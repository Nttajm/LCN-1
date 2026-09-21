'use strict';

const fs = require('fs');
const path = require('path');

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function inlineFormat(text) {
    let s = escapeHtml(text);
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    return s;
}

function parseImageMarkdown(line) {
    // ![alt](url) or ![alt](url "width:320") or ![alt](url =320x)
    const m = line.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?(?:\s+=(\d+)x?)?\)$/);
    if (!m) return null;
    const alt = escapeHtml(m[1] || '');
    const src = escapeHtml(m[2]);
    let width = null;
    if (m[4]) width = m[4];
    else if (m[3]) {
        const wm = m[3].match(/width\s*[:=]\s*(\d+)/i);
        if (wm) width = wm[1];
    }
    const style = width ? ` style="width:${width}px;"` : '';
    const widthAttr = width ? ` width="${width}"` : '';
    return `<img src="${src}" alt="${alt}"${widthAttr}${style}>`;
}

function markdownToHtml(md) {
    const lines = String(md).replace(/\r\n/g, '\n').split('\n');
    const out = [];
    let i = 0;
    let inUl = false;
    let inOl = false;
    let inBq = false;

    function closeLists() {
        if (inUl) {
            out.push('</ul>');
            inUl = false;
        }
        if (inOl) {
            out.push('</ol>');
            inOl = false;
        }
    }

    function closeBq() {
        if (inBq) {
            out.push('</blockquote>');
            inBq = false;
        }
    }

    while (i < lines.length) {
        const line = lines[i];

        if (line.startsWith('```')) {
            closeLists();
            closeBq();
            const lang = escapeHtml(line.slice(3).trim());
            const codeLines = [];
            i += 1;
            while (i < lines.length && !lines[i].startsWith('```')) {
                codeLines.push(lines[i]);
                i += 1;
            }
            const code = escapeHtml(codeLines.join('\n'));
            const cls = lang ? ` class="language-${lang}"` : '';
            out.push(`<pre><code${cls}>${code}</code></pre>`);
            i += 1;
            continue;
        }

        const img = parseImageMarkdown(line.trim());
        if (img) {
            closeLists();
            closeBq();
            out.push(`<p>${img}</p>`);
            i += 1;
            continue;
        }

        const h = line.match(/^(#{1,3})\s+(.+)$/);
        if (h) {
            closeLists();
            closeBq();
            const level = h[1].length;
            out.push(`<h${level}>${inlineFormat(h[2].trim())}</h${level}>`);
            i += 1;
            continue;
        }

        if (/^>\s?/.test(line)) {
            closeLists();
            if (!inBq) {
                out.push('<blockquote>');
                inBq = true;
            }
            out.push(`<p>${inlineFormat(line.replace(/^>\s?/, ''))}</p>`);
            i += 1;
            continue;
        }
        if (inBq && line.trim() === '') {
            closeBq();
            i += 1;
            continue;
        }
        if (inBq && !/^>\s?/.test(line)) {
            closeBq();
        }

        const ul = line.match(/^[-*]\s+(.+)$/);
        if (ul) {
            closeBq();
            if (inOl) {
                out.push('</ol>');
                inOl = false;
            }
            if (!inUl) {
                out.push('<ul>');
                inUl = true;
            }
            out.push(`<li>${inlineFormat(ul[1])}</li>`);
            i += 1;
            continue;
        }

        const ol = line.match(/^\d+\.\s+(.+)$/);
        if (ol) {
            closeBq();
            if (inUl) {
                out.push('</ul>');
                inUl = false;
            }
            if (!inOl) {
                out.push('<ol>');
                inOl = true;
            }
            out.push(`<li>${inlineFormat(ol[1])}</li>`);
            i += 1;
            continue;
        }

        if (line.trim() === '') {
            closeLists();
            closeBq();
            i += 1;
            continue;
        }

        closeLists();
        closeBq();
        out.push(`<p>${inlineFormat(line)}</p>`);
        i += 1;
    }

    closeLists();
    closeBq();
    return out.join('\n');
}

function looksLikeHtml(text) {
    const t = String(text).trim();
    return /^</.test(t) || /<\/[a-z][\w-]*>/i.test(t);
}

function loadContentFromFile(filePath) {
    const abs = path.resolve(filePath);
    if (!fs.existsSync(abs)) {
        throw new Error('Content file not found: ' + abs);
    }
    const raw = fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, '');
    const ext = path.extname(abs).toLowerCase();
    if (ext === '.md' || ext === '.markdown') {
        return markdownToHtml(raw);
    }
    if (ext === '.html' || ext === '.htm' || looksLikeHtml(raw)) {
        return raw;
    }
    // Default: treat unknown text as markdown for agent convenience
    return markdownToHtml(raw);
}

function resolveSiteUrl(url) {
    if (!url) return url;
    const trimmed = String(url).trim();
    if (!trimmed) return trimmed;
    if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) || trimmed.charAt(0) === '/' || trimmed.charAt(0) === '#' || trimmed.indexOf('//') === 0) {
        return trimmed;
    }
    let next = trimmed;
    if (next.indexOf('./') === 0) next = next.slice(2);
    return '/' + next.replace(/^\/+/, '');
}

function normalizeDateInput(value) {
    if (!value) return '';
    const s = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + month + '-' + day;
}

function parseImagesCsv(csv) {
    if (!csv) return [];
    return String(csv)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

module.exports = {
    markdownToHtml,
    loadContentFromFile,
    resolveSiteUrl,
    normalizeDateInput,
    parseImagesCsv,
    looksLikeHtml
};
