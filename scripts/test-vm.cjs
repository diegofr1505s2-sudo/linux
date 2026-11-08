#!/usr/bin/env node
/** Guest shell commands below only enter v86's emulated UART, never a host shell. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const jsVm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const assets = path.join(root, 'client/public/vm');
const component = fs.readFileSync(path.join(root, 'client/src/components/LinuxTerminal.tsx'), 'utf8');
// Test the exact exported implementation without loading browser-only xterm/React.
const ast = ts.createSourceFile('LinuxTerminal.tsx', component, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const helpers = ast.statements.filter(node => ts.isFunctionDeclaration(node) && ['prepareInsertion', 'isLabPrompt'].includes(node.name?.text));
assert.equal(helpers.length, 2, 'Component exports its actual insertion and readiness helpers');
const js = ts.transpileModule(helpers.map(node => node.getText(ast)).join('\n'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const context = { exports: {} };
jsVm.runInNewContext(js, context); // Pure JS string transformation; no shell or filesystem access.
const prepareInsertion = context.exports.prepareInsertion;
const isLabPrompt = context.exports.isLabPrompt;
assert.ok(isLabPrompt('linuxlab:~/lab# '));
assert.ok(isLabPrompt('linuxlab:/root/lab# '));
assert.ok(!isLabPrompt('LinuxLab : fichiers exemples prets.'));
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
const command = "pwd; echo VM_ECHO_OK; ls -1; cat logs/app.log | grep ERROR | wc -l; uname -r; busybox | head -1; printf 'BASH='; command -v bash || true; printf '\\nASH='; command -v ash; printf 'SH='; readlink /bin/sh; printf 'APT='; command -v apt || true; printf '\\nSYSTEMCTL='; command -v systemctl || true; printf '\\nVM_TEST_DONE\\n'\n";
const logPath = path.join(assets, 'boot-test-output.txt');

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
    if (stage === 'boot' && output.endsWith('~% ')) {
      stage = 'init';
      console.log(`Guest boot prompt received after ${Date.now() - started} ms.`);
      vm.serial0_send(fs.readFileSync(path.join(assets, 'lab-init.sh'), 'utf8'));
    } else if (stage === 'init' && isLabPrompt(output)) {
      stage = 'commands';
      console.log('Fixture created; sending test commands into the guest UART.');
      vm.serial0_send(command);
    } else if (stage === 'commands' && commandOutput.includes('\nVM_TEST_DONE\n')) {
      try {
        assert.match(commandOutput, /\n\/root\/lab\n/);
        assert.match(commandOutput, /\nVM_ECHO_OK\n/);
        assert.match(commandOutput.replace(/\x1b\[[0-9;]*m/g, ''), /\nlogs\nnotes\.txt\nprojets\n/);
        assert.match(commandOutput, /\n2\n/);
        assert.match(commandOutput, /BusyBox v/);
        assert.match(commandOutput, /ASH=\/bin\/ash\n/);
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
