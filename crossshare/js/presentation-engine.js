(function (global) {
    'use strict';

    var DEFAULT_IMAGE_DURATION = 5;
    var DEFAULT_PRESENTATION_DURATION = 10;
    var MAX_RENDER_DEPTH = 8;
    var TRANSITION_TYPES = ['fade', 'crossfade', 'fadeblack'];
    var DEFAULT_TRANSITION_DURATION = 1;

    function num(value, fallback) {
        var parsed = parseFloat(value);
        return isFinite(parsed) ? parsed : fallback;
    }

    function positive(value, fallback) {
        var parsed = num(value, fallback);
        return parsed > 0 ? parsed : fallback;
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function getPresentation(project, id) {
        if (!project || !Array.isArray(project.presentations)) return null;
        for (var i = 0; i < project.presentations.length; i++) {
            if (project.presentations[i].id === id) return project.presentations[i];
        }
        return null;
    }

    function getMediaItem(project, id) {
        var items = project && project.media && Array.isArray(project.media.items) ? project.media.items : [];
        for (var i = 0; i < items.length; i++) {
            if (items[i].id === id) return items[i];
        }
        return null;
    }

    function parseYouTubeVideoId(input) {
        var raw = String(input || '').trim();
        if (!raw) return null;
        if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;
        var match = raw.match(
            /(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
        );
        return match ? match[1] : null;
    }

    var youtubeApiPromise = null;

    function ensureYoutubeApi() {
        if (typeof window === 'undefined') {
            return Promise.reject(new Error('No window'));
        }
        if (window.YT && window.YT.Player) {
            return Promise.resolve(window.YT);
        }
        if (youtubeApiPromise) return youtubeApiPromise;
        youtubeApiPromise = new Promise(function (resolve, reject) {
            var settled = false;
            function finish() {
                if (settled) return;
                if (window.YT && window.YT.Player) {
                    settled = true;
                    resolve(window.YT);
                }
            }
            var previous = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = function () {
                try {
                    if (typeof previous === 'function') previous();
                } catch (e) {}
                finish();
            };
            if (!document.querySelector('script[data-cs-youtube-api]')) {
                var script = document.createElement('script');
                script.src = 'https://www.youtube.com/iframe_api';
                script.async = true;
                script.setAttribute('data-cs-youtube-api', '1');
                script.onerror = function () {
                    if (!settled) {
                        settled = true;
                        youtubeApiPromise = null;
                        reject(new Error('YouTube API failed to load'));
                    }
                };
                (document.head || document.documentElement).appendChild(script);
            }
            finish();
            window.setTimeout(finish, 50);
            window.setTimeout(function () {
                if (!settled) {
                    settled = true;
                    youtubeApiPromise = null;
                    reject(new Error('YouTube API timeout'));
                }
            }, 15000);
        });
        return youtubeApiPromise;
    }

    function youtubePlayerVars(mediaTime, playing) {
        var vars = {
            autoplay: playing ? 1 : 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            cc_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            mute: 1,
            start: Math.max(0, Math.floor(num(mediaTime, 0)))
        };
        try {
            if (typeof location !== 'undefined' && location.origin && location.origin !== 'null') {
                vars.origin = location.origin;
            }
        } catch (e) {}
        return vars;
    }

    // Kept for source-preview fallback URLs; prefer createYoutubePlayer.
    function youtubeEmbedSrc(videoId, mediaTime, playing) {
        var vars = youtubePlayerVars(mediaTime, playing);
        var params = [
            'enablejsapi=1',
            'playsinline=1',
            'rel=0',
            'modestbranding=1',
            'controls=0',
            'disablekb=1',
            'fs=0',
            'iv_load_policy=3',
            'cc_load_policy=3',
            'mute=1',
            'autoplay=' + vars.autoplay,
            'start=' + vars.start
        ];
        if (vars.origin) params.push('origin=' + encodeURIComponent(vars.origin));
        return 'https://www.youtube.com/embed/' + encodeURIComponent(videoId) + '?' + params.join('&');
    }

    function destroyYoutubePlayer(target) {
        if (!target) return;
        var player = target.ytPlayer || (target._csYtPlayer) || null;
        if (player && typeof player.destroy === 'function') {
            try { player.destroy(); } catch (e) {}
        }
        if (target.ytPlayer) target.ytPlayer = null;
        if (target._csYtPlayer) target._csYtPlayer = null;
        if (target.el && target.el._csYtPlayer) target.el._csYtPlayer = null;
    }

    function createYoutubePlayer(hostEl, options) {
        options = options || {};
        var videoId = options.videoId;
        var mediaTime = Math.max(0, num(options.mediaTime, 0));
        var playing = !!options.playing;
        if (!hostEl || !videoId) return Promise.reject(new Error('Missing YouTube host'));
        if (!hostEl.id) {
            hostEl.id = 'cs-yt-' + String(Math.random()).slice(2, 12);
        }
        hostEl._csYoutubeReady = false;
        return ensureYoutubeApi().then(function (YT) {
            return new Promise(function (resolve) {
                var pendingPausedFrame = !playing;
                function latchPausedFrame(event) {
                    if (!pendingPausedFrame) return;
                    var state = event && event.data;
                    if (state !== YT.PlayerState.PLAYING) return;
                    pendingPausedFrame = false;
                    try { event.target.pauseVideo(); } catch (e) {}
                    event.target._csPendingPausedFrame = false;
                    var pausedIframe = event.target.getIframe ? event.target.getIframe() : document.getElementById(hostEl.id);
                    if (pausedIframe) pausedIframe._csPendingPausedFrame = false;
                }
                var player = new YT.Player(hostEl.id, {
                    videoId: videoId,
                    width: '100%',
                    height: '100%',
                    playerVars: youtubePlayerVars(mediaTime, playing),
                    events: {
                        onReady: function (event) {
                            var readyPlayer = event.target;
                            try { readyPlayer.mute(); } catch (e) {}
                            try { readyPlayer.seekTo(mediaTime, true); } catch (e2) {}
                            try {
                                if (playing) readyPlayer.playVideo();
                                else {
                                    readyPlayer._csPendingPausedFrame = true;
                                    readyPlayer.playVideo();
                                }
                            } catch (e3) {}
                            var iframe = readyPlayer.getIframe ? readyPlayer.getIframe() : document.getElementById(hostEl.id);
                            if (iframe) {
                                iframe.className = hostEl.className || 'cs-render-media cs-render-embed';
                                iframe._csYtPlayer = readyPlayer;
                                iframe._csYoutubeReady = true;
                                iframe._csPendingPausedFrame = !playing;
                            }
                            hostEl._csYtPlayer = readyPlayer;
                            hostEl._csYoutubeReady = true;
                            hostEl._csPendingPausedFrame = !playing;
                            resolve({ player: readyPlayer, iframe: iframe || hostEl });
                        },
                        onStateChange: latchPausedFrame,
                        onError: function () {
                            resolve({ player: player, iframe: document.getElementById(hostEl.id) || hostEl });
                        }
                    }
                });
            });
        });
    }

    function syncYoutubePlayer(player, playing, mediaTime, node) {
        if (!player) return;
        var startSec = Math.floor(Math.max(0, num(mediaTime, 0)));
        try { player.mute(); } catch (e) {}
        try {
            var current = typeof player.getCurrentTime === 'function' ? player.getCurrentTime() : null;
            var drift = current == null ? Infinity : Math.abs(current - mediaTime);
            var lastStart = node && node.embedStartSec;
            if (drift > 1.25 || lastStart == null || Math.abs(startSec - lastStart) > 2) {
                player.seekTo(Math.max(0, mediaTime), true);
                if (node) node.embedStartSec = startSec;
            } else if (node) {
                node.embedStartSec = startSec;
            }
        } catch (e2) {}
        try {
            if (playing) {
                player._csPendingPausedFrame = false;
                if (node && node.el) node.el._csPendingPausedFrame = false;
                player.playVideo();
            } else if (!player._csPendingPausedFrame) {
                player.pauseVideo();
            }
        } catch (e3) {}
    }

    // Back-compat wrappers used by manager source preview.
    function attachYoutubeLoadSync(hostOrIframe, playing, mediaTime) {
        if (!hostOrIframe) return;
        if (hostOrIframe._csYtPlayer) {
            syncYoutubePlayer(hostOrIframe._csYtPlayer, playing, mediaTime, null);
            return;
        }
        createYoutubePlayer(hostOrIframe, {
            videoId: hostOrIframe.getAttribute('data-video-id') || hostOrIframe._csVideoId,
            mediaTime: mediaTime,
            playing: playing
        }).then(function (result) {
            if (result && result.iframe) {
                result.iframe._csYoutubeReady = true;
            }
        }).catch(function () {});
    }

    function syncYoutubePlayback(hostOrIframe, playing, mediaTime, node) {
        var player = (hostOrIframe && hostOrIframe._csYtPlayer) ||
            (node && node.ytPlayer) ||
            null;
        if (player) {
            syncYoutubePlayer(player, playing, mediaTime, node);
            return;
        }
        attachYoutubeLoadSync(hostOrIframe, playing, mediaTime);
    }

    function isGeneratedMediaKind(kind) {
        return kind === 'color' || kind === 'embed' || kind === 'timer';
    }

    function formatTimerDisplay(totalSeconds, showMs) {
        totalSeconds = Math.max(0, num(totalSeconds, 0));
        if (showMs) {
            var minsMs = Math.floor(totalSeconds / 60);
            var secsMs = Math.floor(totalSeconds % 60);
            var cs = Math.floor((totalSeconds * 100) % 100);
            return String(minsMs).padStart(2, '0') + ':' + String(secsMs).padStart(2, '0') + '.' + String(cs).padStart(2, '0');
        }
        var s = Math.floor(totalSeconds + 1e-9);
        var h = Math.floor(s / 3600);
        var m = Math.floor((s % 3600) / 60);
        var sec = s % 60;
        if (h > 0) {
            return h + ':' + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
        }
        return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
    }

    function timerValueAtMediaTime(media, mediaTime) {
        if (!media || media.kind !== 'timer') return 0;
        mediaTime = Math.max(0, num(mediaTime, 0));
        var base = positive(media.timerSeconds, 60);
        if (media.timerMode === 'countup') return mediaTime;
        return Math.max(0, base - mediaTime);
    }

    function defaultItemFromSource(source, createId, project, parentStack) {
        var kind = source.kind === 'presentation' ? 'presentation' : 'media';
        var duration = DEFAULT_IMAGE_DURATION;
        if (kind === 'presentation' && project) {
            var nested = getPresentation(project, source.id);
            duration = positive(presentationDuration(project, nested, parentStack || []), DEFAULT_PRESENTATION_DURATION);
        } else if (source.duration && isFinite(source.duration)) {
            duration = source.duration;
        } else if (kind === 'media' && source.mediaEnd != null && source.mediaStart != null) {
            duration = positive(Number(source.mediaEnd) - Number(source.mediaStart), DEFAULT_IMAGE_DURATION);
        }
        return normalizeItem({
            id: createId(),
            type: kind,
            mediaId: kind === 'media' ? source.id : null,
            presentationId: kind === 'presentation' ? source.id : null,
            name: source.name || 'Untitled item',
            start: 0,
            duration: duration,
            loop: false,
            loopCount: 1,
            visible: true,
            z: 0,
            x: 50,
            y: 50,
            scaleX: 100,
            scaleY: 100,
            rotation: 0,
            opacity: 100,
            fit: 'contain',
            trimIn: 0,
            trimOut: null
        });
    }

    function normalizeTransition(transition) {
        if (!transition || !transition.type) return null;
        var type = TRANSITION_TYPES.indexOf(transition.type) === -1 ? 'fade' : transition.type;
        return {
            id: transition.id || null,
            type: type,
            duration: positive(transition.duration, DEFAULT_TRANSITION_DURATION),
            afterItemId: transition.afterItemId || null,
            beforeItemId: transition.beforeItemId || null
        };
    }

    function normalizeTransitions(transitions) {
        if (!Array.isArray(transitions)) return [];
        return transitions.map(normalizeTransition).filter(Boolean);
    }

    function orderedPresentationItems(presentation) {
        return (presentation && Array.isArray(presentation.items) ? presentation.items : [])
            .map(normalizeItem)
            .sort(function (a, b) {
                return a.z === b.z ? a.start - b.start : a.z - b.z;
            });
    }

    function findTransitionBefore(presentation, itemId, ordered) {
        ordered = ordered || orderedPresentationItems(presentation);
        var index = -1;
        for (var i = 0; i < ordered.length; i++) {
            if (ordered[i].id === itemId) {
                index = i;
                break;
            }
        }
        if (index === -1) return null;
        var afterItemId = index > 0 ? ordered[index - 1].id : null;
        var transitions = normalizeTransitions(presentation && presentation.transitions);
        for (var t = 0; t < transitions.length; t++) {
            var tr = transitions[t];
            if (tr.beforeItemId === itemId && tr.afterItemId === afterItemId) return tr;
        }
        return null;
    }

    function findTransitionAfter(presentation, itemId, ordered) {
        ordered = ordered || orderedPresentationItems(presentation);
        var index = -1;
        for (var i = 0; i < ordered.length; i++) {
            if (ordered[i].id === itemId) {
                index = i;
                break;
            }
        }
        if (index === -1) return null;
        var beforeItemId = index < ordered.length - 1 ? ordered[index + 1].id : null;
        var transitions = normalizeTransitions(presentation && presentation.transitions);
        for (var t = 0; t < transitions.length; t++) {
            var tr = transitions[t];
            if (tr.afterItemId === itemId && tr.beforeItemId === beforeItemId) return tr;
        }
        return null;
    }

    function layoutSequentialPresentation(project, presentation) {
        if (!presentation || !Array.isArray(presentation.items)) return;
        syncPresentationItemDurations(project, presentation);
        var ordered = orderedPresentationItems(presentation);
        var prevEnd = 0;
        for (var i = 0; i < ordered.length; i++) {
            var live = null;
            for (var j = 0; j < presentation.items.length; j++) {
                if (presentation.items[j].id === ordered[i].id) {
                    live = presentation.items[j];
                    break;
                }
            }
            if (!live) continue;
            live.z = i;
            var trans = findTransitionBefore(presentation, ordered[i].id, ordered);
            if (i === 0) {
                live.start = 0;
            } else if (trans && trans.type === 'crossfade') {
                live.start = Math.max(0, prevEnd - trans.duration);
            } else if (trans && trans.type === 'fadeblack') {
                live.start = prevEnd + trans.duration;
            } else {
                live.start = prevEnd;
            }
            var span = itemSpan(project, live, [presentation.id]);
            if (span === Infinity) {
                prevEnd = live.start + 86400;
            } else {
                prevEnd = live.start + span;
            }
        }
    }

    function migrateLegacyTransitions(presentation) {
        if (!presentation) return;
        if (!Array.isArray(presentation.transitions)) presentation.transitions = [];
        var ordered = orderedPresentationItems(presentation);
        var migrated = false;
        ordered.forEach(function (item, index) {
            var live = null;
            for (var j = 0; j < presentation.items.length; j++) {
                if (presentation.items[j].id === item.id) {
                    live = presentation.items[j];
                    break;
                }
            }
            if (!live) return;
            if (live.transition) {
                presentation.transitions.push(normalizeTransition({
                    id: live.transition.id || ('tr_' + item.id + '_in'),
                    type: live.transition.type,
                    duration: live.transition.duration,
                    afterItemId: index > 0 ? ordered[index - 1].id : null,
                    beforeItemId: item.id
                }));
                live.transition = null;
                migrated = true;
            }
            if (live.transitionOut && index === ordered.length - 1) {
                presentation.transitions.push(normalizeTransition({
                    id: live.transitionOut.id || ('tr_' + item.id + '_out'),
                    type: live.transitionOut.type,
                    duration: live.transitionOut.duration,
                    afterItemId: item.id,
                    beforeItemId: null
                }));
                live.transitionOut = null;
                migrated = true;
            }
        });
        if (migrated) {
            presentation.transitions = presentation.transitions.map(normalizeTransition).filter(Boolean);
        }
    }

    function normalizeItem(item) {
        item = item || {};
        var normalized = {};
        normalized.id = item.id || ('item_' + Date.now().toString(36));
        normalized.type = item.type === 'presentation' ? 'presentation' : 'media';
        normalized.mediaId = item.mediaId || null;
        normalized.presentationId = item.presentationId || null;
        normalized.name = item.name || 'Untitled item';
        normalized.start = Math.max(0, num(item.start, 0));
        normalized.duration = positive(item.duration, DEFAULT_IMAGE_DURATION);
        normalized.loop = !!item.loop;
        normalized.loopCount = item.loopCount === 0 ? 0 : Math.max(1, Math.round(num(item.loopCount, 1)));
        normalized.visible = item.visible !== false;
        normalized.z = Math.round(num(item.z, 0));
        normalized.x = num(item.x, 50);
        normalized.y = num(item.y, 50);
        normalized.scaleX = positive(item.scaleX, 100);
        normalized.scaleY = positive(item.scaleY, 100);
        normalized.rotation = num(item.rotation, 0);
        normalized.opacity = clamp(num(item.opacity, 100), 0, 100);
        normalized.fit = ['contain', 'cover', 'stretch', 'original'].indexOf(item.fit) === -1 ? 'contain' : item.fit;
        normalized.trimIn = Math.max(0, num(item.trimIn, 0));
        normalized.trimOut = item.trimOut == null || item.trimOut === '' ? null : Math.max(0, num(item.trimOut, null));
        return normalized;
    }

    function sourceDuration(project, item, stack) {
        item = normalizeItem(item);
        if (item.type === 'presentation') {
            var nested = getPresentation(project, item.presentationId);
            var nestedDuration = presentationDuration(project, nested, stack);
            return positive(nestedDuration, item.duration || DEFAULT_PRESENTATION_DURATION);
        }
        var media = getMediaItem(project, item.mediaId);
        if (media && (media.kind === 'video' || media.kind === 'audio')) {
            var mediaDuration = media.duration;
            if ((mediaDuration == null || !isFinite(mediaDuration)) && media.mediaEnd != null && media.mediaStart != null) {
                mediaDuration = Math.max(0, Number(media.mediaEnd) - Number(media.mediaStart));
            }
            if (mediaDuration != null && isFinite(mediaDuration)) {
                var trimOut = item.trimOut == null ? mediaDuration : Math.min(item.trimOut, mediaDuration);
                return positive(trimOut - Math.min(item.trimIn, trimOut), item.duration || DEFAULT_IMAGE_DURATION);
            }
        }
        return positive(item.duration, DEFAULT_IMAGE_DURATION);
    }

    function itemUnitDuration(project, item, stack) {
        item = normalizeItem(item);
        // Videos, audio, and nested presentations should always follow their
        // source length (including trims), not a stale default item.duration.
        if (item.type === 'presentation') {
            return sourceDuration(project, item, stack);
        }
        if (item.type === 'media') {
            var media = getMediaItem(project, item.mediaId);
            if (media && (media.kind === 'video' || media.kind === 'audio')) {
                return sourceDuration(project, item, stack);
            }
        }
        return positive(item.duration || sourceDuration(project, item, stack), DEFAULT_IMAGE_DURATION);
    }

    function syncPresentationItemDurations(project, presentation, stack) {
        if (!presentation || !Array.isArray(presentation.items)) return;
        stack = stack || [];
        if (stack.indexOf(presentation.id) !== -1 || stack.length > MAX_RENDER_DEPTH) return;
        var nextStack = stack.concat(presentation.id);
        for (var i = 0; i < presentation.items.length; i++) {
            var live = presentation.items[i];
            if (!live) continue;
            var item = normalizeItem(live);
            var duration = sourceDuration(project, item, nextStack);
            if (!isFinite(duration) || duration <= 0) continue;
            if (item.type === 'presentation') {
                live.duration = duration;
                continue;
            }
            if (item.type === 'media') {
                var media = getMediaItem(project, item.mediaId);
                if (media && (media.kind === 'video' || media.kind === 'audio')) {
                    live.duration = duration;
                }
            }
        }
    }

    function itemSpan(project, item, stack) {
        item = normalizeItem(item);
        var unit = itemUnitDuration(project, item, stack);
        if (item.loop && item.loopCount === 0) return Infinity;
        return unit * (item.loop ? item.loopCount : 1);
    }

    function presentationDuration(project, presentation, stack) {
        if (!presentation) return 0;
        stack = stack || [];
        if (stack.indexOf(presentation.id) !== -1 || stack.length > MAX_RENDER_DEPTH) return 0;
        var nextStack = stack.concat(presentation.id);
        var items = Array.isArray(presentation.items) ? presentation.items : [];
        var duration = 0;
        for (var i = 0; i < items.length; i++) {
            var item = normalizeItem(items[i]);
            var span = itemSpan(project, item, nextStack);
            if (span === Infinity) return Infinity;
            duration = Math.max(duration, item.start + span);
        }
        return duration;
    }

    function hasCycle(project, presentationId, childPresentationId, stack) {
        if (!childPresentationId) return false;
        if (presentationId === childPresentationId) return true;
        stack = stack || [];
        if (stack.indexOf(childPresentationId) !== -1 || stack.length > MAX_RENDER_DEPTH) return true;
        var child = getPresentation(project, childPresentationId);
        if (!child || !Array.isArray(child.items)) return false;
        for (var i = 0; i < child.items.length; i++) {
            var item = child.items[i];
            if (item.type === 'presentation' && hasCycle(project, presentationId, item.presentationId, stack.concat(childPresentationId))) {
                return true;
            }
        }
        return false;
    }

    function itemPlayback(project, item, playhead, stack) {
        item = normalizeItem(item);
        var unit = itemUnitDuration(project, item, stack);
        var span = itemSpan(project, item, stack);
        var elapsed = playhead - item.start;
        if (!item.visible || elapsed < 0 || (span !== Infinity && elapsed >= span) || unit <= 0) return null;
        var iteration = Math.floor(elapsed / unit);
        var local = elapsed - iteration * unit;
        var mediaTime = item.trimIn + local;
        return {
            item: item,
            unitDuration: unit,
            span: span,
            elapsed: elapsed,
            iteration: iteration + 1,
            loopTotal: item.loop ? item.loopCount : 1,
            progress: clamp(local / unit, 0, 1),
            localTime: local,
            mediaTime: mediaTime
        };
    }

    function transitionOpacity(item, playback, transBefore, transAfter) {
        var mult = 1;

        if (transBefore && playback.iteration === 1) {
            var inDur = transBefore.duration;
            if (playback.elapsed < inDur) {
                if (transBefore.type === 'crossfade' || transBefore.type === 'fade' || transBefore.type === 'fadeblack') {
                    mult *= clamp(playback.elapsed / inDur, 0, 1);
                }
            }
        }

        if (transAfter && playback.span !== Infinity) {
            var outDur = transAfter.duration;
            var remaining = playback.span - playback.elapsed;
            if (transAfter.type === 'crossfade' || transAfter.type === 'fade' || transAfter.type === 'fadeblack') {
                if (remaining <= outDur) mult *= clamp(remaining / outDur, 0, 1);
            }
        }

        return mult;
    }

    function resolveLayers(project, presentationId, playhead, stack, inherited) {
        var presentation = getPresentation(project, presentationId);
        if (!presentation) return [];
        stack = stack || [];
        if (stack.indexOf(presentationId) !== -1 || stack.length > MAX_RENDER_DEPTH) return [];
        inherited = inherited || { opacity: 100, zPath: [], viewZoom: 1 };
        var presentationZoom = clamp(num(presentation.viewZoom, 100), 10, 400) / 100;
        var viewZoom = inherited.viewZoom * presentationZoom;
        var layers = [];
        migrateLegacyTransitions(presentation);
        var ordered = orderedPresentationItems(presentation);

        ordered.forEach(function (item) {
            var playback = itemPlayback(project, item, playhead, stack);
            if (!playback) return;
            var transBefore = findTransitionBefore(presentation, item.id, ordered);
            var transAfter = findTransitionAfter(presentation, item.id, ordered);
            var zPath = inherited.zPath.concat(item.z);
            var effectiveOpacity = inherited.opacity * (item.opacity / 100) *
                transitionOpacity(item, playback, transBefore, transAfter);
            if (item.type === 'presentation') {
                layers = layers.concat(resolveLayers(project, item.presentationId, playback.localTime, stack.concat(presentationId), {
                    opacity: effectiveOpacity,
                    zPath: zPath,
                    viewZoom: viewZoom
                }));
                return;
            }
            var media = getMediaItem(project, item.mediaId);
            if (!media) return;
            layers.push({
                key: item.id,
                item: item,
                media: media,
                mediaTime: playback.mediaTime,
                playback: playback,
                opacity: effectiveOpacity,
                viewZoom: viewZoom,
                zPath: zPath
            });
        });

        return layers.sort(function (a, b) {
            return a.zPath.join('.').localeCompare(b.zPath.join('.'), undefined, { numeric: true });
        });
    }

    function loopLabel(playback) {
        if (!playback) return '0/1';
        if (!playback.item.loop) return '1/1';
        if (playback.loopTotal === 0) return playback.iteration + '/∞';
        return Math.min(playback.iteration, playback.loopTotal) + '/' + playback.loopTotal;
    }

    function normalizePlaybackState(state, defaultPlaying) {
        state = state || {};
        var playing = typeof state.playing === 'boolean' ? state.playing : !!defaultPlaying;
        var time = Math.max(0, num(state.time, 0));
        var anchorTimeMs = num(state.anchorTimeMs, null);
        if (!playing) anchorTimeMs = null;
        return {
            playing: playing,
            time: time,
            anchorTimeMs: anchorTimeMs,
            startedAt: num(state.startedAt, null)
        };
    }

    function syncPlaybackState(state, duration, nowMs) {
        if (!state) return 0;
        nowMs = num(nowMs, Date.now());
        state.time = Math.max(0, num(state.time, 0));

        if (state.playing) {
            if (typeof state.anchorTimeMs === 'number' && isFinite(state.anchorTimeMs)) {
                state.time += Math.max(0, nowMs - state.anchorTimeMs) / 1000;
            }
            state.anchorTimeMs = nowMs;
        } else {
            state.anchorTimeMs = null;
        }

        if (duration > 0 && isFinite(duration) && state.time > duration) {
            state.time = state.time % duration;
        }
        return state.time;
    }

    function setPlaybackPlaying(state, playing, duration, nowMs, options) {
        if (!state) return;
        options = options || {};
        nowMs = num(nowMs, Date.now());
        syncPlaybackState(state, duration, nowMs);
        var wasPlaying = state.playing;
        state.playing = !!playing;
        state.anchorTimeMs = state.playing ? nowMs : null;

        if (state.playing && !wasPlaying) {
            if (options.restart || state.time === 0) {
                state.startedAt = nowMs;
                state.time = 0;
            } else {
                state.startedAt = nowMs - (state.time * 1000);
            }
        }
        if (!state.playing) {
            state.startedAt = null;
        }
    }

    function restartPlayback(state, duration, nowMs) {
        if (!state) return;
        nowMs = num(nowMs, Date.now());
        state.time = 0;
        state.startedAt = state.playing ? nowMs : null;
        state.anchorTimeMs = state.playing ? nowMs : null;
    }

    function seekPlaybackState(state, time, duration, nowMs) {
        if (!state) return;
        nowMs = num(nowMs, Date.now());
        state.time = Math.max(0, num(time, 0));
        if (duration > 0 && isFinite(duration) && state.time > duration) state.time = state.time % duration;
        state.anchorTimeMs = state.playing ? nowMs : null;
        state.startedAt = state.playing ? nowMs - state.time * 1000 : null;
    }

    function drawMediaFit(ctx, el, x, y, w, h, fit) {
        var sw = el.videoWidth || el.naturalWidth || 1;
        var sh = el.videoHeight || el.naturalHeight || 1;
        if (fit === 'stretch') {
            ctx.drawImage(el, x, y, w, h);
            return;
        }
        if (fit === 'cover') {
            var coverScale = Math.max(w / sw, h / sh);
            var coverW = sw * coverScale;
            var coverH = sh * coverScale;
            ctx.drawImage(el, x + (w - coverW) / 2, y + (h - coverH) / 2, coverW, coverH);
            return;
        }
        var containScale = Math.min(w / sw, h / sh);
        var containW = sw * containScale;
        var containH = sh * containScale;
        ctx.drawImage(el, x + (w - containW) / 2, y + (h - containH) / 2, containW, containH);
    }

    function waitForPreviewMedia(el, kind, mediaTime) {
        return new Promise(function (resolve) {
            if (!el) {
                resolve(false);
                return;
            }
            if (kind === 'video') {
                function seekAndResolve() {
                    var settled = false;
                    function finish() {
                        if (settled) return;
                        settled = true;
                        resolve(el.readyState >= 2);
                    }
                    try {
                        if (isFinite(mediaTime)) el.currentTime = Math.max(0, mediaTime);
                    } catch (e) {}
                    if (el.readyState >= 2) {
                        finish();
                        return;
                    }
                    el.addEventListener('seeked', finish, { once: true });
                    el.addEventListener('loadeddata', finish, { once: true });
                    setTimeout(finish, 250);
                }
                if (el.readyState >= 1) {
                    seekAndResolve();
                } else {
                    el.addEventListener('loadedmetadata', seekAndResolve, { once: true });
                    el.addEventListener('error', function () { resolve(false); }, { once: true });
                }
                return;
            }
            if (el.complete) {
                resolve(true);
                return;
            }
            el.addEventListener('load', function () { resolve(true); }, { once: true });
            el.addEventListener('error', function () { resolve(false); }, { once: true });
        });
    }

    function createPreviewCapture(options) {
        options = options || {};
        var width = Math.max(16, Math.round(positive(options.width, 128)));
        var height = Math.max(16, Math.round(positive(options.height, 96)));
        var resolveUrl = options.resolveUrl;
        var canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext('2d');
        var mediaCache = {};

        function mediaElement(media) {
            if (!resolveUrl) return Promise.resolve(null);
            return resolveUrl(media.id).then(function (url) {
                if (!url) return null;
                var cached = mediaCache[media.id];
                if (!cached || cached.url !== url) {
                    if (cached && cached.el && cached.el.parentNode) {
                        cached.el.parentNode.removeChild(cached.el);
                    }
                    var el = media.kind === 'video' ? document.createElement('video') : document.createElement('img');
                    el.src = url;
                    el.muted = true;
                    el.preload = 'auto';
                    if (media.kind === 'video') el.playsInline = true;
                    el.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';
                    document.body.appendChild(el);
                    cached = mediaCache[media.id] = { el: el, url: url, kind: media.kind };
                }
                return cached;
            });
        }

        function capture(project, presentationId, playhead) {
            if (!ctx || !resolveUrl) return Promise.resolve(null);
            var layers = resolveLayers(project, presentationId, playhead);
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, width, height);
            if (!layers.length) return Promise.resolve(null);

            var chain = Promise.resolve();
            layers.forEach(function (layer) {
                if (!layer.media || layer.media.kind === 'audio') return;
                chain = chain.then(function () {
                    var viewZoom = layer.viewZoom || 1;
                    var boxW = (layer.item.scaleX * viewZoom / 100) * width;
                    var boxH = (layer.item.scaleY * viewZoom / 100) * height;
                    var cx = (layer.item.x / 100) * width;
                    var cy = (layer.item.y / 100) * height;
                    var dx = cx - boxW / 2;
                    var dy = cy - boxH / 2;

                    function paintBox(drawFn) {
                        ctx.save();
                        ctx.globalAlpha = clamp(layer.opacity, 0, 100) / 100;
                        if (layer.item.rotation) {
                            ctx.translate(cx, cy);
                            ctx.rotate(layer.item.rotation * Math.PI / 180);
                            ctx.translate(-cx, -cy);
                        }
                        drawFn();
                        ctx.restore();
                    }

                    if (layer.media.kind === 'color') {
                        paintBox(function () {
                            ctx.fillStyle = layer.media.solidColor || '#000000';
                            ctx.fillRect(dx, dy, boxW, boxH);
                        });
                        return;
                    }

                    if (layer.media.kind === 'embed') {
                        paintBox(function () {
                            ctx.fillStyle = '#111111';
                            ctx.fillRect(dx, dy, boxW, boxH);
                            ctx.fillStyle = '#c0392b';
                            var mark = Math.min(boxW, boxH) * 0.22;
                            ctx.beginPath();
                            ctx.moveTo(cx - mark * 0.35, cy - mark * 0.55);
                            ctx.lineTo(cx - mark * 0.35, cy + mark * 0.55);
                            ctx.lineTo(cx + mark * 0.65, cy);
                            ctx.closePath();
                            ctx.fill();
                        });
                        return;
                    }

                    if (layer.media.kind === 'timer') {
                        paintBox(function () {
                            ctx.fillStyle = layer.media.solidColor || '#141414';
                            ctx.fillRect(dx, dy, boxW, boxH);
                            var label = formatTimerDisplay(
                                timerValueAtMediaTime(layer.media, layer.mediaTime),
                                !!layer.media.timerShowMs
                            );
                            ctx.fillStyle = layer.media.timerTextColor || '#ffffff';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.font = '700 ' + Math.max(12, Math.min(boxW, boxH) * 0.22) + 'px ui-monospace, monospace';
                            ctx.fillText(label, cx, cy);
                        });
                        return;
                    }

                    return mediaElement(layer.media).then(function (cached) {
                        if (!cached || !cached.el) return;
                        return waitForPreviewMedia(cached.el, cached.kind, layer.mediaTime).then(function (ready) {
                            if (!ready) return;
                            paintBox(function () {
                                drawMediaFit(ctx, cached.el, dx, dy, boxW, boxH, layer.item.fit);
                            });
                        });
                    });
                });
            });

            return chain.then(function () {
                try {
                    return canvas.toDataURL('image/jpeg', 0.72);
                } catch (e) {
                    return null;
                }
            });
        }

        function destroy() {
            Object.keys(mediaCache).forEach(function (key) {
                var cached = mediaCache[key];
                if (cached && cached.el) {
                    if (cached.el.pause) cached.el.pause();
                    if (cached.el.parentNode) cached.el.parentNode.removeChild(cached.el);
                }
            });
            mediaCache = {};
        }

        return { capture: capture, destroy: destroy };
    }

    function createDomRenderer(options) {
        var stage = options.stage;
        var resolveUrl = options.resolveUrl;
        var onBufferingChange = typeof options.onBufferingChange === 'function' ? options.onBufferingChange : function () {};
        var nodes = {};
        var buffering = false;
        var SEEK_DRIFT_WHILE_PAUSED = 0.08;
        // While playing, small drift is corrected by playbackRate nudging and
        // a hard seek only happens for large drift, at most once every few
        // seconds. Seeking to an unbuffered position on a slow network aborts
        // in-flight data and starts a new request, so frequent catch-up seeks
        // turn a short stall into a permanent buffering loop.
        var RATE_DRIFT_MIN = 0.06;
        var HARD_SEEK_DRIFT = 0.75;
        var RESYNC_MIN_INTERVAL_MS = 3000;
        var POOL_MAX_MEDIA = 8;
        var POOL_MAX_IMAGES = 16;

        // Detached media elements kept for reuse. Presentations loop the same
        // media over and over; recreating elements forces a full re-download
        // of data the browser already had buffered.
        var elementPool = {};
        var poolOrder = [];

        function disposePooledEntry(entry) {
            if (!entry || !entry.el) return;
            entry.el._csNode = null;
            if (entry.el.pause) {
                try { entry.el.pause(); } catch (e) {}
                entry.el.removeAttribute('src');
                try { entry.el.load(); } catch (e) {}
            }
        }

        function poolPrune() {
            var mediaCount = 0;
            var imageCount = 0;
            for (var i = poolOrder.length - 1; i >= 0; i--) {
                var id = poolOrder[i];
                var entry = elementPool[id];
                if (!entry) {
                    poolOrder.splice(i, 1);
                    continue;
                }
                var playable = !!(entry.el && entry.el.pause);
                if (playable) mediaCount++;
                else imageCount++;
                if ((playable && mediaCount > POOL_MAX_MEDIA) || (!playable && imageCount > POOL_MAX_IMAGES)) {
                    disposePooledEntry(entry);
                    delete elementPool[id];
                    poolOrder.splice(i, 1);
                }
            }
        }

        function poolPut(mediaId, el) {
            if (!mediaId || !el) return;
            var url = el._csUrl || el.currentSrc || el.src || '';
            if (!url) return;
            var existing = elementPool[mediaId];
            if (existing && existing.el !== el) disposePooledEntry(existing);
            el._csNode = null;
            elementPool[mediaId] = { el: el, url: url };
            var idx = poolOrder.indexOf(mediaId);
            if (idx !== -1) poolOrder.splice(idx, 1);
            poolOrder.push(mediaId);
            poolPrune();
        }

        function poolTake(mediaId, url) {
            var entry = elementPool[mediaId];
            if (!entry) return null;
            delete elementPool[mediaId];
            var idx = poolOrder.indexOf(mediaId);
            if (idx !== -1) poolOrder.splice(idx, 1);
            if (entry.url !== url) {
                disposePooledEntry(entry);
                return null;
            }
            return entry.el;
        }

        function clearPool() {
            Object.keys(elementPool).forEach(function (id) {
                disposePooledEntry(elementPool[id]);
            });
            elementPool = {};
            poolOrder = [];
        }

        function reportBuffering() {
            var next = false;
            Object.keys(nodes).forEach(function (key) {
                var node = nodes[key];
                if (node && node.buffering) next = true;
            });
            if (next === buffering) return;
            buffering = next;
            onBufferingChange(buffering);
        }

        function setNodeBuffering(node, value) {
            if (!node || node.buffering === !!value) return;
            node.buffering = !!value;
            reportBuffering();
        }

        function removeNode(node) {
            if (!node) return;
            destroyYoutubePlayer(node);
            if (node.el) {
                if (node.el.pause) {
                    try { node.el.pause(); } catch (e) {}
                }
                var wasGenerated = !!(node.el.tagName === 'IFRAME' ||
                    (node.el.classList && (
                        node.el.classList.contains('cs-render-color') ||
                        node.el.classList.contains('cs-render-embed') ||
                        node.el.classList.contains('cs-render-timer')
                    )));
                if (node.mediaId && !wasGenerated) poolPut(node.mediaId, node.el);
                else node.el._csNode = null;
                node.el = null;
            }
            setNodeBuffering(node, false);
            if (node.wrap && node.wrap.parentNode) node.wrap.parentNode.removeChild(node.wrap);
        }

        function applyPendingSeek(node) {
            if (!node || !node.el || node.pendingSeekTime == null || node.el.readyState < 1) return;
            var target = Math.max(0, node.pendingSeekTime);
            try {
                node.el.currentTime = target;
                node.pendingSeekTime = null;
                node.forceSeek = false;
                node.lastSeekAt = Date.now();
            } catch (e) {}
        }

        function seekMediaNode(node, mediaTime) {
            if (!node || !node.el || !isFinite(mediaTime)) return;
            var target = Math.max(0, mediaTime);
            node.pendingSeekTime = target;
            applyPendingSeek(node);
        }

        function installMediaEvents(el) {
            if (!el || el._csEventsInstalled) return;
            el._csEventsInstalled = true;
            // Listeners resolve the owning node via el._csNode so pooled
            // elements can move between layer nodes without re-binding.
            ['waiting', 'stalled', 'seeking'].forEach(function (eventName) {
                el.addEventListener(eventName, function () {
                    var node = el._csNode;
                    if (node) setNodeBuffering(node, !!node.wantsPlayback);
                });
            });
            ['canplay', 'canplaythrough', 'playing', 'timeupdate', 'seeked', 'loadeddata'].forEach(function (eventName) {
                el.addEventListener(eventName, function () {
                    var node = el._csNode;
                    if (!node) return;
                    applyPendingSeek(node);
                    setNodeBuffering(node, false);
                });
            });
            el.addEventListener('loadedmetadata', function () {
                var node = el._csNode;
                if (node) applyPendingSeek(node);
            });
            el.addEventListener('error', function () {
                var node = el._csNode;
                if (node) setNodeBuffering(node, false);
            });
        }

        function removeMissing(visible) {
            Object.keys(nodes).forEach(function (key) {
                if (visible[key]) return;
                var node = nodes[key];
                removeNode(node);
                delete nodes[key];
            });
            reportBuffering();
        }

        function timeIsBuffered(el, time, slackSeconds) {
            try {
                var ranges = el.buffered;
                for (var i = 0; i < ranges.length; i++) {
                    if (time >= ranges.start(i) && time <= ranges.end(i) + (slackSeconds || 0)) return true;
                }
            } catch (e) {}
            return false;
        }

        function setMediaNode(layer, node, playing) {
            if (!node.el) return;
            var mediaClassName = 'cs-render-media cs-fit-' + layer.item.fit;
            if (layer.media.kind === 'color') {
                mediaClassName += ' cs-render-color';
            } else if (layer.media.kind === 'embed') {
                mediaClassName += ' cs-render-embed';
            } else if (layer.media.kind === 'timer') {
                mediaClassName += ' cs-render-timer';
            }
            if (node.mediaClassName !== mediaClassName) {
                node.el.className = mediaClassName;
                node.mediaClassName = mediaClassName;
            }
            if (layer.media.kind === 'color') {
                var fill = layer.media.solidColor || '#000000';
                if (node.solidColor !== fill) {
                    node.el.style.background = fill;
                    node.solidColor = fill;
                }
                setNodeBuffering(node, false);
                return;
            }
            if (layer.media.kind === 'timer') {
                var timerBg = layer.media.solidColor || '#141414';
                var timerFg = layer.media.timerTextColor || '#ffffff';
                if (node.solidColor !== timerBg) {
                    node.el.style.background = timerBg;
                    node.solidColor = timerBg;
                }
                if (node.timerTextColor !== timerFg && node.timerLabel) {
                    node.timerLabel.style.color = timerFg;
                    node.timerTextColor = timerFg;
                }
                var timerShowMs = !!layer.media.timerShowMs;
                var timerText = formatTimerDisplay(
                    timerValueAtMediaTime(layer.media, layer.mediaTime),
                    timerShowMs
                );
                if (node.timerLabel && node.timerDisplay !== timerText) {
                    node.timerLabel.textContent = timerText;
                    node.timerDisplay = timerText;
                }
                setNodeBuffering(node, false);
                return;
            }
            if (layer.media.kind === 'embed' && layer.media.embedProvider === 'youtube') {
                var mediaTime = isFinite(layer.mediaTime) ? Math.max(0, layer.mediaTime) : 0;
                var startSec = Math.floor(mediaTime);
                var videoId = layer.media.embedVideoId || parseYouTubeVideoId(layer.media.embedUrl);
                if (!videoId) {
                    setNodeBuffering(node, false);
                    return;
                }
                node.wantsPlayback = !!playing;
                var now = Date.now();
                var lastSynced = node.embedSyncedAt || 0;
                var lastStart = node.embedStartSec;
                var drift = lastStart == null ? Infinity : Math.abs(startSec - lastStart);
                var player = node.ytPlayer || (node.el && node.el._csYtPlayer) || null;

                if (player && node.embedVideoId && node.embedVideoId !== videoId) {
                    try {
                        player.loadVideoById({
                            videoId: videoId,
                            startSeconds: mediaTime
                        });
                    } catch (e) {}
                    node.embedVideoId = videoId;
                    node.embedStartSec = startSec;
                    node.embedSyncedAt = now;
                    node.embedPlaying = !!playing;
                    syncYoutubePlayer(player, playing, mediaTime, node);
                    setNodeBuffering(node, false);
                    return;
                }

                if (player && (drift > 2 && now - lastSynced > 750)) {
                    syncYoutubePlayer(player, playing, mediaTime, node);
                    node.embedStartSec = startSec;
                    node.embedSyncedAt = now;
                    node.embedPlaying = !!playing;
                    setNodeBuffering(node, false);
                    return;
                }

                if (player) {
                    if (drift <= 2) node.embedStartSec = startSec;
                    var wantsPlay = !!playing || !!node.wantsPlayback;
                    var pendingPaused = !!(player._csPendingPausedFrame ||
                        (node.el && node.el._csPendingPausedFrame));
                    if (wantsPlay !== !!node.embedPlaying || pendingPaused ||
                        (wantsPlay && !(node.el && node.el._csYoutubeReady))) {
                        syncYoutubePlayer(player, wantsPlay, mediaTime, node);
                        node.embedPlaying = wantsPlay;
                        if (wantsPlay) node.embedSyncedAt = now;
                    }
                    setNodeBuffering(node, false);
                    return;
                }

                setNodeBuffering(node, false);
                return;
            }
            if (layer.media.kind === 'video' || layer.media.kind === 'audio') {
                var avMediaTime = isFinite(layer.mediaTime) ? Math.max(0, layer.mediaTime) : 0;
                var currentTime = node.el.currentTime || 0;
                var signedDrift = avMediaTime - currentTime;
                var avDrift = Math.abs(signedDrift);
                var avNow = Date.now();
                var canCorrect = node.el.readyState >= 1;

                installMediaEvents(node.el);
                node.el._csNode = node;
                node.wantsPlayback = !!playing;
                node.el.muted = true;
                node.el.loop = false;

                var wantsHardSeek = false;
                if (node.pendingSeekTime != null || node.forceSeek) {
                    wantsHardSeek = true;
                } else if (!playing && avDrift > SEEK_DRIFT_WHILE_PAUSED) {
                    wantsHardSeek = true;
                } else if (playing && canCorrect && avDrift > HARD_SEEK_DRIFT) {
                    // Behind the shared clock while playing. A hard seek only
                    // helps if the target is already buffered; otherwise it
                    // discards buffered data and stalls the element again, so
                    // rate-based catch-up (or simply tolerating drift) wins.
                    var throttled = avNow - (node.lastSeekAt || 0) < RESYNC_MIN_INTERVAL_MS;
                    if (!throttled && (timeIsBuffered(node.el, avMediaTime, 0.5) || avDrift > 8)) {
                        wantsHardSeek = true;
                    }
                }
                if (wantsHardSeek) {
                    seekMediaNode(node, avMediaTime);
                }
                if ('playbackRate' in node.el) {
                    if (playing && !wantsHardSeek && avDrift > RATE_DRIFT_MIN) {
                        node.el.playbackRate = signedDrift > 0 ? Math.min(1.12, 1 + avDrift * 0.15) : 0.92;
                    } else {
                        node.el.playbackRate = 1;
                    }
                }
                if (playing && node.el.paused) {
                    var promise = node.el.play();
                    if (promise && promise.catch) promise.catch(function () {});
                } else if (!playing && !node.el.paused) {
                    node.el.pause();
                }
                // readyState 2 (HAVE_CURRENT_DATA) is enough to keep showing
                // frames; only report buffering when the element truly cannot
                // present the current position.
                setNodeBuffering(node, !!playing && (node.el.seeking || node.el.readyState < 2));
            }
        }

        function mountGeneratedMedia(layer, node, playing) {
            node.wrap.innerHTML = '';
            node.pendingSeekTime = null;
            node.forceSeek = true;
            node.lastSeekAt = 0;
            node.wantsPlayback = !!playing;
            if (layer.media.kind === 'color') {
                var colorEl = document.createElement('div');
                colorEl.className = 'cs-render-media cs-render-color cs-fit-' + layer.item.fit;
                colorEl.style.background = layer.media.solidColor || '#000000';
                node.wrap.appendChild(colorEl);
                node.el = colorEl;
                node.solidColor = layer.media.solidColor || '#000000';
                node.mediaClassName = colorEl.className;
                setNodeBuffering(node, false);
                return;
            }
            if (layer.media.kind === 'timer') {
                var timerEl = document.createElement('div');
                timerEl.className = 'cs-render-media cs-render-timer cs-fit-' + layer.item.fit;
                timerEl.style.background = layer.media.solidColor || '#141414';
                var timerLabel = document.createElement('span');
                timerLabel.className = 'cs-render-timer-label';
                timerLabel.style.color = layer.media.timerTextColor || '#ffffff';
                timerLabel.textContent = formatTimerDisplay(
                    timerValueAtMediaTime(layer.media, layer.mediaTime || 0),
                    !!layer.media.timerShowMs
                );
                timerEl.appendChild(timerLabel);
                node.wrap.appendChild(timerEl);
                node.el = timerEl;
                node.timerLabel = timerLabel;
                node.timerDisplay = timerLabel.textContent;
                node.solidColor = layer.media.solidColor || '#141414';
                node.timerTextColor = layer.media.timerTextColor || '#ffffff';
                node.mediaClassName = timerEl.className;
                setNodeBuffering(node, false);
                return;
            }
            if (layer.media.kind === 'embed') {
                var videoId = layer.media.embedVideoId || parseYouTubeVideoId(layer.media.embedUrl);
                var embedWrap = document.createElement('div');
                embedWrap.className = 'cs-render-embed-wrap';
                var host = document.createElement('div');
                host.className = 'cs-render-media cs-render-embed cs-fit-' + layer.item.fit;
                host.setAttribute('data-video-id', videoId || '');
                host._csVideoId = videoId || '';
                embedWrap.appendChild(host);
                node.wrap.appendChild(embedWrap);
                node.el = host;
                node.embedWrap = embedWrap;
                node.mediaClassName = host.className;
                node.ytPlayer = null;
                if (layer.media.embedProvider === 'youtube' && videoId) {
                    node.embedVideoId = videoId;
                    node.embedStartSec = Math.floor(Math.max(0, layer.mediaTime || 0));
                    node.embedSyncedAt = Date.now();
                    node.embedPlaying = !!playing;
                    setNodeBuffering(node, true);
                    createYoutubePlayer(host, {
                        videoId: videoId,
                        mediaTime: layer.mediaTime || 0,
                        playing: playing
                    }).then(function (result) {
                        if (!nodes[layer.key] || nodes[layer.key] !== node) {
                            if (result && result.player && result.player.destroy) {
                                try { result.player.destroy(); } catch (e) {}
                            }
                            return;
                        }
                        node.ytPlayer = result.player;
                        if (result.iframe) {
                            node.el = result.iframe;
                            result.iframe._csYtPlayer = result.player;
                            result.iframe._csYoutubeReady = true;
                        }
                        var shouldPlay = !!node.wantsPlayback;
                        syncYoutubePlayer(result.player, shouldPlay, layer.mediaTime || 0, node);
                        node.embedPlaying = shouldPlay;
                        setNodeBuffering(node, false);
                    }).catch(function () {
                        setNodeBuffering(node, false);
                    });
                } else {
                    setNodeBuffering(node, false);
                }
            }
        }

        function render(project, presentationId, playhead, playing) {
            if (!stage) return;
            stage.style.transformOrigin = '';
            stage.style.transform = '';
            var layers = resolveLayers(project, presentationId, playhead);
            var visible = {};

            layers.forEach(function (layer, index) {
                visible[layer.key] = true;
                var node = nodes[layer.key];
                if (!node) {
                    var wrap = document.createElement('div');
                    wrap.className = 'cs-render-layer';
                    var pending = document.createElement('div');
                    pending.className = 'cs-render-pending';
                    pending.textContent = layer.media.name || 'Loading';
                    wrap.appendChild(pending);
                    stage.appendChild(wrap);
                    node = nodes[layer.key] = { wrap: wrap, mediaId: null, el: null, buffering: false };
                }

                var viewZoom = layer.viewZoom || 1;
                var layout = {
                    zIndex: String(index + 1),
                    left: (50 + (layer.item.x - 50) * viewZoom) + '%',
                    top: (50 + (layer.item.y - 50) * viewZoom) + '%',
                    width: (layer.item.scaleX * viewZoom) + '%',
                    height: (layer.item.scaleY * viewZoom) + '%',
                    opacity: String(layer.opacity / 100),
                    transform: 'translate(-50%, -50%) rotate(' + layer.item.rotation + 'deg)'
                };
                var layoutKey = [layout.zIndex, layout.left, layout.top, layout.width, layout.height, layout.opacity, layout.transform].join('|');
                if (node.layoutKey !== layoutKey) {
                    node.wrap.style.zIndex = layout.zIndex;
                    node.wrap.style.left = layout.left;
                    node.wrap.style.top = layout.top;
                    node.wrap.style.width = layout.width;
                    node.wrap.style.height = layout.height;
                    node.wrap.style.opacity = layout.opacity;
                    node.wrap.style.transform = layout.transform;
                    node.layoutKey = layoutKey;
                }

                if (node.mediaId !== layer.media.id && (!node.retryAt || Date.now() >= node.retryAt)) {
                    var requestedMediaId = layer.media.id;
                    var previousMediaId = node.mediaId;
                    node.mediaId = requestedMediaId;
                    node.retryAt = 0;
                    if (node.el) {
                        destroyYoutubePlayer(node);
                        if (node.el.pause) {
                            try { node.el.pause(); } catch (e) {}
                        }
                        var wasGenerated = !!(node.el.tagName === 'IFRAME' ||
                            (node.el.classList && (
                                node.el.classList.contains('cs-render-color') ||
                                node.el.classList.contains('cs-render-embed') ||
                                node.el.classList.contains('cs-render-timer')
                            )));
                        if (previousMediaId && !wasGenerated) {
                            poolPut(previousMediaId, node.el);
                        } else {
                            node.el._csNode = null;
                        }
                    }
                    node.el = null;
                    node.ytPlayer = null;
                    node.pendingSeekTime = null;
                    node.forceSeek = true;
                    node.lastSeekAt = 0;
                    node.embedVideoId = null;
                    node.embedStartSec = null;
                    node.embedSyncedAt = 0;
                    node.embedPlaying = null;
                    node.solidColor = null;

                    if (isGeneratedMediaKind(layer.media.kind)) {
                        mountGeneratedMedia(layer, node, playing);
                        setMediaNode(layer, node, playing);
                        return;
                    }

                    setNodeBuffering(node, layer.media.kind === 'video' || layer.media.kind === 'audio');
                    node.wrap.innerHTML = '<div class="cs-render-pending">Loading</div>';
                    resolveUrl(requestedMediaId).then(function (url) {
                        var current = nodes[layer.key];
                        // Only bail if the layer disappeared or was retargeted while loading.
                        if (!current || current.mediaId !== requestedMediaId) return;
                        if (!url) {
                            // Blob missing: retry after a short delay instead of hanging on "Loading".
                            current.mediaId = null;
                            current.retryAt = Date.now() + 1000;
                            setNodeBuffering(current, false);
                            return;
                        }
                        // Reuse a pooled element for this media if one exists:
                        // it keeps the browser's buffered/decoded data alive so
                        // looping content plays instantly instead of refetching.
                        var el = poolTake(requestedMediaId, url);
                        if (!el) {
                            el = document.createElement(
                                layer.media.kind === 'video' ? 'video' :
                                    (layer.media.kind === 'audio' ? 'audio' : 'img')
                            );
                            el.alt = '';
                            if (el.tagName === 'IMG') el.decoding = 'async';
                            if (layer.media.kind === 'video' || layer.media.kind === 'audio') {
                                el.preload = 'auto';
                                el.muted = true;
                                el.controls = false;
                                if (el.disableRemotePlayback != null) el.disableRemotePlayback = true;
                                if (layer.media.kind === 'video') {
                                    el.playsInline = true;
                                    el.setAttribute('playsinline', '');
                                    el.setAttribute('webkit-playsinline', '');
                                }
                            }
                            el._csUrl = url;
                            el.src = url;
                        }
                        el.className = 'cs-render-media cs-fit-' + layer.item.fit;
                        current.wrap.innerHTML = '';
                        current.wrap.appendChild(el);
                        current.el = el;
                        el._csNode = current;
                        if (layer.media.kind !== 'video' && layer.media.kind !== 'audio') {
                            setNodeBuffering(current, false);
                        }
                        setMediaNode(layer, current, playing);
                    });
                } else {
                    setMediaNode(layer, node, playing);
                }
            });

            removeMissing(visible);
        }

        function isReady() {
            var keys = Object.keys(nodes);
            for (var i = 0; i < keys.length; i++) {
                var node = nodes[keys[i]];
                if (!node || !node.el) return false;
                if (node.buffering) return false;
                if (node.ytPlayer || node.el.tagName === 'IFRAME' ||
                    (node.el.classList && (
                        node.el.classList.contains('cs-render-color') ||
                        node.el.classList.contains('cs-render-embed') ||
                        node.el.classList.contains('cs-render-timer')
                    ))) {
                    if (node.ytPlayer || node.el._csYoutubeReady) {
                        continue;
                    }
                    if (node.el.classList && node.el.classList.contains('cs-render-embed')) {
                        return false;
                    }
                    continue;
                }
                if (node.el.tagName === 'VIDEO' || node.el.tagName === 'AUDIO') {
                    if (node.pendingSeekTime != null || node.el.seeking || node.el.readyState < 3) return false;
                } else if (!node.el.complete || !node.el.naturalWidth) {
                    return false;
                }
            }
            return true;
        }

        function destroy() {
            Object.keys(nodes).forEach(function (key) {
                var node = nodes[key];
                removeNode(node);
            });
            nodes = {};
            clearPool();
            reportBuffering();
        }

        return { render: render, isReady: isReady, destroy: destroy };
    }

    global.CrosssharePresentationEngine = {
        DEFAULT_IMAGE_DURATION: DEFAULT_IMAGE_DURATION,
        MAX_RENDER_DEPTH: MAX_RENDER_DEPTH,
        clamp: clamp,
        getPresentation: getPresentation,
        getMediaItem: getMediaItem,
        parseYouTubeVideoId: parseYouTubeVideoId,
        youtubeEmbedSrc: youtubeEmbedSrc,
        ensureYoutubeApi: ensureYoutubeApi,
        createYoutubePlayer: createYoutubePlayer,
        destroyYoutubePlayer: destroyYoutubePlayer,
        attachYoutubeLoadSync: attachYoutubeLoadSync,
        syncYoutubePlayback: syncYoutubePlayback,
        isGeneratedMediaKind: isGeneratedMediaKind,
        formatTimerDisplay: formatTimerDisplay,
        timerValueAtMediaTime: timerValueAtMediaTime,
        normalizeItem: normalizeItem,
        normalizeTransition: normalizeTransition,
        normalizeTransitions: normalizeTransitions,
        orderedPresentationItems: orderedPresentationItems,
        findTransitionBefore: findTransitionBefore,
        findTransitionAfter: findTransitionAfter,
        layoutSequentialPresentation: layoutSequentialPresentation,
        migrateLegacyTransitions: migrateLegacyTransitions,
        defaultItemFromSource: defaultItemFromSource,
        sourceDuration: sourceDuration,
        syncPresentationItemDurations: syncPresentationItemDurations,
        itemUnitDuration: itemUnitDuration,
        itemSpan: itemSpan,
        presentationDuration: presentationDuration,
        hasCycle: hasCycle,
        itemPlayback: itemPlayback,
        resolveLayers: resolveLayers,
        loopLabel: loopLabel,
        normalizePlaybackState: normalizePlaybackState,
        syncPlaybackState: syncPlaybackState,
        setPlaybackPlaying: setPlaybackPlaying,
        restartPlayback: restartPlayback,
        seekPlaybackState: seekPlaybackState,
        createPreviewCapture: createPreviewCapture,
        createDomRenderer: createDomRenderer
    };
})(window);
