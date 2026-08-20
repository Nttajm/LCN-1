import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  getFirestore, collection, doc, addDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, limit, arrayUnion, arrayRemove
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBCaGiPCM-PrrA4zwnahDYyayltI2QVOdA",
  authDomain: "overunder-ths.firebaseapp.com",
  projectId: "overunder-ths",
  storageBucket: "overunder-ths.firebasestorage.app",
  messagingSenderId: "690530120785",
  appId: "1:690530120785:web:408027b78e117d36cb7470",
  measurementId: "G-4GSKNVGTM0"
};

const db = getFirestore(initializeApp(firebaseConfig));

const GIPHY_KEY = "Yld6rG99fDQgrMKBCSFbi2SI29jcdwGY";
const GIPHY_TERM = "speed";

const CLASSES = [
  { id: "b5", code: "B5", subject: "Computer Science", teacher: "Mr. Alvarez", room: "214" },
  { id: "c3", code: "C3", subject: "Algebra II", teacher: "Ms. Whitfield", room: "118" },
  { id: "d4", code: "D4", subject: "US History", teacher: "Mr. Osei", room: "306" }
];

const CHANNELS = [
  { id: "general", name: "general", topic: "Anything for this period." },
  { id: "homework", name: "homework", topic: "Questions about tonight's work." },
  { id: "lounge", name: "lounge", topic: "Off topic. Keep it school safe." }
];

const REACTIONS = [
  { key: "up", glyph: "\u{1F44D}" },
  { key: "fire", glyph: "\u{1F525}" },
  { key: "haha", glyph: "\u{1F602}" },
  { key: "heart", glyph: "\u2764\uFE0F" }
];

const TONES = ["#f0a83c", "#7cc0f0", "#8fd694", "#e9748d", "#b79bf0", "#f0d05a", "#f28f6a", "#77d4c8"];

const PRESENCE_TTL = 70000;
const TYPING_TTL = 6000;
const GROUP_WINDOW = 300000;

const el = (id) => document.getElementById(id);
const nodes = {
  gate: el("gate"),
  gatePeriods: el("gate-periods"),
  cardPhoto: el("card-photo"),
  cardHandle: el("card-handle"),
  cardFull: el("card-full"),
  cardPeriod: el("card-period"),
  nameForm: el("name-form"),
  first: el("input-first"),
  last: el("input-last"),
  nameError: el("name-error"),
  gateClasses: el("gate-classes"),
  classCards: el("class-cards"),
  backToName: el("back-to-name"),
  app: el("app"),
  scrim: el("scrim"),
  railList: el("rail-list"),
  signOut: el("sign-out"),
  sideCode: el("side-code"),
  sideSubject: el("side-subject"),
  sideMeta: el("side-meta"),
  channelList: el("channel-list"),
  meAvatar: el("me-avatar"),
  meHandle: el("me-handle"),
  meFull: el("me-full"),
  navToggle: el("nav-toggle"),
  stageChannel: el("stage-channel"),
  stageTopic: el("stage-topic"),
  stageCount: el("stage-count"),
  stream: el("stream"),
  messages: el("messages"),
  typing: el("typing"),
  gifPanel: el("gif-panel"),
  gifSearch: el("gif-search"),
  gifClose: el("gif-close"),
  gifStatus: el("gif-status"),
  gifGrid: el("gif-grid"),
  gifToggle: el("gif-toggle"),
  composer: el("composer"),
  input: el("composer-input"),
  rosterList: el("roster-list"),
  rosterCount: el("roster-count"),
  toasts: el("toasts")
};

const state = {
  me: null,
  classId: CLASSES[0].id,
  channelId: CHANNELS[0].id,
  draft: { first: "", last: "" },
  messages: [],
  presence: [],
  gifsLoaded: false,
  gifToken: 0,
  lastTypingWrite: 0
};

let messagesUnsub = null;
let presenceUnsub = null;
let heartbeat = null;
let gifTimer = null;
const gifNodeCache = new Map();
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });
const dateFmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });

const classById = (id) => CLASSES.find((c) => c.id === id) || CLASSES[0];
const channelById = (id) => CHANNELS.find((c) => c.id === id) || CHANNELS[0];

function titleCase(value) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .split(/([ '\u2019-])/)
    .map((part) => (/^[a-z]/i.test(part) ? part[0].toUpperCase() + part.slice(1).toLowerCase() : part))
    .join("");
}

function toneFor(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 100000;
  return TONES[hash % TONES.length];
}

function makeId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function loadMe() {
  try {
    const raw = localStorage.getItem("techchat.me");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.uid || !parsed.handle) return null;
    return parsed;
  } catch (err) {
    return null;
  }
}

function saveMe() {
  localStorage.setItem("techchat.me", JSON.stringify(state.me));
}

function toast(message) {
  const box = document.createElement("p");
  box.className = "toast";
  box.textContent = message;
  nodes.toasts.appendChild(box);
  setTimeout(() => box.remove(), 4600);
}

function setDraftCard() {
  const first = titleCase(state.draft.first);
  const last = titleCase(state.draft.last);
  const handle = first && last ? `${first[0]} ${last}` : "Your name";
  nodes.cardHandle.textContent = handle;
  nodes.cardFull.textContent = first || last ? `${first} ${last}`.trim() : "Not set yet";
  nodes.cardPhoto.textContent = first || last ? `${first[0] || ""}${last[0] || ""}` : "\u2014\u2014";
}

function validateName(value) {
  return /^[A-Za-z][A-Za-z'\u2019-]{1,23}$/.test(value.trim());
}

function buildGatePeriods() {
  nodes.gatePeriods.textContent = "";
  CLASSES.forEach((klass) => {
    const li = document.createElement("li");
    const code = document.createElement("span");
    code.className = "code";
    code.textContent = klass.code;
    const label = document.createElement("span");
    label.textContent = `${klass.subject} \u00b7 ${klass.teacher}`;
    li.append(code, label);
    nodes.gatePeriods.appendChild(li);
  });
}

function buildClassCards() {
  nodes.classCards.textContent = "";
  CLASSES.forEach((klass) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "class-card";
    card.dataset.classId = klass.id;

    const code = document.createElement("span");
    code.className = "class-card-code";
    code.textContent = klass.code;

    const body = document.createElement("span");
    const subject = document.createElement("strong");
    subject.className = "class-card-subject";
    subject.textContent = klass.subject;
    const meta = document.createElement("span");
    meta.className = "class-card-meta";
    meta.textContent = `${klass.teacher} \u00b7 Room ${klass.room}`;
    body.append(subject, meta);

    const live = document.createElement("span");
    live.className = "class-card-live";
    live.dataset.liveFor = klass.id;
    live.textContent = "0 here";

    card.append(code, body, live);
    card.addEventListener("click", () => enterClass(klass.id));
    card.addEventListener("mouseenter", () => {
      nodes.cardPeriod.textContent = `Period ${klass.code}`;
    });
    card.addEventListener("focus", () => {
      nodes.cardPeriod.textContent = `Period ${klass.code}`;
    });
    nodes.classCards.appendChild(card);
  });
}

function buildRail() {
  nodes.railList.textContent = "";
  CLASSES.forEach((klass) => {
    const li = document.createElement("li");
    li.className = "rail-item";
    li.dataset.classId = klass.id;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "rail-btn";
    btn.textContent = klass.code;
    btn.title = `${klass.code} \u00b7 ${klass.subject}`;
    btn.setAttribute("aria-label", `${klass.code}, ${klass.subject}`);
    btn.addEventListener("click", () => switchClass(klass.id));
    li.appendChild(btn);
    nodes.railList.appendChild(li);
  });
}

function buildChannels() {
  nodes.channelList.textContent = "";
  CHANNELS.forEach((channel) => {
    const li = document.createElement("li");
    li.dataset.channelId = channel.id;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "channel-btn";
    const hash = document.createElement("span");
    hash.className = "hash";
    hash.textContent = "#";
    hash.setAttribute("aria-hidden", "true");
    btn.append(hash, document.createTextNode(channel.name));
    btn.addEventListener("click", () => switchChannel(channel.id));
    li.appendChild(btn);
    nodes.channelList.appendChild(li);
  });
}

function paintShell() {
  const klass = classById(state.classId);
  const channel = channelById(state.channelId);

  nodes.sideCode.textContent = `Period ${klass.code}`;
  nodes.sideSubject.textContent = klass.subject;
  nodes.sideMeta.textContent = `${klass.teacher} \u00b7 Room ${klass.room}`;
  nodes.stageChannel.textContent = channel.name;
  nodes.stageTopic.textContent = channel.topic;
  nodes.input.placeholder = `Message #${channel.name}`;
  nodes.gifToggle.title = `Add a GIF to #${channel.name}`;

  nodes.railList.querySelectorAll(".rail-item").forEach((item) => {
    item.classList.toggle("is-active", item.dataset.classId === state.classId);
  });
  nodes.channelList.querySelectorAll("li").forEach((item) => {
    item.querySelector(".channel-btn").classList.toggle("is-active", item.dataset.channelId === state.channelId);
  });

  nodes.meAvatar.textContent = state.me.initials;
  nodes.meAvatar.style.background = state.me.tone;
  nodes.meHandle.textContent = state.me.handle;
  nodes.meFull.textContent = state.me.full;
}

function avatar(initials, tone, small) {
  const span = document.createElement("span");
  span.className = small ? "avatar avatar-sm" : "avatar";
  span.style.background = tone;
  span.textContent = initials;
  span.setAttribute("aria-hidden", "true");
  return span;
}

function dayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function stampFor(ts) {
  const today = dayKey(Date.now());
  const yesterday = dayKey(Date.now() - 86400000);
  const key = dayKey(ts);
  if (key === today) return `Today at ${timeFmt.format(ts)}`;
  if (key === yesterday) return `Yesterday at ${timeFmt.format(ts)}`;
  return `${dateFmt.format(ts)} at ${timeFmt.format(ts)}`;
}

function dayLabel(ts) {
  const key = dayKey(ts);
  if (key === dayKey(Date.now())) return "Today";
  if (key === dayKey(Date.now() - 86400000)) return "Yesterday";
  return dayFmt.format(ts);
}

function fillText(target, text) {
  text.split(/(https?:\/\/[^\s]+)/g).forEach((part) => {
    if (!part) return;
    if (/^https?:\/\//.test(part)) {
      const link = document.createElement("a");
      link.href = part;
      link.textContent = part;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      target.appendChild(link);
      return;
    }
    target.appendChild(document.createTextNode(part));
  });
}

function gifNode(message) {
  let img = gifNodeCache.get(message.id);
  if (!img) {
    img = document.createElement("img");
    img.className = "msg-gif";
    img.loading = "lazy";
    img.src = message.gif.url;
    img.alt = message.gif.title || "GIF";
    if (message.gif.width && message.gif.height) {
      img.width = message.gif.width;
      img.height = message.gif.height;
    }
    gifNodeCache.set(message.id, img);
  }
  return img;
}

function reactionBar(message) {
  const entries = REACTIONS.map((r) => ({ ...r, users: (message.reactions && message.reactions[r.key]) || [] }))
    .filter((r) => r.users.length);
  if (!entries.length) return null;

  const wrap = document.createElement("div");
  wrap.className = "msg-reactions";
  entries.forEach((entry) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "reaction";
    btn.classList.toggle("is-mine", entry.users.includes(state.me.uid));
    const glyph = document.createElement("span");
    glyph.className = "reaction-glyph";
    glyph.textContent = entry.glyph;
    btn.append(glyph, document.createTextNode(String(entry.users.length)));
    btn.addEventListener("click", () => toggleReaction(message, entry.key, entry.users.includes(state.me.uid)));
    wrap.appendChild(btn);
  });
  return wrap;
}

function toolBar(message) {
  const wrap = document.createElement("div");
  wrap.className = "msg-tools";
  REACTIONS.forEach((r) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tool-btn";
    btn.textContent = r.glyph;
    btn.title = `React with ${r.key}`;
    const mine = ((message.reactions && message.reactions[r.key]) || []).includes(state.me.uid);
    btn.addEventListener("click", () => toggleReaction(message, r.key, mine));
    wrap.appendChild(btn);
  });
  return wrap;
}

function messageRow(message, grouped) {
  const row = document.createElement("article");
  row.className = grouped ? "msg is-grouped" : "msg";

  const side = document.createElement("div");
  side.className = "msg-side";
  if (grouped) {
    const stamp = document.createElement("span");
    stamp.className = "msg-stamp-side";
    stamp.textContent = timeFmt.format(message.createdAt);
    side.appendChild(stamp);
  } else {
    side.appendChild(avatar(message.initials, message.tone, false));
  }

  const body = document.createElement("div");
  if (!grouped) {
    const head = document.createElement("div");
    head.className = "msg-head";
    const author = document.createElement("span");
    author.className = "msg-author";
    author.textContent = message.handle;
    author.style.color = message.tone;
    const stamp = document.createElement("time");
    stamp.className = "msg-stamp";
    stamp.dateTime = new Date(message.createdAt).toISOString();
    stamp.textContent = stampFor(message.createdAt);
    head.append(author, stamp);
    body.appendChild(head);
  }

  if (message.text) {
    const text = document.createElement("p");
    text.className = "msg-text";
    fillText(text, message.text);
    body.appendChild(text);
  }

  if (message.gif && message.gif.url) body.appendChild(gifNode(message));

  const reactions = reactionBar(message);
  if (reactions) body.appendChild(reactions);

  row.append(side, body, toolBar(message));
  return row;
}

function emptyStream() {
  const channel = channelById(state.channelId);
  const klass = classById(state.classId);
  const wrap = document.createElement("div");
  wrap.className = "stream-empty";
  const mark = document.createElement("span");
  mark.className = "stream-empty-mark";
  mark.textContent = "#";
  const title = document.createElement("h2");
  title.className = "stream-empty-title";
  title.textContent = `#${channel.name} is quiet`;
  const copy = document.createElement("p");
  copy.className = "stream-empty-copy";
  copy.textContent = `Nobody in ${klass.code} has posted here yet. Start the thread.`;
  wrap.append(mark, title, copy);
  return wrap;
}

function atBottom() {
  const gap = nodes.stream.scrollHeight - nodes.stream.scrollTop - nodes.stream.clientHeight;
  return gap < 120;
}

function renderMessages(forceBottom) {
  const stick = forceBottom || atBottom();
  nodes.messages.textContent = "";

  if (!state.messages.length) {
    nodes.messages.appendChild(emptyStream());
    return;
  }

  let lastDay = "";
  let lastAuthor = "";
  let lastTime = 0;

  state.messages.forEach((message) => {
    const key = dayKey(message.createdAt);
    if (key !== lastDay) {
      const divider = document.createElement("p");
      divider.className = "day";
      divider.textContent = dayLabel(message.createdAt);
      nodes.messages.appendChild(divider);
      lastDay = key;
      lastAuthor = "";
    }
    const grouped = message.authorId === lastAuthor && message.createdAt - lastTime < GROUP_WINDOW;
    nodes.messages.appendChild(messageRow(message, grouped));
    lastAuthor = message.authorId;
    lastTime = message.createdAt;
  });

  if (stick) nodes.stream.scrollTop = nodes.stream.scrollHeight;
}

function livePresence() {
  const cutoff = Date.now() - PRESENCE_TTL;
  return state.presence.filter((p) => (p.beat || 0) > cutoff);
}

function renderPresence() {
  const live = livePresence();
  const counts = new Map();
  live.forEach((p) => counts.set(p.classId, (counts.get(p.classId) || 0) + 1));

  nodes.classCards.querySelectorAll("[data-live-for]").forEach((tag) => {
    const n = counts.get(tag.dataset.liveFor) || 0;
    tag.textContent = n === 1 ? "1 here" : `${n} here`;
  });

  if (!state.me) return;

  const inClass = live
    .filter((p) => p.classId === state.classId)
    .sort((a, b) => a.handle.localeCompare(b.handle));

  nodes.rosterCount.textContent = String(inClass.length);
  nodes.stageCount.textContent = inClass.length === 1 ? "1 in class" : `${inClass.length} in class`;

  const list = nodes.rosterList;
  list.textContent = "";
  if (!inClass.length) {
    const empty = document.createElement("li");
    empty.className = "roster-empty";
    empty.textContent = "Nobody here right now.";
    list.appendChild(empty);
  }
  inClass.forEach((person) => {
    const li = document.createElement("li");
    li.className = "roster-row";
    const wrap = document.createElement("span");
    wrap.className = "avatar-wrap";
    wrap.appendChild(avatar(person.initials, person.tone, true));
    const dot = document.createElement("span");
    dot.className = "avatar-dot";
    wrap.appendChild(dot);
    const name = document.createElement("span");
    name.className = "roster-name";
    name.textContent = person.handle;
    name.title = person.full || person.handle;
    li.append(wrap, name);
    if (person.uid === state.me.uid) {
      const you = document.createElement("span");
      you.className = "roster-you";
      you.textContent = "You";
      li.appendChild(you);
    }
    list.appendChild(li);
  });

  renderTyping(live);
}

function renderTyping(live) {
  const room = `${state.classId}/${state.channelId}`;
  const cutoff = Date.now() - TYPING_TTL;
  const names = live
    .filter((p) => p.uid !== state.me.uid && p.typingIn === room && (p.typingAt || 0) > cutoff)
    .map((p) => p.handle);

  nodes.typing.textContent = "";
  if (!names.length) return;

  const label = document.createElement("span");
  names.slice(0, 3).forEach((name, index) => {
    if (index) label.appendChild(document.createTextNode(index === names.length - 1 ? " and " : ", "));
    const strong = document.createElement("b");
    strong.textContent = name;
    label.appendChild(strong);
  });
  const tail = names.length > 3 ? ` and ${names.length - 3} others are typing` : names.length > 1 ? " are typing" : " is typing";
  label.appendChild(document.createTextNode(`${tail}\u2026`));
  nodes.typing.appendChild(label);
}

function messagesRef() {
  return collection(db, "techchat_rooms", state.classId, "channels", state.channelId, "messages");
}

function watchMessages() {
  if (messagesUnsub) messagesUnsub();
  gifNodeCache.clear();
  state.messages = [];
  renderMessages(true);

  const q = query(messagesRef(), orderBy("createdAt", "desc"), limit(100));
  messagesUnsub = onSnapshot(
    q,
    (snap) => {
      state.messages = snap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse();
      renderMessages(false);
    },
    (error) => {
      console.error(error);
      toast("Messages stopped loading. Reload the page to reconnect.");
    }
  );
}

function watchPresence() {
  if (presenceUnsub) return;
  presenceUnsub = onSnapshot(
    collection(db, "techchat_presence"),
    (snap) => {
      state.presence = snap.docs.map((d) => d.data()).filter((d) => d && d.handle);
      renderPresence();
    },
    (error) => {
      console.error(error);
    }
  );
}

async function writePresence(extra) {
  if (!state.me) return;
  const payload = {
    uid: state.me.uid,
    handle: state.me.handle,
    full: state.me.full,
    initials: state.me.initials,
    tone: state.me.tone,
    classId: state.classId,
    channelId: state.channelId,
    typingIn: "",
    typingAt: 0,
    beat: Date.now(),
    ...extra
  };
  try {
    await setDoc(doc(db, "techchat_presence", state.me.uid), payload);
  } catch (error) {
    console.error(error);
  }
}

async function sendMessage(text, gif) {
  const body = text.trim();
  if (!body && !gif) return;
  const payload = {
    authorId: state.me.uid,
    handle: state.me.handle,
    initials: state.me.initials,
    tone: state.me.tone,
    text: body.slice(0, 2000),
    gif: gif || null,
    createdAt: Date.now(),
    reactions: {}
  };
  try {
    await addDoc(messagesRef(), payload);
    state.lastTypingWrite = 0;
    writePresence();
  } catch (error) {
    console.error(error);
    toast("That message didn't send. Check your connection and try again.");
  }
}

async function toggleReaction(message, key, mine) {
  const ref = doc(db, "techchat_rooms", state.classId, "channels", state.channelId, "messages", message.id);
  try {
    await updateDoc(ref, { [`reactions.${key}`]: mine ? arrayRemove(state.me.uid) : arrayUnion(state.me.uid) });
  } catch (error) {
    console.error(error);
    toast("The reaction didn't save.");
  }
}

async function loadGifs(term) {
  const wanted = (term || "").trim() || GIPHY_TERM;
  const token = state.gifToken + 1;
  state.gifToken = token;

  nodes.gifStatus.hidden = false;
  nodes.gifStatus.textContent = `Searching ${wanted}`;

  const url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(wanted)}&limit=24&offset=0&rating=pg&lang=en&bundle=messaging_non_clips`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`giphy ${res.status}`);
    const payload = await res.json();
    if (token !== state.gifToken) return;

    const items = (payload.data || []).filter((item) => item.images && item.images.fixed_width);
    nodes.gifGrid.textContent = "";

    if (!items.length) {
      nodes.gifStatus.textContent = `No GIFs for ${wanted}. Try another word.`;
      return;
    }

    nodes.gifStatus.hidden = true;
    items.forEach((item) => {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "gif-cell";
      cell.title = item.title || "GIF";
      const thumb = document.createElement("img");
      const preview = item.images.fixed_width_downsampled || item.images.fixed_width_small || item.images.fixed_width;
      thumb.src = preview.url;
      thumb.alt = item.title || "GIF";
      thumb.loading = "lazy";
      cell.appendChild(thumb);
      cell.addEventListener("click", () => {
        const full = item.images.fixed_width;
        sendMessage("", {
          url: full.url,
          width: Number(full.width) || 0,
          height: Number(full.height) || 0,
          title: (item.title || "GIF").slice(0, 120)
        });
        closeGifs();
      });
      nodes.gifGrid.appendChild(cell);
    });
    state.gifsLoaded = true;
  } catch (error) {
    console.error(error);
    if (token !== state.gifToken) return;
    nodes.gifGrid.textContent = "";
    nodes.gifStatus.hidden = false;
    nodes.gifStatus.textContent = "GIPHY didn't answer. Try the search again.";
  }
}

function openGifs() {
  nodes.gifPanel.hidden = false;
  nodes.gifSearch.value = "";
  nodes.gifSearch.focus();
  if (!state.gifsLoaded) loadGifs(GIPHY_TERM);
}

function closeGifs() {
  nodes.gifPanel.hidden = true;
}

function switchClass(id) {
  if (id === state.classId) return;
  state.classId = id;
  localStorage.setItem("techchat.class", id);
  paintShell();
  watchMessages();
  writePresence();
  renderPresence();
  closeNav();
}

function switchChannel(id) {
  if (id === state.channelId) return;
  state.channelId = id;
  localStorage.setItem("techchat.channel", id);
  paintShell();
  watchMessages();
  writePresence();
  renderPresence();
  closeNav();
}

function closeNav() {
  nodes.app.classList.remove("is-open");
}

function autoGrow() {
  nodes.input.style.height = "auto";
  nodes.input.style.height = `${Math.min(nodes.input.scrollHeight, 160)}px`;
}

function markTyping() {
  const now = Date.now();
  if (now - state.lastTypingWrite < 2600) return;
  state.lastTypingWrite = now;
  writePresence({ typingIn: `${state.classId}/${state.channelId}`, typingAt: now });
}

function startSession() {
  nodes.gate.hidden = true;
  nodes.app.hidden = false;
  paintShell();
  watchMessages();
  watchPresence();
  writePresence();
  renderPresence();
  if (heartbeat) clearInterval(heartbeat);
  heartbeat = setInterval(() => {
    writePresence();
    renderPresence();
  }, 20000);
}

function enterClass(id) {
  const first = titleCase(state.draft.first);
  const last = titleCase(state.draft.last);
  const uid = (loadMe() || {}).uid || makeId();

  state.me = {
    uid,
    first,
    last,
    full: `${first} ${last}`,
    handle: `${first[0]} ${last}`,
    initials: `${first[0]}${last[0]}`,
    tone: toneFor(uid)
  };
  saveMe();
  state.classId = id;
  localStorage.setItem("techchat.class", id);
  startSession();
}

function showClassStep() {
  nodes.gate.dataset.step = "class";
  nodes.nameForm.hidden = true;
  nodes.gateClasses.hidden = false;
  nodes.cardPeriod.textContent = "Pick a period";
  nodes.classCards.querySelector(".class-card").focus();
}

function showNameStep() {
  nodes.gate.dataset.step = "name";
  nodes.nameForm.hidden = false;
  nodes.gateClasses.hidden = true;
  nodes.cardPeriod.textContent = "No period";
  nodes.first.focus();
}

async function signOut() {
  if (heartbeat) clearInterval(heartbeat);
  if (messagesUnsub) messagesUnsub();
  if (presenceUnsub) presenceUnsub();
  messagesUnsub = null;
  presenceUnsub = null;
  heartbeat = null;
  try {
    await deleteDoc(doc(db, "techchat_presence", state.me.uid));
  } catch (error) {
    console.error(error);
  }
  localStorage.removeItem("techchat.me");
  state.me = null;
  state.messages = [];
  state.presence = [];
  nodes.app.hidden = true;
  nodes.gate.hidden = false;
  nodes.first.value = "";
  nodes.last.value = "";
  state.draft = { first: "", last: "" };
  setDraftCard();
  showNameStep();
}

nodes.first.addEventListener("input", () => {
  state.draft.first = nodes.first.value;
  setDraftCard();
});

nodes.last.addEventListener("input", () => {
  state.draft.last = nodes.last.value;
  setDraftCard();
});

nodes.nameForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const first = nodes.first.value.trim();
  const last = nodes.last.value.trim();

  if (!validateName(first) || !validateName(last)) {
    nodes.nameError.hidden = false;
    nodes.nameError.textContent = "Use two or more letters for each name, letters and hyphens only.";
    (validateName(first) ? nodes.last : nodes.first).focus();
    return;
  }

  nodes.nameError.hidden = true;
  state.draft = { first, last };
  setDraftCard();
  showClassStep();
});

nodes.backToName.addEventListener("click", showNameStep);
nodes.signOut.addEventListener("click", signOut);
nodes.navToggle.addEventListener("click", () => nodes.app.classList.toggle("is-open"));
nodes.scrim.addEventListener("click", closeNav);

nodes.composer.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = nodes.input.value;
  nodes.input.value = "";
  autoGrow();
  sendMessage(text, null);
});

nodes.input.addEventListener("input", () => {
  autoGrow();
  if (nodes.input.value.trim()) markTyping();
});

nodes.input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    nodes.composer.requestSubmit();
  }
});

nodes.gifToggle.addEventListener("click", () => {
  if (nodes.gifPanel.hidden) openGifs();
  else closeGifs();
});

nodes.gifClose.addEventListener("click", () => {
  closeGifs();
  nodes.input.focus();
});

nodes.gifSearch.addEventListener("input", () => {
  clearTimeout(gifTimer);
  gifTimer = setTimeout(() => loadGifs(nodes.gifSearch.value), 420);
});

nodes.gifSearch.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    clearTimeout(gifTimer);
    loadGifs(nodes.gifSearch.value);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !nodes.gifPanel.hidden) {
    closeGifs();
    nodes.input.focus();
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && state.me) {
    writePresence();
    renderPresence();
  }
});

window.addEventListener("pagehide", () => {
  if (state.me) deleteDoc(doc(db, "techchat_presence", state.me.uid)).catch(() => {});
});

buildGatePeriods();
buildClassCards();
buildRail();
buildChannels();
setDraftCard();
watchPresence();

const stored = loadMe();
if (stored) {
  state.me = stored;
  state.classId = classById(localStorage.getItem("techchat.class") || "").id;
  state.channelId = channelById(localStorage.getItem("techchat.channel") || "").id;
  state.draft = { first: stored.first, last: stored.last };
  nodes.first.value = stored.first;
  nodes.last.value = stored.last;
  setDraftCard();
  startSession();
}
