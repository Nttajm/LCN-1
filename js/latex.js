(function (global) {
    function encodeLatex(src) {
        return encodeURIComponent(String(src || ''));
    }

    function decodeLatex(raw) {
        if (!raw) return '';
        try {
            return decodeURIComponent(raw);
        } catch (e) {
            return raw;
        }
    }

    function getSource(el) {
        if (!el) return '';
        return decodeLatex(el.getAttribute('data-latex') || '');
    }

    function isDisplay(el) {
        return !!(el && el.getAttribute('data-display') === 'true');
    }

    function render(el, options) {
        if (!el || !global.katex) return null;
        options = options || {};
        var src = options.source != null ? String(options.source) : getSource(el);
        var display = options.display != null ? !!options.display : isDisplay(el);

        el.setAttribute('data-latex', encodeLatex(src));
        el.setAttribute('data-display', display ? 'true' : 'false');
        el.setAttribute('contenteditable', 'false');
        el.classList.add('ed-math');
        el.classList.toggle('ed-math--display', display);
        el.classList.toggle('ed-math--inline', !display);

        if (display) {
            if (el.tagName !== 'DIV') {
                /* keep tag as-is when already a div */
            }
        }

        try {
            global.katex.render(src, el, {
                displayMode: display,
                throwOnError: false,
                strict: 'ignore',
                output: 'html'
            });
            el.classList.remove('ed-math--error');
            el.removeAttribute('title');
        } catch (err) {
            el.textContent = src || '(empty)';
            el.classList.add('ed-math--error');
            el.title = err && err.message ? err.message : 'Invalid LaTeX';
        }

        return { source: src, display: display };
    }

    function renderAll(root) {
        root = root || document;
        if (!global.katex) return 0;
        var nodes = root.querySelectorAll('.ed-math');
        nodes.forEach(function (el) {
            render(el);
        });
        return nodes.length;
    }

    function createElement(source, display) {
        var el = document.createElement(display ? 'div' : 'span');
        el.className = 'ed-math ' + (display ? 'ed-math--display' : 'ed-math--inline');
        el.setAttribute('contenteditable', 'false');
        render(el, { source: source || '', display: !!display });
        return el;
    }

    function stripRendered(root) {
        if (!root) return;
        root.querySelectorAll('.ed-math').forEach(function (el) {
            el.innerHTML = '';
            el.classList.remove('ed-math--error', 'ed-math--selected');
        });
    }

    global.EdLatex = {
        encodeLatex: encodeLatex,
        decodeLatex: decodeLatex,
        getSource: getSource,
        isDisplay: isDisplay,
        render: render,
        renderAll: renderAll,
        createElement: createElement,
        stripRendered: stripRendered
    };
})(typeof window !== 'undefined' ? window : this);
