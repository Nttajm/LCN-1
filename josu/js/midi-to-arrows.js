// ══════════════════════════════════════════════════════════════
// JOSU – MIDI → 4-lane arrow beatmap
// ══════════════════════════════════════════════════════════════

const JosuMidi = (() => {
    const ARROWS = ['left', 'down', 'up', 'right'];
    const DRUM_CHANNEL = 9;
    const DEFAULT_TEMPO = 500000;

    function parse(buffer) {
        const view = toView(buffer);
        if (readStr(view, 0, 4) !== 'MThd') throw new Error('Not a MIDI file');
        const headerLen = view.getUint32(4);
        const format = view.getUint16(8);
        const trackCount = view.getUint16(10);
        const division = view.getUint16(12);
        let offset = 8 + headerLen;

        const tracks = [];
        for (let t = 0; t < trackCount && offset + 8 <= view.byteLength; t++) {
            const tag = readStr(view, offset, 4);
            const length = view.getUint32(offset + 4);
            offset += 8;
            if (tag !== 'MTrk') {
                offset += length;
                continue;
            }
            const end = Math.min(offset + length, view.byteLength);
            tracks.push(parseTrack(view, offset, end));
            offset = end;
        }

        const tempos = [{ tick: 0, usPerQuarter: DEFAULT_TEMPO }];
        let lastTick = 0;
        let foundTempo = false;
        tracks.forEach(events => {
            events.forEach(ev => {
                if (ev.tick > lastTick) lastTick = ev.tick;
                if (ev.type === 'meta' && ev.metaType === 0x51 && ev.data.length >= 3) {
                    const us = (ev.data[0] << 16) | (ev.data[1] << 8) | ev.data[2];
                    if (us > 0) {
                        foundTempo = true;
                        tempos.push({ tick: ev.tick, usPerQuarter: us });
                    }
                }
            });
        });
        tempos.sort((a, b) => a.tick - b.tick);

        const toMs = ticksToMsFactory(division, tempos);
        const notes = [];
        tracks.forEach((events, track) => {
            events.forEach(ev => {
                if (ev.type !== 'midi') return;
                if (ev.cmd !== 0x90 || ev.data2 <= 0) return;
                notes.push({
                    tick: ev.tick,
                    timeMs: toMs(ev.tick),
                    pitch: ev.data1,
                    velocity: ev.data2,
                    channel: ev.channel,
                    track
                });
            });
        });

        notes.sort((a, b) => a.timeMs - b.timeMs || a.pitch - b.pitch);
        const bpm = foundTempo ? primaryBpm(tempos, lastTick) : null;
        const durationMs = notes.length ? notes[notes.length - 1].timeMs : toMs(lastTick);

        return { format, trackCount, bpm, durationMs, notes };
    }

    function toArrows(parsed, opts = {}) {
        const bpm = clamp(Math.round(opts.bpm || parsed.bpm || 120), 60, 300);
        const snap = opts.snap !== false;
        const snapMs = (60000 / bpm) / 4;
        const source = pickSourceNotes(parsed.notes);
        if (!source.length) return [];

        const timed = source.map(n => ({
            pitch: n.pitch,
            velocity: n.velocity,
            time: snap ? Math.round(n.timeMs / snapMs) * snapMs : Math.round(n.timeMs)
        })).filter(n => n.time >= 0);

        timed.sort((a, b) => a.time - b.time || a.pitch - b.pitch);

        const groups = [];
        timed.forEach(n => {
            const last = groups[groups.length - 1];
            if (last && Math.abs(last.time - n.time) <= 2) last.notes.push(n);
            else groups.push({ time: n.time, notes: [n] });
        });

        let lastLane = 1;
        let lastPitch = groups[0].notes[0].pitch;
        const placed = [];
        const seen = new Set();

        groups.forEach(g => {
            const pitches = uniquePitches(g.notes);
            const lanes = assignLanes(pitches, lastLane, lastPitch);
            lanes.forEach(lane => {
                const key = ARROWS[lane];
                const id = key + ':' + g.time;
                if (seen.has(id)) return;
                seen.add(id);
                placed.push({ key, time: Math.round(g.time) });
            });
            lastLane = lanes[lanes.length - 1];
            lastPitch = pitches[pitches.length - 1];
        });

        return placed;
    }

    function pickSourceNotes(notes) {
        const audible = notes.filter(n => n.velocity >= 20);
        const melody = audible.filter(n => n.channel !== DRUM_CHANNEL);
        return melody.length >= 8 ? melody : audible;
    }

    function uniquePitches(notes) {
        const byPitch = new Map();
        notes.forEach(n => {
            const prev = byPitch.get(n.pitch);
            if (!prev || n.velocity > prev.velocity) byPitch.set(n.pitch, n);
        });
        const ranked = [...byPitch.values()].sort((a, b) => b.velocity - a.velocity);
        const top = ranked.slice(0, 4).sort((a, b) => a.pitch - b.pitch);
        return top.map(n => n.pitch);
    }

    function pitchBand(pitch) {
        const t = (pitch - 48) / 36;
        return clamp(Math.floor(t * 4), 0, 3);
    }

    function followPitch(pitch, lastLane, lastPitch) {
        const delta = pitch - lastPitch;
        if (Math.abs(delta) < 1) return lastLane;
        const dir = delta > 0 ? 1 : -1;
        const steps = clamp(Math.round(Math.abs(delta) / 4), 1, 2);
        let lane = lastLane + dir * steps;
        if (lane > 3) {
            lane = 3 - (lane - 3);
            if (lane === lastLane) lane = Math.max(0, lastLane - 1);
        } else if (lane < 0) {
            lane = -lane;
            if (lane === lastLane) lane = Math.min(3, lastLane + 1);
        }
        return clamp(lane, 0, 3);
    }

    function assignLanes(pitches, lastLane, lastPitch) {
        const n = pitches.length;
        if (n === 1) return [followPitch(pitches[0], lastLane, lastPitch)];
        if (n === 2) {
            let low = Math.min(1, pitchBand(pitches[0]));
            let high = Math.max(2, pitchBand(pitches[1]));
            if (high === low) high = Math.min(3, low + 2);
            return [low, high];
        }
        if (n === 3) {
            const loGap = pitches[1] - pitches[0];
            const hiGap = pitches[2] - pitches[1];
            return loGap >= hiGap ? [0, 2, 3] : [0, 1, 3];
        }
        return [0, 1, 2, 3];
    }

    function primaryBpm(tempos, lastTick) {
        let bestUs = tempos[0].usPerQuarter;
        let bestDur = 0;
        for (let i = 0; i < tempos.length; i++) {
            const start = tempos[i].tick;
            const end = i + 1 < tempos.length ? tempos[i + 1].tick : Math.max(lastTick, start + 1);
            const dur = end - start;
            if (dur >= bestDur) {
                bestDur = dur;
                bestUs = tempos[i].usPerQuarter;
            }
        }
        return clamp(Math.round(60000000 / bestUs), 60, 300);
    }

    function ticksToMsFactory(division, tempos) {
        if (division & 0x8000) {
            const fps = 256 - ((division >> 8) & 0xff);
            const tpf = division & 0xff;
            const ticksPerSecond = Math.max(1, fps * tpf);
            return tick => (tick / ticksPerSecond) * 1000;
        }
        const tpq = division || 480;
        const map = tempos[0] && tempos[0].tick === 0
            ? tempos
            : [{ tick: 0, usPerQuarter: DEFAULT_TEMPO }, ...tempos];
        return tick => {
            let ms = 0;
            let prev = 0;
            let us = map[0].usPerQuarter;
            for (let i = 0; i < map.length; i++) {
                const at = map[i].tick;
                if (at >= tick) break;
                if (at > prev) {
                    ms += (at - prev) * us / tpq / 1000;
                    prev = at;
                }
                us = map[i].usPerQuarter;
            }
            ms += (tick - prev) * us / tpq / 1000;
            return ms;
        };
    }

    function parseTrack(view, start, end) {
        let offset = start;
        let tick = 0;
        let status = 0;
        const events = [];

        const u8 = () => {
            if (offset >= end) throw new Error('MIDI track truncated');
            return view.getUint8(offset++);
        };
        const vlq = () => {
            let v = 0;
            for (let i = 0; i < 4; i++) {
                const b = u8();
                v = (v << 7) | (b & 0x7f);
                if ((b & 0x80) === 0) return v;
            }
            return v;
        };

        while (offset < end) {
            tick += vlq();
            if (offset >= end) break;
            const peek = view.getUint8(offset);
            if (peek >= 0x80) status = u8();
            else if (!status) throw new Error('MIDI running status missing');

            if (status === 0xff) {
                const metaType = u8();
                const len = vlq();
                if (offset + len > end) throw new Error('MIDI meta truncated');
                const data = new Uint8Array(view.buffer, view.byteOffset + offset, len);
                offset += len;
                events.push({ tick, type: 'meta', metaType, data });
            } else if (status === 0xf0 || status === 0xf7) {
                const len = vlq();
                offset = Math.min(end, offset + len);
            } else {
                const cmd = status & 0xf0;
                const channel = status & 0x0f;
                if (cmd === 0xc0 || cmd === 0xd0) {
                    events.push({ tick, type: 'midi', cmd, channel, data1: u8(), data2: 0 });
                } else if (status < 0xf0) {
                    events.push({ tick, type: 'midi', cmd, channel, data1: u8(), data2: u8() });
                } else if (status === 0xf2) {
                    u8(); u8();
                } else if (status === 0xf1 || status === 0xf3) {
                    u8();
                }
            }
        }
        return events;
    }

    function toView(buffer) {
        if (buffer instanceof ArrayBuffer) return new DataView(buffer);
        if (ArrayBuffer.isView(buffer)) {
            return new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        }
        throw new Error('Not a MIDI file');
    }

    function readStr(view, offset, len) {
        let s = '';
        for (let i = 0; i < len; i++) s += String.fromCharCode(view.getUint8(offset + i));
        return s;
    }

    function clamp(n, lo, hi) {
        return Math.max(lo, Math.min(hi, n));
    }

    return { parse, toArrows };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = JosuMidi;
