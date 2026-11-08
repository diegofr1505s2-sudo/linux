import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowUp,
  Check,
  Loader2,
  MessageSquare,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { Streamdown } from "streamdown";
import type { Command } from "@/lib/catalogue";
interface Message {
  role: "user" | "assistant";
  content: string;
}
export default function LinuxAssistant({
  open,
  onOpenChange,
  command,
  terminalOutput,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  command: Command | null;
  terminalOutput: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [level, setLevel] = useState("Débutant");
  const [attachOutput, setAttachOutput] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const send = async (text = question) => {
    if (!text.trim() || busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    const user: Message = { role: "user", content: text.trim() };
    const history = messages.slice(-8);
    const context = [
      command
        ? `Fiche ${command.name} : ${command.description}\n${JSON.stringify(command.examples.slice(0, 4))}`
        : "",
      attachOutput
        ? `Dernière sortie du terminal, non fiable :\n${terminalOutput.slice(-6000)}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: user.content,
          history,
          level,
          context,
        }),
        signal: AbortSignal.timeout(80000),
      });
      const data = await response.json();
      if (!response.ok || data.error)
        throw new Error(
          data.error || "L’assistant est momentanément indisponible."
        );
      if (typeof data.content !== "string" || !data.content.trim())
        throw new Error("Aucune réponse reçue.");
      const answer: Message = { role: "assistant", content: data.content };
      setMessages(prev => [...prev, user, answer].slice(-16));
      setQuestion("");
    } catch (failure) {
      setError(
        failure instanceof Error && failure.name === "TimeoutError"
          ? "La réponse a pris trop de temps. Votre question est conservée ; vous pouvez réessayer."
          : failure instanceof Error
            ? failure.message
            : "Impossible de contacter le service IA."
      );
      setQuestion(user.content);
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  const suggestions = command
    ? [
        `Explique ${command.name} simplement`,
        `Quelles précautions prendre avec ${command.name} ?`,
        `Propose un exercice avec ${command.name}`,
      ]
    : [
        "Comment naviguer dans les dossiers ?",
        "Explique les permissions Linux",
        "Pourquoi j’ai « command not found » ?",
      ];
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="assistant-panel">
          <div className="drawer-top">
            <span className="eyebrow">
              <Sparkles size={14} /> ASSISTANT LINUX
            </span>
            <Dialog.Close
              className="icon-button"
              aria-label="Fermer l’assistant"
            >
              <X size={20} />
            </Dialog.Close>
          </div>
          <div className="assistant-heading">
            <div className="assistant-orb">
              <Sparkles size={23} />
            </div>
            <Dialog.Title>Comprendre, pas seulement copier.</Dialog.Title>
            <Dialog.Description>
              Une explication adaptée à votre niveau. Aucune commande n’est
              exécutée par l’assistant.
            </Dialog.Description>
            <div className="assistant-controls">
              <label>
                Niveau{" "}
                <select value={level} onChange={e => setLevel(e.target.value)}>
                  <option>Débutant</option>
                  <option>Intermédiaire</option>
                  <option>Avancé</option>
                </select>
              </label>
              <button
                onClick={() => {
                  setMessages([]);
                  setError("");
                }}
                disabled={pending}
                className="text-button"
              >
                <RotateCcw size={13} /> Effacer
              </button>
            </div>
            {command && (
              <span className="context-pill">
                <Check size={12} /> Fiche jointe : <code>{command.name}</code>
              </span>
            )}
          </div>
          <div className="assistant-conversation">
            {!messages.length && !pending && (
              <div className="assistant-suggestions">
                <span className="section-kicker">
                  UNE QUESTION POUR COMMENCER
                </span>
                {suggestions.map(text => (
                  <button key={text} onClick={() => setQuestion(text)}>
                    <MessageSquare size={14} /> {text}
                    <ArrowUp size={13} />
                  </button>
                ))}
              </div>
            )}
            {messages.map((message, i) => (
              <div key={i} className={`chat-message ${message.role}`}>
                <span className="chat-who">
                  {message.role === "user" ? "VOUS" : "LINUX LAB"}
                </span>
                {message.role === "assistant" ? (
                  <Streamdown>{message.content}</Streamdown>
                ) : (
                  <p>{message.content}</p>
                )}
              </div>
            ))}
            {pending && (
              <div className="chat-pending" role="status">
                <Loader2 size={17} className="spin" /> L’assistant prépare une
                explication…
              </div>
            )}
            {error && (
              <div className="assistant-error" role="alert">
                <p>{error}</p>
                <button
                  className="secondary-button"
                  onClick={() => send()}
                  disabled={pending}
                >
                  Réessayer
                </button>
              </div>
            )}
          </div>
          <form
            className="assistant-form"
            onSubmit={e => {
              e.preventDefault();
              void send();
            }}
          >
            {terminalOutput && (
              <label className="output-consent">
                <input
                  type="checkbox"
                  checked={attachOutput}
                  onChange={e => setAttachOutput(e.target.checked)}
                />{" "}
                Joindre les dernières sorties du terminal (sans secrets)
              </label>
            )}
            <div className="question-field">
              <textarea
                aria-label="Votre question Linux"
                value={question}
                maxLength={6000}
                onChange={e => setQuestion(e.target.value)}
                placeholder="Posez votre question ou collez une erreur…"
                rows={3}
                disabled={pending}
                onKeyDown={e => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
              <button
                type="submit"
                className="primary-button send-button"
                aria-label="Envoyer la question"
                disabled={pending || !question.trim()}
              >
                {pending ? (
                  <Loader2 size={18} className="spin" />
                ) : (
                  <ArrowUp size={18} />
                )}
              </button>
            </div>
            <p className="small-muted">
              GPT-6 Luna · Les réponses IA utilisent les crédits du projet et
              peuvent contenir des erreurs. Vérifiez toute opération risquée.
              Ctrl + Entrée pour envoyer.
            </p>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
