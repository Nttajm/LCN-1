/**
 * ch.js — Relations gate controller
 * Determines the daily random opening window (10:00–11:30 AM),
 * shows a lock overlay before then, and dynamically loads relations.js
 * only once the gate opens. Tamper-detection prevents the game from
 * loading if the overlay is removed or hidden early.
 *
 * Windows across all Titan Games (same seeded-random design, non-overlapping):
 *   Nerdle      →  8:00 – 9:30 AM
 *   Relations   → 10:00 – 11:30 AM   ← this file
 *   Connections → 12:00 –  1:30 PM
 */
(function () {
    'use strict';

    // ── Seeded random (FNV-1a 32-bit) ──────────────────────────────────────
    function seededRand(str) {
        let h = 2166136261 >>> 0;
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619) >>> 0;
        }
        return h / 0xFFFFFFFF;
    }

    // ── Clock baseline for post-load drift detection ────────────────────────
    const _perfBase = performance.now();
    const _dateBase = Date.now();
    const CLOCK_DRIFT_MS = 5000;   // tolerated skew in ms
    let _serverOffset = 0;

    function isSuspiciousClockDrift() {
        var elapsed = performance.now() - _perfBase;
        return Math.abs(Date.now() - (_dateBase + elapsed)) > CLOCK_DRIFT_MS;
    }

    /** Current time in ms, corrected by the server-time offset. */
    function trustedNowMs() {
        return Date.now() + _serverOffset;
    }

    /**
     * HEAD-request the current page to read the server's Date header.
     * Sets _serverOffset so trustedNowMs() corrects client-clock skew
     * (covers the case where the system clock is changed before page load).
     */
    function fetchServerTime() {
        return fetch(window.location.href, { method: 'HEAD', cache: 'no-store' })
            .then(function (r) {
                var d = r.headers.get('Date');
                if (d) {
                    var st = new Date(d).getTime();
                    if (!isNaN(st)) { _serverOffset = st - Date.now(); }
                }
            })
            .catch(function () { /* silent – fall back to local clock */ });
    }

    // ── Daily open time (consistent for everyone on the same calendar day) ─
    function getTodayKey() {
        const d = new Date(trustedNowMs());
        return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    }

    // Returns the opening time as total minutes since midnight.
    // 10:00 AM = 600 min, 11:30 AM = 690 min → 91 possible values (0–90 offset).
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

    // ── Gate state (read by relations.js as a second layer of protection) ──
    // The property is sealed with Object.defineProperty so that
    //   window.__relationsGate_v1 = { open: true, ... }   (console write)
    // and
    //   Object.defineProperty(window, '__relationsGate_v1', ...)  (redefinition)
    // are both silently rejected or throw — the getter always reads the
    // private closure variables _gateOpen / _tampered.
    const GATE_KEY = '__relationsGate_v1';
    let _gateOpen  = false;
    let _tampered  = false;
    let _noPuzzle  = false;

    try {
        Object.defineProperty(window, GATE_KEY, {
            get: function () { return { open: _gateOpen, tampered: _tampered, noPuzzle: _noPuzzle }; },
            set: function () { /* silently reject console writes */ },
            configurable: false,
            enumerable: false
        });
    } catch (e) { /* already defined (e.g. double-load) – ignore */ }

    function setGate(open) {
        _gateOpen = !!open;
        // _tampered is always reflected live through the getter above.
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

    // ── Post-load clock tamper check ───────────────────────────────────────
    function checkAndMarkClockTamper() {
        if (!_tampered && isSuspiciousClockDrift()) { markTampered(); }
    }

    // ── Puzzle existence check (Firestore REST API, no SDK required) ────────
    // Checks whether today has a published puzzle BEFORE loading game JS.
    // Returns Promise<true|false|null>:
    //   true  → published puzzle found
    //   false → document missing or not published  (show no-puzzle overlay)
    //   null  → network/parse error               (fail open; game handles fallback)
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
                if (r.status === 404) return false; // Doc truly missing.
                if (!r.ok) return null; // Permission/network/server issue: fail open.
                return r.json().then(function (data) {
                    if (data && data.error) {
                        // Firestore error payload (e.g. PERMISSION_DENIED): fail open.
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

    // ── No-puzzle overlay ───────────────────────────────────────────────────
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

        // Keep the overlay from being removed or hidden
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

    // ── Load relations.js (module) ──────────────────────────────────────────
    function loadRelations() {
        setGate(true);
        var script = document.createElement('script');
        script.type = 'module';
        script.src = 'js/relations.js';
        document.head.appendChild(script);
    }

    // ── Overlay styles ─────────────────────────────────────────────────────
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

    // ── Create and mount the lock overlay ──────────────────────────────────
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

        // Countdown ticker
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

        // ── MutationObserver: detect removal, display/visibility changes ───
        var observer = new MutationObserver(function (mutations) {
            if (_tampered || isUnlocked()) return;

            for (var mi = 0; mi < mutations.length; mi++) {
                var mut = mutations[mi];

                // Detect node removal
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

                // Detect attribute changes on the overlay
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

    // ── Main entry ─────────────────────────────────────────────────────────
    setGate(false);

    // 1. Fetch authoritative server time.
    // 2. Check Firestore for today's published puzzle.
    // 3a. No puzzle  → show "no puzzle today" overlay; never load game JS.
    // 3b. Puzzle exists but time not yet reached → show countdown overlay.
    // 3c. Puzzle exists and time reached → load relations.js.
    fetchServerTime()
        .then(function () { return fetchPuzzleExists(); })
        .then(function (puzzleExists) {
            // null = network error: fail open so the game can use its own fallback
            if (puzzleExists === false) {
                showNoPuzzleOverlay();
                return;
            }
            if (isUnlocked()) {
                loadRelations();
            } else {
                var openMin     = getOpenMinutes();
                var openTimeStr = formatMinutes(openMin);
                var _observer   = createOverlay(openTimeStr, openMin); // eslint-disable-line

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
