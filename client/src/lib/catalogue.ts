export type CategoryId =
  | 'navigation'
  | 'files'
  | 'text'
  | 'permissions'
  | 'network'
  | 'system'
  | 'processes'
  | 'packages'
  | 'shell'
  | 'archives'
  | 'development'
  | 'security'
  | 'other';

export type Command = {
  id: string;
  name: string;
  description: string;
  details: string[];
  category: CategoryId;
  level: 'Débutant' | 'Intermédiaire' | 'Avancé';
  language: 'fr' | 'en';
  syntax: string;
  examples: { description: string; code: string }[];
  options: { flag: string; description: string }[];
  related: string[];
  dangerous: boolean;
  source: string;
  manualUrl: string;
  prerequisites: string[];
  keywords: string[];
};

export type CatalogueMeta = {
  count: number;
  frenchCount: number;
  examplesCount: number;
  updatedAt: string;
  commit: string;
  source: string;
  license: string;
};

export const CATEGORIES: { id: CategoryId; label: string; description: string }[] = [
  { id: 'navigation', label: 'Navigation', description: 'Se repérer et parcourir les répertoires.' },
  { id: 'files', label: 'Fichiers', description: 'Créer, rechercher, copier et gérer les fichiers.' },
  { id: 'text', label: 'Texte et édition', description: 'Lire, filtrer, transformer et éditer du texte.' },
  { id: 'permissions', label: 'Permissions', description: 'Comprendre les droits et les propriétaires.' },
  { id: 'network', label: 'Réseau', description: 'Connexions, transferts et diagnostics réseau.' },
  { id: 'system', label: 'Système', description: 'Matériel, stockage, utilisateurs et administration Linux.' },
  { id: 'processes', label: 'Processus et services', description: 'Observer les processus et gérer les services.' },
  { id: 'packages', label: 'Paquets', description: 'Installer et gérer logiciels et dépendances.' },
  { id: 'shell', label: 'Shell et scripts', description: 'Interpréteurs, variables et outils du terminal.' },
  { id: 'archives', label: 'Archives', description: 'Archiver, compresser et extraire les fichiers.' },
  { id: 'development', label: 'Développement', description: 'Code, compilation, versions, conteneurs et outils développeur.' },
  { id: 'security', label: 'Sécurité', description: 'Chiffrement et audits sur des systèmes autorisés.' },
  { id: 'other', label: 'Autres outils', description: 'Commandes non classées par les règles explicites du catalogue.' },
];

export const ESSENTIAL_NAMES = ['pwd', 'ls', 'cd', 'mkdir', 'touch', 'cat', 'cp', 'mv', 'rm', 'grep', 'find', 'chmod'];
