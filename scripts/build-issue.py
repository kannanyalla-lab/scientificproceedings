#!/usr/bin/env python3
"""Turns the plain-text issue sources in content/<issue>/*.txt into one JSON
file that the database seed loads (src/db/content/<issue>.json).

Source format (one article per file):
  key: value lines (type, pages, title, authors, aff a, corr, email, keywords, image)
  --- abstract <Heading>   paragraph text
  --- body                 ## headings, paragraphs, !fig file | caption, table blocks
  --- notes                end matter (declarations)
  --- refs                 numbered references
Citations in text are written ^1^, ^4-8^ or ^12,13^ and become links to the reference list.
"""
import html, json, re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent

def esc(s):
    return html.escape(s, quote=False)

def inline(s):
    s = esc(s)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"<em>\1</em>", s)
    s = re.sub(r"~(.+?)~", r"<sub>\1</sub>", s)
    def cite(m):
        parts = []
        for tok in re.split(r"(,)", m.group(1)):
            if tok == ",":
                parts.append(",")
                continue
            r = re.match(r"\s*(\d+)\s*[-–]\s*(\d+)\s*$", tok)
            if r:
                a, b = r.groups()
                parts.append(f'<a href="#ref-{a}">{a}</a>–<a href="#ref-{b}">{b}</a>')
            elif tok.strip().isdigit():
                n = tok.strip()
                parts.append(f'<a href="#ref-{n}">{n}</a>')
            else:
                parts.append(esc(tok))
        return '<sup class="cite">' + "".join(parts) + "</sup>"
    s = re.sub(r"(?<![0-9])\^([0-9,\-– ]+)\^", cite, s)
    s = re.sub(r"\^([^^]+)\^", r"<sup>\1</sup>", s)
    return s

def slugify(s):
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return s[:90].rstrip("-")

def blocks_to_html(lines, figbase, figs):
    out, para, i = [], [], 0
    def flush():
        if para:
            out.append("<p>" + inline(" ".join(para)) + "</p>")
            para.clear()
    while i < len(lines):
        ln = lines[i].rstrip()
        if not ln.strip():
            flush(); i += 1; continue
        if ln.startswith("### "):
            flush(); out.append(f"<h3>{inline(ln[4:])}</h3>")
        elif ln.startswith("## "):
            flush(); t = ln[3:]
            out.append(f'<h2 id="{slugify(t)}">{inline(t)}</h2>')
        elif ln.startswith("- "):
            flush(); items = []
            while i < len(lines) and lines[i].startswith("- "):
                items.append(f"<li>{inline(lines[i][2:])}</li>"); i += 1
            out.append("<ul>" + "".join(items) + "</ul>"); continue
        elif re.match(r"^\d+\. ", ln) and not para:
            items = []
            while i < len(lines) and re.match(r"^\d+\. ", lines[i]):
                items.append(f"<li>{inline(re.sub(r'^\d+\. ', '', lines[i]))}</li>"); i += 1
            out.append("<ol>" + "".join(items) + "</ol>"); continue
        elif ln.startswith("!fig "):
            flush()
            files, cap = [x.strip() for x in ln[5:].split("|", 1)]
            imgs = ""
            for f in files.split(","):
                f = f.strip(); src = f"{figbase}/{f}"; figs.append(src)
                imgs += f'<a href="{src}" target="_blank" rel="noopener"><img src="{src}" alt="{esc(re.sub(r"[*^]", "", cap))}" loading="lazy"></a>'
            m = re.match(r"((?:Figure|Fig\.?|Image)\s*[\dA-Za-z,\s&and–-]*?[:.])\s*(.*)", cap)
            capt = f"<strong>{esc(m.group(1))}</strong> {inline(m.group(2))}" if m else inline(cap)
            out.append(f'<figure class="fig">{imgs}<figcaption>{capt}</figcaption></figure>')
        elif ln.startswith("!table"):
            flush(); i += 1; rows = []; cap = ""
            while i < len(lines) and lines[i].strip() != "!end":
                if lines[i].startswith("caption:"):
                    cap = lines[i][8:].strip()
                elif lines[i].strip():
                    raw = lines[i].strip()
                    # cells are separated by a pipe with space (or a line end) on both sides
                    cells = [c.strip() for c in re.split(r"(?:^|(?<=\s))\|(?=\s|$)", raw.strip("|").strip())]
                    # a row written as " | x | y" continues the cell above it
                    rows.append([""] + cells if raw.startswith("|") else cells)
                i += 1
            head, body = rows[0], rows[1:]
            # Rows may leave trailing cells empty; pad them to the header width.
            body = [r + [""] * (len(head) - len(r)) for r in body]
            t = '<div class="table-wrap"><table><thead><tr>' + "".join(f"<th>{inline(c)}</th>" for c in head) + "</tr></thead><tbody>"
            for r in body:
                t += "<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>"
            t += "</tbody></table></div>"
            m = re.match(r"(Table\s*\d+[.:])\s*(.*)", cap)
            if cap:
                capt = f"<strong>{esc(m.group(1))}</strong> {inline(m.group(2))}" if m else inline(cap)
                t = f'<figure class="tbl"><figcaption>{capt}</figcaption>{t}</figure>'
            out.append(t)
        elif ln.startswith("!box"):
            flush(); title = ln[4:].strip(); i += 1; inner = []
            while i < len(lines) and lines[i].strip() != "!endbox":
                inner.append(lines[i]); i += 1
            h = f"<h4>{inline(title)}</h4>" if title else ""
            out.append(f'<aside class="panel">{h}{blocks_to_html(inner, figbase, figs)}</aside>')
        elif ln.startswith("> "):
            flush(); out.append(f'<div class="boxed">{inline(ln[2:])}</div>')
        else:
            para.append(ln.strip())
        i += 1
    flush()
    return "\n".join(out)

def parse_article(path, figbase):
    text = path.read_text(encoding="utf-8")
    head, *sections = re.split(r"^--- ", text, flags=re.M)
    meta = {}
    for ln in head.splitlines():
        if ":" in ln and not ln.startswith("#"):
            k, v = ln.split(":", 1); meta.setdefault(k.strip(), []).append(v.strip())
    g = lambda k: (meta.get(k) or [""])[0]
    a = {
        "title": g("title"), "articleType": g("type"),
        "authors": [], "affiliations": [], "keywords": [], "abstract": [], "refs": [],
        "correspondingAuthor": g("corr") or None, "correspondingEmail": g("email") or None,
    }
    for au in [x.strip() for x in g("authors").split(";") if x.strip()]:
        m = re.match(r"(.+?)\s*\(([^)]*)\)$", au)
        a["authors"].append({"name": m.group(1), "aff": m.group(2)} if m else {"name": au})
    for k, vs in meta.items():
        if k.startswith("aff "):
            a["affiliations"].append({"key": k[4:].strip(), "text": vs[0]})
    a["affiliations"].sort(key=lambda x: x["key"])
    a["keywords"] = [k.strip() for k in g("keywords").split(";") if k.strip()]
    if g("pages"):
        p = g("pages").split("-"); a["pageStart"] = p[0]; a["pageEnd"] = p[-1]
    figs = []
    for sec in sections:
        name, _, body = sec.partition("\n")
        name = name.strip()
        if name.startswith("abstract"):
            a["abstract"].append({"heading": name[8:].strip(), "text": " ".join(l.strip() for l in body.strip().splitlines() if l.strip())})
        elif name == "body":
            a["bodyHtml"] = blocks_to_html(body.splitlines(), figbase, figs)
        elif name == "notes":
            a["notesHtml"] = blocks_to_html(body.splitlines(), figbase, figs)
        elif name == "refs":
            cur = []
            for l in body.splitlines():
                l = l.strip()
                if not l: continue
                if re.match(r"^\d+\.\s", l):
                    cur.append(re.sub(r"^\d+\.\s*", "", l))
                elif cur:
                    cur[-1] += ("" if cur[-1].endswith(("-", "/", ".")) and re.match(r"^[0-9a-z]", l) and "doi" in cur[-1][-30:].lower() else " ") + l
            a["refs"] = cur
    # A citation to a reference that is not in the list stays as plain text.
    n = len(a["refs"])
    def unlink(m):
        return m.group(0) if int(m.group(1)) <= n else m.group(1)
    for k in ("bodyHtml", "notesHtml"):
        if a.get(k):
            a[k] = re.sub(r'<a href="#ref-(\d+)">\d+</a>', unlink, a[k])
    img = g("image")
    a["imageUrl"] = f"{figbase}/{img}" if img else (figs[0] if figs else None)
    a["featured"] = g("featured").lower() == "yes"
    return a

def main(issue_dir):
    d = ROOT / "content" / issue_dir
    issue = json.loads((d / "issue.json").read_text(encoding="utf-8"))
    figbase = issue["assetBase"] + "/fig"
    arts = []
    for i, f in enumerate(sorted(d.glob("a*.txt"))):
        a = parse_article(f, figbase); a["sortOrder"] = i; arts.append(a)
    extra = {}
    for f in sorted(d.glob("x-*.txt")):
        extra[f.stem[2:]] = f.read_text(encoding="utf-8")
    out = {"issue": issue, "articles": arts}
    for name in ("pharma", "spotters", "scramble"):
        p = d / f"{name}.json"
        if p.exists():
            out[name] = json.loads(p.read_text(encoding="utf-8"))
    if "pharma" in out:
        for p in out["pharma"]:
            if "body" in p:
                p["bodyHtml"] = blocks_to_html(p.pop("body").splitlines(), figbase, [])
    dest = ROOT / "src" / "db" / "content" / f"{issue_dir}.json"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"wrote {dest.relative_to(ROOT)}: {len(arts)} articles")

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "2026-09")
