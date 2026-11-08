#!/usr/bin/env node
/** Guest shell commands below only enter v86's emulated UART, never a host shell. */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const jsVm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const assets = path.join(root, 'client/public/vm');
const component = fs.readFileSync(path.join(root, 'client/src/components/LinuxTerminal.tsx'), 'utf8');
// Test the exact exported implementation without loading browser-only xterm/React.
const ast = ts.createSourceFile('LinuxTerminal.tsx', component, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const helpers = ast.statements.filter(node => ts.isFunctionDeclaration(node) && ['prepareInsertion', 'isLabPrompt', 'isBootstrapPrompt'].includes(node.name?.text));
assert.equal(helpers.length, 3, 'Component exports its actual insertion and readiness helpers');
const js = ts.transpileModule(helpers.map(node => node.getText(ast)).join('\n'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const context = { exports: {} };
jsVm.runInNewContext(js, context); // Pure JS string transformation; no shell or filesystem access.
const prepareInsertion = context.exports.prepareInsertion;
const isLabPrompt = context.exports.isLabPrompt;
const isBootstrapPrompt = context.exports.isBootstrapPrompt;
assert.ok(isLabPrompt('linuxlab:~/lab# '));
assert.ok(isLabPrompt('linuxlab:/root/lab# '));
assert.ok(!isLabPrompt('LinuxLab : fichiers exemples prets.'));
assert.ok(isBootstrapPrompt('~% '));
assert.ok(isBootstrapPrompt('root% '));
assert.ok(!isBootstrapPrompt('linuxlab:~/lab# '));
const multiline = "nom='Linux Lab'\nprintf 'Bonjour %s\\n' \"$nom\"\nprintf '%s\\n' 'C:\\notes\\tab'\nprintf '%s\\n' 'quote: '\"'\"'ok'\nmkdir -p /root/lab/script\necho 'MULTILINE_EXECUTED' > /root/lab/script/result.txt\ncat /root/lab/script/result.txt";
const suggestion = prepareInsertion(multiline);
assert.doesNotMatch(suggestion, /[\x00-\x1f\x7f-\x9f]/, 'Suggestion contains zero terminal controls');
assert.equal(prepareInsertion('pwd\x1b\r\x03'), 'pwd  ');
assert.doesNotMatch(prepareInsertion('echo\tfoo\r\n\x1becho bar'), /[\x00-\x1f\x7f-\x9f]/);
console.log('PASS: exact component insertion helper preserves a script as one control-free shell line.');

const started = Date.now();
let vm;
let output = '';
let stage = 'boot';
let timer;
let scriptTimer;
let commandOutput = '';
let insertionOutput = '';
let finished = false;
const command = [
  "pwd; echo VM_ECHO_OK; ls -1; cat logs/app.log | grep ERROR | wc -l; uname -r; busybox | head -1; printf 'BASH='; command -v bash || true; printf '\\nASH='; command -v ash; printf 'SH='; readlink /bin/sh; printf 'APT='; command -v apt || true; printf '\\nSYSTEMCTL='; command -v systemctl || true",
  "printf '\\nVM_APPLETS_BEGIN\\n'; busybox --list; printf 'VM_APPLETS_END\\n'",
  "printf '\\nVM_PROBE_BEGIN\\n'; for name in sh ash bash apt apt-get systemctl sudo apk curl wget ping ip awk sed tar find grep chmod ps vi nano git python3 ls cp mv rm touch date cat head tail sort uniq cut wc xargs busybox alias bg break cd command continue echo eval exec exit export false fg getopts hash help jobs kill local printf pwd read readonly return set shift test times trap true type ulimit umask unalias unset wait; do path=$(command -v \"$name\" 2>/dev/null) || path=; printf '%s=%s\\n' \"$name\" \"${path:-absent}\"; done; printf 'VM_PROBE_END\\n'",
  "printf '\\nVM_TEST_DONE\\n'",
].join('; ') + '\n';
const logPath = path.join(os.tmpdir(), 'linuxlab-vm-boot-test-output.txt');
const inventoryPath = path.join(root, 'client/src/lib/terminal-capabilities.json');

(async () => {
  const { V86 } = await import('v86');
  const wasmModule = await WebAssembly.compile(fs.readFileSync(path.join(assets, 'v86.wasm')));
  const bufferImage = name => {
    const bytes = fs.readFileSync(path.join(assets, name));
    return { buffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
  };
  vm = new V86({
    wasm_fn: imports => WebAssembly.instantiate(wasmModule, imports).then(instance => instance.exports),
    bios: bufferImage('seabios.bin'),
    vga_bios: bufferImage('vgabios.bin'),
    bzimage: bufferImage('buildroot-bzimage68.bin'),
    filesystem: {},
    memory_size: 128 * 1024 * 1024,
    vga_memory_size: 2 * 1024 * 1024,
    cmdline: 'tsc=reliable mitigations=off random.trust_cpu=on',
    autostart: true,
    disable_keyboard: true,
    disable_mouse: true,
    disable_speaker: true,
    // No relay, fetch adapter, host filesystem, or network backend.
  });
  timer = setTimeout(() => finish(new Error(`Linux boot/test timeout at stage ${stage}`)), 30000);
  vm.add_listener('emulator-ready', () => console.log('v86 emulator ready; waiting for guest shell.'));
  vm.add_listener('serial0-output-byte', byte => {
    const char = byte === 13 ? '' : String.fromCharCode(byte);
    output += char;
    if (stage === 'commands') commandOutput += char;
    if (stage === 'inserted' || stage === 'script') insertionOutput += char;
    if (stage === 'boot' && isBootstrapPrompt(output)) {
      stage = 'quiet';
      console.log(`Guest boot prompt received after ${Date.now() - started} ms; disabling echo.`);
      vm.serial0_send('stty -echo\n');
    } else if (stage === 'quiet' && isBootstrapPrompt(output)) {
      stage = 'init';
      vm.serial0_send(fs.readFileSync(path.join(assets, 'lab-init.sh'), 'utf8'));
    } else if (stage === 'init' && isLabPrompt(output)) {
      stage = 'clear-screen';
      vm.serial0_send('\x0c');
      scriptTimer = setTimeout(() => {
        try {
          assert.match(output, /\x1b\[[0-9;]*[HJ]/, 'Ctrl-L clears the boot output');
          const cleanTail = output.slice(-100).replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');
          assert.ok(isLabPrompt(cleanTail), 'Ctrl-L redraws the lab prompt');
          assert.doesNotMatch(output, /mkdir -p \/root\/lab\/logs/, 'Initialization script stays hidden');
          stage = 'commands';
          console.log('Fixture ready after the startup screen was cleared; sending tests to the guest UART.');
          vm.serial0_send(command);
        } catch (error) { finish(error); }
      }, 100);
    } else if (stage === 'commands' && commandOutput.includes('\nVM_TEST_DONE\n')) {
      try {
        assert.match(commandOutput, /\n\/root\/lab\n/);
        assert.match(commandOutput, /\nVM_ECHO_OK\n/);
        assert.match(commandOutput.replace(/\x1b\[[0-9;]*m/g, ''), /\nlogs\nnotes\.txt\nprojets\n/);
        assert.match(commandOutput, /\n2\n/);
        assert.match(commandOutput, /BusyBox v/);
        assert.match(commandOutput, /ASH=\/bin\/ash\n/);
        const appletMatch = commandOutput.match(/\nVM_APPLETS_BEGIN\n([\s\S]*?)\nVM_APPLETS_END\n/);
        const probeMatch = commandOutput.match(/\nVM_PROBE_BEGIN\n([\s\S]*?)\nVM_PROBE_END\n/);
        assert.ok(appletMatch && probeMatch, 'Guest applet inventory and command probes were returned');
        const applets = appletMatch[1].trim().split(/\s+/).sort();
        const probes = Object.fromEntries(probeMatch[1].trim().split('\n').map(line => {
          const separator = line.indexOf('=');
          return [line.slice(0, separator), line.slice(separator + 1) !== 'absent'];
        }));
        for (const name of ['ls', 'cat', 'grep', 'awk', 'sed', 'find', 'tar', 'chmod']) assert.equal(probes[name], true, `${name} should be available`);
        for (const name of ['bash', 'apt', 'apt-get', 'systemctl', 'sudo', 'nano', 'git', 'python3']) assert.equal(probes[name], false, `${name} should be absent`);
        const inventory = { distribution: 'Buildroot', kernel: 'Linux 6.8.12', shell: 'BusyBox ash', busybox: '1.36.1', applets, probes };
        fs.writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2) + '\n');
        stage = 'wait-prompt';
      } catch (error) { finish(error); }
    } else if (stage === 'wait-prompt' && isLabPrompt(output)) {
      stage = 'inserted';
      vm.serial0_send(suggestion); // Deliberately no newline: exactly the component contract.
      scriptTimer = setTimeout(() => {
        try {
          assert.doesNotMatch(insertionOutput, /\nBonjour Linux Lab\n|\nMULTILINE_EXECUTED\n/);
          console.log('PASS: suggestion remained unexecuted for 500 ms before explicit Enter.');
          stage = 'script';
          vm.serial0_send('\n'); // Explicit test-user Enter.
        } catch (error) { finish(error); }
      }, 500);
    } else if (stage === 'script' && isLabPrompt(output)) {
      try {
        assert.match(insertionOutput, /\nBonjour Linux Lab\n/);
        assert.match(insertionOutput, /\nC:\\notes\\tab\n/);
        assert.match(insertionOutput, /\nquote: 'ok\n/);
        assert.match(insertionOutput, /\nMULTILINE_EXECUTED\n/);
        stage = 'done';
        finish();
      } catch (error) { finish(error); }
    }
  });
})().catch(finish);

async function finish(error) {
  if (finished) return;
  finished = true;
  if (timer) clearTimeout(timer);
  if (scriptTimer) clearTimeout(scriptTimer);
  fs.writeFileSync(logPath, output);
  if (vm) await vm.destroy().catch(() => {});
  if (error) {
    console.error(error);
    console.error('Last guest output:', output.slice(-5000));
    process.exitCode = 1;
  } else {
    console.log(`PASS: real Linux boot, pwd, echo, ls, pipeline and multiline script (${Date.now() - started} ms).`);
    console.log('Guest command:', command.trim());
    console.log('Prepared suggestion (zero control characters):', suggestion);
    console.log('Guest output tail:\n' + output.slice(-4500));
  }
  console.log('Serial evidence:', logPath);
}
