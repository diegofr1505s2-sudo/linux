import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Braces,
  Check,
  CheckCircle2,
  ExternalLink,
  FolderOpen,
  Info,
  Shield,
  Terminal,
} from "lucide-react";
import { CodeBlock } from "./CommandDetail";
import type { CatalogueMeta, Command } from "@/lib/catalogue";
const tracks = [
  {
    id: "files",
    title: "Se repérer et manipuler les fichiers",
    description:
      "Votre premier pas dans le terminal : naviguer, créer, lire et copier.",
    icon: FolderOpen,
    names: ["pwd", "ls", "cd", "mkdir", "touch", "cat", "cp", "mv"],
    exercise:
      "mkdir -p /root/lab/exercice\ncd /root/lab/exercice\nprintf 'Bonjour Linux\\n' > notes.txt\ncat notes.txt\ncp notes.txt copie.txt\nls -l",
    effect:
      "Vous créez un dossier d’exercice, écrivez une ligne, la lisez et créez une copie. La dernière commande doit lister notes.txt et copie.txt.",
  },
  {
    id: "text",
    title: "Trouver l’information utile",
    description: "Passez de fichiers entiers aux lignes qui vous intéressent.",
    icon: BookOpen,
    names: ["cat", "head", "tail", "grep", "sort", "uniq", "wc", "find"],
    exercise:
      "printf 'linux\\nbash\\nlinux\\nterminal\\n' > /root/lab/mots.txt\ncat /root/lab/mots.txt | sort | uniq\ngrep -n 'linux' /root/lab/mots.txt\nwc -l /root/lab/mots.txt",
    effect:
      "Le tri suivi de uniq affiche trois mots distincts. grep retrouve linux aux lignes 1 et 3. wc compte quatre lignes.",
  },
  {
    id: "shell",
    title: "Enchaîner plutôt que répéter",
    description:
      "Comprenez les redirections, les variables et les conditions du shell.",
    icon: Braces,
    names: ["echo", "printf", "export", "test", "sh", "alias", "env"],
    exercise:
      "nom='Linux Lab'\nprintf 'Bonjour %s\\n' \"$nom\"\nmkdir -p /root/lab/shell && echo 'Dossier prêt'\ntest -d /root/lab/shell && echo 'Le dossier existe'",
    effect:
      "Le shell affiche le contenu de la variable, puis exécute la commande suivante seulement lorsque la précédente réussit. Ce script fonctionne dans ash comme dans Bash.",
  },
];
const tips = [
  {
    title: "Relier deux commandes",
    code: "ls /root/lab | grep '\\.txt$'",
    text: "Le pipe | transmet la sortie standard de la première commande à l’entrée standard de la suivante.",
  },
  {
    title: "Écrire dans un fichier",
    code: "printf 'Première ligne\\n' > /root/lab/exemple.txt",
    text: "La redirection > crée le fichier ou écrase son contenu existant. Vérifiez le chemin avant de l’utiliser.",
  },
  {
    title: "Ajouter sans écraser",
    code: "printf 'Deuxième ligne\\n' >> /root/lab/exemple.txt",
    text: "La redirection >> ajoute la sortie à la fin du fichier.",
  },
  {
    title: "Continuer si tout va bien",
    code: "mkdir -p /root/lab/test && echo 'Prêt'",
    text: "&& lance la seconde commande uniquement si la première renvoie un code de succès (0).",
  },
  {
    title: "Prévoir une solution de repli",
    code: "test -f /root/lab/inconnu.txt || echo 'Fichier absent'",
    text: "|| lance la seconde commande seulement si la première échoue.",
  },
  {
    title: "Séparer les erreurs",
    code: "ls /chemin/inexistant 2> /root/lab/erreurs.txt",
    text: "2> redirige la sortie d’erreur. 2>&1 la regroupe avec la sortie standard.",
  },
  {
    title: "Utiliser une variable",
    code: "nom='Linux Lab'; printf 'Bonjour %s\\n' \"$nom\"",
    text: 'Pas d’espace autour de =. Entourez une expansion comme "$nom" de guillemets pour conserver les espaces.',
  },
  {
    title: "Créer un raccourci",
    code: "alias ll='ls -la'\nll",
    text: "Un alias personnalise votre session. Il est temporaire tant que vous ne l’ajoutez pas au fichier de configuration du shell.",
  },
];
export default function LearningHub({
  view,
  commands,
  meta,
  onTry,
  onCommand,
}: {
  view: "learning" | "bash" | "sources";
  commands: Command[];
  meta: CatalogueMeta | null;
  onTry: (code: string) => void;
  onCommand: (name: string) => void;
}) {
  const [track, setTrack] = useState("files");
  const [done, setDone] = useState<string[]>(() => {
    try {
      const d = JSON.parse(localStorage.getItem("linuxlab-progress") || "[]");
      return Array.isArray(d) ? d : [];
    } catch {
      return [];
    }
  });
  const mark = (id: string) => {
    const next = done.includes(id) ? done.filter(v => v !== id) : [...done, id];
    setDone(next);
    try {
      localStorage.setItem("linuxlab-progress", JSON.stringify(next));
    } catch {
      /* Nonessential local progress. */
    }
  };
  if (view === "sources")
    return (
      <>
        <div className="breadcrumb">
          <span>Linux Lab</span>
          <span>/</span>
          <strong>Sources & limites</strong>
        </div>
        <div className="section-page-heading">
          <div className="hero-eyebrow">TRANSPARENT, PAR CONCEPTION</div>
          <h1>
            Un laboratoire ouvert.
            <br />
            <span>Des limites claires.</span>
          </h1>
          <p>Comprendre ce que vous consultez et ce que vous exécutez.</p>
        </div>
        <div className="source-grid">
          <section className="resource-panel">
            <BookOpen className="resource-icon" size={25} />
            <h2>Un vaste catalogue, pas « toutes » les commandes.</h2>
            <p>
              Il n’existe pas de liste universelle finie de toutes les commandes
              Linux : elles varient selon la distribution, les logiciels et les
              scripts installés.
            </p>
            <p>
              Cette version rassemble{" "}
              <strong>
                {meta?.count.toLocaleString("fr-FR") || "—"} fiches
              </strong>{" "}
              pour Linux et les outils multiplateformes, avec{" "}
              <strong>
                {meta?.frenchCount.toLocaleString("fr-FR") || "—"} fiches en
                français
              </strong>
              . Les autres sont indiquées en anglais ; l’assistant peut les
              expliquer en français.
            </p>
            <p>
              Les catégories et niveaux sont des repères de navigation,
              attribués par règles. Les options présentées sont celles des
              exemples, pas toutes les options possibles.
            </p>
            <a
              className="text-link"
              href="https://github.com/tldr-pages/tldr"
              target="_blank"
              rel="noopener noreferrer"
            >
              tldr-pages sur GitHub <ExternalLink size={14} />
            </a>
            <p className="small-muted">
              Contenu tldr : {meta?.license || "licence en cours de chargement"}
              , par les contributeurs tldr-pages. Les attributions sont
              conservées dans les fiches et les sources. Le code de
              l’application est distinct.
            </p>
          </section>
          <section className="resource-panel">
            <Terminal className="resource-icon" size={25} />
            <h2>Vrai Linux, machine virtuelle légère.</h2>
            <p>
              v86 émule un ordinateur x86 en WebAssembly et démarre Linux
              Buildroot dans votre navigateur. Il ne s’agit pas d’une liste de
              réponses préenregistrées.
            </p>
            <p>
              Les utilitaires BusyBox et le shell ash permettent de travailler
              réellement sur les fichiers, les pipes et les permissions. Les
              options GNU peuvent différer. Bash, apt, systemd et les outils
              spécialisés ne sont pas garantis.
            </p>
            <CodeBlock
              code="busybox --list"
              onTry={onTry}
              label="Lister les utilitaires intégrés."
            />
            <p>
              Le réseau est volontairement désactivé. SSH, les téléchargements
              et les scans externes ne fonctionnent donc pas. Aucun shell du
              serveur ni fichier personnel de votre ordinateur n’est accessible.
            </p>
            <a
              className="text-link"
              href="https://github.com/copy/v86"
              target="_blank"
              rel="noopener noreferrer"
            >
              v86 · licence BSD-2-Clause <ExternalLink size={14} />
            </a>
            <p className="small-muted">
              Linux et BusyBox : licences GPL selon leurs composants. Buildroot
              : projet d’assemblage libre. Sources et licences disponibles
              auprès des projets d’origine.
            </p>
          </section>
          <section className="resource-panel">
            <Shield className="resource-icon" size={25} />
            <h2>Les précautions restent utiles.</h2>
            <p>
              Les fichiers du laboratoire sont temporaires : une
              réinitialisation ou la fermeture de l’onglet peut les faire
              disparaître. Le bouton × du panneau masque simplement la session.
            </p>
            <p>
              Une commande envoyée depuis une fiche est seulement insérée dans
              le terminal. Vous devez vérifier ses paramètres, puis appuyer sur
              Entrée. Cela évite d’exécuter aveuglément un exemple.
            </p>
            <p>
              Les favoris, le thème et les étapes terminées restent dans le
              stockage de ce navigateur. Les discussions avec l’assistant ne
              sont pas sauvegardées dans une base de données.
            </p>
            <div className="info-callout">
              <Info size={18} />
              <p>
                Les extraits SQLi du fichier d’origine ne sont pas listés comme
                des commandes Linux. Les outils de sécurité restent réservés aux
                tests explicitement autorisés.
              </p>
            </div>
          </section>
          <section className="resource-panel">
            <CheckCircle2 className="resource-icon" size={25} />
            <h2>Vérifiez avec le bon manuel.</h2>
            <p>
              Les fiches pratiques aident à démarrer. Pour les comportements
              exacts et toutes les options, suivez le lien de documentation de
              la fiche, ou lisez l’aide du programme installé.
            </p>
            <CodeBlock code="ls --help" onTry={onTry} />
            <p>
              <code>command -v nom</code> permet de vérifier si un programme est
              disponible. Une commande interne comme cd n’a pas nécessairement
              d’option --help dans tous les shells.
            </p>
            <p className="small-muted">
              Instantané du catalogue :{" "}
              {meta?.updatedAt
                ? new Date(meta.updatedAt).toLocaleDateString("fr-FR")
                : "en cours de chargement"}
              . La version est figée pour une documentation reproductible.
            </p>
          </section>
        </div>
      </>
    );
  if (view === "bash")
    return (
      <>
        <div className="breadcrumb">
          <span>Linux Lab</span>
          <span>/</span>
          <strong>Mémo Bash</strong>
        </div>
        <div className="section-page-heading">
          <div className="hero-eyebrow">
            LES PETITS SYMBOLES FONT LA DIFFÉRENCE
          </div>
          <h1>Le shell, sans les zones d’ombre.</h1>
          <p>
            Redirections, raccourcis et enchaînements. Les exemples ci-dessous
            fonctionnent aussi dans ash.
          </p>
        </div>
        <div className="shortcut-strip">
          {[
            { key: "Tab", text: "Compléter" },
            { key: "Ctrl C", text: "Interrompre" },
            { key: "Ctrl L", text: "Effacer l’écran" },
            { key: "↑ / ↓", text: "Historique" },
          ].map(item => (
            <span key={item.key}>
              <kbd>{item.key}</kbd>
              {item.text}
            </span>
          ))}
        </div>
        <div className="bash-grid">
          {tips.map((tip, i) => (
            <section className="resource-panel" key={tip.title}>
              <div className="section-kicker">
                {String(i + 1).padStart(2, "0")} / LE SHELL EN PRATIQUE
              </div>
              <h2>{tip.title}</h2>
              <p>{tip.text}</p>
              <CodeBlock code={tip.code} onTry={onTry} />
            </section>
          ))}
        </div>
        <div className="warning-callout">
          <Shield size={20} />
          <div>
            <strong>Trois habitudes à garder</strong>
            <p>
              Linux distingue les majuscules et les minuscules. rm ne passe
              généralement pas par une corbeille. ~ désigne le dossier personnel
              de l’utilisateur courant, pas un chemin fixe comme /home/kali.
            </p>
          </div>
        </div>
      </>
    );
  const selected = tracks.find(t => t.id === track)!;
  return (
    <>
      <div className="breadcrumb">
        <span>Linux Lab</span>
        <span>/</span>
        <strong>Parcours d’apprentissage</strong>
      </div>
      <div className="section-page-heading">
        <div className="hero-eyebrow">
          UN PEU DE THÉORIE. BEAUCOUP DE PRATIQUE.
        </div>
        <h1>
          Du premier <code>ls</code>
          <br />
          <span>aux bonnes habitudes.</span>
        </h1>
        <p>Trois parcours courts pour progresser sans vous disperser.</p>
      </div>
      <div className="track-grid">
        {tracks.map((t, i) => (
          <button
            key={t.id}
            className={`track-card ${track === t.id ? "active" : ""}`}
            onClick={() => setTrack(t.id)}
          >
            <span className="track-top">
              <t.icon size={22} />
              <small>PARCOURS {String(i + 1).padStart(2, "0")}</small>
              {done.includes(t.id) && <CheckCircle2 size={17} />}
            </span>
            <h2>{t.title}</h2>
            <p>{t.description}</p>
            <span>
              {t.names.length} commandes · Débutant <ArrowRight size={14} />
            </span>
          </button>
        ))}
      </div>
      <section className="resource-panel exercise-panel">
        <div className="exercise-heading">
          <div>
            <span className="section-kicker">VOTRE FEUILLE DE ROUTE</span>
            <h2>{selected.title}</h2>
          </div>
          <span className="progress-label">
            {done.length} / 3 parcours marqués terminés
          </span>
        </div>
        <p>
          Lisez les fiches, puis essayez l’exercice dans le terminal. Le
          laboratoire est temporaire et isolé.
        </p>
        <div className="learning-commands">
          {selected.names
            .filter(n => commands.some(c => c.name === n))
            .map((name, i) => (
              <button key={name} onClick={() => onCommand(name)}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <code>{name}</code>
                <ArrowRight size={13} />
              </button>
            ))}
        </div>
        <h3>À vous de jouer</h3>
        <CodeBlock
          code={selected.exercise}
          onTry={onTry}
          label="Plusieurs lignes : vérifiez le script avant de le lancer."
        />
        <div className="exercise-result">
          <CheckCircle2 size={17} />
          <div>
            <strong>Ce que vous devriez observer</strong>
            <p>{selected.effect}</p>
          </div>
        </div>
        <button
          className={
            done.includes(selected.id) ? "secondary-button" : "primary-button"
          }
          onClick={() => mark(selected.id)}
        >
          <Check size={15} />
          {done.includes(selected.id)
            ? "Parcours terminé — annuler"
            : "J’ai terminé cet exercice"}
        </button>
        <p className="small-muted">
          Progression déclarative : vous cochez l’exercice après l’avoir essayé.
          Pas de vérification automatique.
        </p>
      </section>
    </>
  );
}
