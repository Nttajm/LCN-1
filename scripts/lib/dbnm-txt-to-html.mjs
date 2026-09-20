/**
 * Convert DBNM how-to .txt files (setuser-style) to doc-body HTML.
 */
export function txtToHtml(raw) {
    const lines = raw.replace(/\r\n/g, '\n').split('\n');
    const out = [];
    let i = 0;

    const isUnderline = (line) => /^=+$/.test(line.trim()) || /^-+$/.test(line.trim());

    const flushParagraph = (buf) => {
        const text = buf.join(' ').trim();
        if (text) out.push(`<p>${escapeHtml(text)}</p>`);
    };

    let paraBuf = [];
    let inCode = false;
    let codeLines = [];

    const flushCode = () => {
        if (!codeLines.length) return;
        out.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
        codeLines = [];
        inCode = false;
    };

    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();

        if (inCode) {
            if (line.startsWith('  ') || line.startsWith('\t')) {
                codeLines.push(line.replace(/^\s{2}/, '').replace(/^\t/, ''));
                i += 1;
                continue;
            }
            flushCode();
        }

        if (!trimmed) {
            flushParagraph(paraBuf);
            paraBuf = [];
            i += 1;
            continue;
        }

        const next = lines[i + 1];
        if (next !== undefined && isUnderline(next)) {
            flushParagraph(paraBuf);
            paraBuf = [];
            flushCode();
            const level = next.trim()[0] === '=' ? 'h1' : 'h2';
            out.push(`<${level}>${escapeHtml(trimmed)}</${level}>`);
            i += 2;
            continue;
        }

        if (line.startsWith('  ') || line.startsWith('\t')) {
            flushParagraph(paraBuf);
            paraBuf = [];
            inCode = true;
            codeLines.push(line.replace(/^\s{2}/, '').replace(/^\t/, ''));
            i += 1;
            continue;
        }

        if (/^[-*]\s+/.test(trimmed)) {
            flushParagraph(paraBuf);
            paraBuf = [];
            flushCode();
            const items = [];
            while (i < lines.length) {
                const t = lines[i].trim();
                if (/^[-*]\s+/.test(t)) {
                    items.push(t.replace(/^[-*]\s+/, ''));
                    i += 1;
                    continue;
                }
                if (!t && items.length) break;
                if (items.length && t && !isUnderline(lines[i + 1] || '') && !line.startsWith('  ')) {
                    items[items.length - 1] += ' ' + t;
                    i += 1;
                    continue;
                }
                break;
            }
            out.push('<ul>' + items.map((item) => `<li>${escapeHtml(item)}</li>`).join('') + '</ul>');
            continue;
        }

        paraBuf.push(trimmed);
        i += 1;
    }

    flushParagraph(paraBuf);
    flushCode();
    return out.join('');
}

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
