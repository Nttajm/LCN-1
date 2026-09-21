(function (global) {
    var ASSET_PREFIX = 'a_home_assets/';
    var DEFAULT_IMAGE = ASSET_PREFIX + 'gradients/g_2_gray.jpg';

    function normalizeAssetSrc(src) {
        if (!src || typeof src !== 'string') return '';
        src = src.trim();
        if (!src) return '';

        if (/^data:/i.test(src)) return src;

        src = src.replace(/^https?:\/\/[^/]+/i, '');
        if (src.charAt(0) === '/') src = src.slice(1);
        while (src.indexOf('../') === 0) src = src.slice(3);
        while (src.indexOf('./') === 0) src = src.slice(2);

        if (src === ASSET_PREFIX + 'content/screenshots/josu_home' ||
            src.endsWith('/screenshots/josu_home')) {
            src = ASSET_PREFIX + 'content/screenshots/josu_home.png';
        }

        if (src.indexOf(ASSET_PREFIX) === 0) return src;

        if (/^https?:\/\//i.test(src)) return src;

        if (src.indexOf('content/') === 0 || src.indexOf('gradients/') === 0) {
            return ASSET_PREFIX + src;
        }

        return src;
    }

    function resolveAssetUrl(src, opts) {
        opts = opts || {};
        var root = opts.root != null ? opts.root : '';
        var normalized = normalizeAssetSrc(src);
        if (!normalized) return root + DEFAULT_IMAGE;
        if (/^https?:\/\//i.test(normalized) || /^data:/i.test(normalized)) {
            return normalized;
        }
        return root + normalized;
    }

    function rewriteContentHtml(html, opts) {
        if (!html) return html;
        opts = opts || {};
        var root = opts.root != null ? opts.root : '../';
        var tmp = document.createElement('div');
        tmp.innerHTML = html;
        tmp.querySelectorAll('img[src]').forEach(function (img) {
            var resolved = resolveAssetUrl(img.getAttribute('src'), { root: root });
            img.setAttribute('src', resolved);
        });
        return tmp.innerHTML;
    }

    function canonicalizeContentHtmlForSave(html) {
        if (!html) return html;
        var tmp = document.createElement('div');
        tmp.innerHTML = html;
        tmp.querySelectorAll('img[src]').forEach(function (img) {
            var normalized = normalizeAssetSrc(img.getAttribute('src'));
            if (!normalized) return;
            if (normalized.indexOf(ASSET_PREFIX) === 0) {
                img.setAttribute('src', '../' + normalized);
            } else {
                img.setAttribute('src', normalized);
            }
        });
        return tmp.innerHTML;
    }

    global.LCN = global.LCN || {};
    global.LCN.normalizeAssetSrc = normalizeAssetSrc;
    global.LCN.resolveAssetUrl = resolveAssetUrl;
    global.LCN.rewriteContentHtml = rewriteContentHtml;
    global.LCN.canonicalizeContentHtmlForSave = canonicalizeContentHtmlForSave;
    global.LCN.DEFAULT_ASSET_IMAGE = DEFAULT_IMAGE;
})(typeof window !== 'undefined' ? window : this);
