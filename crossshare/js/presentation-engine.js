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
                    return mediaElement(layer.media).then(function (cached) {
                        if (!cached || !cached.el) return;
                        return waitForPreviewMedia(cached.el, cached.kind, layer.mediaTime).then(function (ready) {
                            if (!ready) return;
                            var viewZoom = layer.viewZoom || 1;
                            var boxW = (layer.item.scaleX * viewZoom / 100) * width;
                            var boxH = (layer.item.scaleY * viewZoom / 100) * height;
                            var cx = (layer.item.x / 100) * width;
                            var cy = (layer.item.y / 100) * height;
                            var dx = cx - boxW / 2;
                            var dy = cy - boxH / 2;
                            ctx.save();
                            ctx.globalAlpha = clamp(layer.opacity, 0, 100) / 100;
                            if (layer.item.rotation) {
                                ctx.translate(cx, cy);
                                ctx.rotate(layer.item.rotation * Math.PI / 180);
                                ctx.translate(-cx, -cy);
                            }
                            drawMediaFit(ctx, cached.el, dx, dy, boxW, boxH, layer.item.fit);
                            ctx.restore();
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
        var SEEK_DRIFT_WHILE_PLAYING = 0.12;
        var SEEK_DRIFT_WHILE_PAUSED = 0.08;
        var SEEK_THROTTLE_MS = 250;

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
            if (node.el && node.el.pause) node.el.pause();
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

        function installMediaEvents(node, playing) {
            if (!node || !node.el || node.eventsInstalled) return;
            node.eventsInstalled = true;
            ['waiting', 'stalled', 'seeking'].forEach(function (eventName) {
                node.el.addEventListener(eventName, function () {
                    setNodeBuffering(node, !!node.wantsPlayback);
                });
            });
            ['canplay', 'canplaythrough', 'playing', 'timeupdate', 'seeked', 'loadeddata'].forEach(function (eventName) {
                node.el.addEventListener(eventName, function () {
                    applyPendingSeek(node);
                    setNodeBuffering(node, false);
                });
            });
            node.el.addEventListener('loadedmetadata', function () {
                applyPendingSeek(node);
            });
            node.el.addEventListener('error', function () {
                setNodeBuffering(node, false);
            });
            node.wantsPlayback = !!playing;
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

        function setMediaNode(layer, node, playing) {
            if (!node.el) return;
            node.el.className = 'cs-render-media cs-fit-' + layer.item.fit;
            if (layer.media.kind === 'video' || layer.media.kind === 'audio') {
                var mediaTime = isFinite(layer.mediaTime) ? Math.max(0, layer.mediaTime) : 0;
                var currentTime = node.el.currentTime || 0;
                var signedDrift = mediaTime - currentTime;
                var drift = Math.abs(signedDrift);
                var now = Date.now();
                var canCorrect = node.el.readyState >= 1;
                var largeDrift = drift > SEEK_DRIFT_WHILE_PLAYING &&
                    now - (node.lastSeekAt || 0) > SEEK_THROTTLE_MS;

                installMediaEvents(node, playing);
                node.wantsPlayback = !!playing;
                node.el.muted = true;
                node.el.loop = false;
                if (
                    node.pendingSeekTime != null ||
                    node.forceSeek ||
                    (!playing && drift > SEEK_DRIFT_WHILE_PAUSED) ||
                    (playing && canCorrect && largeDrift)
                ) {
                    seekMediaNode(node, mediaTime);
                }
                if ('playbackRate' in node.el) {
                    if (playing && drift > 0.035 && drift <= SEEK_DRIFT_WHILE_PLAYING) {
                        node.el.playbackRate = signedDrift > 0 ? 1.05 : 0.95;
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
                setNodeBuffering(node, !!playing && (node.el.seeking || node.el.readyState < 3));
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

                node.wrap.style.zIndex = String(index + 1);
                var viewZoom = layer.viewZoom || 1;
                node.wrap.style.left = (50 + (layer.item.x - 50) * viewZoom) + '%';
                node.wrap.style.top = (50 + (layer.item.y - 50) * viewZoom) + '%';
                node.wrap.style.width = (layer.item.scaleX * viewZoom) + '%';
                node.wrap.style.height = (layer.item.scaleY * viewZoom) + '%';
                node.wrap.style.opacity = String(layer.opacity / 100);
                node.wrap.style.transform = 'translate(-50%, -50%) rotate(' + layer.item.rotation + 'deg)';

                if (node.mediaId !== layer.media.id && (!node.retryAt || Date.now() >= node.retryAt)) {
                    var requestedMediaId = layer.media.id;
                    node.mediaId = requestedMediaId;
                    node.retryAt = 0;
                    if (node.el && node.el.pause) node.el.pause();
                    node.el = null;
                    node.eventsInstalled = false;
                    node.pendingSeekTime = null;
                    node.forceSeek = true;
                    node.lastSeekAt = 0;
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
                        var el = document.createElement(
                            layer.media.kind === 'video' ? 'video' :
                                (layer.media.kind === 'audio' ? 'audio' : 'img')
                        );
                        el.className = 'cs-render-media cs-fit-' + layer.item.fit;
                        el.alt = '';
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
                        el.src = url;
                        current.wrap.innerHTML = '';
                        current.wrap.appendChild(el);
                        current.el = el;
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
