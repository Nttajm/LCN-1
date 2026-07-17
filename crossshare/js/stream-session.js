(function (global) {
    'use strict';

    var STORAGE_KEY = 'crossshare_streams';
    var SIGNAL_PREFIX = 'crossshare_presentation_signal:';
    var CHANNEL_PREFIX = 'crossshare-presentations:';

    function nowMs() {
        return Date.now();
    }

    function clonePlayback(playback) {
        playback = playback || {};
        return {
            playing: !!playback.playing,
            time: typeof playback.time === 'number' && isFinite(playback.time) ? playback.time : 0,
            anchorTimeMs: typeof playback.anchorTimeMs === 'number' && isFinite(playback.anchorTimeMs)
                ? playback.anchorTimeMs
                : null,
            startedAt: typeof playback.startedAt === 'number' && isFinite(playback.startedAt)
                ? playback.startedAt
                : null
        };
    }

    function buildEnvelope(type, options) {
        options = options || {};
        return {
            type: type,
            projectId: options.projectId || null,
            projectCode: options.projectCode || null,
            streamId: options.streamId || null,
            streamViewId: options.streamViewId || null,
            revision: options.revision || nowMs(),
            ts: nowMs(),
            playback: clonePlayback(options.playback)
        };
    }

    function loadProjects() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            var list = raw ? JSON.parse(raw) : [];
            return Array.isArray(list) ? list : [];
        } catch (e) {
            return [];
        }
    }

    function isProjectCodeExpired(project) {
        if (!project) return true;
        if (project.projectCodeExpiryMode === 'never') return false;
        if (project.projectCodeExpiresAt == null) return false;
        return project.projectCodeExpiresAt <= nowMs();
    }

    function sanitizeViewId(value) {
        return String(value || '').replace(/\s+/g, '');
    }

    function getStreamViewId(stream, index) {
        var custom = sanitizeViewId(stream && stream.viewId);
        if (custom) return custom;
        return String((index || 0) + 1);
    }

    function findProjectByPublicCode(code, options) {
        options = options || {};
        var needle = String(code || '').trim().toUpperCase();
        if (!needle) return null;
        var list = loadProjects();
        if (needle.length === 4) {
            for (var t = list.length - 1; t >= 0; t--) {
                var tempProject = list[t];
                if (
                    tempProject &&
                    tempProject.tempCode &&
                    String(tempProject.tempCode).toUpperCase() === needle &&
                    tempProject.tempCodeExpiresAt > nowMs()
                ) {
                    return tempProject;
                }
            }
        }
        for (var i = list.length - 1; i >= 0; i--) {
            var project = list[i];
            if (!project) continue;
            if (project.projectCode && String(project.projectCode).toUpperCase() === needle) {
                if (!options.allowExpired && isProjectCodeExpired(project)) continue;
                return project;
            }
            if (
                project.tempCode &&
                String(project.tempCode).toUpperCase() === needle &&
                project.tempCodeExpiresAt > nowMs()
            ) {
                return project;
            }
        }
        return null;
    }

    function findProjectByIdentity(identity) {
        identity = identity || {};
        var list = loadProjects();
        var i;
        if (identity.projectCode) {
            var byCode = findProjectByPublicCode(identity.projectCode, { allowExpired: !!identity.allowExpired });
            if (byCode) return byCode;
        }
        if (identity.projectId) {
            for (i = list.length - 1; i >= 0; i--) {
                if (list[i] && list[i].id === identity.projectId) return list[i];
            }
        }
        if (identity.projectName) {
            for (i = list.length - 1; i >= 0; i--) {
                if (list[i] && list[i].name === identity.projectName) return list[i];
            }
        }
        return null;
    }

    function findStreamByViewId(project, viewId, options) {
        options = options || {};
        var streams = project && Array.isArray(project.projectStreams) ? project.projectStreams : [];
        var needle = sanitizeViewId(viewId);
        if (!needle) return options.allowFallback ? (streams[0] || null) : null;

        for (var i = 0; i < streams.length; i++) {
            if (getStreamViewId(streams[i], i) === needle) return streams[i];
        }
        for (var j = 0; j < streams.length; j++) {
            if (streams[j].id === needle) return streams[j];
        }
        return options.allowFallback ? (streams[0] || null) : null;
    }

    function createLocalTransport(sessionKey) {
        var channel = null;
        var listeners = [];
        var closed = false;
        var signalKey = SIGNAL_PREFIX + sessionKey;

        function emitLocal(message) {
            for (var i = 0; i < listeners.length; i++) {
                try {
                    listeners[i](message);
                } catch (e) {}
            }
        }

        if (global.BroadcastChannel) {
            channel = new BroadcastChannel(CHANNEL_PREFIX + sessionKey);
            channel.addEventListener('message', function (event) {
                if (closed) return;
                emitLocal(event.data || {});
            });
        }

        function onStorage(event) {
            if (closed) return;
            if (event.key === STORAGE_KEY || event.key === signalKey) {
                emitLocal({
                    type: 'snapshot-reload',
                    projectId: sessionKey,
                    revision: nowMs(),
                    ts: nowMs(),
                    source: 'storage',
                    key: event.key
                });
            }
        }

        if (global.addEventListener) {
            global.addEventListener('storage', onStorage);
        }

        return {
            publish: function (message) {
                if (closed || !message) return;
                if (channel) {
                    try {
                        channel.postMessage(message);
                    } catch (e) {}
                }
            },
            signalSnapshot: function () {
                if (closed) return;
                try {
                    localStorage.setItem(signalKey, String(nowMs()));
                } catch (e) {}
            },
            subscribe: function (handler) {
                if (typeof handler !== 'function') return function () {};
                listeners.push(handler);
                return function unsubscribe() {
                    listeners = listeners.filter(function (fn) { return fn !== handler; });
                };
            },
            close: function () {
                if (closed) return;
                closed = true;
                listeners = [];
                if (channel) {
                    try { channel.close(); } catch (e) {}
                    channel = null;
                }
                if (global.removeEventListener) {
                    global.removeEventListener('storage', onStorage);
                }
            }
        };
    }

    function createSession(options) {
        options = options || {};
        var projectId = options.projectId || '_default';
        var projectCode = options.projectCode || null;
        var transport = createLocalTransport(projectId);
        var lastRevisionByType = {};

        function publish(type, payload) {
            payload = payload || {};
            var envelope = buildEnvelope(type, {
                projectId: projectId,
                projectCode: payload.projectCode || projectCode,
                streamId: payload.streamId || null,
                streamViewId: payload.streamViewId || null,
                revision: payload.revision || nowMs(),
                playback: payload.playback
            });
            lastRevisionByType[type] = envelope.revision;
            transport.publish(envelope);
            if (type === 'presentation-change' || type === 'stream-deleted' || type === 'project-change') {
                transport.signalSnapshot();
            }
            return envelope;
        }

        function isStale(message) {
            if (!message || !message.type || message.revision == null) return false;
            var prev = lastRevisionByType[message.type];
            return typeof prev === 'number' && message.revision < prev;
        }

        function matchesStream(message, streamId, streamViewId) {
            if (!message) return false;
            if (message.streamId && streamId && message.streamId !== streamId) return false;
            if (message.streamViewId && streamViewId && String(message.streamViewId) !== String(streamViewId)) {
                return false;
            }
            return true;
        }

        function subscribe(handler) {
            return transport.subscribe(function (message) {
                if (!message || !message.type) return;
                if (message.projectId && message.projectId !== projectId) return;
                if (isStale(message)) return;
                if (message.revision != null) {
                    lastRevisionByType[message.type] = message.revision;
                }
                handler(message);
            });
        }

        return {
            projectId: projectId,
            projectCode: projectCode,
            publishPlayback: function (payload) {
                return publish('playback-change', payload);
            },
            publishPresentation: function (payload) {
                return publish('presentation-change', payload);
            },
            publishStreamDeleted: function (payload) {
                return publish('stream-deleted', payload);
            },
            publishProjectChange: function (payload) {
                return publish('project-change', payload);
            },
            subscribe: subscribe,
            matchesStream: matchesStream,
            close: function () {
                transport.close();
            }
        };
    }

    global.CrossshareStreamSession = {
        STORAGE_KEY: STORAGE_KEY,
        SIGNAL_PREFIX: SIGNAL_PREFIX,
        CHANNEL_PREFIX: CHANNEL_PREFIX,
        loadProjects: loadProjects,
        isProjectCodeExpired: isProjectCodeExpired,
        sanitizeViewId: sanitizeViewId,
        getStreamViewId: getStreamViewId,
        findProjectByPublicCode: findProjectByPublicCode,
        findProjectByIdentity: findProjectByIdentity,
        findStreamByViewId: findStreamByViewId,
        buildEnvelope: buildEnvelope,
        createSession: createSession
    };
})(window);
