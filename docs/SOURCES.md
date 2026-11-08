# Sources et provenance du catalogue LinuxLab

## Corpus tldr figé

Le catalogue est une adaptation structurée des pages du projet [tldr-pages](https://github.com/tldr-pages/tldr), créées par [l’équipe tldr-pages](https://github.com/orgs/tldr-pages/people) et ses [contributeurs](https://github.com/tldr-pages/tldr/graphs/contributors).

- Commit utilisé : [`ed1f496b347fa32446122aa56e254431e2b50fa0`](https://github.com/tldr-pages/tldr/tree/ed1f496b347fa32446122aa56e254431e2b50fa0).
- Date du commit : `2026-11-08T06:56:49Z`. Le champ `updatedAt` désigne cette date de référence amont, et non la date de consultation ou une mise à jour automatique.
- [Archive GitHub reproductible](https://codeload.github.com/tldr-pages/tldr/tar.gz/ed1f496b347fa32446122aa56e254431e2b50fa0).
- SHA-256 de l’archive téléchargée : `e21fa0837c123872ffaf615fab35c6ffb50c7aa47f4610c8177b15ffb88da4c7`.
- Corpus anglais : toutes les pages Markdown de `pages/common` et `pages/linux`, soit 6 822 pages avant dédoublonnage et 6 786 identifiants distincts après 36 remplacements commun/Linux.
- Aucun répertoire de plateforme `osx`, `windows`, `android`, `freebsd`, etc. n’est importé. Une page classée `common` reste incluse même si sa documentation mentionne d’autres plateformes ; cette inclusion ne garantit pas qu’un outil soit préinstallé sur Linux.

Chaque fiche possède un lien `source` vers le fichier réellement utilisé dans ce commit, avec le chemin encodé en URL. Le champ `manualUrl` reprend le lien indiqué par « More information » ou « Plus d’informations » dans tldr ; à défaut, il reprend `source`. Ces liens peuvent viser un manuel officiel, une documentation de projet ou un site de pages de manuel tiers : ils ne sont pas tous présentés comme officiels. Le contrôle vérifie la syntaxe HTTP(S) et l’existence de chaque fichier source dans l’archive, pas la disponibilité actuelle de tous les sites externes.

## Licence : CC BY 4.0, pas CC BY-SA

La [licence présente au commit importé](https://github.com/tldr-pages/tldr/blob/ed1f496b347fa32446122aa56e254431e2b50fa0/LICENSE.md) indique explicitement : **Creative Commons Attribution 4.0 International (CC BY 4.0)**, copyright © 2014–present tldr-pages team and contributors. Le contenu tldr est donc attribué à ses auteurs et utilisé sous [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). La valeur technique des métadonnées est `CC-BY-4.0`.

La mention CC-BY-SA ne correspond pas à cette version vérifiée : aucune obligation de partage à l’identique n’est déduite à tort. Il faut conserver l’attribution, le lien vers la licence et l’indication des adaptations lors d’une redistribution. Cette page et les liens individuels du catalogue fournissent la provenance. Les adaptations effectuées sont le parsing en JSON, l’allègement du balisage Markdown, la conversion des gabarits d’exemples, la classification et l’ajout des exemples utilisateur décrits ci-dessous.

Les scripts amont présents dans le répertoire `scripts/` du dépôt tldr sont sous MIT, comme indiqué dans sa licence. Aucun de ces scripts n’a été copié : `scripts/import-catalogue.py` est un importateur propre à LinuxLab utilisant uniquement la bibliothèque standard Python. La licence des pages ne constitue pas une licence générale pour tout le code de l’application.

## Français : disponibilité réelle, sans traduction inventée

Le catalogue contient **903 fiches dont la page principale est française**, signalées par `language: "fr"`. Les autres fiches conservent leur description et leurs exemples tldr anglais, avec `language: "en"`. Aucune traduction automatique ni appel LLM n’a été utilisé.

La sélection dédoublonne d’abord les identifiants avec préférence pour la page Linux. La traduction `pages.fr/linux` ou `pages.fr/common` correspondant à la page retenue est préférée lorsqu’elle existe. Dans six cas où la page Linux n’a pas de traduction mais où une page commune française existe (`at`, `cat`, `df`, `mktemp`, `rename`, `renice`), cette véritable page française commune devient la source principale ; une note dans `details` signale la page Linux anglaise distincte. Cette règle explicite privilégie une documentation française authentique sans prétendre que la traduction commune couvre toutes les spécificités Linux.

Parmi les douze commandes essentielles, `pwd`, `ls`, `cd`, `mkdir`, `cat`, `cp`, `grep`, `find` et `chmod` utilisent de vraies pages françaises. **`touch`, `mv` et `rm` restent en anglais**, aucune page française commune/Linux correspondante n’étant disponible dans le commit retenu. Les avertissements ajoutés par LinuxLab et les exemples fournis par l’utilisateur peuvent être en français dans une fiche anglaise : `language` et `frenchCount` désignent la langue de la source principale, pas une garantie de traduction intégrale de tous les champs.

## Source fournie par l’utilisateur

La source initiale est `pasted_content.txt`, une cheat-sheet HTML fournie pour ce projet. Son SHA-256 est `962a4b06754236e6b8b196fe20cc78adbabb4de34f6e08416c1c9c5ebb2101e9`. Ses 184 objets de données ont été extraits sans exécuter le JavaScript et conservés dans `docs/user-examples.json`, un petit instantané de provenance permettant une reproduction indépendante du fichier téléchargé initialement. Aucun HTML, CSS ni code d’interface de cette source n’est utilisé par l’importateur.

Les exemples complets sont rattachés aux commandes ou sous-commandes déjà présentes dans tldr. Le champ `example` est préféré ; s’il contient seulement une sortie, une flèche ou une option isolée, le champ `cmd` peut être retenu uniquement lorsqu’il constitue lui-même une commande complète. Aucun fragment n’est complété par invention. Les doublons exacts ne sont pas réimportés. Ce traitement fournit **125 exemples supplémentaires** dans le catalogue final ; 150 exemples distincts étaient éligibles dans l’instantané, dont 25 figuraient déjà dans les exemples tldr convertis. Les descriptions utiles d’origine sont conservées.

La source utilisateur ne comporte pas de déclaration de licence. Ses droits ne sont donc pas attribués automatiquement à tldr ni réputés couverts par CC BY 4.0 : la valeur `license` des métadonnées concerne le corpus tldr. Pour une redistribution indépendante des ajouts utilisateur, vérifier que l’autorisation sur la source utilisateur couvre cet usage.

### Exclusions documentées

Les **neuf entrées `sqlmap-payloads`**, telles que les suffixes URL de test SQL, conditions SQL, commentaires et fragments `UNION` ou `SLEEP`, ne sont **pas des commandes Linux**. Elles ne créent aucune fiche et ne sont importées dans aucun exemple du catalogue. Elles ne subsistent que dans l’instantané brut de provenance ; aucune affirmation de vulnérabilité tirée de ces fragments n’est reprise.

Onze autres entrées sont exclues comme fragments, sorties ou constructions incomplètes, notamment le shebang seul, l’affectation isolée, les boucles et conditions sans corps ni terminaison et les opérateurs de comparaison sans commande complète. Quatorze doublons de la source utilisateur sont supprimés. Les commandes complètes `sqlmap …` restent des exemples d’un outil Linux, et non des fragments de payload URL. Les outils d’audit portent un préalable d’autorisation explicite ; leurs exemples ne sont jamais exécutés par l’importateur.

### Corrections factuelles simples

- `echo` affiche ses arguments sur la sortie standard ; il n’écrit dans un fichier qu’avec une redirection, par exemple `>` ou `>>`.
- `uniq` ne supprime ou ne sélectionne que les répétitions **adjacentes** ; `sort … | uniq` regroupe d’abord les lignes identiques.
- Un shebang choisit l’interpréteur lors de l’exécution directe d’un script. Il n’est pas obligatoire pour `bash fichier.sh`.
- `~` désigne le répertoire personnel de l’utilisateur courant, habituellement déterminé par `HOME`, et non toujours `/home/kali`.
- `export` transmet une variable aux processus enfants du shell ; ce n’est pas une variable globale de toute la machine.
- `apt upgrade` met à jour les paquets installés selon les dépôts configurés, pas nécessairement tous les programmes de la machine.
- `sqlmap --batch` utilise les réponses par défaut, pas systématiquement « yes ».
- `nmap -A` active la détection OS/versions, les scripts par défaut et traceroute ; il ne signifie pas que tous les ports ou toutes les possibilités de scan sont exhaustivement couverts.

## Transformations déterministes

La catégorie repose exclusivement sur des listes de noms et expressions régulières de préfixes explicites, visibles dans l’importateur. Un outil inconnu est classé dans `other` (5 064 fiches dans cet instantané), sans jugement manuel fondé sur sa description. Les niveaux sont indicatifs : liste explicite de commandes débutantes ; sécurité et administration sélectionnée en avancé ; intermédiaire sinon. Le champ `dangerous` est un avertissement fondé sur les noms et certains motifs destructifs connus, pas une preuve qu’un exemple est sûr lorsqu’il vaut `false`.

Les sous-commandes gardent leur identifiant stable, par exemple `git-commit` pour `git commit`. Vingt-trois variantes homonymes de tldr (`just.1`, `mc.fm`, etc.) portent un suffixe de désambiguïsation dans leur nom affiché, sans changement de leur véritable syntaxe ou de leurs exemples. Les relations ne pointent que vers des identifiants connus, par correspondances explicites ou par famille de commande ; elles sont plafonnées et ne prétendent pas être exhaustives.

Le premier exemple fournit `syntax` : il s’agit d’une **forme illustrée**, pas d’une grammaire complète de tous les arguments. Les doubles accolades de tldr sont retirées. Les alias `{{[-a|--all]}}` et `{{[a|address]}}` prennent leur première forme dans le code illustré ; les autres valeurs alternatives deviennent un choix visible tel que `[up / down]`. Les chemins, valeurs fictives et marques `...` restent volontairement éditables. Des exemples ne sont donc pas prêts à exécuter tels quels ; l’utilisateur doit choisir ou remplacer les paramètres nécessaires.

Les `options` sont des **options illustrées**, pas une liste exhaustive ni un extrait garanti du manuel. Un flag littéral ou un alias présent dans un exemple est associé exactement à la prose de cet exemple. Une même option peut apparaître avec plusieurs descriptions d’usage ; les options courtes groupées ne sont pas artificiellement décomposées. Cette extraction lexicale n’est pas un parseur universel de toutes les syntaxes CLI.

Les descriptions et exemples restent des chaînes de texte. À la sérialisation, `<`, `>`, `&` et les séparateurs Unicode sensibles sont encodés en échappements JSON ; un `JSON.parse` les restaure sans exécuter de HTML. L’interface doit continuer à rendre ces chaînes comme du texte React, jamais avec `dangerouslySetInnerHTML`. Aucun exemple, URL ou fragment de la source n’est exécuté lors de l’import.

## Reproduire ou mettre à jour

Depuis la racine du projet, avec Python 3.10 ou ultérieur et sans dépendances externes :

```sh
python3 scripts/import-catalogue.py
```

L’importateur télécharge par défaut l’archive du commit figé, la lit directement en mémoire et supprime ses fichiers temporaires. Aucune extraction de l’arbre tldr n’est effectuée dans le projet. Il génère `client/public/data/commands.json`, `client/public/data/commands.json.gz` et `client/public/data/catalogue-meta.json` à partir des pages tldr et de `docs/user-examples.json`.

La sortie gzip utilise le niveau de compression 9, `mtime=0` et un nom de fichier vide dans l’en-tête, pour une compression reproductible indépendante du chemin et de la date. Elle représente 1 687 590 octets (1,609 Mio), contre 15 172 613 octets de JSON brut. La décompression restaure exactement les octets de `commands.json` et deux compressions successives sont identiques. Ce fichier peut être servi au même point d’accès JSON avec `Content-Encoding: gzip` lorsque le client accepte ce codage ; sa génération ne modifie pas elle-même les routes serveur.

Pour utiliser une archive locale, dont la racine doit correspondre au commit demandé :

```sh
python3 scripts/import-catalogue.py --archive /tmp/tldr-ed1f496b347fa32446122aa56e254431e2b50fa0.tar.gz
```

Pour tester une mise à jour sans écraser le catalogue courant :

```sh
python3 scripts/import-catalogue.py \
  --commit SHA_COMPLET_DE_40_CARACTERES \
  --output-dir /tmp/linuxlab-catalogue-test
```

Le SHA doit être complet : une branche mouvante comme `main` est refusée. La date d’un autre commit est obtenue par l’API GitHub, sauf si `--updated-at` est fourni explicitement. La licence amont doit toujours être revue ; l’import s’arrête si le texte de licence n’indique plus CC BY 4.0.

Pour régénérer l’instantané de la source utilisateur, ou utiliser temporairement une autre source de même format :

```sh
python3 scripts/import-catalogue.py --freeze-user-source /chemin/pasted_content.txt
python3 scripts/import-catalogue.py --user-source /chemin/pasted_content.txt --output-dir /tmp/linuxlab-test
```

## Contrôles effectués

L’import valide les clés et types du schéma, l’unicité des identifiants et noms affichés, la présence de descriptions et d’exemples non vides, les catégories et niveaux, les relations internes, les URL HTTP(S), le commit épinglé de chaque lien source, la disparition des doubles accolades et la cohérence de tous les compteurs. Les douze commandes essentielles doivent être présentes.

L’instantané livré contient **6 786 commandes**, **903 fiches françaises** et **30 246 exemples**. Deux imports indépendants — l’un par téléchargement, l’autre par archive locale — ont produit des JSON identiques octet pour octet. Tous les liens `source` ont été résolus vers des fichiers existants de l’archive et `client/src/lib/catalogue.ts` a été vérifié avec TypeScript. Aucune interface, configuration, dépendance, liste de tâches ou opération Git n’a été modifiée pour cette importation.
