import {
  lazy,
  Suspense,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  Braces,
  ChevronDown,
  Code2,
  Command as CommandIcon,
  Database,
  FileText,
  Folder,
  FolderOpen,
  Globe,
  HardDrive,
  Heart,
  Info,
  Layers,
  LayoutGrid,
  ListFilter,
  Loader2,
  Menu,
  Moon,
  Search,
  Server,
  Shield,
  Sparkles,
  Star,
  Sun,
  Terminal,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import CommandDetail from "@/components/CommandDetail";
import LinuxAssistant from "@/components/LinuxAssistant";
import LearningHub from "@/components/LearningHub";
import {
  CATEGORIES,
  ESSENTIAL_NAMES,
  type CategoryId,
  type CatalogueMeta,
  type Command,
} from "@/lib/catalogue";
import { useTheme } from "@/contexts/ThemeContext";
const LinuxTerminal = lazy(() => import("@/components/LinuxTerminal"));
const categoryIcons: Record<CategoryId, LucideIcon> = {
  navigation: FolderOpen,
  files: Folder,
  text: FileText,
  permissions: Shield,
  network: Globe,
  system: Server,
  processes: Layers,
  packages: Database,
  shell: Braces,
  archives: HardDrive,
  development: Code2,
  security: Shield,
  other: LayoutGrid,
};
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
type View = "library" | "learning" | "bash" | "sources";
type LibraryFilter = "essentials" | "all" | "favorites";
export default function Home() {
  const [commands, setCommands] = useState<Command[]>([]);
  const [meta, setMeta] = useState<CatalogueMeta | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [view, setView] = useState<View>("library");
  const [filter, setFilter] = useState<LibraryFilter>("essentials");
  const [category, setCategory] = useState<CategoryId | "all">("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [level, setLevel] = useState("all");
  const [language, setLanguage] = useState("all");
  const [limit, setLimit] = useState(24);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const data = JSON.parse(
        localStorage.getItem("linuxlab-favorites") || "[]"
      );
      return Array.isArray(data) ? data.filter(v => typeof v === "string") : [];
    } catch {
      return [];
    }
  });
  const [selected, setSelected] = useState<Command | null>(null);
  const [assistantCommand, setAssistantCommand] = useState<Command | null>(
    null
  );
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalMounted, setTerminalMounted] = useState(false);
  const [insertCommand, setInsertCommand] = useState<{
    text: string;
    nonce: number;
  }>();
  const [terminalOutput, setTerminalOutput] = useState("");
  const receiveTerminalOutput = useCallback(
    (text: string) =>
      setTerminalOutput(previous => (previous + text).slice(-10000)),
    []
  );
  const [mobileNav, setMobileNav] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { theme, mode, setMode } = useTheme();
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");
    Promise.all([
      fetch("/data/commands.json", { signal: controller.signal }).then(r => {
        if (!r.ok) throw new Error("Le catalogue n’a pas pu être chargé.");
        return r.json();
      }),
      fetch("/data/catalogue-meta.json", { signal: controller.signal }).then(
        r => {
          if (!r.ok)
            throw new Error(
              "Les informations du catalogue sont indisponibles."
            );
          return r.json();
        }
      ),
    ])
      .then(([data, metadata]) => {
        if (!Array.isArray(data) || !data.length)
          throw new Error("Le catalogue est vide.");
        setCommands(data);
        setMeta(metadata);
        setLoading(false);
      })
      .catch(e => {
        if (!controller.signal.aborted) {
          setLoadError(e.message);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [retry]);
  useEffect(() => {
    try {
      localStorage.setItem("linuxlab-favorites", JSON.stringify(favorites));
    } catch {
      /* Local settings are optional. */
    }
  }, [favorites]);
  useEffect(() => {
    setLimit(24);
  }, [deferredQuery, category, level, language, filter]);
  useEffect(() => {
    const keyboard = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setView("library");
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        setMobileNav(false);
        if (!selected && !assistantOpen) setTerminalOpen(false);
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [selected, assistantOpen]);
  const searchIndex = useMemo(
    () =>
      commands.map(command => ({
        command,
        text: normalize(
          [
            command.name,
            command.description,
            ...command.details,
            command.category,
            CATEGORIES.find(c => c.id === command.category)?.label,
            ...command.keywords,
            ...command.options.map(o => `${o.flag} ${o.description}`),
            ...command.examples.map(e => `${e.code} ${e.description}`),
          ].join(" ")
        ),
      })),
    [commands]
  );
  const results = useMemo(() => {
    const terms = normalize(deferredQuery.trim()).split(/\s+/).filter(Boolean);
    const filtered = searchIndex
      .filter(
        ({ command: c, text }) =>
          (filter !== "essentials" || ESSENTIAL_NAMES.includes(c.name)) &&
          (filter !== "favorites" || favorites.includes(c.id)) &&
          (category === "all" || c.category === category) &&
          (level === "all" || c.level === level) &&
          (language === "all" || c.language === language) &&
          terms.every(term => text.includes(term))
      )
      .map(i => i.command);
    if (filter === "essentials" && !terms.length)
      return filtered.sort(
        (a, b) =>
          ESSENTIAL_NAMES.indexOf(a.name) - ESSENTIAL_NAMES.indexOf(b.name)
      );
    if (terms.length)
      return filtered.sort(
        (a, b) =>
          Number(normalize(b.name) === normalize(deferredQuery)) -
            Number(normalize(a.name) === normalize(deferredQuery)) ||
          Number(normalize(b.name).startsWith(terms[0])) -
            Number(normalize(a.name).startsWith(terms[0])) ||
          a.name.localeCompare(b.name)
      );
    return filtered;
  }, [
    searchIndex,
    deferredQuery,
    filter,
    category,
    level,
    language,
    favorites,
  ]);
  const counts = useMemo(
    () =>
      commands.reduce(
        (acc, c) => {
          acc[c.category] = (acc[c.category] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    [commands]
  );
  const num = (value?: number) =>
    value === undefined ? "—" : value.toLocaleString("fr-FR");
  const favorite = (id: string) =>
    setFavorites(prev =>
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  const navigate = (next: View) => {
    setView(next);
    setMobileNav(false);
    contentRef.current?.scrollTo({ top: 0 });
  };
  const resetFilters = () => {
    setQuery("");
    setCategory("all");
    setLevel("all");
    setLanguage("all");
    setFilter("all");
  };
  const pickCategory = (id: CategoryId | "all") => {
    setCategory(id);
    setFilter("all");
    setQuery("");
    navigate("library");
  };
  const openTerminal = (text?: string) => {
    setSelected(null);
    setTerminalMounted(true);
    setTerminalOpen(true);
    if (text) {
      setInsertCommand({ text, nonce: Date.now() });
      toast("Commande préparée : vérifiez-la, puis appuyez sur Entrée.");
    }
  };
  const related = (name: string) => {
    const cmd = commands.find(c => c.name === name || c.id === name);
    if (cmd) setSelected(cmd);
    else {
      setSelected(null);
      setQuery(name);
      setFilter("all");
      navigate("library");
    }
  };
  const ask = (command: Command | null = null) => {
    setAssistantCommand(command);
    setSelected(null);
    setAssistantOpen(true);
  };
  const activeCategory = CATEGORIES.find(c => c.id === category);
  return (
    <div className="lab-app">
      <a href="#main-content" className="skip-link">
        Aller au contenu
      </a>
      {mobileNav && (
        <button
          className="nav-backdrop"
          aria-label="Fermer le menu"
          onClick={() => setMobileNav(false)}
        />
      )}
      <aside
        className={`sidebar ${mobileNav ? "mobile-open" : ""}`}
        aria-label="Navigation principale"
      >
        <button
          className="brand"
          onClick={() => {
            setCategory("all");
            setFilter("essentials");
            setQuery("");
            navigate("library");
          }}
        >
          <span className="brand-mark">
            <Terminal size={24} strokeWidth={2} />
          </span>
          <span>
            linux<span className="brand-accent">lab</span>
            <small>COMPRENDRE. TESTER. MAÎTRISER.</small>
          </span>
        </button>
        <div className="side-scroll">
          <span className="side-label">VOTRE ESPACE</span>
          <nav className="main-nav">
            <button
              className={
                view === "library" && filter !== "favorites" ? "active" : ""
              }
              onClick={() => {
                setCategory("all");
                setFilter("essentials");
                setQuery("");
                navigate("library");
              }}
            >
              <BookOpen size={17} /> Bibliothèque
              <span className="nav-count">{num(meta?.count)}</span>
            </button>
            <button
              className={
                filter === "favorites" && view === "library" ? "active" : ""
              }
              onClick={() => {
                resetFilters();
                setFilter("favorites");
                navigate("library");
              }}
            >
              <Star size={17} /> Mes favoris
              <span className="nav-count">{favorites.length}</span>
            </button>
            <button
              className={view === "learning" ? "active" : ""}
              onClick={() => navigate("learning")}
            >
              <Layers size={17} /> Parcours d’apprentissage
              <span className="new-dot" />
            </button>
          </nav>
          <div className="side-label category-label">
            EXPLORER PAR CATÉGORIE
          </div>
          <nav className="category-nav">
            {CATEGORIES.map(item => {
              const Icon = categoryIcons[item.id];
              return (
                <button
                  key={item.id}
                  className={
                    category === item.id && view === "library" ? "active" : ""
                  }
                  onClick={() => pickCategory(item.id)}
                >
                  <Icon size={15} />
                  <span>{item.label}</span>
                  <small>{num(counts[item.id])}</small>
                </button>
              );
            })}
          </nav>
          <div className="side-label category-label">LES OUTILS DU LAB</div>
          <nav className="main-nav">
            <button onClick={() => openTerminal()}>
              <Terminal size={17} /> Terminal Linux
              <span className="mini-live" />
            </button>
            <button
              className={view === "bash" ? "active" : ""}
              onClick={() => navigate("bash")}
            >
              <CommandIcon size={17} /> Mémo Bash
            </button>
            <button
              className={view === "sources" ? "active" : ""}
              onClick={() => navigate("sources")}
            >
              <Info size={17} /> Sources & limites
            </button>
          </nav>
        </div>
        <div className="side-bottom">
          <span className="status-dot" />
          <span>LE SAVOIR EST OPEN SOURCE.</span>
          <a
            href="https://github.com/tldr-pages/tldr"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Projet tldr open source"
          >
            <ArrowRight size={14} />
          </a>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            aria-label="Ouvrir le menu"
            onClick={() => setMobileNav(true)}
          >
            <Menu size={21} />
          </button>
          <div className="global-search">
            <Search size={17} />
            <input
              ref={searchRef}
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                setFilter("all");
                setView("library");
              }}
              placeholder="Rechercher une commande, une option, une idée…"
              aria-label="Rechercher dans toutes les commandes"
            />
            {query ? (
              <button
                className="icon-button"
                aria-label="Effacer la recherche"
                onClick={() => setQuery("")}
              >
                <X size={14} />
              </button>
            ) : (
              <kbd>Ctrl K</kbd>
            )}
          </div>
          <div className="topbar-actions">
            <label className="theme-picker" title="Choisir le thème">
              {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
              <select
                aria-label="Choisir le thème"
                value={mode}
                onChange={e =>
                  setMode(e.target.value as "dark" | "light" | "system")
                }
              >
                <option value="dark">Sombre</option>
                <option value="light">Clair</option>
                <option value="system">Système</option>
              </select>
              <ChevronDown size={12} />
            </label>
            <span className="top-divider" />
            <button className="terminal-button" onClick={() => openTerminal()}>
              <Terminal size={16} />
              <span>Ouvrir le terminal</span>
              <span className="status-dot" />
            </button>
          </div>
        </header>
        <div className="main-scroll" ref={contentRef}>
          <main id="main-content" className="main-content">
            {view === "library" ? (
              <>
                <div className="breadcrumb">
                  <span>Linux Lab</span>
                  <span>/</span>
                  <strong>
                    {filter === "favorites"
                      ? "Mes favoris"
                      : activeCategory?.label || "Bibliothèque"}
                  </strong>
                  <span className="version-label">
                    RÉFÉRENCE INTERACTIVE / V.4
                  </span>
                </div>
                {!query && category === "all" && filter !== "favorites" && (
                  <section className="hero">
                    <div className="hero-copy">
                      <div className="hero-eyebrow">
                        <span className="status-dot" /> LE MANUEL QUI SE
                        PRATIQUE.
                      </div>
                      <h1>
                        Moins de mémorisation.
                        <br />
                        <span>Plus de maîtrise.</span>
                      </h1>
                      <p>
                        Explorez les commandes Linux, comprenez chaque option
                        <br className="desktop-break" /> et passez de la théorie
                        au terminal.
                      </p>
                      <div className="hero-facts">
                        <span>
                          <BookOpen size={14} />
                          <strong>{num(meta?.count)}</strong> fiches
                        </span>
                        <span>
                          <Code2 size={14} />
                          <strong>{num(meta?.examplesCount)}</strong> exemples
                        </span>
                        <button onClick={() => navigate("sources")}>
                          <Shield size={14} />
                          Sources ouvertes
                          <span className="fact-info">
                            <Info size={11} />
                          </span>
                        </button>
                      </div>
                    </div>
                    <div
                      className="hero-terminal"
                      aria-label="Exemple de session Linux, illustration"
                    >
                      <div className="mini-terminal-bar">
                        <span className="window-dots">
                          <i />
                          <i />
                          <i />
                        </span>
                        <span>linuxlab — exemple de session</span>
                        <span>~/lab</span>
                      </div>
                      <div className="mini-terminal-code">
                        <div>
                          <span className="prompt-user">user@linuxlab</span>
                          <span className="prompt-path">:~/lab</span>
                          <span> $ </span>ls -la
                        </div>
                        <div className="terminal-muted">total 12</div>
                        <div>
                          <span className="terminal-muted">drwxr-xr-x</span>{" "}
                          <span className="prompt-path">documents/</span>
                        </div>
                        <div>
                          <span className="terminal-muted">-rw-r--r--</span>{" "}
                          notes.txt
                        </div>
                        <div>
                          <span className="prompt-user">user@linuxlab</span>
                          <span className="prompt-path">:~/lab</span>
                          <span> $ </span>
                          <span className="block-cursor" />
                        </div>
                      </div>
                      <button onClick={() => openTerminal()}>
                        <span>
                          <Zap size={13} /> Un vrai Linux. Dans votre
                          navigateur.
                        </span>
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  </section>
                )}
                {filter === "favorites" && (
                  <div className="section-page-heading">
                    <div className="hero-eyebrow">VOTRE MÉMO PERSONNEL</div>
                    <h1>Vos commandes, à portée de main.</h1>
                    <p>Les favoris sont enregistrés dans ce navigateur.</p>
                  </div>
                )}
                {category !== "all" && (
                  <div className="section-page-heading">
                    <div className="hero-eyebrow">EXPLORER LES COMMANDES</div>
                    <h1>{activeCategory?.label}</h1>
                    <p>{activeCategory?.description}</p>
                  </div>
                )}
                <section
                  className="catalogue-section"
                  aria-label="Catalogue de commandes"
                >
                  <div className="library-heading">
                    <div>
                      <h2>
                        {query
                          ? "Résultats de recherche"
                          : filter === "favorites"
                            ? "Mes favoris"
                            : category !== "all"
                              ? "Les commandes à connaître"
                              : "Votre prochaine commande commence ici."}
                      </h2>
                      <p>
                        {query
                          ? `Recherche dans le catalogue complet pour « ${query} ».`
                          : "Une fiche, des exemples, puis à vous de jouer."}
                      </p>
                    </div>
                    <button className="assistant-trigger" onClick={() => ask()}>
                      <Sparkles size={15} />
                      <span>Besoin d’une explication ?</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                  <div className="filter-bar">
                    <div
                      className="filter-tabs"
                      role="group"
                      aria-label="Filtrer le catalogue"
                    >
                      <button
                        className={filter === "essentials" ? "active" : ""}
                        onClick={() => {
                          resetFilters();
                          setFilter("essentials");
                        }}
                      >
                        <Zap size={13} /> Essentielles
                      </button>
                      <button
                        className={filter === "all" ? "active" : ""}
                        onClick={() => setFilter("all")}
                      >
                        <LayoutGrid size={13} /> Toutes les commandes
                      </button>
                      <button
                        className={filter === "favorites" ? "active" : ""}
                        onClick={() => setFilter("favorites")}
                      >
                        <Star size={13} /> Favoris
                      </button>
                    </div>
                    <div className="filter-selects">
                      <ListFilter size={14} />
                      <select
                        aria-label="Filtrer par niveau"
                        value={level}
                        onChange={e => setLevel(e.target.value)}
                      >
                        <option value="all">Tous les niveaux</option>
                        <option>Débutant</option>
                        <option>Intermédiaire</option>
                        <option>Avancé</option>
                      </select>
                      <select
                        aria-label="Filtrer par langue"
                        value={language}
                        onChange={e => setLanguage(e.target.value)}
                      >
                        <option value="all">Toutes les langues</option>
                        <option value="fr">Français</option>
                        <option value="en">Anglais</option>
                      </select>
                    </div>
                  </div>
                  <div className="results-meta">
                    <span>
                      {loading
                        ? "Chargement du catalogue…"
                        : `${num(results.length)} commande${results.length !== 1 ? "s" : ""}`}
                      {category !== "all" && (
                        <button onClick={() => setCategory("all")}>
                          {activeCategory?.label}
                          <X size={11} />
                        </button>
                      )}
                    </span>
                    <span className="cards-hint">
                      <BookOpen size={12} /> Cliquez pour comprendre, testez
                      pour retenir.
                    </span>
                  </div>
                  {loadError ? (
                    <div className="empty-state" role="alert">
                      <Info size={28} />
                      <h3>Le catalogue n’est pas disponible.</h3>
                      <p>{loadError}</p>
                      <button
                        className="secondary-button"
                        onClick={() => setRetry(v => v + 1)}
                      >
                        Réessayer
                      </button>
                    </div>
                  ) : loading ? (
                    <div className="command-grid">
                      {Array.from({ length: 6 }, (_, i) => (
                        <div className="skeleton-card" key={i}>
                          <div />
                          <div />
                          <div />
                        </div>
                      ))}
                    </div>
                  ) : results.length ? (
                    <div className="command-grid">
                      {results.slice(0, limit).map(command => {
                        const Icon = categoryIcons[command.category];
                        const saved = favorites.includes(command.id);
                        return (
                          <article
                            key={command.id}
                            className={`command-card cat-${command.category} ${command.dangerous ? "dangerous" : ""}`}
                          >
                            <button
                              className={`card-favorite ${saved ? "saved" : ""}`}
                              onClick={() => favorite(command.id)}
                              aria-pressed={saved}
                              aria-label={
                                saved
                                  ? `Retirer ${command.name} des favoris`
                                  : `Ajouter ${command.name} aux favoris`
                              }
                            >
                              <Star
                                size={15}
                                fill={saved ? "currentColor" : "none"}
                              />
                            </button>
                            <button
                              className="card-content"
                              onClick={() => {
                                setSelected(command);
                                setAssistantCommand(command);
                              }}
                            >
                              <div className="card-category">
                                <Icon size={12} />
                                <span>
                                  {
                                    CATEGORIES.find(
                                      c => c.id === command.category
                                    )?.label
                                  }
                                </span>
                                {command.language === "en" && (
                                  <span className="card-language">EN</span>
                                )}
                              </div>
                              <h3>{command.name}</h3>
                              <p>{command.description}</p>
                              <div className="card-preview">
                                <span>$</span>
                                <code>
                                  {command.examples[0]?.code || command.syntax}
                                </code>
                              </div>
                              <div className="card-footer">
                                <span
                                  className={`card-level ${command.dangerous ? "risk" : ""}`}
                                >
                                  <i />
                                  {command.dangerous
                                    ? "À utiliser avec précaution"
                                    : command.level}
                                </span>
                                <span className="card-examples">
                                  {command.examples.length} exemples{" "}
                                  <ArrowRight size={13} />
                                </span>
                              </div>
                            </button>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <Search size={30} />
                      <h3>
                        {filter === "favorites"
                          ? "Votre premier favori vous attend."
                          : "Aucune commande ne correspond."}
                      </h3>
                      <p>
                        {filter === "favorites"
                          ? "Cliquez sur l’étoile d’une fiche pour la retrouver ici."
                          : "Essayez un nom de commande ou retirez un filtre."}
                      </p>
                      <button
                        className="secondary-button"
                        onClick={resetFilters}
                      >
                        Explorer toutes les commandes
                      </button>
                    </div>
                  )}
                  {results.length > limit && (
                    <button
                      className="load-more"
                      onClick={() => setLimit(v => v + 36)}
                    >
                      Afficher 36 commandes de plus <ArrowDown size={14} />
                      <span>
                        {num(Math.min(limit, results.length))} /{" "}
                        {num(results.length)}
                      </span>
                    </button>
                  )}
                </section>
                <div className="practice-banner">
                  <span className="practice-icon">
                    <Terminal size={24} />
                  </span>
                  <div>
                    <h3>La meilleure façon d’apprendre ? Essayer.</h3>
                    <p>
                      Un laboratoire Linux isolé, sans installation et sans
                      risque pour votre ordinateur.
                    </p>
                  </div>
                  <button
                    className="secondary-button"
                    onClick={() => openTerminal()}
                  >
                    Lancer le laboratoire <ArrowRight size={15} />
                  </button>
                </div>
              </>
            ) : (
              <LearningHub
                view={view}
                commands={commands}
                meta={meta}
                onTry={code => openTerminal(code)}
                onCommand={related}
              />
            )}
            <footer className="site-footer">
              <span>
                linux<span>lab</span> <i> / </i> Comprendre avant d’exécuter.
              </span>
              <button onClick={() => navigate("sources")}>
                Propulsé par tldr & v86 <ArrowRight size={12} />
              </button>
              <span>
                Fichiers locaux · Aucune commande sur votre ordinateur
              </span>
            </footer>
          </main>
        </div>
      </div>
      <CommandDetail
        key={selected?.id || "closed"}
        command={selected}
        onClose={() => setSelected(null)}
        isFavorite={!!selected && favorites.includes(selected.id)}
        onFavorite={favorite}
        onTry={code => openTerminal(code)}
        onRelated={related}
        onAsk={() => ask(selected)}
      />
      <LinuxAssistant
        open={assistantOpen}
        onOpenChange={setAssistantOpen}
        command={assistantCommand}
        terminalOutput={terminalOutput}
      />
      {terminalMounted && (
        <section
          className={`terminal-dock ${terminalOpen ? "open" : ""}`}
          style={{ display: terminalOpen ? "flex" : "none" }}
          aria-label="Laboratoire Linux"
        >
          <div className="dock-title">
            <span>
              <Terminal size={15} /> LABORATOIRE LINUX{" "}
              <small>ISOLÉ DANS LE NAVIGATEUR</small>
            </span>
            <div>
              <button
                className="icon-button"
                aria-label="Demander de l’aide pour le terminal"
                title="Demander de l’aide"
                onClick={() => ask()}
              >
                <Sparkles size={16} />
              </button>
              <button
                className="icon-button"
                aria-label="Masquer le terminal sans l’arrêter"
                title="Masquer — la session est conservée"
                onClick={() => setTerminalOpen(false)}
              >
                <X size={19} />
              </button>
            </div>
          </div>
          <Suspense
            fallback={
              <div className="terminal-loading">
                <Loader2 size={22} className="spin" /> Chargement du terminal
                open source…
              </div>
            }
          >
            <LinuxTerminal
              insertCommand={insertCommand}
              onOutput={receiveTerminalOutput}
            />
          </Suspense>
        </section>
      )}
    </div>
  );
}
