#!/usr/bin/env python3
"""Import Linux/common tldr pages without dependencies, execution of examples or LLMs.

Default inputs are pinned; downloads and archive inspection stay in a temporary
folder. Re-run from any directory. See docs/SOURCES.md for provenance and limits.
"""
from __future__ import annotations

import argparse
import collections
import datetime as dt
import gzip
import hashlib
import html
import io
import json
import re
import shlex
import tarfile
import tempfile
import urllib.parse
import urllib.request
from pathlib import Path

PINNED_COMMIT = "ed1f496b347fa32446122aa56e254431e2b50fa0"
PINNED_UPDATED_AT = "2026-11-08T06:56:49Z"
REPOSITORY = "https://github.com/tldr-pages/tldr"
PROJECT_ROOT = Path(__file__).resolve().parents[1]
CATEGORIES = {
    "navigation": set("pwd cd ls tree dirs pushd popd realpath basename dirname readlink zoxide autojump broot eza exa lsd ranger lf nnn yazi".split()),
    "files": set("mkdir touch cp mv rm rmdir ln find locate plocate mlocate updatedb fd file stat install truncate shred sync readlink namei rename mmv rsync du df ncdu test trash trash-cli chattr lsattr lsof fuser watchman inotifywait inotifywatch".split()),
    "text": set("cat bat less more head tail grep egrep fgrep ripgrep rg sed awk gawk mawk sort uniq cut paste join comm diff diff3 cmp wc tr tee xargs strings iconv recode dos2unix unix2dos od hexdump xxd rev tac fmt fold expand unexpand split csplit shuf nl column pr printf nano vim nvim vi emacs ed micro jq yq jless sponge delta sd ack ag choose datamash csvkit".split()),
    "permissions": set("chmod chown chgrp umask getfacl setfacl getcap setcap sudo su doas runuser setpriv visudo".split()),
    "network": set("ip ifconfig ping ping6 traceroute tracepath mtr netstat ss curl wget wget2 aria2c ssh scp sftp ssh-copy-id ssh-add ssh-agent telnet nc ncat netcat socat dig host nslookup whois resolvectl nmcli nmtui iw iwconfig iwlist ifup ifdown route arp arping ethtool networkctl tcpdump tshark wireshark iperf iperf3 speedtest speedtest-cli http httpie http-server openssl s_client lftp ftp proxychains proxychains4 tor torsocks rclone mosquitto_pub mosquitto_sub".split()),
    "system": set("uname hostname hostnamectl uptime date cal ncal timedatectl hwclock whoami id who w users groups last lastb lastlog logname passwd adduser deluser useradd userdel usermod groupadd groupdel groupmod chpasswd chage getent dmesg journalctl logger free vmstat iostat iotop mpstat sar lsblk lscpu lspci lsusb lshw dmidecode blkid findmnt mount umount swapon swapoff mkswap fdisk cfdisk sfdisk parted partprobe mkfs fsck tune2fs resize2fs wipefs dd losetup hdparm smartctl eject lsmod modprobe insmod rmmod sysctl udevadm reboot shutdown poweroff halt login logout localectl loadkeys setfont locale printenv env chroot debootstrap bootctl efibootmgr grub-install grub-mkconfig update-grub numactl systemd-analyze lsns unshare nsenter".split()),
    "processes": set("ps top htop btop atop pgrep pkill kill killall nice renice nohup jobs bg fg wait disown time timeout watch sleep systemctl service init telinit systemd-run supervisorctl supervisord pm2 crontab at atq atrm batch pidof pstree pmap strace ltrace perf taskset ionice chrt".split()),
    "packages": set("apt apt-get apt-cache apt-mark apt-file aptitude dpkg dpkg-query dpkg-reconfigure dnf dnf5 yum rpm zypper pacman paru yay trizen pikaur pamac flatpak snap brew nix nix-env nix-shell nixos-rebuild guix emerge eopkg apk pkg pkg-config pkcon nala deb-get pip pip3 pipx poetry uv npm pnpm yarn bun gem cargo rustup go composer conda mamba micromamba cpan tlmgr".split()),
    "shell": set("bash sh zsh fish dash ksh csh tcsh nu nushell elvish echo alias unalias export unset set source eval exec read history fc help type which whereis command builtin bind complete compgen getopts getopt hash ulimit trap return exit true false seq yes clear reset tput stty tmux screen script scriptreplay direnv fzf parallel sponge envsubst test [ !".split()),
    "archives": set("tar zip unzip gzip gunzip zcat zgrep zless zmore bzip2 bunzip2 bzcat xz unxz xzcat zstd unzstd zstdcat lz4 lzma unlzma 7z 7za 7zr rar unrar cpio ar atool bsdtar bsdtar base64 base32 basenc".split()),
    "development": set("git gh glab hg svn fossil make gmake cmake ctest meson ninja gcc g++ cc c++ clang clang++ clang-format clang-tidy ld ldd nm objdump objcopy readelf strip addr2line ar as gdb lldb valgrind python python3 node nodejs deno ruby perl php lua luajit java javac jshell javadoc kotlin kotlinc gradle mvn swift dotnet csc mono ghc runghc cabal stack ocaml dune elixir mix erl erlc rebar3 r racket julia zig nasm yasm autoconf automake autoreconf libtool docker docker-compose podman buildah kubectl helm minikube kind k3d terraform tofu ansible vagrant packer devenv just task hyperfine watchexec entr sqlite3 mysql mariadb psql redis-cli mongosh mongod protoc buf eslint prettier tsc typescript pytest unittest tox nox ruff black pylint flake8 shellcheck shfmt bats ctags cscope cloc scc".split()),
    "security": set("nmap sqlmap nikto masscan rustscan nuclei gobuster ffuf dirb dirbuster hydra john hashcat aircrack-ng airmon-ng airodump-ng aireplay-ng wpscan msfconsole msfvenom metasploit searchsploit exploitdb burpsuite zaproxy gpg gpg2 gpgv age sops pass openssl ssh-keygen ssh-keyscan sha256sum sha512sum sha1sum md5sum b2sum cksum cryptsetup veracrypt luksformat fail2ban-client ufw firewall-cmd iptables ip6tables nft ipset auditctl ausearch aureport lynis clamav clamscan freshclam chkrootkit rkhunter apg pwgen htpasswd chpasswd keyctl certbot ca-certificate update-ca-certificates cewl chisel dalfox feroxbuster netdiscover smbclient enum4linux sslscan testssl recon-ng theharvester".split()),
}
# Explicit family prefixes only: unknown tools are not classified from prose.
PREFIXES = [
    ("security", r"^(?:gpg|openssl|iptables|nft|cryptsetup|ufw|firewall-cmd|aircrack-ng|airmon-ng|airodump-ng|sqlmap|nmap|msf|hashcat|john|fail2ban|audit|semanage|setsebool)(?:-|$)"),
    ("packages", r"^(?:apt|apt-get|apt-cache|apt-mark|dpkg|dnf|dnf5|yum|rpm|pacman|yay|paru|flatpak|snap|brew|nix|guix|pip|pip3|pipx|uv|npm|pnpm|yarn|bun|gem|cargo|rustup|go|composer|conda|mamba|micromamba)(?:-|$)"),
    ("development", r"^(?:git|gh|glab|hg|svn|docker|docker-compose|podman|kubectl|helm|terraform|tofu|ansible|vagrant|cmake|meson|gcc|clang|gdb|lldb|python|python3|node|deno|java|dotnet|gradle|mvn|pytest|ruff|sqlite3|mysql|mariadb|psql|redis|mongosh)(?:-|$)"),
    ("network", r"^(?:ip|nmcli|networkctl|resolvectl|ssh|scp|sftp|curl|wget|http|aria2c|iw|ethtool|tcpdump|tshark|rclone|mosquitto)(?:-|$)"),
    ("system", r"^(?:systemd|journalctl|lsblk|lscpu|udevadm|mount|umount|mkfs|fsck|grub|useradd|userdel|usermod|groupadd|groupdel|groupmod|sysctl|hostnamectl|timedatectl|btrfs|zfs|zpool|lvm|lvcreate|lvremove|lvextend|lvreduce|vgcreate|vgremove|pvcreate|pvremove|mdadm)(?:[.-]|$)"),
    ("processes", r"^(?:systemctl|service|supervisorctl|pm2|kill|pkill|pgrep|ps|perf|crontab)(?:-|$)"),
    ("archives", r"^(?:tar|zip|unzip|gzip|bzip2|xz|zstd|7z|7za|rar|unrar|cpio|lz4)(?:-|$)"),
    ("shell", r"^(?:bash|zsh|fish|tmux|screen|alias|history|echo|test)(?:-|$)"),
]
BEGINNER = set("pwd ls cd mkdir touch cat cp mv rm rmdir echo less more head tail grep find wc sort uniq cut clear history whoami id uname date cal df du free ping wget curl nano man help which whereis file stat tree ln printf read alias export env printenv bash sh tar zip unzip gzip gunzip chmod chown groups passwd".split())
ADMIN_ADVANCED = set("dd fdisk cfdisk sfdisk parted mkfs fsck wipefs mkswap swapon swapoff mount umount modprobe insmod rmmod sysctl udevadm chroot reboot shutdown poweroff halt useradd userdel usermod adduser deluser groupadd groupdel groupmod su sudo doas visudo bootctl efibootmgr grub-install grub-mkconfig update-grub nsenter unshare strace ltrace perf auditctl systemctl service".split())
DANGEROUS = set("rm rmdir shred dd truncate mkfs wipefs fdisk cfdisk sfdisk parted mkswap swapoff umount reboot shutdown poweroff halt kill killall pkill userdel deluser groupdel lvremove vgremove pvremove cryptsetup chmod chown chgrp sudo su doas passwd chpasswd usermod setfacl setcap iptables ip6tables nft firewall-cmd ufw sqlmap hydra john hashcat msfconsole msfvenom aircrack-ng aireplay-ng".split())
DESTRUCTIVE_NAME = re.compile(r"(?:^mkfs[.-]|^(?:git-(?:reset|clean|rebase)|docker-(?:rm|rmi|system-prune|volume-rm)|podman-(?:rm|rmi|system-prune)|kubectl-delete|terraform-destroy|tofu-destroy|btrfs-(?:device-remove|subvolume-delete)|zpool-destroy|zfs-destroy)(?:-|$))")
BUILTINS = set("cd dirs pushd popd echo alias unalias export unset set source eval exec read history fc help type command builtin bind complete compgen getopts hash ulimit trap return exit jobs bg fg wait disown umask ! [".split())
ESSENTIAL_NAMES = ["pwd", "ls", "cd", "mkdir", "touch", "cat", "cp", "mv", "rm", "grep", "find", "chmod"]
EXPLICIT_RELATED = {
    "pwd": ["cd", "ls"], "cd": ["pwd", "ls", "pushd", "popd"],
    "ls": ["tree", "find", "stat", "cd"], "mkdir": ["rmdir", "touch", "ls"],
    "touch": ["stat", "mkdir", "truncate"], "cat": ["less", "head", "tail", "bat"],
    "cp": ["mv", "rsync", "install"], "mv": ["cp", "rename", "rm"],
    "rm": ["rmdir", "trash", "shred"], "grep": ["rg", "find", "sed", "awk"],
    "find": ["fd", "locate", "grep", "xargs"], "chmod": ["chown", "chgrp", "umask", "getfacl"],
    "echo": ["printf", "tee", "cat"], "uniq": ["sort", "comm", "awk"],
    "ssh": ["scp", "sftp", "ssh-keygen"], "tar": ["gzip", "zip", "unzip"],
    "apt": ["apt-get", "apt-cache", "dpkg"], "ps": ["top", "htop", "pgrep", "kill"],
    "kill": ["pkill", "killall", "ps"], "systemctl": ["service", "journalctl"],
    "bash": ["sh", "zsh", "fish", "shellcheck"], "nmap": ["ss", "tcpdump", "masscan"],
    "sqlmap": ["curl", "nmap"], "ufw": ["iptables", "nft", "firewall-cmd"],
}


def text_plain(value: str) -> str:
    value = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", value)
    value = re.sub(r"\[([A-Za-zÀ-ÿ])\](?=[A-Za-zÀ-ÿ])", r"\1", value)
    value = value.replace("`", "")
    return html.unescape(value).strip()


def template_code(code: str) -> str:
    """Drop template braces; choose first alias, retain editable ordinary values.

    {{[-a|--all]}} -> -a; {{[a|address]}} -> a; {{-a|-m}} -> -a.
    General alternative values become [up / down], not an accidental shell pipe.
    No values are invented; every remaining placeholder still needs user review.
    """
    def replace(match: re.Match) -> str:
        value = match.group(1)
        if value.startswith("[") and value.endswith("]") and "|" in value:
            return value[1:-1].split("|", 1)[0]
        if "|" in value and all(x.startswith("-") for x in value.split("|")):
            return value.split("|", 1)[0]
        if "|" in value:
            return "[" + " / ".join(value.split("|")) + "]"
        return value
    return re.sub(r"\{\{(.*?)\}\}", replace, code).strip()


def valid_url(value: str) -> bool:
    try:
        parsed = urllib.parse.urlsplit(value)
        return parsed.scheme in ("https", "http") and bool(parsed.hostname) and not re.search(r"[\s<>\x00-\x1f]", value)
    except ValueError:
        return False


def parse_page(text: str, page_id: str) -> dict:
    name = page_id.replace("-", " ")
    descriptions, details, examples, raw_examples = [], [], [], []
    pending = ""
    manual = ""
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("# "):
            name = text_plain(stripped[2:])
        elif stripped.startswith("> "):
            value = stripped[2:]
            # Official/upstream link when present; third-party man pages remain
            # as supplied by tldr. No assertion that all links are official.
            if re.match(r"(?:More information|Plus d['’]informations|Plus d['’]information)\s*:", value, re.I):
                links = re.findall(r"https?://[^\s<>]+", value)
                for link in links:
                    link = link.rstrip(".")
                    if valid_url(link):
                        manual = link
                        break
            else:
                plain = text_plain(value)
                if plain:
                    (descriptions if not descriptions else details).append(plain)
        elif stripped.startswith("- "):
            pending = text_plain(stripped[2:].rstrip(":"))
        elif stripped.startswith("`") and stripped.endswith("`") and not stripped.startswith("```"):
            code = stripped[1:-1]
            if not code or not pending:
                raise ValueError(f"Code without descriptive prose in {page_id}: {stripped}")
            examples.append({"description": pending, "code": template_code(code)})
            raw_examples.append((pending, code))
        elif pending and stripped and not stripped.startswith("#"):
            pending += " " + text_plain(stripped)
    if not descriptions or not examples:
        raise ValueError(f"Missing description/examples: {page_id}")
    return {"name": name, "description": descriptions[0], "details": details,
            "examples": examples, "raw_examples": raw_examples, "manualUrl": manual}


def flags_from_example(code: str) -> list[str]:
    # Illustrations, not a full getopt parser. Alias alternatives in the raw
    # tldr source are included; grouped short flags are not split/invented.
    aliases = []
    for value in re.findall(r"\{\{(.*?)\}\}", code):
        options = value.strip("[]").split("|")
        if len(options) > 1:
            for option in options:
                aliases.extend(re.findall(r"(?<!\S)(--?[A-Za-z?][A-Za-z0-9_?-]*)(?=\s|=|$)", option))
    converted = template_code(code)
    try:
        tokens = shlex.split(converted, posix=True)
    except ValueError:
        tokens = converted.split()
    for token in tokens:
        if re.fullmatch(r"--?[A-Za-z?][A-Za-z0-9_?-]*(?:=.*)?", token):
            aliases.append(token.split("=", 1)[0])
    return list(dict.fromkeys(aliases))


def classify(page_id: str, name: str) -> str:
    for category, pattern in PREFIXES:
        if re.search(pattern, page_id):
            return category
    for category, names in CATEGORIES.items():
        if name in names or page_id in names:
            return category
    return "other"


def js_string(value: str) -> str:
    if value.startswith('"'):
        return json.loads(value)
    # The supplied attachment uses single quoted JS strings with simple escapes.
    body = value[1:-1]
    return re.sub(r"\\(['\"\\/bfnrt])", lambda m: {"b": "\b", "f": "\f", "n": "\n", "r": "\r", "t": "\t"}.get(m.group(1), m.group(1)), body)


def attachment_records(path: Path) -> list[dict]:
    source = path.read_text(encoding="utf-8")
    match = re.search(r"const commands\s*=\s*\[(.*?)\n\];", source, re.S)
    if not match:
        raise ValueError("Cannot locate literal commands array in user source")
    records = []
    pattern = r"(id|section|cmd|desc|example)\s*:\s*('(?:[^'\\]|\\.)*'|\"(?:[^\"\\]|\\.)*\")"
    for line in match.group(1).splitlines():
        if line.lstrip().startswith("{id:"):
            item = {m.group(1): js_string(m.group(2)) for m in re.finditer(pattern, line)}
            if set(item) != {"id", "section", "cmd", "desc", "example"}:
                raise ValueError(f"Incomplete attachment record: {line}")
            records.append(item)
    return records


def command_target(code: str, known: set[str]) -> str | None:
    try:
        tokens = shlex.split(code, posix=True)
    except ValueError:
        return None
    if not tokens:
        return None
    if tokens[0] == "sudo":
        tokens = tokens[1:]
    if not tokens:
        return None
    # Prefer an existing full subcommand page without treating flags as names.
    words = []
    for token in tokens[:5]:
        if not re.fullmatch(r"[A-Za-z0-9_.+!-]+", token) or token.startswith("-"):
            break
        words.append(token)
    for length in range(len(words), 0, -1):
        candidate = "-".join(words[:length])
        if candidate in known:
            return candidate
    return tokens[0] if tokens[0] in known else None


def supplements(records: list[dict], known: set[str]) -> tuple[dict, dict]:
    imported = collections.defaultdict(list)
    stats = collections.Counter()
    seen = set()
    def full_code(value: str) -> bool:
        if not value or "→" in value or "…" in value or "..." in value or value.startswith(("-", "?", "#", "[")):
            return False
        if re.match(r"^(?:if|for|while)\b", value) and not (";" in value and re.search(r"\b(?:fi|done)\s*$", value)):
            return False
        if re.search(r"(?:[|>&]|\b(?:-name|-iname|--data|-u|-D|-T|-C))\s*$", value):
            return False
        if re.search(r"\bapt(?:-get)?\s+(?:install|remove|purge)\s*$", value):
            return False
        return command_target(value, known) is not None
    for item in records:
        if item["section"] == "sqlmap-payloads":
            stats["excludedSqlPayloads"] += 1
            continue
        code = item["example"].strip()
        # Prefer the full example. When it is merely output or an option-only
        # fragment, the complete literal cmd may be used without reconstruction.
        if not full_code(code):
            code = item["cmd"].strip()
            if not full_code(code):
                stats["excludedOutputOrFragment"] += 1
                continue
            stats["usedCompleteCommandField"] += 1
        target = command_target(code, known)
        if not target:
            stats["excludedOutputOrFragment"] += 1
            continue
        # A pipeline representing uniq belongs to uniq, not the sort front end.
        if item["cmd"].startswith("uniq ") and re.search(r"\|\s*uniq(?:\s|$)", code):
            target = "uniq"
        description = item["desc"]
        if target == "echo" and ">>" not in code and ">" not in code and re.search(r"(?:écrire|ecrire).*fichier", description, re.I):
            description = "Afficher du texte sur la sortie standard"
        elif target == "uniq":
            description = "Trier les lignes puis supprimer les doublons adjacents"
        elif target == "export":
            description = "Exporter une variable vers les processus enfants du shell"
        elif "cd ~" in code:
            description = "Aller au répertoire personnel de l’utilisateur courant (HOME)"
        elif "apt upgrade" in code:
            description = "Mettre à jour les paquets installés selon les dépôts configurés"
        elif "sudo cat /etc/shadow" in code:
            description = "Lire les informations de comptes et les empreintes de mots de passe de /etc/shadow (droits requis)"
        elif "nmap -A" in code:
            description = "Activer la détection OS/versions, les scripts par défaut et traceroute (cible autorisée uniquement)"
        elif target == "sqlmap" and "--batch" in code:
            description = description.replace('Répondre automatiquement "yes" à toutes les questions de sqlmap', 'Utiliser les réponses par défaut sans demander de confirmation')
        if (target, code) in seen:
            stats["duplicateAttachmentExamples"] += 1
            continue
        seen.add((target, code))
        imported[target].append({"description": description, "code": code})
        stats["eligibleAttachmentExamples"] += 1
    return imported, dict(stats)


def load_archive(path: Path, commit: str | None = None) -> tuple[dict[str, str], str]:
    pages = {}
    license_text = ""
    with tarfile.open(path, "r:*") as archive:
        for member in archive:
            if not member.isfile():
                continue
            parts = member.name.split("/")
            if commit and parts[0] != f"tldr-{commit}":
                raise ValueError("Archive root does not match the requested pinned commit")
            if len(parts) == 2 and parts[-1] == "LICENSE.md":
                license_text = archive.extractfile(member).read().decode("utf-8")
            elif len(parts) == 4 and parts[1] in {"pages", "pages.fr"} and parts[2] in {"common", "linux"} and parts[3].endswith(".md"):
                key = "/".join(parts[1:])
                pages[key] = archive.extractfile(member).read().decode("utf-8")
    if not pages:
        raise ValueError("Archive has no common/Linux pages")
    # Never infer a licence from folklore: fail closed if upstream changes it.
    if "https://creativecommons.org/licenses/by/4.0/" not in license_text:
        raise ValueError("Upstream licence changed: review and update provenance before importing")
    return pages, license_text


def catalogue(pages: dict[str, str], commit: str, records: list[dict]) -> tuple[list[dict], dict]:
    selected = {}
    duplicate_names = 0
    for platform in ("common", "linux"):
        for path in sorted(pages):
            if path.startswith(f"pages/{platform}/"):
                page_id = Path(path).stem
                duplicate_names += page_id in selected
                selected[page_id] = path
    known = set(selected)
    extras, stats = supplements(records, known)
    commands = []
    family_members = collections.defaultdict(list)
    for page_id in sorted(known):
        prefixes = [prefix for prefix in known if page_id.startswith(prefix + "-")]
        family = max(prefixes, key=len) if prefixes else page_id
        family_members[family].append(page_id)
    supplement_count = french_common_fallbacks = 0
    for page_id, original_path in sorted(selected.items()):
        path = original_path.replace("pages/", "pages.fr/", 1)
        if path not in pages:
            # Linux wins English deduplication. Where its FR variant is absent,
            # an actual FR common page may supply the accessible primary text.
            common_fr = f"pages.fr/common/{page_id}.md"
            if common_fr in pages:
                path = common_fr
                french_common_fallbacks += original_path.startswith("pages/linux/")
            else:
                path = original_path
        language = "fr" if path.startswith("pages.fr/") else "en"
        parsed = parse_page(pages[path], page_id)
        category = classify(page_id, parsed["name"])
        root_name = parsed["name"].split()[0]
        level = "Avancé" if category == "security" or root_name in ADMIN_ADVANCED or re.search(r"^(?:mkfs[.-]|fsck[.-]|btrfs-|zfs-|zpool-|lvm-)", page_id) else ("Débutant" if parsed["name"] in BEGINNER else "Intermédiaire")
        source = f"{REPOSITORY}/blob/{commit}/{urllib.parse.quote(path, safe='/')}"
        examples = parsed["examples"]
        raw_examples = parsed["raw_examples"]
        seen_codes = {e["code"] for e in examples}
        for extra in extras.get(page_id, []):
            if extra["code"] not in seen_codes:
                examples.append(extra)
                raw_examples.append((extra["description"], extra["code"]))
                seen_codes.add(extra["code"])
                supplement_count += 1
        options = []
        seen_options = set()
        for description, code in raw_examples:
            for flag in flags_from_example(code):
                pair = (flag, description)
                if pair not in seen_options:
                    options.append({"flag": flag, "description": description})
                    seen_options.add(pair)
        # Link only stable known IDs, with deterministic capped sibling groups.
        prefixes = [prefix for prefix in known if page_id.startswith(prefix + "-")]
        family = max(prefixes, key=len) if prefixes else page_id
        relatives = EXPLICIT_RELATED.get(page_id, []) + ([family] if family != page_id else []) + family_members.get(family, [])
        related = list(dict.fromkeys(x for x in relatives if x in known and x != page_id))[:8]
        dangerous = root_name in DANGEROUS or bool(DESTRUCTIVE_NAME.search(page_id))
        dangerous = dangerous or any(re.search(r"(?:\brm\s+-[a-zA-Z]*[rf]|\bkill\s+-9\b|\bchmod\s+777\b|\bhistory\s+-c\b|/etc/shadow)", e["code"]) for e in examples)
        prerequisites = (["Commande intégrée : utiliser un shell compatible avec la syntaxe illustrée."] if root_name in BUILTINS else [f"Vérifier que l’outil « {root_name} » est installé et disponible dans PATH."])
        if category == "security":
            prerequisites.append("Pour les audits réseau ou de sécurité : uniquement sur vos systèmes ou avec une autorisation explicite.")
        if root_name in ADMIN_ADVANCED or any(re.search(r"(?:^|[|;&]\s*)sudo\s", e["code"]) for e in examples):
            prerequisites.append("Certaines opérations nécessitent des droits administrateur ; vérifier les effets avant exécution.")
        prerequisites.append("Adapter les chemins, valeurs, choix et autres paramètres fictifs avant utilisation.")
        details = list(parsed["details"])
        if path != original_path and path.startswith("pages.fr/common/") and original_path.startswith("pages/linux/"):
            details.append("La description provient de la page française commune ; une page Linux anglaise distincte existe dans tldr.")
        if page_id == "echo":
            details.append("echo affiche sur la sortie standard ; écrire dans un fichier nécessite une redirection > ou >>.")
        if page_id == "uniq":
            details.append("uniq ne traite que les répétitions adjacentes ; trier au préalable pour regrouper les lignes identiques.")
        if page_id == "bash":
            details.append("Le shebang choisit l’interpréteur lors d’une exécution directe ; il n’est pas obligatoire pour bash fichier.sh.")
        if page_id == "cd":
            details.append("~ désigne le répertoire personnel de l’utilisateur courant (HOME), pas systématiquement /home/kali.")
        keywords = list(dict.fromkeys([page_id, parsed["name"], root_name, category, *parsed["name"].split(), *(o["flag"] for o in options)]))
        commands.append({"id": page_id, "name": parsed["name"], "description": parsed["description"],
                         "details": details, "category": category, "level": level, "language": language,
                         "syntax": examples[0]["code"], "examples": examples, "options": options,
                         "related": related, "dangerous": dangerous, "source": source,
                         "manualUrl": parsed["manualUrl"] or source,
                         "prerequisites": prerequisites, "keywords": keywords})
    stats.update({"englishPageCount": sum(k.startswith("pages/") for k in pages),
                  "deduplicatedLinuxOverrides": duplicate_names,
                  "frenchCommonFallbacks": french_common_fallbacks,
                  "importedAttachmentExamples": supplement_count})
    # tldr uses suffixes for distinct tools sharing the same executable title
    # (just.1/just.js, mc.cli/mc.fm, etc.). Keep every page, but make its display
    # name unambiguous; syntax and example invocations are never renamed.
    titles = collections.Counter(command["name"] for command in commands)
    variant_count = 0
    for command in commands:
        if titles[command["name"]] > 1 and command["id"] != command["name"]:
            original_name = command["name"]
            command["name"] = f"{original_name} ({command['id']})"
            command["keywords"].append(command["name"])
            command["details"].append(f"Variante tldr « {command['id']} » : le nom exécutable reste « {original_name} ».")
            variant_count += 1
    stats["disambiguatedVariantNames"] = variant_count
    return commands, stats


def validate(commands: list[dict], meta: dict) -> None:
    fields = {"id", "name", "description", "details", "category", "level", "language", "syntax", "examples", "options", "related", "dangerous", "source", "manualUrl", "prerequisites", "keywords"}
    ids = {c["id"] for c in commands}
    assert len(ids) == len(commands) and commands, "Empty or duplicate IDs"
    assert len({c["name"] for c in commands}) == len(commands), "Duplicate names"
    for c in commands:
        assert set(c) == fields, (c["id"], "Schema keys")
        assert c["category"] in set(CATEGORIES) | {"other"}
        assert c["language"] in {"fr", "en"} and c["level"] in {"Débutant", "Intermédiaire", "Avancé"}
        assert isinstance(c["dangerous"], bool)
        for field in ("id", "name", "description", "syntax", "source", "manualUrl"):
            assert isinstance(c[field], str) and c[field].strip(), (c["id"], field)
        assert valid_url(c["source"]) and valid_url(c["manualUrl"]), (c["id"], "URL")
        assert meta["commit"] in c["source"]
        for field in ("details", "related", "prerequisites", "keywords"):
            assert isinstance(c[field], list) and all(isinstance(s, str) and s.strip() for s in c[field])
        assert set(c["related"]) <= ids and c["id"] not in c["related"]
        assert c["examples"] and all(set(e) == {"description", "code"} and all(isinstance(v, str) and v.strip() for v in e.values()) for e in c["examples"])
        assert all("{{" not in e["code"] and "}}" not in e["code"] for e in c["examples"])
        assert all(set(o) == {"flag", "description"} and re.fullmatch(r"--?[A-Za-z?][A-Za-z0-9_?-]*", o["flag"]) and o["description"] in {e["description"] for e in c["examples"]} for o in c["options"])
    assert set(ESSENTIAL_NAMES) <= {c["name"] for c in commands}
    assert set(meta) == {"count", "frenchCount", "examplesCount", "updatedAt", "commit", "source", "license"}
    assert meta["count"] == len(commands)
    assert meta["frenchCount"] == sum(c["language"] == "fr" for c in commands)
    assert meta["examplesCount"] == sum(len(c["examples"]) for c in commands)
    assert dt.datetime.fromisoformat(meta["updatedAt"].replace("Z", "+00:00")).tzinfo is not None


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    # Defence in depth for accidental HTML embedding: React should still render
    # strings as text. JSON.parse restores the original code/comparison symbols.
    body = json.dumps(value, ensure_ascii=False, indent=2)
    body = body.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")
    assert not any(character in body for character in "<>&"), "Unsafe raw HTML delimiter in JSON"
    path.write_text(body + "\n", encoding="utf-8")


def write_catalogue_gzip(json_path: Path) -> int:
    """Compress existing JSON reproducibly: fixed mtime, no source filename."""
    raw = json_path.read_bytes()
    buffer = io.BytesIO()
    with gzip.GzipFile(filename="", mode="wb", compresslevel=9, fileobj=buffer, mtime=0) as stream:
        stream.write(raw)
    compressed = buffer.getvalue()
    assert gzip.decompress(compressed) == raw, "gzip roundtrip changed catalogue"
    json_path.with_suffix(json_path.suffix + ".gz").write_bytes(compressed)
    return len(compressed)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--commit", default=PINNED_COMMIT, help="Full 40-character tldr commit SHA")
    parser.add_argument("--archive", type=Path, help="Previously downloaded GitHub archive for that commit")
    parser.add_argument("--updated-at", help="Snapshot ISO UTC date; defaults to pinned commit date, or resolves supplied commit date")
    parser.add_argument("--user-source", type=Path, help="Optional replacement attachment HTML; otherwise uses docs/user-examples.json")
    parser.add_argument("--output-dir", type=Path, default=PROJECT_ROOT / "client/public/data")
    parser.add_argument("--freeze-user-source", type=Path, help="Parse attachment to docs/user-examples.json, then import")
    args = parser.parse_args()
    if not re.fullmatch(r"[a-f0-9]{40}", args.commit):
        parser.error("--commit must be a full lowercase SHA, not a moving branch")
    snapshot = PROJECT_ROOT / "docs/user-examples.json"
    if args.freeze_user_source:
        records = attachment_records(args.freeze_user_source)
        write_json(snapshot, {"source": "pasted_content.txt (source fournie par l’utilisateur)",
                              "sha256": hashlib.sha256(args.freeze_user_source.read_bytes()).hexdigest(), "records": records})
    elif args.user_source:
        records = attachment_records(args.user_source)
    elif snapshot.exists():
        records = json.loads(snapshot.read_text(encoding="utf-8"))["records"]
    else:
        parser.error("Missing docs/user-examples.json snapshot; pass --user-source or --freeze-user-source")
    updated_at = args.updated_at or (PINNED_UPDATED_AT if args.commit == PINNED_COMMIT else None)
    if not updated_at:
        request = urllib.request.Request(f"https://api.github.com/repos/tldr-pages/tldr/commits/{args.commit}", headers={"User-Agent": "LinuxLab catalogue importer"})
        with urllib.request.urlopen(request, timeout=60) as response:
            updated_at = json.load(response)["commit"]["committer"]["date"]
    with tempfile.TemporaryDirectory(prefix="linuxlab-tldr-") as temporary:
        archive_path = args.archive
        if archive_path is None:
            archive_path = Path(temporary) / f"tldr-{args.commit}.tar.gz"
            url = f"https://codeload.github.com/tldr-pages/tldr/tar.gz/{args.commit}"
            print(f"Downloading pinned archive: {url}", flush=True)
            urllib.request.urlretrieve(url, archive_path)
        pages, _ = load_archive(archive_path, args.commit)
        commands, stats = catalogue(pages, args.commit, records)
    meta = {"count": len(commands), "frenchCount": sum(c["language"] == "fr" for c in commands),
            "examplesCount": sum(len(c["examples"]) for c in commands), "updatedAt": updated_at,
            "commit": args.commit, "source": f"{REPOSITORY}/tree/{args.commit}", "license": "CC-BY-4.0"}
    validate(commands, meta)
    write_json(args.output_dir / "commands.json", commands)
    write_json(args.output_dir / "catalogue-meta.json", meta)
    gzip_bytes = write_catalogue_gzip(args.output_dir / "commands.json")
    print(json.dumps({"meta": meta, "diagnostics": stats,
                      "gzipBytes": gzip_bytes,
                      "commandsBytes": (args.output_dir / "commands.json").stat().st_size,
                      "frenchEssentials": [c["name"] for c in commands if c["name"] in ESSENTIAL_NAMES and c["language"] == "fr"],
                      "englishEssentials": [c["name"] for c in commands if c["name"] in ESSENTIAL_NAMES and c["language"] == "en"],
                      "categories": dict(collections.Counter(c["category"] for c in commands)),
                      "commandsSha256": hashlib.sha256((args.output_dir / "commands.json").read_bytes()).hexdigest()}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
