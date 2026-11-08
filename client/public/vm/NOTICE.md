# Sources et licences du terminal LinuxLab

La machine virtuelle s’exécute intégralement dans le navigateur. Aucun serveur de shell, relais réseau ou montage du système de fichiers de l’hôte n’est configuré. Le dossier pédagogique est créé dans la mémoire de la machine invitée, puis perdu au redémarrage.

## Émulateur et terminal

v86 est distribué sous licence BSD à deux clauses. Le paquet npm officiel `v86@0.5.473` fournit le code JavaScript regroupé par Vite et les fichiers `v86.wasm` et `v86-fallback.wasm` copiés sans modification. Le paquet identifie sa version source comme `0.5.473+g315b2b0`. Le texte de licence et les mentions de copyright sont conservés dans `LICENSE.v86`. Sources : https://github.com/copy/v86 et https://www.npmjs.com/package/v86.

Le terminal utilise `@xterm/xterm@6.0.0` et `@xterm/addon-fit@0.11.0`, sous licence MIT. Les licences sont conservées dans `LICENSE.xterm` et `LICENSE.xterm-fit`. Sources : https://github.com/xtermjs/xterm.js.

## BIOS

`seabios.bin` et `vgabios.bin` proviennent du répertoire BIOS du dépôt officiel : https://github.com/copy/v86/tree/master/bios. Ces fichiers sont conservés sans modification.

SeaBIOS utilise la LGPL v3 et certains composants la GPL v3. Les textes fournis par le projet source sont conservés dans `LICENSE.seabios-LGPL` et `LICENSE.seabios`. Sources et instructions de construction : https://github.com/coreboot/seabios.

Le BIOS VGA Bochs/Plex86 utilise la LGPL v2.1. Le texte est conservé dans `LICENSE.vgabios`. Sources : https://github.com/qemu/vgabios et https://www.nongnu.org/vgabios/.

## Linux et Buildroot

L’image `buildroot-bzimage68.bin` est une image officielle d’exemple v86, téléchargée sans modification depuis https://i.copy.sh/buildroot-bzimage68.bin. Elle intègre un noyau Linux 6.8.12 et un système minimal BusyBox construit avec Buildroot. Le noyau Linux et BusyBox sont notamment sous GPL v2 ; le texte est conservé dans `LICENSE.GPL-2.0`. L’image contient aussi des composants sous leurs propres licences : cette mention ne prétend pas que tout le système est couvert par une licence unique.

Sources du noyau : https://cdn.kernel.org/pub/linux/kernel/v6.x/linux-6.8.12.tar.xz. Sources BusyBox : https://busybox.net/downloads/. Sources Buildroot : https://buildroot.org/downloads/buildroot-2024.05.2.tar.gz. Les configurations et le patch rootfs correspondant à cette famille d’image ont été publiés dans https://github.com/copy/v86/issues/725 et https://gist.github.com/SuperMaxusa/19a789c9e9b4a69b3237947fdb86d61e. Les sources des paquets Buildroot sont également disponibles via https://sources.buildroot.net/.

Pour une redistribution commerciale ou une modification de l’image, conserver les sources exactes, configurations et patches correspondants ainsi que le résultat de `make legal-info`, conformément aux obligations de chaque paquet. Les liens ci-dessus sont des références de provenance ; ils ne constituent pas à eux seuls une affirmation de conformité juridique complète pour une nouvelle redistribution. Voir https://buildroot.org/downloads/manual/manual.html#legal-info.

`lab-init.sh` est le script pédagogique propre à LinuxLab. Il ne modifie pas le binaire distribué : il prépare `/root/lab` dans le Linux invité après son démarrage et démarre explicitement le shell BusyBox ash. Les traces brutes produites par le test VM restent dans le répertoire temporaire du système et ne sont pas livrées comme actifs du site.
