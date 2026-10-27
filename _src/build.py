"""Build the Network Cabling Series site from shell.html + <page>.part.html.

Usage: python _src/build.py
  -> _site/ : static site for Vercel
       index.html, reference.html          (shared: selector home, appendix)
       copper/*.html                        (銅纜篇 C1..)
       fiber/*.html                         (光纖篇 F1..)
       vercel.json                          (301 redirects from the old flat URLs)

Part files link to other pages by their *legacy flat names* (e.g. "cat-grades.html")
and to "assets/..."; the build rewrites both to the right relative path for each page.
"""
import json
import re
from pathlib import Path

SRC = Path(__file__).parent
SITE = SRC.parent / "_site"

SECTIONS = [  # (sec key, zh, en, body class, [(part key, code, nav name, zh, new path, legacy flat name)])
    ("copper", "銅纜篇", "COPPER", "sec-copper", [
        ("basics", "C1", "BASICS", "構造與雙絞", "copper/basics.html", "copper-basics.html"),
        ("shield", "C2", "SHIELDING", "遮蔽代碼", "copper/shielding.html", "shielding.html"),
        ("cat", "C3", "CATEGORY", "Cat 等級", "copper/category.html", "cat-grades.html"),
        ("awg", "C4", "AWG · JACKET", "線徑外被線序", "copper/awg-jacket.html", "awg-jacket.html"),
        ("install", "C5", "INSTALL", "佈線與驗收", "copper/install-test.html", "install-test.html"),
        ("dac", "C6", "DAC · AEC", "高速銅纜", "copper/dac-aec.html", "dac-aec.html"),
    ]),
    ("fiber", "光纖篇", "FIBER", "sec-fiber", [
        ("fiber", "F1", "FIBER", "光纖基礎", "fiber/basics.html", "fiber-basics.html"),
        ("conn", "F2", "CONNECTOR", "接頭與維護", "fiber/connectors.html", "connectors.html"),
        ("module", "F3", "MODULE", "光模組入門", "fiber/transceivers.html", "transceivers.html"),
        ("codes", "F4", "CODES", "模組代號解碼", "fiber/module-codes.html", "module-codes.html"),
        ("hs", "F5", "400G–1.6T", "高速光模組", "fiber/400g-1.6t.html", "400g-1.6t.html"),
        ("optics", "F6", "OPTICS", "光源與架構", "fiber/light-source.html", "light-source.html"),
    ]),
]
SHARED = [  # (part key, nav label, new path, legacy name)
    ("home", "選型首頁", "index.html", "index.html"),
    ("ref", "附錄・總表與辭典", "reference.html", "reference.html"),
]
NEW_PAGES = {"dac-aec.html", "module-codes.html", "400g-1.6t.html", "light-source.html"}  # alias names only, no redirect
RELATED = [("https://poe-pd-series.vercel.app/", "↗ PoE PD", "受電端系列")]


def pages():
    """Yield (part key, new path, section tuple or None, page tuple or None)."""
    for sec in SECTIONS:
        for pg in sec[4]:
            if (SRC / f"{pg[0]}.part.html").exists():
                yield pg[0], pg[4], sec, pg
    for key, _, path, _ in SHARED:
        if (SRC / ("index.part.html" if key == "home" else f"{key}.part.html")).exists():
            yield key, path, None, None


def built_secs():
    return [(s, [p for p in s[4] if (SRC / f"{p[0]}.part.html").exists()]) for s in SECTIONS]


def rel(path, depth):
    return "../" * depth + path


def nav(key, sec, depth):
    top = ['<span class="lab">網路線材 Series</span>']
    top.append('<span class="cur" aria-current="page"><b>HOME</b>選型首頁</span>' if key == "home"
               else f'<a href="{rel("index.html", depth)}"><b>HOME</b>選型首頁</a>')
    for s, pgs in built_secs():
        if not pgs:
            continue
        inner = f"<b>{s[2]}</b>{s[1]}"
        cls = ' class="sec-on"' if sec and sec[0] == s[0] else ""
        top.append(f'<a{cls} data-sec="{s[0]}" href="{rel(pgs[0][4], depth)}">{inner}</a>')
    top.append('<span class="cur" aria-current="page"><b>APPENDIX</b>附錄</span>' if key == "ref"
               else f'<a href="{rel("reference.html", depth)}"><b>APPENDIX</b>附錄</a>')
    for url, b, zh in RELATED:
        top.append(f'<a href="{url}" target="_blank" rel="noopener"><b>{b}</b>{zh}</a>')
    out = '<nav class="series" aria-label="網站分區 Sections">' + "".join(top) + "</nav>"
    if sec:
        sub = [f'<span class="lab">{sec[1]}</span>']
        for p in [p for s, ps in built_secs() if s[0] == sec[0] for p in ps]:
            inner = f"<b>{p[1]} {p[2]}</b>{p[3]}"
            sub.append(f'<span class="cur" aria-current="page">{inner}</span>' if p[0] == key
                       else f'<a href="{rel(p[4], depth)}">{inner}</a>')
        out += f'\n  <nav class="series sub" aria-label="{sec[1]}">' + "".join(sub) + "</nav>"
    return out


def link_map():
    m = {"index.html": "index.html", "reference.html": "reference.html"}
    for sec in SECTIONS:
        for p in sec[4]:
            m[p[5]] = p[4]
    return m


def rewrite(html, depth):
    """Point legacy flat links and assets/ at the right place for a page `depth` folders down."""
    m = link_map()
    pat = re.compile(r'(?<=["\'`(])(' + "|".join(re.escape(k) for k in m) + r')(?=[#"\'`)])')
    html = pat.sub(lambda x: rel(m[x.group(1)], depth), html)
    if depth:
        html = re.sub(r'(?<=["\'`(])assets/', "../" * depth + "assets/", html)
    return html


def fill(template, fields):
    return re.sub(r"\{\{([A-Z0-9_]+)\}\}", lambda m: fields.get(m.group(1), ""), template)


def parse_part(text):
    parts = re.split(r"^<!--#([A-Z0-9_]+)-->\s*$", text, flags=re.M)
    return {parts[i]: parts[i + 1].strip("\n") for i in range(1, len(parts), 2)}


def main():
    shell = (SRC / "shell.html").read_text(encoding="utf-8-sig")
    css = "".join((SRC / n).read_text(encoding="utf-8-sig") for n in ("series.css", "base2.css", "cable.css"))
    reset = "html{color-scheme:light}body{margin:0}img{max-width:100%}[hidden]{display:none!important}\n"
    # clean previously generated pages so moved/removed pages do not linger
    for f in list(SITE.glob("*.html")) + list(SITE.glob("copper/*.html")) + list(SITE.glob("fiber/*.html")):
        f.unlink()
    (SITE / "assets" / "img").mkdir(parents=True, exist_ok=True)
    (SITE / "assets" / "series.css").write_text(reset + css, encoding="utf-8")
    (SITE / "assets" / "common.js").write_text((SRC / "common.js").read_text(encoding="utf-8-sig"), encoding="utf-8")
    for img in (SRC / "img").glob("*.jpg"):  # real photos (Wikimedia Commons, credited on each page)
        (SITE / "assets" / "img" / img.name).write_bytes(img.read_bytes())
    for key, path, sec, pg in pages():
        part = SRC / ("index.part.html" if key == "home" else f"{key}.part.html")
        fields = parse_part(part.read_text(encoding="utf-8-sig"))
        depth = path.count("/")
        eyebrow = "Network Cabling Series" + (f" · {sec[1]} {pg[1]}" if sec else (" · 附錄" if key == "ref" else ""))
        fields.update(NAV=nav(key, sec, depth), EYEBROW=eyebrow, SEC=sec[3] if sec else "sec-home")
        # page titles in the parts still carry the old 01–09 numbers; swap in the new code
        code = pg[1] if sec else ("附錄" if key == "ref" else "")
        if code:
            fields["TITLE"] = re.sub(r"^\d\d ", code + " ", fields.get("TITLE", ""))
        html = fill(shell, fields)
        left = re.findall(r"\{\{[A-Z0-9_]+\}\}", html)
        if left:
            raise SystemExit(f"{part.name}: unfilled {left}")
        out = SITE / path
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(rewrite(html, depth), encoding="utf-8")
        print("wrote _site/" + path)
    redirects = [{"source": "/" + p[5], "destination": "/" + p[4], "permanent": True}
                 for s in SECTIONS for p in s[4] if p[5] not in NEW_PAGES]
    (SITE / "vercel.json").write_text(json.dumps({"redirects": redirects}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote _site/vercel.json ({len(redirects)} redirects)")


if __name__ == "__main__":
    main()
