"""Build the Network Cabling Series site from shell.html + <page>.part.html.

Usage: python _src/build.py
  -> _site/ : static site for Vercel (index.html + one page per topic, shared assets/)
"""
import re
from pathlib import Path

SRC = Path(__file__).parent
SITE = SRC.parent / "_site"
SERIES = [  # (key, number, nav name, zh, site file)
    ("basics", "01", "BASICS", "構造與雙絞", "copper-basics.html"),
    ("cat", "02", "CATEGORY", "Cat 等級", "cat-grades.html"),
    ("shield", "03", "SHIELDING", "遮蔽代碼", "shielding.html"),
    ("awg", "04", "AWG · JACKET", "線徑外被線序", "awg-jacket.html"),
    ("install", "05", "INSTALL", "佈線與驗收", "install-test.html"),
    ("fiber", "06", "FIBER", "光纖基礎", "fiber-basics.html"),
    ("module", "07", "MODULE", "光模組", "transceivers.html"),
    ("conn", "08", "CONNECTOR", "接頭與維護", "connectors.html"),
    ("ref", "09", "APPENDIX", "選型總表與辭典", "reference.html"),
]
RELATED = [
    ("https://poe-pd-series.vercel.app/", "↗ PoE PD", "受電端系列"),
]


def parse_part(text):
    parts = re.split(r"^<!--#([A-Z0-9_]+)-->\s*$", text, flags=re.M)
    return {parts[i]: parts[i + 1].strip("\n") for i in range(1, len(parts), 2)}


def nav(current):
    items = ['<span class="lab">系列 Series</span>']
    home = "<b>HOME</b>選型首頁"
    items.append(f'<span class="cur" aria-current="page">{home}</span>' if current == "home" else f'<a href="./">{home}</a>')
    for key, no, name, zh, f in SERIES:
        inner = f"<b>{no} {name}</b>{zh}"
        items.append(f'<span class="cur" aria-current="page">{inner}</span>' if key == current else f'<a href="{f}">{inner}</a>')
    for url, b, zh in RELATED:
        items.append(f'<a href="{url}" target="_blank" rel="noopener"><b>{b}</b>{zh}</a>')
    return "".join(items)


def fill(template, fields):
    return re.sub(r"\{\{([A-Z0-9_]+)\}\}", lambda m: fields.get(m.group(1), ""), template)


def main():
    shell = (SRC / "shell.html").read_text(encoding="utf-8-sig")
    css = "".join((SRC / n).read_text(encoding="utf-8-sig") for n in ("series.css", "base2.css", "cable.css"))
    reset = "html{color-scheme:light}body{margin:0}img{max-width:100%}[hidden]{display:none!important}\n"
    (SITE / "assets").mkdir(parents=True, exist_ok=True)
    (SITE / "assets" / "series.css").write_text(reset + css, encoding="utf-8")
    (SITE / "assets" / "common.js").write_text((SRC / "common.js").read_text(encoding="utf-8-sig"), encoding="utf-8")
    pages = [(k, no, f) for k, no, _, _, f in SERIES] + [("home", "", "index.html")]
    for key, no, site_file in pages:
        part = SRC / ("index.part.html" if key == "home" else f"{key}.part.html")
        if not part.exists():
            print("skip", part.name)
            continue
        fields = parse_part(part.read_text(encoding="utf-8-sig"))
        fields.update(NAV=nav(key), EYEBROW="Network Cabling Series" + (f" · {no}" if no else ""))
        html = fill(shell, fields)
        left = re.findall(r"\{\{[A-Z0-9_]+\}\}", html)
        if left:
            raise SystemExit(f"{part.name}: unfilled {left}")
        (SITE / site_file).write_text(html, encoding="utf-8")
        print("wrote _site/" + site_file)


if __name__ == "__main__":
    main()
