import {
  ref,
  get,
  set,
  update,
  remove,
  onValue,
  off,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";
import { db } from "./firebase.js";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_SEATS = 4;
const ACTIVE_GAME_STATUSES = new Set(["playing", "roundEnd", "finished"]);

function partyRef(code) {
  return ref(db, `parties/${code}`);
}

function gameRef(code) {
  return ref(db, `parties/${code}/game`);
}

function generateCode() {
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export function normalizeSeats(seats) {
  // Firebase may return seats as an array OR as an object with numeric keys.
  const list = [];
  if (Array.isArray(seats)) {
    for (let i = 0; i < MAX_SEATS; i += 1) list[i] = seats[i];
  } else if (seats && typeof seats === "object") {
    for (let i = 0; i < MAX_SEATS; i += 1) {
      list[i] = seats[i] ?? seats[String(i)];
    }
  }
  const out = [];
  for (let i = 0; i < MAX_SEATS; i += 1) {
    const seat = list[i];
    out.push(seat && typeof seat === "object" && seat.id ? seat : null);
  }
  return out;
}

export function occupiedCount(seats) {
  return normalizeSeats(seats).filter(Boolean).length;
}

export function seatsForWrite(seats) {
  return normalizeSeats(seats).map((seat) => seat || false);
}

function normalizeGuesses(guesses) {
  if (!Array.isArray(guesses)) return [];
  return guesses.filter((g) => g && typeof g === "object" && g.name);
}

export function normalizeGame(game) {
  if (!game || typeof game !== "object") return null;
  const players = {};
  const rawPlayers = game.players && typeof game.players === "object" ? game.players : {};
  Object.entries(rawPlayers).forEach(([id, player]) => {
    if (!player || typeof player !== "object") return;
    players[id] = {
      name: player.name || "Player",
      color: player.color || "#5b6cf0",
      guesses: normalizeGuesses(player.guesses),
      bestKm: typeof player.bestKm === "number" ? player.bestKm : null,
      wonRound: Boolean(player.wonRound),
      eliminated: Boolean(player.eliminated),
      roundScore: Number(player.roundScore) || 0,
      totalScore: Number(player.totalScore) || 0,
    };
  });
  return {
    status: game.status || "playing",
    mode: game.mode || null,
    region: game.region || "world",
    level: game.level || "easy",
    rounds: Number(game.rounds) || 5,
    timerSec: Number(game.timerSec) || 0,
    currentRound: Number(game.currentRound) || 1,
    targets: Array.isArray(game.targets) ? game.targets.filter(Boolean) : [],
    players,
    roundWinnerId: game.roundWinnerId || null,
    roundEndedAt: game.roundEndedAt || null,
  };
}

function emptyPlayerState(seat) {
  return {
    name: seat.name,
    color: seat.color,
    guesses: false,
    bestKm: false,
    wonRound: false,
    eliminated: false,
    roundScore: 0,
    totalScore: 0,
  };
}

export async function createParty(guest) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateCode();
    const snap = await get(partyRef(code));
    if (snap.exists()) continue;

    const seats = seatsForWrite([
      {
        id: guest.id,
        name: guest.name,
        color: guest.color,
        joinedAt: Date.now(),
      },
      null,
      null,
      null,
    ]);

    const party = {
      code,
      hostId: guest.id,
      status: "lobby",
      mode: false,
      seats,
      updatedAt: Date.now(),
    };

    await set(partyRef(code), party);
    return { ...party, seats: normalizeSeats(seats), game: null };
  }
  throw new Error("Could not create a party. Try again.");
}

export async function fetchParty(code) {
  const normalized = String(code || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(normalized)) {
    throw new Error("Enter a valid 6-character party code.");
  }
  const snap = await get(partyRef(normalized));
  if (!snap.exists()) throw new Error("Party not found.");
  const data = snap.val();
  return {
    ...data,
    code: normalized,
    seats: normalizeSeats(data.seats),
    mode: data.mode || null,
    game: normalizeGame(data.game),
  };
}

export async function joinParty(code, guest) {
  const normalized = String(code || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(normalized)) {
    throw new Error("Enter a valid 6-character party code.");
  }

  let joinError = null;
  const result = await runTransaction(partyRef(normalized), (current) => {
    joinError = null;
    if (!current) {
      joinError = "Party not found.";
      return;
    }
    if (current.status === "setup" || ACTIVE_GAME_STATUSES.has(current.status)) {
      joinError = "That party already started.";
      return;
    }

    const seats = normalizeSeats(current.seats);
    const existingIndex = seats.findIndex((s) => s && s.id === guest.id);
    if (existingIndex >= 0) {
      current.seats = seatsForWrite(seats);
      current.updatedAt = Date.now();
      return current;
    }

    const emptyIndex = seats.findIndex((s) => !s);
    if (emptyIndex < 0) {
      joinError = "Party is full.";
      return;
    }

    seats[emptyIndex] = {
      id: guest.id,
      name: guest.name,
      color: guest.color,
      joinedAt: Date.now(),
    };
    current.seats = seatsForWrite(seats);
    current.updatedAt = Date.now();
    return current;
  });

  if (!result.committed) {
    throw new Error(joinError || "Could not join party.");
  }

  const data = result.snapshot.val();
  if (!data) throw new Error("Party not found.");
  return {
    ...data,
    code: normalized,
    seats: normalizeSeats(data.seats),
    mode: data.mode || null,
    game: normalizeGame(data.game),
  };
}

export async function leaveParty(code, guestId) {
  if (!code || !guestId) return null;
  const snap = await get(partyRef(code));
  if (!snap.exists()) return null;

  const data = snap.val();
  const seats = normalizeSeats(data.seats).map((seat) =>
    seat && seat.id === guestId ? null : seat
  );
  const remaining = seats.filter(Boolean);

  if (remaining.length === 0) {
    await remove(partyRef(code));
    return null;
  }

  const hostId =
    data.hostId === guestId ? remaining[0].id : data.hostId;

  const next = {
    hostId,
    seats: seatsForWrite(seats),
    updatedAt: Date.now(),
  };

  if (data.status === "mode" && remaining.length < 2) {
    next.status = "lobby";
    next.mode = false;
  }

  await update(partyRef(code), next);
  return {
    ...data,
    ...next,
    seats,
    mode: next.mode === false ? null : data.mode || null,
    game: normalizeGame(data.game),
  };
}

export async function setPartyStatus(code, status, extra = {}) {
  const payload = {
    status,
    updatedAt: Date.now(),
    ...extra,
  };
  if (Object.prototype.hasOwnProperty.call(extra, "mode") && extra.mode == null) {
    payload.mode = false;
  }
  await update(partyRef(code), payload);
}

export async function startPartyGame(code, config) {
  // Always read seats from the server so late joiners are not dropped.
  const snap = await get(partyRef(code));
  if (!snap.exists()) throw new Error("Party not found.");
  const party = snap.val();
  const seats = normalizeSeats(party.seats);
  const players = {};
  seats.forEach((seat) => {
    if (!seat) return;
    players[seat.id] = emptyPlayerState(seat);
  });

  if (Object.keys(players).length < 2) {
    throw new Error("Need at least 2 players to start.");
  }

  const mode = config.mode || party.mode || null;
  if (!mode) throw new Error("Pick a mode before starting.");

  await update(partyRef(code), {
    status: "playing",
    mode,
    game: {
      status: "playing",
      mode,
      region: config.region,
      level: config.level,
      rounds: config.rounds,
      timerSec: config.timerSec,
      currentRound: 1,
      targets: config.targets,
      players,
      roundWinnerId: false,
      roundEndedAt: false,
    },
    updatedAt: Date.now(),
  });
}

export async function pushPlayerGuess(code, playerId, guess) {
  const playerPath = ref(db, `parties/${code}/game/players/${playerId}`);
  const snap = await get(playerPath);
  if (!snap.exists()) throw new Error("Player not in game.");
  const data = snap.val();
  const guesses = normalizeGuesses(data.guesses);
  if (guesses.some((g) => g.name === guess.name)) {
    throw new Error("Already guessed.");
  }
  guesses.push({
    name: guess.name,
    km: guess.km,
    at: guess.at || Date.now(),
    correct: Boolean(guess.correct),
  });
  const bestKm =
    typeof data.bestKm === "number"
      ? Math.min(data.bestKm, guess.km)
      : guess.km;
  await update(playerPath, {
    guesses,
    bestKm,
  });
}

export async function markPlayerEliminated(code, playerId) {
  await update(ref(db, `parties/${code}/game/players/${playerId}`), {
    eliminated: true,
  });
}

export async function claimRoundWin(code, playerId, roundScore) {
  const result = await runTransaction(gameRef(code), (game) => {
    if (!game || game.status !== "playing") return;
    if (game.roundWinnerId) return;
    const players = game.players || {};
    const me = players[playerId];
    if (!me) return;
    const totalScore = (Number(me.totalScore) || 0) + (Number(roundScore) || 0);
    players[playerId] = {
      ...me,
      wonRound: true,
      roundScore: Number(roundScore) || 0,
      totalScore,
    };
    game.players = players;
    game.status = "roundEnd";
    game.roundWinnerId = playerId;
    game.roundEndedAt = Date.now();
    return game;
  });
  return Boolean(result.committed && result.snapshot.val()?.roundWinnerId === playerId);
}

export async function endRoundNoWinner(code) {
  const result = await runTransaction(gameRef(code), (game) => {
    if (!game || game.status !== "playing") return;
    if (game.roundWinnerId) return;
    game.status = "roundEnd";
    game.roundWinnerId = false;
    game.roundEndedAt = Date.now();
    return game;
  });
  return Boolean(result.committed);
}

export async function advanceRound(code) {
  const snap = await get(gameRef(code));
  if (!snap.exists()) return null;
  const game = snap.val();
  const nextRound = (Number(game.currentRound) || 1) + 1;
  const totalRounds = Number(game.rounds) || 1;

  if (nextRound > totalRounds) {
    await update(partyRef(code), {
      status: "finished",
      updatedAt: Date.now(),
    });
    await update(gameRef(code), {
      status: "finished",
    });
    return { finished: true, currentRound: game.currentRound };
  }

  const players = {};
  Object.entries(game.players || {}).forEach(([id, player]) => {
    players[id] = {
      name: player.name,
      color: player.color,
      guesses: false,
      bestKm: false,
      wonRound: false,
      eliminated: false,
      roundScore: 0,
      totalScore: Number(player.totalScore) || 0,
    };
  });

  await update(gameRef(code), {
    status: "playing",
    currentRound: nextRound,
    players,
    roundWinnerId: false,
    roundEndedAt: false,
  });
  await update(partyRef(code), {
    status: "playing",
    updatedAt: Date.now(),
  });
  return { finished: false, currentRound: nextRound };
}

export async function clearPartyGame(code) {
  await update(partyRef(code), {
    status: "setup",
    game: null,
    updatedAt: Date.now(),
  });
}

export function subscribeParty(code, onUpdate) {
  const r = partyRef(code);
  const handler = (snap) => {
    if (!snap.exists()) {
      onUpdate(null);
      return;
    }
    const data = snap.val();
    onUpdate({
      ...data,
      code,
      seats: normalizeSeats(data.seats),
      mode: data.mode || null,
      game: normalizeGame(data.game),
    });
  };
  onValue(r, handler);
  return () => off(r, "value", handler);
}
