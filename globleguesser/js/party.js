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
const LOBBY_LIKE_STATUSES = new Set(["mode", "pvp-format", "teams"]);

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

function normalizeTeam(team) {
  return team === "A" || team === "B" ? team : null;
}

function normalizeSeat(seat) {
  if (!seat || typeof seat !== "object" || !seat.id) return null;
  const out = {
    id: seat.id,
    name: seat.name || "Player",
    color: seat.color || "#5b6cf0",
    joinedAt: Number(seat.joinedAt) || Date.now(),
  };
  const team = normalizeTeam(seat.team);
  if (team) out.team = team;
  return out;
}

export function normalizeSeats(seats) {
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
    out.push(normalizeSeat(list[i]));
  }
  return out;
}

export function occupiedCount(seats) {
  return normalizeSeats(seats).filter(Boolean).length;
}

export function seatsForWrite(seats) {
  return normalizeSeats(seats).map((seat) => {
    if (!seat) return false;
    return {
      id: seat.id,
      name: seat.name,
      color: seat.color,
      joinedAt: seat.joinedAt,
      team: seat.team || false,
    };
  });
}

export function clearSeatTeams(seats) {
  return normalizeSeats(seats).map((seat) => (seat ? { ...seat, team: null } : null));
}

export function teamsReady(seats) {
  const occupied = normalizeSeats(seats).filter(Boolean);
  if (occupied.length < 2) return false;
  if (!occupied.every((s) => s.team === "A" || s.team === "B")) return false;
  const hasA = occupied.some((s) => s.team === "A");
  const hasB = occupied.some((s) => s.team === "B");
  return hasA && hasB;
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
      team: normalizeTeam(player.team),
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
    allCountries: Boolean(game.allCountries),
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
    team: seat.team || false,
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

function applyJoinToParty(current, guest) {
  if (!current || typeof current !== "object") {
    return { error: "Party not found." };
  }
  if (current.status === "setup" || ACTIVE_GAME_STATUSES.has(current.status)) {
    return { error: "That party already started." };
  }

  const seats = normalizeSeats(current.seats);
  if (seats.some((s) => s && s.id === guest.id)) {
    return {
      party: {
        ...current,
        seats: seatsForWrite(seats),
        updatedAt: Date.now(),
      },
    };
  }

  const emptyIndex = seats.findIndex((s) => !s);
  if (emptyIndex < 0) {
    return { error: "Party is full." };
  }

  seats[emptyIndex] = {
    id: guest.id,
    name: guest.name,
    color: guest.color,
    joinedAt: Date.now(),
  };
  return {
    party: {
      ...current,
      seats: seatsForWrite(seats),
      updatedAt: Date.now(),
    },
  };
}

export async function joinParty(code, guest) {
  const normalized = String(code || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(normalized)) {
    throw new Error("Enter a valid 6-character party code.");
  }

  const existing = await get(partyRef(normalized));
  if (!existing.exists()) {
    throw new Error("Party not found.");
  }

  let joinError = null;
  const result = await runTransaction(
    partyRef(normalized),
    (current) => {
      joinError = null;
      const base = current ?? existing.val();
      const next = applyJoinToParty(base, guest);
      if (next.error) {
        joinError = next.error;
        return;
      }
      return next.party;
    },
    { applyLocally: false }
  );

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

  if (LOBBY_LIKE_STATUSES.has(data.status) && remaining.length < 2) {
    next.status = "lobby";
    next.mode = false;
    next.seats = seatsForWrite(clearSeatTeams(seats));
  }

  await update(partyRef(code), next);
  return {
    ...data,
    ...next,
    seats: normalizeSeats(next.seats),
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
  if (extra.clearTeams) {
    const snap = await get(partyRef(code));
    if (snap.exists()) {
      payload.seats = seatsForWrite(clearSeatTeams(snap.val().seats));
    }
    delete payload.clearTeams;
  }
  await update(partyRef(code), payload);
}

export async function assignSeatTeam(code, guestId, team) {
  const normalizedTeam = normalizeTeam(team);
  if (!normalizedTeam) throw new Error("Pick Team A or Team B.");
  if (!guestId) throw new Error("Missing player.");

  const snap = await get(partyRef(code));
  if (!snap.exists()) throw new Error("Party not found.");
  const data = snap.val();
  if (data.status !== "teams") throw new Error("Team pick is not open.");

  const seats = normalizeSeats(data.seats);
  const index = seats.findIndex((s) => s && s.id === guestId);
  if (index < 0) throw new Error("You are not in this party.");

  seats[index] = { ...seats[index], team: normalizedTeam };
  await update(partyRef(code), {
    seats: seatsForWrite(seats),
    updatedAt: Date.now(),
  });
}

export async function startPartyGame(code, config) {
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

  if (mode === "teams" && !teamsReady(seats)) {
    throw new Error("Both teams need at least one player.");
  }

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
      allCountries: Boolean(config.allCountries),
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
    const points = Number(roundScore) || 0;
    const winnerTeam = normalizeTeam(me.team);

    if (game.mode === "teams" && winnerTeam) {
      Object.entries(players).forEach(([id, player]) => {
        if (!player || normalizeTeam(player.team) !== winnerTeam) return;
        players[id] = {
          ...player,
          wonRound: id === playerId,
          roundScore: points,
          totalScore: (Number(player.totalScore) || 0) + points,
        };
      });
    } else {
      players[playerId] = {
        ...me,
        wonRound: true,
        roundScore: points,
        totalScore: (Number(me.totalScore) || 0) + points,
      };
    }

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
      team: player.team || false,
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
