# Linux Lab

Référence interactive Linux en français, construite à partir de la cheat-sheet fournie et de tldr-pages. L’interface « Manuel phosphore » associe une bibliothèque filtrable, des fiches avec exemples, favoris, parcours d’apprentissage, mémo shell et terminal libre.

## Démarrage local

Prérequis : Node.js 20.19+ ou 22.12+. Les scripts utilisent Corepack et la version pnpm 10.18.0 épinglée par le projet ; si les dépendances ne sont pas installées, ils les installent depuis le lockfile.

- **Windows :** double-cliquez sur `start-local.cmd`, ou lancez-le depuis l’invite de commandes.
- **macOS/Linux :** lancez `chmod +x ./start-local.sh` une fois, puis `./start-local.sh`.

Ouvrez ensuite `http://localhost:3000`. Le serveur reste dans la fenêtre du terminal ; appuyez sur `Ctrl+C` pour l’arrêter. Pour choisir un autre port, définissez `PORT` avant de lancer le script.

Manuellement, `pnpm install --frozen-lockfile` installe les dépendances et, sous macOS/Linux, `pnpm dev` démarre Express et Vite sur le port 3000. `pnpm check` vérifie les types. `pnpm build` produit le frontend et le serveur ; `pnpm start` démarre la version de production. Le Dockerfile est prêt pour le déploiement du serveur et des actifs statiques.

## Catalogue

6 786 fiches common/Linux de tldr sont incluses dans cet instantané. 903 utilisent une source française ; les autres conservent la source anglaise et sont signalées EN. Les catégories et niveaux suivent des règles explicites. Les options sont illustrées à partir des exemples, et le lien de la fiche donne accès à la documentation d’origine. Aucune liste ne peut garantir « toutes les commandes Linux », car les distributions et programmes installés varient.

`python3 scripts/import-catalogue.py` régénère l’instantané depuis le commit épinglé. La provenance et l’attribution du contenu sont détaillées dans [docs/SOURCES.md](docs/SOURCES.md). Le serveur transmet le catalogue précompressé avec gzip, environ 1,6 Mio ; la version JSON reste disponible.

## Terminal

Le bouton « Démarrer Linux » télécharge environ 12 Mio d’actifs libres, puis v86 exécute un vrai noyau Linux Buildroot/BusyBox dans le navigateur. Les pipes, fichiers, redirections et permissions sont réels à l’intérieur de cette VM. Il n’y a aucun shell serveur accessible, aucun montage du poste utilisateur et aucun relais réseau. Les fichiers sont temporaires.

Le shell est ash, pas Bash. La disponibilité des programmes et des options ne correspond pas forcément à GNU/Linux complet. `busybox --list` et `command -v nom` montrent les utilitaires disponibles. Les exemples sont insérés sans Entrée ; l’utilisateur doit les vérifier et déclencher l’exécution. Les licences et la vérification du noyau sont décrites dans [la section Terminal Linux du guide technique](docs/DEVELOPMENT.md#terminal-linux).

## Assistant pédagogique

Le service Express `/api/assistant` appelle réellement GPT-6 Luna via les variables serveur `MANUS_API_URL` et `MANUS_API_KEY` fournies par le projet. Il explique une commande ou une erreur, avec limites de longueur, fréquence et durée, sans jamais exécuter de code. L’assistant utilise les crédits du projet. La dernière sortie du terminal n’est jointe que sur action explicite ; les conversations ne sont pas stockées dans une base de données.

Les favoris, le thème et la progression déclarative sont conservés dans ce navigateur. Le contexte architectural est décrit dans [la section Architecture du guide technique](docs/DEVELOPMENT.md#architecture).
