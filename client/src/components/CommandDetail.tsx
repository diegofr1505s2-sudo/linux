import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowRight,
  BookOpen,
  Check,
  Copy,
  ExternalLink,
  Info,
  Play,
  ShieldAlert,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import {
  CATEGORIES,
  getCommandAvailability,
  terminalAppletCount,
  terminalProfile,
} from "@/lib/catalogue";
import type { Command } from "@/lib/catalogue";

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.cssText = "position:fixed;left:-9999px;top:0";
    document.body.appendChild(area);
    area.select();
    const success = document.execCommand("copy");
    area.remove();
    if (!success)
      toast.error("La copie n’est pas autorisée par votre navigateur.");
    return success;
  }
}
export function CodeBlock({
  code,
  onTry,
  label,
  tryLabel,
}: {
  code: string;
  onTry?: (code: string) => void;
  label?: string;
  tryLabel?: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (await copyText(code)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };
  return (
    <div className="code-block">
      <div className="code-line">
        <span className="dollar" aria-hidden="true">
          $
        </span>
        <pre>
          <code>{code}</code>
        </pre>
        <button
          className="code-copy"
          onClick={copy}
          title="Copier la commande"
          aria-label="Copier la commande"
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
        </button>
      </div>
      {onTry && (
        <div className="code-bottom">
          <span>
            {label || "Modifiez les chemins et paramètres avant utilisation."}
          </span>
          <button onClick={() => onTry(code)}>
            <Play size={12} /> {tryLabel || "Essayer dans le terminal"}
          </button>
        </div>
      )}
    </div>
  );
}
interface Props {
  command: Command | null;
  onClose: () => void;
  isFavorite: boolean;
  onFavorite: (id: string) => void;
  onTry: (code: string) => void;
  onRelated: (name: string) => void;
  onAsk: () => void;
}
export default function CommandDetail({
  command,
  onClose,
  isFavorite,
  onFavorite,
  onTry,
  onRelated,
  onAsk,
}: Props) {
  const [tab, setTab] = useState("examples");
  if (!command) return null;
  const category = CATEGORIES.find(c => c.id === command.category);
  const terminalCommand = getCommandAvailability(command.name);
  const external = /^https?:\/\//i.test(command.manualUrl)
    ? command.manualUrl
    : command.source;
  return (
    <Dialog.Root
      open={!!command}
      onOpenChange={open => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="detail-drawer">
          <div className="drawer-top">
            <span className="eyebrow">
              <BookOpen size={13} /> MANUEL DE COMMANDE
            </span>
            <Dialog.Close className="icon-button" aria-label="Fermer la fiche">
              <X size={20} />
            </Dialog.Close>
          </div>
          <div className="drawer-scroll">
            <div className="detail-heading">
              <span className={`category-chip cat-${command.category}`}>
                {category?.label}
              </span>
              <span className="level-chip">{command.level}</span>
              {command.language === "en" && (
                <span className="lang-chip">Fiche en anglais</span>
              )}
              <div className="detail-title-line">
                <Dialog.Title className="command-title">
                  {command.name}
                </Dialog.Title>
                <button
                  className={`icon-button favorite ${isFavorite ? "saved" : ""}`}
                  onClick={() => onFavorite(command.id)}
                  aria-label={
                    isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"
                  }
                  aria-pressed={isFavorite}
                >
                  <Star size={22} fill={isFavorite ? "currentColor" : "none"} />
                </button>
              </div>
              <Dialog.Description className="detail-description">
                {command.description}
              </Dialog.Description>
              {command.details.length > 0 && (
                <div className="detail-prose">
                  <Streamdown>{command.details.join("\n\n")}</Streamdown>
                </div>
              )}
            </div>
            {command.dangerous && (
              <div className="warning-callout">
                <ShieldAlert size={19} />
                <div>
                  <strong>À manipuler avec précaution</strong>
                  <p>
                    Cette commande peut supprimer des données ou modifier le
                    système. Vérifiez les options et les chemins. Dans le
                    laboratoire, seuls les fichiers de la machine virtuelle sont
                    concernés.
                  </p>
                </div>
              </div>
            )}
            {command.category === "security" && (
              <div className="info-callout">
                <Info size={17} />
                <p>
                  Les outils de sécurité sont à utiliser exclusivement dans un
                  laboratoire ou sur des systèmes pour lesquels vous avez une
                  autorisation explicite.
                </p>
              </div>
            )}
            <section className="detail-section">
              <h3>Syntaxe illustrée</h3>
              <CodeBlock code={command.syntax} />
              <p className="small-muted">
                Un exemple de structure, pas la liste exhaustive des arguments.
                Les paramètres comme chemin/vers/fichier sont à remplacer.
              </p>
            </section>
            <div
              className={`info-callout terminal-compatibility terminal-compatibility-${terminalCommand.availability}`}
              role="note"
            >
              {terminalCommand.availability === "available" ? (
                <Info size={17} />
              ) : (
                <ShieldAlert size={19} />
              )}
              <div>
                <strong>
                  Dans le terminal LinuxLab :{" "}
                  {terminalCommand.availability === "available"
                    ? "présente"
                    : terminalCommand.availability === "absent"
                      ? "absente"
                      : "non répertoriée"}
                </strong>
                <p>
                  Environnement réellement mesuré : {terminalProfile} ·{" "}
                  {terminalAppletCount} applets BusyBox. Les options peuvent
                  différer de GNU/Linux.
                </p>
                {terminalCommand.availability !== "available" && (
                  <>
                    <p>
                      {terminalCommand.availability === "absent"
                        ? `« ${terminalCommand.executable} » n’est pas installé dans cette VM ; l’exemple affichera probablement « not found ».`
                        : `« ${terminalCommand.executable} » ne figure pas dans la liste mesurée ; vérifiez sa présence avant de l’essayer.`}{" "}
                      Cela ne signifie pas que la commande manque sur votre
                      propre distribution.
                    </p>
                    {terminalCommand.executable && (
                      <code>
                        Vérification : command -v {terminalCommand.executable}
                      </code>
                    )}
                  </>
                )}
              </div>
            </div>
            <div
              className="detail-tabs"
              role="tablist"
              aria-label="Contenu de la fiche"
            >
              {[
                {
                  id: "examples",
                  label: `Exemples (${command.examples.length})`,
                },
                { id: "options", label: "Options illustrées" },
                { id: "notes", label: "À savoir" },
              ].map(item => (
                <button
                  key={item.id}
                  role="tab"
                  aria-selected={tab === item.id}
                  aria-controls={`detail-${item.id}`}
                  id={`tab-${item.id}`}
                  onClick={() => setTab(item.id)}
                  className={tab === item.id ? "active" : ""}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {tab === "examples" && (
              <div
                role="tabpanel"
                id="detail-examples"
                aria-labelledby="tab-examples"
                className="examples-list"
              >
                {command.examples.map((example, i) => (
                  <section className="example-item" key={`${command.id}-${i}`}>
                    <div className="example-title">
                      <span>{String(i + 1).padStart(2, "0")}</span>
                      <h3>{example.description}</h3>
                    </div>
                    <CodeBlock
                      code={example.code}
                      onTry={onTry}
                      tryLabel={
                        terminalCommand.availability === "available"
                          ? undefined
                          : "Insérer quand même"
                      }
                    />
                    <p className="expected">
                      <span>Effet recherché</span>{" "}
                      {example.description.replace(/:$/, ".")}
                    </p>
                  </section>
                ))}
                <p className="small-muted">
                  Les exemples viennent de tldr et de votre cheat-sheet. L’effet
                  décrit n’est pas une sortie mesurée ; le résultat dépend des
                  fichiers, des droits et de la version installée.
                </p>
              </div>
            )}
            {tab === "options" && (
              <div
                role="tabpanel"
                id="detail-options"
                aria-labelledby="tab-options"
                className="option-list"
              >
                <p className="small-muted">
                  Options repérées dans les exemples documentés. La description
                  indique le contexte d’emploi ; consultez le manuel pour leur
                  définition complète.
                </p>
                {command.options.length ? (
                  command.options.map((option, i) => (
                    <div className="option-row" key={i}>
                      <code>{option.flag}</code>
                      <p>{option.description}</p>
                    </div>
                  ))
                ) : (
                  <div className="empty-small">
                    Cette fiche ne documente pas d’option particulière. Les
                    commandes internes peuvent ne pas proposer{" "}
                    <code>--help</code>.
                  </div>
                )}
                <a
                  className="text-link"
                  href={external}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Consulter la documentation complète <ExternalLink size={14} />
                </a>
              </div>
            )}
            {tab === "notes" && (
              <div
                role="tabpanel"
                id="detail-notes"
                aria-labelledby="tab-notes"
                className="notes-list"
              >
                <h3>Prérequis</h3>
                {command.prerequisites.map((note, i) => (
                  <p key={i}>
                    <span className="list-dot" />
                    {note}
                  </p>
                ))}
                <h3>Compatibilité du laboratoire</h3>
                <p>
                  Linux Lab démarre Buildroot avec BusyBox. De nombreuses
                  commandes de base sont disponibles, mais pas tous les
                  programmes du catalogue. Le shell est ash et les options
                  peuvent différer des variantes GNU.
                </p>
                <CodeBlock
                  code={`command -v ${command.name.split(" ")[0]}`}
                  onTry={onTry}
                  label="Vérifier si le programme est installé."
                />
                <p>
                  Pour voir les utilitaires intégrés :{" "}
                  <code>busybox --list</code>. Le réseau est désactivé. Les
                  fichiers sont temporaires.
                </p>
                <h3>Sur votre propre machine</h3>
                <p>
                  La disponibilité dépend de votre distribution et des paquets
                  installés. Ne copiez pas une commande destructive sans
                  comprendre ses paramètres.
                </p>
              </div>
            )}
            {command.related.length > 0 && (
              <section className="detail-section related-section">
                <h3>Pour aller plus loin</h3>
                <div>
                  {command.related.map(name => (
                    <button
                      key={name}
                      onClick={() => {
                        setTab("examples");
                        onRelated(name);
                      }}
                    >
                      <code>{name}</code>
                      <ArrowRight size={13} />
                    </button>
                  ))}
                </div>
              </section>
            )}
            <div className="detail-source">
              <span>
                Source ouverte ·{" "}
                {command.language === "fr" ? "Français" : "Anglais"}
              </span>
              <a
                href={command.source}
                target="_blank"
                rel="noopener noreferrer"
              >
                tldr / fiche d’origine <ExternalLink size={12} />
              </a>
            </div>
          </div>
          <div className="drawer-footer">
            <button className="secondary-button" onClick={onAsk}>
              <Sparkles size={15} /> M’expliquer cette commande
            </button>
            <button
              className="primary-button"
              onClick={() => onTry(command.examples[0]?.code || command.name)}
            >
              <Play size={14} /> Ouvrir le terminal
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
