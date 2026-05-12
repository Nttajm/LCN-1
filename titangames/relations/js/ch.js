(function () {
    'use strict';

    function seededRand(str) {
        let h = 2166136261 >>> 0;
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619) >>> 0;
        }
        return h / 0xFFFFFFFF;
    }

    const _perfBase = performance.now();
    const _dateBase = Date.now();
    const CLOCK_DRIFT_MS = 5000;
    let _serverOffset = 0;

    function isSuspiciousClockDrift() {
        var elapsed = performance.now() - _perfBase;
        return Math.abs(Date.now() - (_dateBase + elapsed)) > CLOCK_DRIFT_MS;
    }

    function trustedNowMs() {
        return Date.now() + _serverOffset;
    }

    function fetchServerTime() {
        return fetch(window.location.href, { method: 'HEAD', cache: 'no-store' })
            .then(function (r) {
                var d = r.headers.get('Date');
                if (d) {
                    var st = new Date(d).getTime();
                    if (!isNaN(st)) { _serverOffset = st - Date.now(); }
                }
            })
            .catch(function () {  });
    }

    function getTodayKey() {
        const d = new Date(trustedNowMs());
        return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    }

    function getOpenMinutes() {
        return 600 + Math.floor(seededRand(getTodayKey() + ':relations:gate') * 91);
    }

    function formatMinutes(totalMin) {
        const h = Math.floor(totalMin / 60) % 12 || 12;
        const m = String(totalMin % 60).padStart(2, '0');
        const ampm = totalMin < 720 ? 'AM' : 'PM';
        return h + ':' + m + ' ' + ampm;
    }

    function nowMinutes() {
        const d = new Date(trustedNowMs());
        return d.getHours() * 60 + d.getMinutes();
    }

    function isUnlocked() {
        return nowMinutes() >= getOpenMinutes();
    }

    const GATE_KEY = '__relationsGate_v1';
    let _gateOpen  = false;
    let _tampered  = false;
    let _noPuzzle  = false;

    try {
        Object.defineProperty(window, GATE_KEY, {
            get: function () { return { open: _gateOpen, tampered: _tampered, noPuzzle: _noPuzzle }; },
            set: function () {  },
            configurable: false,
            enumerable: false
        });
    } catch (e) {  }

    function setGate(open) {
        _gateOpen = !!open;
    }

    function markTampered() {
        if (_tampered) return;
        _tampered = true;
        setGate(false);
        var ov = document.getElementById('_ngOverlay');
        if (ov) {
            var msg  = ov.querySelector('._ng-msg');
            var sub  = ov.querySelector('._ng-sub');
            var cd   = ov.querySelector('._ng-countdown');
            var icon = ov.querySelector('._ng-icon');
            if (icon) icon.textContent = '⚠️';
            if (msg)  msg.textContent  = 'Game unavailable.';
            if (sub)  sub.textContent  = 'Reload the page to try again.';
            if (cd)   cd.textContent   = '';
            ov.style.cssText = 'display:flex!important;visibility:visible!important;opacity:1!important;pointer-events:all!important;';
        }
    }

    function checkAndMarkClockTamper() {
        if (!_tampered && isSuspiciousClockDrift()) { markTampered(); }
    }

    function fetchPuzzleExists() {
        var d = new Date(trustedNowMs());
        var dateStr = d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
        var url = 'https://firestore.googleapis.com/v1/projects/square-lcn' +
            '/databases/(default)/documents/relations/' + dateStr +
            '?key=AIzaSyDNXZ1Xnm3FrE4Ofo8ClzJ8sph7NoVSgnk';
        return fetch(url, { cache: 'no-store' })
            .then(function (r) {
                if (r.status === 404) return false;
                if (!r.ok) return null;
                return r.json().then(function (data) {
                    if (data && data.error) {
                        return null;
                    }
                    var fields = data && data.fields;
                    if (!fields) return false;
                    var status = fields.status && fields.status.stringValue;
                    return status === 'published' && !!fields.categories;
                }).catch(function () {
                    return null;
                });
            })
            .catch(function () { return null; });
    }

    function showNoPuzzleOverlay() {
        _noPuzzle = true;
        injectStyles();
        var overlay = document.createElement('div');
        overlay.id = '_ngOverlay';
        overlay.innerHTML =
            '<div class="_ng-icon">📅</div>' +
            '<p class="_ng-title">Relations</p>' +
            '<p class="_ng-msg">No puzzle today.</p>' +
            '<p class="_ng-sub">Check back tomorrow for a new puzzle.</p>';
        document.body.appendChild(overlay);

        var obs = new MutationObserver(function (mutations) {
            for (var mi = 0; mi < mutations.length; mi++) {
                var mut = mutations[mi];
                if (mut.type === 'childList') {
                    for (var ri = 0; ri < mut.removedNodes.length; ri++) {
                        var node = mut.removedNodes[ri];
                        if (node.nodeType !== 1) continue;
                        if (node.id === '_ngOverlay' ||
                            (typeof node.querySelector === 'function' &&
                             node.querySelector('#_ngOverlay'))) {
                            var bare = document.createElement('div');
                            bare.id = '_ngOverlay';
                            bare.style.cssText = [
                                'position:fixed;inset:0;z-index:9999;',
                                'background:rgba(18,18,18,0.9);',
                                'display:flex;align-items:center;justify-content:center;',
                                'font-family:sans-serif;color:#fff;font-size:1.1rem;',
                                'pointer-events:all;',
                            ].join('');
                            bare.textContent = 'No puzzle today. Check back tomorrow.';
                            document.body.appendChild(bare);
                            return;
                        }
                    }
                }
                if (mut.type === 'attributes' && mut.target.id === '_ngOverlay') {
                    var t = mut.target;
                    if (t.style.display === 'none' || t.style.visibility === 'hidden' ||
                        t.style.opacity === '0' || t.hasAttribute('hidden')) {
                        t.style.cssText = 'display:flex!important;visibility:visible!important;opacity:1!important;pointer-events:all!important;';
                    }
                }
            }
        });
        obs.observe(document.body, {
            childList: true, subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class', 'hidden', 'aria-hidden']
        });
    }

    function loadRelations() {
        setGate(true);
        var script = document.createElement('script');
        script.type = 'module';
        script.src = 'js/relations.js';
        document.head.appendChild(script);
    }

    function injectStyles() {
        var style = document.createElement('style');
        style.id = '_ngStyles';
        style.textContent = [
            '#_ngOverlay{',
            '  position:fixed;inset:0;z-index:9999;',
            '  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;',
            '  background:rgba(18,18,18,0.82);',
            '  backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);',
            '  font-family:"Libre Franklin",sans-serif;color:#fff;',
            '  text-align:center;padding:32px;box-sizing:border-box;',
            '  pointer-events:all;',
            '}',
            '._ng-icon{font-size:2.8rem;line-height:1;margin-bottom:2px;}',
            '._ng-title{',
            '  font-size:1.6rem;font-weight:700;letter-spacing:.08em;',
            '  text-transform:uppercase;color:#fff;margin:0;',
            '}',
            '._ng-msg{',
            '  font-size:1.1rem;color:#c9b458;font-weight:600;margin:0;',
            '}',
            '._ng-countdown{',
            '  font-size:2.4rem;font-weight:700;',
            '  font-variant-numeric:tabular-nums;letter-spacing:.1em;',
            '  color:#fff;min-height:2.8rem;',
            '}',
            '._ng-sub{',
            '  font-size:.85rem;color:rgba(255,255,255,.5);margin:0;',
            '}',
        ].join('');
        document.head.appendChild(style);
    }

    function formatCountdown(diffMs) {
        if (diffMs <= 0) return '0:00:00';
        var totalSec = Math.floor(diffMs / 1000);
        var h = Math.floor(totalSec / 3600);
        var m = Math.floor((totalSec % 3600) / 60);
        var s = totalSec % 60;
        return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }

    function createOverlay(openTimeStr, openMin) {
        injectStyles();

        var overlay = document.createElement('div');
        overlay.id = '_ngOverlay';
        overlay.innerHTML =
            '<div class="_ng-icon">🔒</div>' +
            '<p class="_ng-title">Relations</p>' +
            '<p class="_ng-msg">Opens today at ' + openTimeStr + '</p>' +
            '<div class="_ng-countdown"></div>' +
            '<p class="_ng-sub">Come back then to play today\'s puzzle.</p>';
        document.body.appendChild(overlay);

        function tick() {
            if (_tampered || isUnlocked()) return;
            var now = new Date(trustedNowMs());
            var openMs = new Date(
                now.getFullYear(), now.getMonth(), now.getDate(),
                Math.floor(openMin / 60), openMin % 60, 0
            ).getTime();
            var el = document.getElementById('_ngOverlay');
            if (el) {
                var cd = el.querySelector('._ng-countdown');
                if (cd) cd.textContent = formatCountdown(openMs - trustedNowMs());
            }
        }
        tick();
        var tickInterval = setInterval(function () {
            checkAndMarkClockTamper();
            if (_tampered || isUnlocked()) { clearInterval(tickInterval); return; }
            tick();
        }, 1000);

        var observer = new MutationObserver(function (mutations) {
            if (_tampered || isUnlocked()) return;

            for (var mi = 0; mi < mutations.length; mi++) {
                var mut = mutations[mi];

                if (mut.type === 'childList') {
                    for (var ri = 0; ri < mut.removedNodes.length; ri++) {
                        var node = mut.removedNodes[ri];
                        if (node.nodeType !== 1) continue;
                        if (
                            node.id === '_ngOverlay' ||
                            (typeof node.querySelector === 'function' &&
                             node.querySelector('#_ngOverlay'))
                        ) {
                            markTampered();
                            clearInterval(tickInterval);
                            var bare = document.createElement('div');
                            bare.id = '_ngOverlay';
                            bare.style.cssText = [
                                'position:fixed;inset:0;z-index:9999;',
                                'background:rgba(18,18,18,0.9);',
                                'display:flex;align-items:center;justify-content:center;',
                                'font-family:sans-serif;color:#fff;font-size:1.1rem;',
                                'pointer-events:all;',
                            ].join('');
                            bare.textContent = 'Game unavailable. Reload the page.';
                            document.body.appendChild(bare);
                            return;
                        }
                    }
                }

                if (mut.type === 'attributes' && mut.target.id === '_ngOverlay') {
                    var t = mut.target;
                    var hidden =
                        t.style.display === 'none' ||
                        t.style.visibility === 'hidden' ||
                        t.style.opacity === '0' ||
                        t.hasAttribute('hidden');
                    if (hidden) {
                        markTampered();
                        clearInterval(tickInterval);
                        return;
                    }
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class', 'hidden', 'aria-hidden']
        });

        return observer;
    }

    setGate(false);

    fetchServerTime()
        .then(function () { return fetchPuzzleExists(); })
        .then(function (puzzleExists) {
            if (puzzleExists === false) {
                showNoPuzzleOverlay();
                return;
            }
            if (isUnlocked()) {
                loadRelations();
            } else {
                var openMin     = getOpenMinutes();
                var openTimeStr = formatMinutes(openMin);
                var _observer   = createOverlay(openTimeStr, openMin);

                var unlockInterval = setInterval(function () {
                    checkAndMarkClockTamper();
                    if (_tampered) { clearInterval(unlockInterval); return; }
                    if (isUnlocked()) {
                        clearInterval(unlockInterval);
                        var ov = document.getElementById('_ngOverlay');
                        if (ov) ov.remove();
                        loadRelations();
                    }
                }, 1000);
            }
        });

})();
