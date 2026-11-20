// Turns the light text markup used for article bodies into the HTML the site
// shows. Same rules as scripts/build-issue.py (which builds the bundled
// editions), so imported and bundled articles look identical:
//   ## Heading, ### Subheading, - bullet, 1. numbered, > boxed note
//   ^1^, ^4-8^, ^12,13^  citations (linked to the reference list); ^2^ after a non-digit is superscript
//   ~2~ subscript, **bold**, *italic*
//   !fig <figure ids> | Figure 1: caption
//   !table / caption: ... / cells separated by " | " / !end
//   !box Title ... !endbox

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90).replace(/-+$/, "");
}

export function inline(raw: string) {
  let s = esc(raw);
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])/g, "<em>$1</em>");
  s = s.replace(/~(.+?)~/g, "<sub>$1</sub>");
  s = s.replace(/(?<![0-9])\^([0-9,\-– ]+)\^/g, (_m, inner: string) => {
    const parts = inner.split(/(,)/).map((tok) => {
      if (tok === ",") return ",";
      const r = tok.match(/^\s*(\d+)\s*[-–]\s*(\d+)\s*$/);
      if (r) return `<a href="#ref-${r[1]}">${r[1]}</a>–<a href="#ref-${r[2]}">${r[2]}</a>`;
      if (/^\s*\d+\s*$/.test(tok)) { const n = tok.trim(); return `<a href="#ref-${n}">${n}</a>`; }
      return esc(tok);
    });
    return `<sup class="cite">${parts.join("")}</sup>`;
  });
  s = s.replace(/\^([^^]+)\^/g, "<sup>$1</sup>");
  return s;
}

/** Plain text with citation and emphasis markers removed (for abstracts and alt text). */
export function plain(s: string) {
  return s.replace(/(?<![0-9])\^[0-9,\-– ]+\^/g, "").replace(/\*\*?|~/g, "").replace(/\^([^^]+)\^/g, "$1").replace(/\s+([.,;:])/g, "$1").trim();
}

/** Turns a figure reference (as written after !fig) into an image URL, or null if it can't. */
export type FigureResolver = (ref: string) => string | null;

export function blocksToHtml(lines: string[], fig: FigureResolver, figs: string[] = []): string {
  const out: string[] = [];
  const para: string[] = [];
  const flush = () => { if (para.length) { out.push(`<p>${inline(para.join(" "))}</p>`); para.length = 0; } };
  let i = 0;
  while (i < lines.length) {
    const ln = lines[i].replace(/\s+$/, "");
    if (!ln.trim()) { flush(); i++; continue; }
    if (ln.startsWith("### ")) { flush(); out.push(`<h3>${inline(ln.slice(4))}</h3>`); }
    else if (ln.startsWith("## ")) { flush(); const t = ln.slice(3); out.push(`<h2 id="${slugify(t)}">${inline(t)}</h2>`); }
    else if (ln.startsWith("- ")) {
      flush(); const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) { items.push(`<li>${inline(lines[i].slice(2))}</li>`); i++; }
      out.push(`<ul>${items.join("")}</ul>`); continue;
    } else if (/^\d+\. /.test(ln) && !para.length) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) { items.push(`<li>${inline(lines[i].replace(/^\d+\. /, ""))}</li>`); i++; }
      out.push(`<ol>${items.join("")}</ol>`); continue;
    } else if (ln.startsWith("!fig ")) {
      flush();
      const [refs, cap = ""] = ln.slice(5).split(/\|([^]*)/).map((x) => (x ?? "").trim());
      const alt = esc(plain(cap)).replace(/"/g, "&quot;");
      let imgs = "";
      for (const ref of refs.split(",").map((x) => x.trim()).filter(Boolean)) {
        const src = fig(ref);
        if (!src) continue;
        figs.push(src);
        imgs += `<a href="${src}" target="_blank" rel="noopener"><img src="${src}" alt="${alt}" loading="lazy"></a>`;
      }
      const m = cap.match(/^((?:Figure|Fig\.?|Image)\s*[\dA-Za-z,\s&and–-]*?[:.])\s*([^]*)$/);
      const capt = m ? `<strong>${esc(m[1])}</strong> ${inline(m[2])}` : inline(cap);
      if (imgs) out.push(`<figure class="fig">${imgs}<figcaption>${capt}</figcaption></figure>`);
      else if (cap) out.push(`<p><em>${capt}</em></p>`);
    } else if (ln.startsWith("!table")) {
      flush(); i++;
      const rows: string[][] = []; let cap = "";
      while (i < lines.length && lines[i].trim() !== "!end") {
        if (lines[i].startsWith("caption:")) cap = lines[i].slice(8).trim();
        else if (lines[i].trim()) {
          const raw = lines[i].trim();
          const cells = raw.replace(/^\|+|\|+$/g, "").trim().split(/(?:^|(?<=\s))\|(?=\s|$)/).map((c) => c.trim());
          rows.push(raw.startsWith("|") ? ["", ...cells] : cells);
        }
        i++;
      }
      if (rows.length) {
        const [head, ...body] = rows;
        let t = `<div class="table-wrap"><table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>`;
        for (const r of body) t += `<tr>${[...r, ...Array(Math.max(0, head.length - r.length)).fill("")].map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`;
        t += "</tbody></table></div>";
        if (cap) {
          const m = cap.match(/^(Table\s*\d+[.:])\s*([^]*)$/);
          const capt = m ? `<strong>${esc(m[1])}</strong> ${inline(m[2])}` : inline(cap);
          t = `<figure class="tbl"><figcaption>${capt}</figcaption>${t}</figure>`;
        }
        out.push(t);
      }
    } else if (ln.startsWith("!box")) {
      flush(); const title = ln.slice(4).trim(); i++; const inner: string[] = [];
      while (i < lines.length && lines[i].trim() !== "!endbox") { inner.push(lines[i]); i++; }
      out.push(`<aside class="panel">${title ? `<h4>${inline(title)}</h4>` : ""}${blocksToHtml(inner, fig, figs)}</aside>`);
    } else if (ln.startsWith("> ")) { flush(); out.push(`<div class="boxed">${inline(ln.slice(2))}</div>`); }
    else para.push(ln.trim());
    i++;
  }
  flush();
  return out.join("\n");
}

/** Leaves citations to references that aren't in the list as plain numbers. */
export function unlinkMissingRefs(html: string, refCount: number) {
  return html.replace(/<a href="#ref-(\d+)">(\d+)<\/a>/g, (m, n) => (Number(n) <= refCount ? m : n));
}
