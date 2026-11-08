# Terminal LinuxLab

`client/src/components/LinuxTerminal.tsx` exporte par défaut un terminal Linux réel exécuté exclusivement dans le navigateur. Le code machine x86 du noyau est émulé par v86 et compilé en WebAssembly. Les entrées clavier passent à l’UART série invité, puis les sorties invitées sont affichées par xterm.js. Il n’existe aucun endpoint d’exécution de commande sur l’hôte.

## Intégration React

```tsx
<LinuxTerminal
  insertCommand={{ text: "pwd", nonce: 1 }}
  onOutput={chunk => setOutput(previous => (previous + chunk).slice(-12000))}
/>
```

`onOutput` reçoit des fragments de la vraie sortie série, potentiellement avec des séquences ANSI. Ce n’est pas un état complet à remplacer à chaque appel. Un nouveau `nonce` insère la suggestion une seule fois. Si Linux n’est pas prêt, la dernière suggestion est mise en attente. Aucun retour à la ligne n’est transmis par cette propriété : l’utilisateur doit appuyer sur Entrée.

Les scripts multilignes sont conservés comme un seul `sh -c "$(printf '%b' '…')"` : les antislashs originaux sont doublés avant d’encoder les sauts de ligne et tabulations, les apostrophes sont protégées selon les règles POSIX, et les autres contrôles du terminal sont supprimés. Ainsi, les variables et redirections du script gardent leur sens, mais aucune ligne n’est exécutée lors de son insertion. Les suggestions simples restent du texte nettoyé. La fonction pure `prepareInsertion` est exportée et testée directement depuis le code du composant.

Garder le composant monté pendant la navigation et masquer son parent avec `hidden` préserve la VM. Le `ResizeObserver` ajuste xterm lorsque le panneau redevient visible. Démonter le composant détruit la VM. La fermeture du panneau seule ne détruit donc pas les données ; la fermeture de l’onglet, son rechargement et le redémarrage de la VM les effacent.

Le bouton explicite **Démarrer Linux** charge les modules, BIOS, noyau et WASM. L’écran initial porte la mention « APERÇU VISUEL · AUCUNE COMMANDE EXÉCUTÉE » : il n’est pas un interpréteur simulé. Les états distinguent téléchargement, démarrage du noyau, préparation, shell prêt et erreur. La progression représente les octets réellement reçus, pas un pourcentage inventé. Les réponses HTTP invalides, pages HTML à la place des binaires, WASM incompatible et délai de 180 secondes donnent une erreur avec possibilité de réessayer. Redémarrer exige une confirmation native et recrée une VM neuve. Effacer ne vide que l’affichage, pas le système de fichiers.

## Système invité et sécurité

L’image officielle est `buildroot-bzimage68.bin`, avec Linux **6.8.12** et BusyBox **1.36.1**, vérifiés à l’exécution. L’initialisation force `/bin/busybox ash -i` après création de `/root/lab`. L’invite affiche `linuxlab:~/lab#` car ash abrège le répertoire personnel ; `pwd` retourne bien `/root/lab`. Les fichiers disponibles au premier démarrage sont `notes.txt`, `logs/app.log` et `projets/todo.txt`.

Le terminal est donc **Buildroot/BusyBox ash, pas Ubuntu ni Bash**. Le test confirme que `command -v bash`, `command -v apt` et `command -v systemctl` ne renvoient aucun chemin, tandis que `command -v ash` donne `/bin/ash` et `readlink /bin/sh` donne `busybox`. Certaines options GNU et commandes de cours ne sont pas disponibles. Vérifier avec `command -v nom`, `busybox --list` et l’aide propre à chaque outil. Ne pas promettre un catalogue intégral de commandes Ubuntu.

La VM utilise 128 Mio de mémoire invitée et 2 Mio de mémoire VGA. Aucun `network_relay_url`, backend réseau `fetch`, WebSocket, service shell ni montage de fichiers de l’hôte n’est configuré. Une carte virtuelle interne peut être visible dans l’invité, mais elle n’a aucun relais réseau externe. Le message amont « Enable networking using udhcpc » appartient à l’image ; il ne signifie pas que LinuxLab fournit un réseau. L’objet `filesystem: {}` crée seulement un espace 9p virtuel vide en mémoire, utilisé par l’image, sans montage de l’hôte.

Tab, les flèches, les séquences ANSI et Ctrl-C sont transmis par xterm et l’UART, pas réimplémentés comme des commandes factices. Les commandes saisies manuellement peuvent modifier ou casser le système invité ; elles ne bénéficient d’aucun accès au serveur ni aux fichiers locaux de l’utilisateur. Tout est volatil.

## Actifs locaux et provenance

Les binaires sont conservés dans `client/public/vm/`. Leur taille exacte est :

- `buildroot-bzimage68.bin` : **10 068 480 octets**.
- `v86.wasm` : **2 007 347 octets**.
- `v86-fallback.wasm` : **2 040 034 octets**, chargé uniquement si le module principal n’est pas compilable par le navigateur.
- `seabios.bin` : **131 072 octets**.
- `vgabios.bin` : **36 352 octets**.

Le total des cinq binaires est **14 283 285 octets, soit 13,62 Mio** ; le chargement principal représente **12 243 251 octets, soit 11,68 Mio**, hors JavaScript, CSS et petit script d’initialisation. Les modules JavaScript de v86 et xterm sont regroupés et servis par Vite avec leurs dépendances npm verrouillées : aucune balise script distante n’est utilisée. Les URLs d’actifs tiennent compte de `import.meta.env.BASE_URL`. `manifest.json` contient les tailles et SHA-256 pour vérifier la provenance et détecter un remplacement.

Le noyau provient de https://i.copy.sh/buildroot-bzimage68.bin ; les BIOS de https://github.com/copy/v86/tree/master/bios. Les WASM sont copiés du paquet officiel `v86@0.5.473`, version source `0.5.473+g315b2b0`. Les définitions TypeScript de ce paquet sont utilisées sans fichier de déclaration local supplémentaire. Les dépendances ajoutées sont `v86`, `@xterm/xterm` et `@xterm/addon-fit`. pnpm reste épinglé en **10.18.0** et les permissions de scripts existantes sont inchangées. `pnpm ignored-builds` a répondu « None » après l’installation.

Les notices et textes de licence sont accessibles à `/vm/NOTICE.md` et conservés à côté des binaires. v86 est BSD-2-Clause, xterm MIT, les BIOS ont leurs licences propres et l’image Linux contient des composants GPL ainsi que d’autres licences. Les configurations et le patch source de cette famille Buildroot 2024.05.2/Linux 6.8 ont été publiés dans https://github.com/copy/v86/issues/725 et https://gist.github.com/SuperMaxusa/19a789c9e9b4a69b3237947fdb86d61e. Les sources sont référencées dans la notice ; une redistribution modifiée ou commerciale doit conserver les sources exactes et produire `make legal-info`, pas seulement s’appuyer sur une mention générique « open source ».

## Preuve d’exécution

Commande de validation depuis la racine :

```sh
node scripts/test-vm.cjs
```

Ce test Node utilise v86 et les mêmes buffers locaux BIOS/noyau ainsi que le même WASM précompilé que le navigateur. Il ne lance jamais les commandes Linux sur l’hôte. Il attend l’invite réelle de l’image, envoie le script pédagogique dans l’UART, attend l’invite ash, puis vérifie les sorties des commandes suivantes exécutées **dans le Linux invité** :

Le test charge directement les deux fonctions pures `prepareInsertion` et `isLabPrompt` depuis l’AST TypeScript du composant, sans charger xterm dans Node. Le passage à « prêt » n’utilise donc pas une expression régulière indépendante : il vérifie le même prédicat que React, avec `linuxlab:~/lab# ` et `linuxlab:/root/lab# `.

```sh
pwd; echo VM_ECHO_OK; ls -1; cat logs/app.log | grep ERROR | wc -l; uname -r; busybox | head -1; printf 'BASH='; command -v bash || true; printf '\nASH='; command -v ash; printf 'SH='; readlink /bin/sh; printf 'APT='; command -v apt || true; printf '\nSYSTEMCTL='; command -v systemctl || true; printf '\nVM_TEST_DONE\n'
```

Résultats réellement observés le 8 novembre 2026 :

```text
/root/lab
VM_ECHO_OK
logs
notes.txt
projets
2
6.8.12
BusyBox v1.36.1 (2024-08-31 21:21:23 UTC) multi-call binary.
BASH=
ASH=/bin/ash
SH=busybox
APT=
SYSTEMCTL=
VM_TEST_DONE
```

Le même test insère sans retour à la ligne le script suivant, vérifie qu’aucune sortie d’exécution n’apparaît pendant 500 ms, puis envoie une Entrée explicite :

```sh
nom='Linux Lab'
printf 'Bonjour %s\n' "$nom"
printf '%s\n' 'C:\notes\tab'
printf '%s\n' 'quote: '"'"'ok'
mkdir -p /root/lab/script
echo 'MULTILINE_EXECUTED' > /root/lab/script/result.txt
cat /root/lab/script/result.txt
```

Les assertions vérifient que le texte inséré contient **zéro caractère de contrôle**, que les antislashs et apostrophes sont conservés, et que le script reste inexécuté avant Entrée. Après Entrée, les sorties vérifiées sont `Bonjour Linux Lab`, `C:\notes\tab`, `quote: 'ok` et `MULTILINE_EXECUTED`. La trace brute réelle avec ANSI est enregistrée dans `client/public/vm/boot-test-output.txt`. Aucun faux résultat ou capture d’écran de terminal n’est utilisé comme preuve.

Le composant a passé un contrôle TypeScript ciblé après ses corrections. Le projet a également compilé via `pnpm build:static` ; les modifications parallèles de l’interface sont gérées par le parent. Aucune commande de construction globale répétée n’est nécessaire pour reproduire le test de la VM.
