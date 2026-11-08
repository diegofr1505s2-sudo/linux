import { useEffect, useRef, useState } from "react";
import type { Terminal } from "@xterm/xterm";
import type { FitAddon } from "@xterm/addon-fit";
import type { V86 } from "v86";
import "@xterm/xterm/css/xterm.css";
import "./linux-terminal.css";

type Status = "idle" | "loading" | "booting" | "preparing" | "ready" | "error";
type Props = {
  insertCommand?: { text: string; nonce: number };
  onOutput?: (text: string) => void;
};

const labels: Record<Status, string> = {
  idle: "Linux arrêté",
  loading: "Chargement des fichiers",
  booting: "Démarrage du noyau",
  preparing: "Préparation du laboratoire",
  ready: "Linux prêt",
  error: "Démarrage interrompu",
};
const assetUrl = (name: string) => `${import.meta.env.BASE_URL}vm/${name}`;
// A suggested command is text only. Strip every terminal control character,
// particularly CR, ESC and Ctrl-C. Encode scripts into ONE POSIX shell line;
// no literal newline enters the UART until the user explicitly presses Enter.
export function prepareInsertion(text: string): string {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "");
  if (!normalized.includes("\n")) return normalized.replace(/[\x00-\x1f\x7f-\x9f]/g, " ");
  const script = normalized.replace(/[\x00-\x08\x0b-\x1f\x7f-\x9f]/g, "");
  const encoded = script.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/\t/g, "\\t");
  const quoted = "'" + encoded.replace(/'/g, "'\\''") + "'";
  return `sh -c "$(printf '%b' ${quoted})"`;
}

export function isLabPrompt(tail: string): boolean {
  return /linuxlab:(?:~\/lab|\/root\/lab)# $/.test(tail);
}

export default function LinuxTerminal({ insertCommand, onOutput }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const vmRef = useRef<V86 | null>(null);
  const statusRef = useRef<Status>("idle");
  const generationRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<string | null>(null);
  const nonceRef = useRef<number | null>(null);
  const onOutputRef = useRef(onOutput);
  const outputBytesRef = useRef<number[]>([]);
  const flushRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const decoderRef = useRef(new TextDecoder());

  useEffect(() => { onOutputRef.current = onOutput; }, [onOutput]);

  function transition(next: Status) {
    statusRef.current = next;
    setStatus(next);
  }

  function flushOutput() {
    flushRef.current = null;
    const bytes = new Uint8Array(outputBytesRef.current);
    outputBytesRef.current = [];
    if (!bytes.length) return;
    terminalRef.current?.write(bytes);
    onOutputRef.current?.(decoderRef.current.decode(bytes, { stream: true }));
  }

  function fitTerminal() {
    const element = containerRef.current;
    if (element && element.clientWidth > 0 && element.clientHeight > 0) {
      fitRef.current?.fit();
    }
  }

  function insertPending() {
    if (statusRef.current !== "ready" || !vmRef.current || pendingRef.current === null) return;
    const text = pendingRef.current;
    pendingRef.current = null;
    vmRef.current.serial_send_bytes(0, new TextEncoder().encode(text));
    setNotice(text.startsWith("sh -c \"$(printf '%b'")
      ? "Script préparé dans sh, pas exécuté. Appuyez sur Entrée pour le lancer."
      : "Texte inséré, pas exécuté. Appuyez sur Entrée pour lancer la commande.");
    fitTerminal();
    terminalRef.current?.focus();
  }

  useEffect(() => {
    if (!insertCommand || nonceRef.current === insertCommand.nonce) return;
    nonceRef.current = insertCommand.nonce;
    pendingRef.current = prepareInsertion(insertCommand.text);
    if (statusRef.current === "ready") insertPending();
    else setNotice("Commande en attente. Démarrez Linux ; elle sera insérée sans appuyer sur Entrée.");
  }, [insertCommand]);

  useEffect(() => {
    const element = containerRef.current;
    const resizeObserver = new ResizeObserver(fitTerminal);
    if (element) resizeObserver.observe(element);
    return () => {
      generationRef.current += 1;
      abortRef.current?.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
      if (flushRef.current) clearTimeout(flushRef.current);
      resizeObserver.disconnect();
      void vmRef.current?.destroy().catch(() => {});
      vmRef.current = null;
      terminalRef.current?.dispose();
      terminalRef.current = null;
    };
  }, []);

  async function startLinux() {
    if (["loading", "booting", "preparing"].includes(statusRef.current)) return;
    const generation = ++generationRef.current;
    const isCurrent = () => generationRef.current === generation;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    if (timerRef.current) clearTimeout(timerRef.current);
    const previous = vmRef.current;
    vmRef.current = null;
    if (previous) await previous.destroy().catch(() => {});
    if (!isCurrent()) return;
    setError("");
    setProgress("Chargement local de l’émulateur…");
    transition("loading");

    const fail = (cause: unknown) => {
      if (!isCurrent()) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      controller.abort();
      transition("error");
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(message);
      const machine = vmRef.current;
      vmRef.current = null;
      void machine?.destroy().catch(() => {});
    };

    timerRef.current = setTimeout(() => fail(new Error(
      "Linux n’a pas atteint son shell en 180 secondes. La VM est arrêtée. Réessayez sur un navigateur compatible WebAssembly."
    )), 180_000);

    try {
      if (typeof WebAssembly === "undefined") throw new Error("Ce navigateur ne prend pas en charge WebAssembly.");
      const [{ V86: Emulator }, { Terminal: XTerminal }, { FitAddon: XFitAddon }] = await Promise.all([
        import("v86"), import("@xterm/xterm"), import("@xterm/addon-fit"),
      ]);
      if (!isCurrent()) return;
      if (!terminalRef.current) {
        const terminal = new XTerminal({
          fontFamily: '"IBM Plex Mono", ui-monospace, SFMono-Regular, Consolas, monospace',
          fontSize: 13,
          lineHeight: 1.3,
          cursorBlink: true,
          cursorStyle: "block",
          scrollback: 3000,
          convertEol: false,
          allowProposedApi: false,
          theme: {
            background: "#071A12", foreground: "#B5E8C7", cursor: "#52F28A",
            cursorAccent: "#071A12", selectionBackground: "#245D3B",
            black: "#071A12", red: "#FF8585", green: "#52F28A", yellow: "#E8D58E",
            blue: "#83B9F2", magenta: "#D1A8EC", cyan: "#7FDECC", white: "#D9F5E3",
            brightBlack: "#789F89", brightRed: "#FFADAD", brightGreen: "#8CFFB2",
            brightYellow: "#FFF0AB", brightBlue: "#ADCEFF", brightMagenta: "#E3C0FF",
            brightCyan: "#A3FFEC", brightWhite: "#FFFFFF",
          },
        });
        const fit = new XFitAddon();
        terminal.loadAddon(fit);
        if (!containerRef.current) throw new Error("Le conteneur du terminal est indisponible.");
        terminal.open(containerRef.current);
        terminalRef.current = terminal;
        fitRef.current = fit;
        terminal.onData(data => {
          if (statusRef.current === "ready") {
            if (data.includes("\r") || data.includes("\n")) setNotice("");
            vmRef.current?.serial_send_bytes(0, new TextEncoder().encode(data));
          }
        });
        terminal.onBinary(data => {
          if (statusRef.current === "ready") {
            vmRef.current?.serial_send_bytes(0, Uint8Array.from(data, char => char.charCodeAt(0)));
          }
        });
      }
      if (flushRef.current) clearTimeout(flushRef.current);
      flushRef.current = null;
      outputBytesRef.current = [];
      decoderRef.current = new TextDecoder();
      terminalRef.current.reset();
      fitTerminal();

      // Fetch ourselves, rather than letting v86 retry failed HTTP requests
      // indefinitely. Every binary is same-origin; no external CDN or VM relay.
      const loaded = new Map<string, number>();
      async function download(name: string) {
        const response = await fetch(assetUrl(name), { signal: controller.signal });
        if (!response.ok) throw new Error(`Fichier ${name} indisponible (HTTP ${response.status}).`);
        if (response.headers.get("content-type")?.includes("text/html")) {
          throw new Error(`Le serveur renvoie une page HTML à la place de ${name}.`);
        }
        const reader = response.body?.getReader();
        if (!reader) return response.arrayBuffer();
        const chunks: Uint8Array[] = [];
        let size = 0;
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          chunks.push(value);
          size += value.byteLength;
          loaded.set(name, size);
          if (isCurrent()) {
            const total = [...loaded.values()].reduce((sum, bytes) => sum + bytes, 0);
            setProgress(`${(total / 1_048_576).toFixed(1)} Mio reçus · fichiers locaux`);
          }
        }
        const result = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
        return result.buffer;
      }
      const [bios, vgaBios, kernel, wasm, initBytes] = await Promise.all([
        download("seabios.bin"), download("vgabios.bin"), download("buildroot-bzimage68.bin"),
        download("v86.wasm"), download("lab-init.sh"),
      ]);
      const kernelHeader = new Uint8Array(kernel, 0x202, 4);
      if (String.fromCharCode(...kernelHeader) !== "HdrS") throw new Error("L’image du noyau Linux est invalide.");
      let module: WebAssembly.Module;
      try { module = await WebAssembly.compile(wasm); }
      catch { module = await WebAssembly.compile(await download("v86-fallback.wasm")); }
      const initCommand = new TextDecoder().decode(initBytes).trim() + "\n";
      if (!initCommand.startsWith("mkdir -p /root/lab/")) throw new Error("Le fichier d’initialisation est invalide.");
      if (!isCurrent() || controller.signal.aborted) return;
      transition("booting");
      setProgress("Noyau Linux réel · mémoire invitée 128 Mio");
      let tail = "";
      let initialized = false;
      const machine = new Emulator({
        // Precompiled WASM makes download/compatibility failures catchable above.
        wasm_fn: imports => new Promise(resolve => {
          WebAssembly.instantiate(module, imports).then(instance => resolve(instance.exports), fail);
        }),
        bios: { buffer: bios },
        vga_bios: { buffer: vgaBios },
        bzimage: { buffer: kernel },
        filesystem: {},
        memory_size: 128 * 1024 * 1024,
        vga_memory_size: 2 * 1024 * 1024,
        cmdline: "tsc=reliable mitigations=off random.trust_cpu=on",
        autostart: true,
        disable_keyboard: true,
        disable_mouse: true,
        disable_speaker: true,
        // Intentionally no network_relay_url, net_device relay or host mount.
      });
      vmRef.current = machine;
      machine.add_listener("serial0-output-byte", byte => {
        if (!isCurrent() || statusRef.current === "error") return;
        outputBytesRef.current.push(byte);
        if (!flushRef.current) flushRef.current = setTimeout(flushOutput, 16);
        if (statusRef.current === "ready") return;
        if (byte !== 13) tail = (tail + String.fromCharCode(byte)).slice(-4096);
        if (!initialized && /(?:~% |(?:^|\n)[^\n]*[#$] )$/.test(tail)) {
          initialized = true;
          transition("preparing");
          setProgress("Création de /root/lab et des fichiers d’exercice…");
          machine.serial0_send(initCommand);
        } else if (initialized && isLabPrompt(tail)) {
          if (timerRef.current) clearTimeout(timerRef.current);
          transition("ready");
          setProgress("");
          terminalRef.current?.focus();
          insertPending();
        }
      });
      machine.add_listener("download-error", event => fail(new Error(`Échec du chargement de ${event.file_name}.`)));
    } catch (cause) {
      if (isCurrent() && !controller.signal.aborted) fail(cause);
    }
  }

  function restartLinux() {
    if (window.confirm("Redémarrer Linux ? Tous les fichiers et processus de cette VM seront perdus.")) {
      void startLinux();
    }
  }

  const isStarting = status === "loading" || status === "booting" || status === "preparing";
  return (
    <section className="vm-terminal" aria-label="Terminal Linux dans le navigateur">
      <div className="vm-toolbar">
        <div className="vm-identity"><span className={`vm-light vm-light-${status}`} />
          <strong>LINUX<span className="vm-brand-slash">/</span>LAB</strong>
          <span className="vm-runtime">Buildroot · BusyBox</span>
        </div>
        <div className="vm-actions">
          <button type="button" disabled={status !== "ready"} onClick={() => { fitTerminal(); terminalRef.current?.focus(); }}>Focus</button>
          <button type="button" disabled={!terminalRef.current} onClick={() => terminalRef.current?.clear()}>Effacer</button>
          <button type="button" disabled={status === "idle" || isStarting} onClick={restartLinux}>Redémarrer</button>
        </div>
      </div>
      <div className="vm-status" role="status" aria-live="polite">
        <span>{labels[status]}</span><span>{progress || "100 % dans votre navigateur · sans réseau"}</span>
      </div>
      <div className="vm-screen">
        <div ref={containerRef} className="vm-xterm" aria-label="Console série interactive Linux" />
        {status === "idle" && (
          <div className="vm-start-screen">
            <span className="vm-preview-tag">APERÇU VISUEL · AUCUNE COMMANDE EXÉCUTÉE</span>
            <pre className="vm-preview" aria-hidden="true">{"linuxlab:/root/lab# pwd\n/root/lab\nlinuxlab:/root/lab# ls\nlogs  notes.txt  projets\nlinuxlab:/root/lab# ▋"}</pre>
            <div className="vm-start-copy"><h3>Un vrai Linux. Un espace pour essayer.</h3>
              <p>Le noyau démarre dans une machine virtuelle isolée. Vos essais restent dans cet onglet.</p>
              <button type="button" className="vm-primary" onClick={() => void startLinux()}>Démarrer Linux <span aria-hidden="true">→</span></button>
              <span className="vm-download-note">Environ 12 Mio au premier démarrage · WebAssembly requis</span>
            </div>
          </div>
        )}
        {status === "loading" && <div className="vm-loading" role="status"><span className="vm-loading-bar" /><strong>Chargement de la machine virtuelle…</strong><span>{progress}</span></div>}
        {status === "error" && <div className="vm-error" role="alert"><strong>Linux n’a pas pu démarrer.</strong><p>{error}</p><button type="button" className="vm-primary" onClick={() => void startLinux()}>Réessayer</button></div>}
      </div>
      {notice && <p className="vm-insertion-note" role="status">{notice}</p>}
      <div className="vm-footer"><span><kbd>Tab</kbd> compléter <kbd>↑</kbd> historique <kbd>Ctrl C</kbd> interrompre</span><span>Fichiers volatils · réseau désactivé</span></div>
      <details className="vm-environment"><summary>Ce que ce Linux peut faire</summary>
        <p>Shell <code>BusyBox ash</code>, pas Bash. Ce Linux minimal n’est pas Ubuntu : certaines options GNU diffèrent, sans <code>apt</code> ni <code>systemd</code>. Utilisez <code>command -v nom</code> et <code>busybox --list</code> pour vérifier les commandes disponibles.</p>
        <p><code>/root/lab</code> contient <code>notes.txt</code>, <code>logs/app.log</code> et <code>projets/todo.txt</code>. Vous êtes root uniquement dans la VM. Les fichiers restent pendant la navigation et la fermeture du panneau, mais disparaissent au redémarrage, au rechargement ou à la fermeture de l’onglet.</p>
        <p>Le terminal n’exécute rien sur le serveur ou votre ordinateur. Seuls les fichiers statiques de la VM sont téléchargés. <a href={assetUrl("NOTICE.md")} target="_blank" rel="noreferrer">Sources et licences</a></p>
      </details>
    </section>
  );
}
