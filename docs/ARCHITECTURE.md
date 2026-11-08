# Linux Lab

Le catalogue s’appuie sur les fiches communautaires tldr pour les plateformes common et linux. Les traductions françaises sont privilégiées ; les fiches sans traduction sont explicitement identifiées en anglais. Les exemples et options illustrées ne sont pas un manuel exhaustif. Le fichier HTML fourni est conservé comme référence d’import des exemples utiles, sans considérer les fragments de SQL comme des commandes Linux.

Sources consultées le 8 novembre 2026 : https://github.com/tldr-pages/tldr et https://github.com/copy/v86 . tldr est un complément pratique aux manuels. v86 émule un ordinateur x86 dans le navigateur et exécute un vrai noyau Linux ; cela ne donne aucun accès au shell du serveur ou à la machine de l’utilisateur.

L’interface React utilise des données statiques versionnées, une pagination pour limiter le nombre de cartes, des favoris locaux, et des panneaux accessibles Radix Dialog. Les thèmes sont enregistrés localement. Le terminal se télécharge uniquement au démarrage explicite et ses fichiers sont volatils. Aucun relais réseau n’est activé.

Le seul serveur fonctionnel ajouté est une route Express d’assistance pédagogique /api/assistant, avec validation des entrées, limitation des requêtes et délai d’expiration. Elle utilise le service IA du projet et GPT-6 Luna, choisi dans le catalogue live pour son coût modéré et ses capacités en instruction, écriture et précision. Les clés restent exclusivement côté serveur. Les réponses s’affichent comme texte Markdown et ne sont jamais évaluées comme code. La sortie du terminal n’est jointe qu’en cochant l’option correspondante. Les échanges ne sont pas sauvegardés dans une base de données.

Structure : client/src/pages/Home.tsx contient la bibliothèque et les parcours ; client/src/components/CommandDetail.tsx la fiche ; LinuxTerminal.tsx la VM ; LinuxAssistant.tsx la conversation. client/public/data contient le catalogue, client/public/vm les composants libres du terminal. Les scripts d’import et de vérification documentent les données et la VM. Aucun hébergement persistant de shell n’est nécessaire.
