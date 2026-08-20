import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
  getFirestore, collection, doc, addDoc, setDoc, updateDoc,
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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

const GIPHY_KEY = "Yld6rG99fDQgrMKBCSFbi2SI29jcdwGY";
const GIPHY_TERM = "speed";
const ADMIN_EMAIL = "joel.mulonde@crpusd.org";

const DEFAULT_CLASSES = [
  { id: "b5", code: "B5", subject: "Computer Science", teacher: "Mr. Alvarez", room: "214" },
  { id: "c3", code: "C3", subject: "Algebra II", teacher: "Ms. Whitfield", room: "118" },
  { id: "d4", code: "D4", subject: "US History", teacher: "Mr. Osei", room: "306" }
];

const CAMPUS = {
  id: "campus",
  code: "ALL",
  subject: "Campus Chat",
  teacher: "Everyone",
  room: "Schoolwide",
  isCampus: true
};

const CLASS_CHANNELS = [
  { id: "general", name: "general", topic: "Anything for this period." },
  { id: "homework", name: "homework", topic: "Questions about tonight's work." },
  { id: "lounge", name: "lounge", topic: "Off topic. Keep it school safe." }
];

const CAMPUS_CHANNELS = [
  { id: "campus", name: "campus", topic: "The big schoolwide chat. Every period can talk here." }
];

const REACTIONS = [
  { key: "up", glyph: "\u{1F44D}" },
  { key: "fire", glyph: "\u{1F525}" },
  { key: "haha", glyph: "\u{1F602}" },
  { key: "heart", glyph: "\u2764\uFE0F" }
];

const TONES = ["#f0a83c", "#7cc0f0", "#8fd694", "#e9748d", "#b79bf0", "#f0d05a", "#f28f6a", "#77d4c8"];

const PRESENCE_ONLINE = 240000;
const TYPING_TTL = 5000;
const HEARTBEAT_MS = 20000;
const ROSTER_TICK_MS = 10000;
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
  gateAuth: el("gate-auth"),
  googleSignIn: el("google-sign-in"),
  authError: el("auth-error"),
  signedEmail: el("signed-email"),
  authSignOut: el("auth-sign-out"),
  gateClasses: el("gate-classes"),
  classCards: el("class-cards"),
  backToName: el("back-to-name"),
  adminBar: el("admin-bar"),
  adminSigned: el("admin-signed"),
  adminEmail: el("admin-email"),
  addClassToggle: el("add-class-toggle"),
  adminForm: el("admin-form"),
  adminFormTitle: el("admin-form-title"),
  adminCancel: el("admin-cancel"),
  adminCode: el("admin-code"),
  adminRoom: el("admin-room"),
  adminSubject: el("admin-subject"),
  adminTeacher: el("admin-teacher"),
  adminError: el("admin-error"),
  adminSubmit: el("admin-submit"),
  railAdd: el("rail-add"),
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
  rosterOnline: el("roster-online"),
  rosterOffline: el("roster-offline"),
  rosterOnlineCount: el("roster-online-count"),
  rosterOfflineCount: el("roster-offline-count"),
  rosterCount: el("roster-count"),
  rosterLabel: el("roster-label"),
  toasts: el("toasts")
};

const state = {
  me: null,
  authUser: null,
  classes: [],
  classId: CAMPUS.id,
  channelId: CAMPUS_CHANNELS[0].id,
  draft: { first: "", last: "" },
  messages: [],
  presence: [],
  isAdmin: false,
  editingId: null,
  gifsLoaded: false,
  gifToken: 0,
  lastTypingWrite: 0,
  authReady: false
};

let messagesUnsub = null;
let presenceUnsub = null;
let heartbeat = null;
let rosterTick = null;
let gifTimer = null;
const gifNodeCache = new Map();
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });
const dateFmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });

const classById = (id) => allRooms().find((c) => c.id === id) || CAMPUS;
const allRooms = () => [CAMPUS, ...state.classes];
const channelsFor = (klass) => (klass && klass.isCampus ? CAMPUS_CHANNELS : CLASS_CHANNELS);
const channelById = (id, klass = classById(state.classId)) => {
  const list = channelsFor(klass);
  return list.find((c) => c.id === id) || list[0];
};

function classIdFromCode(code) {
  return code.trim().toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20);
}

function isAdminEmail(email) {
  return (email || "").trim().toLowerCase() === ADMIN_EMAIL;
}

function ensureChannelForRoom(roomId) {
  const klass = classById(roomId);
  const list = channelsFor(klass);
  if (!list.some((c) => c.id === state.channelId)) {
    state.channelId = list[0].id;
    localStorage.setItem("techchat.channel", state.channelId);
  }
}

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

function loadMe() {
  try {
    const raw = localStorage.getItem("techchat.me");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.uid || !parsed.handle || !parsed.first || !parsed.last) return null;
    return parsed;
  } catch (err) {
    return null;
  }
}

function saveMe() {
  localStorage.setItem("techchat.me", JSON.stringify(state.me));
}

function namesFromGoogle(user) {
  const given = (user.displayName || "").trim().split(/\s+/).filter(Boolean);
  let first = "";
  let last = "";
  if (given.length >= 2) {
    first = given[0];
    last = given.slice(1).join(" ");
  } else if (given.length === 1) {
    first = given[0];
  }
  const emailLocal = (user.email || "").split("@")[0] || "";
  if (!first && emailLocal) first = emailLocal.replace(/[._0-9]+/g, " ").trim().split(/\s+/)[0] || "";
  return {
    first: titleCase(first).replace(/[^A-Za-z'\u2019-]/g, "").slice(0, 24),
    last: titleCase(last).replace(/[^A-Za-z'\u2019-]/g, "").slice(0, 24)
  };
}

function buildMe(first, last, uid) {
  const f = titleCase(first);
  const l = titleCase(last);
  return {
    uid,
    email: state.authUser?.email || "",
    first: f,
    last: l,
    full: `${f} ${l}`,
    handle: `${f[0]} ${l}`,
    initials: `${f[0]}${l[0]}`,
    tone: toneFor(uid)
  };
}

function requireAuth() {
  return !!(state.authUser && state.authUser.uid);
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

function paintAdminChrome() {
  const admin = state.isAdmin;
  nodes.adminBar.hidden = !admin;
  nodes.railAdd.hidden = !admin;
  if (admin && state.authUser) {
    nodes.adminEmail.textContent = state.authUser.email;
  } else {
    closeAdminForm();
  }
}

function rebuildClassViews() {
  buildGatePeriods();
  buildClassCards();
  buildRail();
  buildChannels();
  renderPresence();
  if (state.me && classById(state.classId)) paintShell();
}

function buildGatePeriods() {
  nodes.gatePeriods.textContent = "";
  allRooms().forEach((klass) => {
    const li = document.createElement("li");
    const code = document.createElement("span");
    code.className = "code";
    code.textContent = klass.code;
    const label = document.createElement("span");
    label.textContent = klass.isCampus
      ? "Schoolwide chat for every period"
      : `${klass.subject} \u00b7 ${klass.teacher}`;
    li.append(code, label);
    nodes.gatePeriods.appendChild(li);
  });
}

function buildClassCards() {
  nodes.classCards.textContent = "";
  const rooms = allRooms();
  rooms.forEach((klass) => {
    const row = document.createElement("div");
    row.className = "class-row";

    const card = document.createElement("button");
    card.type = "button";
    card.className = klass.isCampus ? "class-card is-campus" : "class-card";
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
    meta.textContent = klass.isCampus
      ? "Open to every signed-in student"
      : `${klass.teacher} \u00b7 Room ${klass.room}`;
    body.append(subject, meta);

    const live = document.createElement("span");
    live.className = "class-card-live";
    live.dataset.liveFor = klass.id;
    live.textContent = "0 here";

    card.append(code, body, live);
    card.addEventListener("click", () => enterClass(klass.id));
    card.addEventListener("mouseenter", () => {
      nodes.cardPeriod.textContent = klass.isCampus ? "Campus chat" : `Period ${klass.code}`;
    });
    card.addEventListener("focus", () => {
      nodes.cardPeriod.textContent = klass.isCampus ? "Campus chat" : `Period ${klass.code}`;
    });
    row.appendChild(card);

    if (state.isAdmin && !klass.isCampus) {
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "class-edit";
      edit.textContent = "Edit";
      edit.addEventListener("click", (event) => {
        event.stopPropagation();
        openEditClass(klass.id);
      });
      row.appendChild(edit);
    }

    nodes.classCards.appendChild(row);
  });
}

function buildRail() {
  nodes.railList.textContent = "";
  allRooms().forEach((klass) => {
    const li = document.createElement("li");
    li.className = "rail-item";
    li.dataset.classId = klass.id;
    if (klass.id === state.classId) li.classList.add("is-active");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = klass.isCampus ? "rail-btn is-campus" : "rail-btn";
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
  const klass = classById(state.classId);
  channelsFor(klass).forEach((channel) => {
    const li = document.createElement("li");
    li.dataset.channelId = channel.id;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "channel-btn";
    if (channel.id === state.channelId) btn.classList.add("is-active");
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
  if (!klass) return;
  ensureChannelForRoom(klass.id);
  const channel = channelById(state.channelId, klass);

  nodes.sideCode.textContent = klass.isCampus ? "Campus" : `Period ${klass.code}`;
  nodes.sideSubject.textContent = klass.subject;
  nodes.sideMeta.textContent = klass.isCampus
    ? "Open to every period"
    : `${klass.teacher} \u00b7 Room ${klass.room}`;
  nodes.stageChannel.textContent = channel.name;
  nodes.stageTopic.textContent = channel.topic;
  nodes.input.placeholder = `Message #${channel.name}`;
  nodes.gifToggle.title = `Add a GIF to #${channel.name}`;
  nodes.rosterLabel.textContent = "Everyone";

  nodes.railList.querySelectorAll(".rail-item").forEach((item) => {
    item.classList.toggle("is-active", item.dataset.classId === state.classId);
  });
  nodes.channelList.querySelectorAll("li").forEach((item) => {
    item.querySelector(".channel-btn").classList.toggle("is-active", item.dataset.channelId === state.channelId);
  });

  if (state.me) {
    nodes.meAvatar.textContent = state.me.initials;
    nodes.meAvatar.style.background = state.me.tone;
    nodes.meHandle.textContent = state.me.handle;
    nodes.meFull.textContent = state.me.full;
  }
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
  copy.textContent = klass.isCampus
    ? "Nobody has posted in the campus chat yet. Say hello."
    : `Nobody in ${klass.code} has posted here yet. Start the thread.`;
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

function isOnline(person, now = Date.now()) {
  return (person.beat || 0) > now - PRESENCE_ONLINE;
}

function isTypingHere(person, now = Date.now()) {
  const room = `${state.classId}/${state.channelId}`;
  return person.typingIn === room && (person.typingAt || 0) > now - TYPING_TTL;
}

function isTypingAnywhere(person, now = Date.now()) {
  return !!(person.typingIn && (person.typingAt || 0) > now - TYPING_TTL);
}

function personClassLabel(person) {
  const klass = allRooms().find((c) => c.id === person.classId);
  if (!klass) {
    if (!person.classId) return "Away";
    return String(person.classId).toUpperCase();
  }
  return klass.isCampus ? "Campus" : `Period ${klass.code}`;
}

function allMembers() {
  return state.presence
    .filter((p) => p && p.handle)
    .sort((a, b) => a.handle.localeCompare(b.handle));
}

function onlinePresence() {
  const now = Date.now();
  return state.presence.filter((p) => p && p.handle && isOnline(p, now));
}

function rosterRow(person, online) {
  const now = Date.now();
  const typingHere = online && isTypingHere(person, now);
  const typingAway = online && !typingHere && isTypingAnywhere(person, now);
  const here = person.classId === state.classId;
  const li = document.createElement("li");
  li.className = online ? "roster-row is-online" : "roster-row is-offline";
  if (here) li.classList.add("is-here");
  if (typingHere || typingAway) li.classList.add("is-typing");

  const wrap = document.createElement("span");
  wrap.className = "avatar-wrap";
  wrap.appendChild(avatar(person.initials, person.tone, true));
  const dot = document.createElement("span");
  dot.className = online ? "avatar-dot is-online" : "avatar-dot is-offline";
  wrap.appendChild(dot);

  const meta = document.createElement("span");
  meta.className = "roster-meta";
  const name = document.createElement("span");
  name.className = "roster-name";
  name.textContent = person.handle;
  name.title = person.full || person.handle;
  meta.appendChild(name);

  const tip = document.createElement("span");
  tip.className = "roster-status";
  if (typingHere) {
    tip.className = "roster-typing";
    tip.innerHTML = 'Typing<span class="typing-dots" aria-hidden="true"><i></i><i></i><i></i></span>';
  } else if (typingAway) {
    tip.className = "roster-typing";
    tip.textContent = `Typing \u00b7 ${personClassLabel(person)}`;
  } else if (!online) {
    tip.textContent = `Offline \u00b7 ${personClassLabel(person)}`;
  } else {
    tip.textContent = personClassLabel(person);
  }
  meta.appendChild(tip);

  li.append(wrap, meta);

  if (state.me && person.uid === state.me.uid) {
    const you = document.createElement("span");
    you.className = "roster-you";
    you.textContent = "You";
    li.appendChild(you);
  }

  return li;
}

function fillRosterList(target, people, online) {
  target.textContent = "";
  if (!people.length) {
    const empty = document.createElement("li");
    empty.className = "roster-empty";
    empty.textContent = online ? "Nobody online." : "Nobody offline.";
    target.appendChild(empty);
    return;
  }
  people.forEach((person) => target.appendChild(rosterRow(person, online)));
}

function renderPresence() {
  const now = Date.now();
  const onlineAll = onlinePresence();
  const counts = new Map();
  onlineAll.forEach((p) => counts.set(p.classId, (counts.get(p.classId) || 0) + 1));

  nodes.classCards.querySelectorAll("[data-live-for]").forEach((tag) => {
    const n = counts.get(tag.dataset.liveFor) || 0;
    tag.textContent = n === 1 ? "1 here" : `${n} here`;
  });

  if (!state.me) return;

  const members = allMembers();
  const online = members.filter((p) => isOnline(p, now));
  const offline = members.filter((p) => !isOnline(p, now));

  nodes.rosterOnlineCount.textContent = String(online.length);
  nodes.rosterOfflineCount.textContent = String(offline.length);
  nodes.rosterCount.textContent = String(members.length);

  nodes.stageCount.textContent = online.length === 1 ? "1 online" : `${online.length} online`;

  fillRosterList(nodes.rosterOnline, online, true);
  fillRosterList(nodes.rosterOffline, offline, false);
  renderTyping(onlineAll);
}

function renderTyping(live) {
  const now = Date.now();
  const room = `${state.classId}/${state.channelId}`;
  const names = live
    .filter((p) => p.uid !== state.me.uid && p.typingIn === room && (p.typingAt || 0) > now - TYPING_TTL)
    .map((p) => p.handle);

  nodes.typing.textContent = "";
  if (!names.length) {
    nodes.typing.hidden = true;
    return;
  }

  nodes.typing.hidden = false;
  const label = document.createElement("span");
  label.className = "typing-copy";
  names.slice(0, 3).forEach((name, index) => {
    if (index) label.appendChild(document.createTextNode(index === names.length - 1 ? " and " : ", "));
    const strong = document.createElement("b");
    strong.textContent = name;
    label.appendChild(strong);
  });
  const tail = names.length > 3 ? ` and ${names.length - 3} others are typing` : names.length > 1 ? " are typing" : " is typing";
  label.appendChild(document.createTextNode(` ${tail}`));

  const dots = document.createElement("span");
  dots.className = "typing-dots";
  dots.setAttribute("aria-hidden", "true");
  dots.innerHTML = "<i></i><i></i><i></i>";

  nodes.typing.append(label, dots);
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

async function seedDefaultClasses() {
  if (!state.isAdmin || !state.authUser) return;
  try {
    await Promise.all(DEFAULT_CLASSES.map((klass) => setDoc(doc(db, "techchat_classes", klass.id), {
      ...klass,
      createdAt: Date.now(),
      createdBy: state.authUser.uid
    }, { merge: true })));
  } catch (error) {
    console.error(error);
  }
}

function watchClasses() {
  onSnapshot(
    query(collection(db, "techchat_classes"), orderBy("code")),
    async (snap) => {
      if (snap.empty) {
        await seedDefaultClasses();
        state.classes = [];
      } else {
        state.classes = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            code: data.code || d.id.toUpperCase(),
            subject: data.subject || "Class",
            teacher: data.teacher || "Teacher",
            room: data.room || "—",
            createdAt: data.createdAt || 0,
            createdBy: data.createdBy || ""
          };
        });
      }

      const saved = localStorage.getItem("techchat.class") || "";
      const next = classById(saved);
      const previous = state.classId;
      state.classId = next.id;
      ensureChannelForRoom(state.classId);
      rebuildClassViews();

      if (state.me) {
        if (nodes.app.hidden || previous !== state.classId) {
          startSession();
        } else {
          paintShell();
        }
      }
    },
    (error) => {
      console.error(error);
      toast("Could not load classes. Reload the page.");
    }
  );
}

async function googleSignIn() {
  nodes.authError.hidden = true;
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    if (error.code === "auth/popup-closed-by-user") return;
    console.error(error);
    nodes.authError.hidden = false;
    nodes.authError.textContent = "Google sign-in didn't finish. Try again.";
  }
}

async function googleSignOutOnly() {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error(error);
  }
}

function closeAdminForm() {
  state.editingId = null;
  nodes.adminForm.hidden = true;
  nodes.adminError.hidden = true;
  nodes.adminForm.reset();
  nodes.adminFormTitle.textContent = "Add a class";
  nodes.adminSubmit.textContent = "Publish class";
  nodes.adminCode.disabled = false;
}

function revealAdminPanel() {
  if (!nodes.gate.hidden) {
    showClassStep();
  } else {
    nodes.app.hidden = true;
    nodes.gate.hidden = false;
    showClassStep();
  }
}

function openCreateClass() {
  if (!state.isAdmin) return;
  revealAdminPanel();
  state.editingId = null;
  nodes.adminForm.reset();
  nodes.adminError.hidden = true;
  nodes.adminFormTitle.textContent = "Add a class";
  nodes.adminSubmit.textContent = "Publish class";
  nodes.adminCode.disabled = false;
  nodes.adminForm.hidden = false;
  nodes.adminCode.focus();
}

function openEditClass(id) {
  if (!state.isAdmin) return;
  const klass = state.classes.find((c) => c.id === id);
  if (!klass) return;
  revealAdminPanel();
  state.editingId = id;
  nodes.adminError.hidden = true;
  nodes.adminFormTitle.textContent = `Edit ${klass.code}`;
  nodes.adminSubmit.textContent = "Save changes";
  nodes.adminCode.value = klass.code;
  nodes.adminCode.disabled = false;
  nodes.adminSubject.value = klass.subject;
  nodes.adminTeacher.value = klass.teacher;
  nodes.adminRoom.value = klass.room;
  nodes.adminForm.hidden = false;
  nodes.adminSubject.focus();
}

function openAdminForm() {
  openCreateClass();
}

async function publishClass(event) {
  event.preventDefault();
  if (!state.isAdmin) {
    toast("Sign in as joel.mulonde@crpusd.org to manage classes.");
    return;
  }

  const code = nodes.adminCode.value.trim().toUpperCase();
  const subject = nodes.adminSubject.value.trim();
  const teacher = nodes.adminTeacher.value.trim();
  const room = nodes.adminRoom.value.trim();
  const editingId = state.editingId;
  const id = editingId || classIdFromCode(code);

  if (!/^[A-Z0-9]{1,8}$/.test(code) || !id || id === CAMPUS.id) {
    nodes.adminError.hidden = false;
    nodes.adminError.textContent = "Use a short period code like B5 or C3.";
    nodes.adminCode.focus();
    return;
  }
  if (subject.length < 2 || teacher.length < 2 || room.length < 1) {
    nodes.adminError.hidden = false;
    nodes.adminError.textContent = "Fill in subject, teacher, and room.";
    return;
  }

  const duplicate = state.classes.find((c) => c.id !== id && c.code.toUpperCase() === code);
  if (duplicate) {
    nodes.adminError.hidden = false;
    nodes.adminError.textContent = `${code} is already used by another class.`;
    return;
  }

  nodes.adminError.hidden = true;
  const existing = editingId ? state.classes.find((c) => c.id === editingId) : null;
  const payload = {
    code,
    subject: subject.slice(0, 48),
    teacher: teacher.slice(0, 48),
    room: room.slice(0, 12),
    createdAt: existing?.createdAt || Date.now(),
    createdBy: existing?.createdBy || state.authUser.uid,
    updatedAt: Date.now(),
    updatedBy: state.authUser.uid
  };

  try {
    await setDoc(doc(db, "techchat_classes", id), payload, { merge: true });
    closeAdminForm();
    toast(editingId ? `Updated ${code}.` : `Published ${code}.`);
  } catch (error) {
    console.error(error);
    nodes.adminError.hidden = false;
    nodes.adminError.textContent = "Could not save that class. Check you are signed in as the teacher account.";
  }
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
  if (id === state.classId || !classById(id)) return;
  state.classId = id;
  localStorage.setItem("techchat.class", id);
  ensureChannelForRoom(id);
  buildChannels();
  paintShell();
  watchMessages();
  writePresence();
  renderPresence();
  closeNav();
}

function switchChannel(id) {
  if (id === state.channelId) return;
  if (!channelsFor(classById(state.classId)).some((c) => c.id === id)) return;
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
  if (now - state.lastTypingWrite < 2000) return;
  state.lastTypingWrite = now;
  writePresence({ typingIn: `${state.classId}/${state.channelId}`, typingAt: now });
}

function clearTyping() {
  if (!state.lastTypingWrite) return;
  state.lastTypingWrite = 0;
  writePresence({ typingIn: "", typingAt: 0 });
}

async function markOffline() {
  if (!state.me) return;
  try {
    await setDoc(doc(db, "techchat_presence", state.me.uid), {
      uid: state.me.uid,
      handle: state.me.handle,
      full: state.me.full,
      initials: state.me.initials,
      tone: state.me.tone,
      classId: state.classId,
      channelId: state.channelId,
      typingIn: "",
      typingAt: 0,
      beat: Date.now() - PRESENCE_ONLINE - 1000
    });
  } catch (error) {
    console.error(error);
  }
}

function startSession() {
  if (!requireAuth() || !state.me) {
    showAuthStep();
    return;
  }
  nodes.gate.hidden = true;
  nodes.app.hidden = false;
  paintShell();
  watchMessages();
  watchPresence();
  writePresence();
  renderPresence();
  if (heartbeat) clearInterval(heartbeat);
  if (rosterTick) clearInterval(rosterTick);
  heartbeat = setInterval(() => {
    if (document.visibilityState === "hidden") return;
    const typing = nodes.input.value.trim()
      ? { typingIn: `${state.classId}/${state.channelId}`, typingAt: Date.now() }
      : { typingIn: "", typingAt: 0 };
    writePresence(typing);
    renderPresence();
  }, HEARTBEAT_MS);
  rosterTick = setInterval(() => renderPresence(), ROSTER_TICK_MS);
}

function enterClass(id) {
  if (!requireAuth()) {
    showAuthStep();
    toast("Sign in with Google to join a class.");
    return;
  }
  const first = titleCase(state.draft.first);
  const last = titleCase(state.draft.last);
  if (!validateName(first) || !validateName(last)) {
    showNameStep();
    toast("Set your roster name before joining a class.");
    return;
  }

  state.me = buildMe(first, last, state.authUser.uid);
  saveMe();
  state.classId = id;
  localStorage.setItem("techchat.class", id);
  ensureChannelForRoom(id);
  startSession();
}

function showAuthStep() {
  nodes.gate.hidden = false;
  nodes.app.hidden = true;
  nodes.gate.dataset.step = "auth";
  nodes.gateAuth.hidden = false;
  nodes.nameForm.hidden = true;
  nodes.gateClasses.hidden = true;
  nodes.cardPeriod.textContent = "No period";
  nodes.authError.hidden = true;
}

function showNameStep() {
  if (!requireAuth()) {
    showAuthStep();
    return;
  }
  nodes.gate.hidden = false;
  nodes.app.hidden = true;
  nodes.gate.dataset.step = "name";
  nodes.gateAuth.hidden = true;
  nodes.nameForm.hidden = false;
  nodes.gateClasses.hidden = true;
  nodes.cardPeriod.textContent = "No period";
  nodes.signedEmail.textContent = state.authUser.email || "";
  nodes.first.focus();
}

function showClassStep() {
  if (!requireAuth()) {
    showAuthStep();
    return;
  }
  if (!validateName(state.draft.first) || !validateName(state.draft.last)) {
    showNameStep();
    return;
  }
  nodes.gate.hidden = false;
  nodes.app.hidden = true;
  nodes.gate.dataset.step = "class";
  nodes.gateAuth.hidden = true;
  nodes.nameForm.hidden = true;
  nodes.gateClasses.hidden = false;
  nodes.cardPeriod.textContent = "Pick a period";
  const firstCard = nodes.classCards.querySelector(".class-card");
  if (firstCard) firstCard.focus();
}

async function signOut() {
  if (heartbeat) clearInterval(heartbeat);
  if (rosterTick) clearInterval(rosterTick);
  if (messagesUnsub) messagesUnsub();
  if (presenceUnsub) presenceUnsub();
  messagesUnsub = null;
  presenceUnsub = null;
  heartbeat = null;
  rosterTick = null;
  await markOffline();
  localStorage.removeItem("techchat.me");
  state.me = null;
  state.messages = [];
  state.presence = [];
  nodes.first.value = "";
  nodes.last.value = "";
  state.draft = { first: "", last: "" };
  setDraftCard();
  await googleSignOutOnly();
  showAuthStep();
}

function resumeAfterAuth(user) {
  state.authUser = user;
  state.isAdmin = isAdminEmail(user.email);
  paintAdminChrome();

  const stored = loadMe();
  if (stored && stored.uid === user.uid) {
    state.me = stored;
    state.draft = { first: stored.first, last: stored.last };
    nodes.first.value = stored.first;
    nodes.last.value = stored.last;
    setDraftCard();
    state.classId = classById(localStorage.getItem("techchat.class") || CAMPUS.id).id;
    state.channelId = channelById(localStorage.getItem("techchat.channel") || "", classById(state.classId)).id;
    startSession();
    return;
  }

  const guessed = namesFromGoogle(user);
  state.draft = guessed;
  nodes.first.value = guessed.first;
  nodes.last.value = guessed.last;
  setDraftCard();
  showNameStep();
}

function clearAuthSession() {
  state.authUser = null;
  state.isAdmin = false;
  state.me = null;
  paintAdminChrome();
  showAuthStep();
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
  if (!requireAuth()) {
    showAuthStep();
    return;
  }
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
  state.me = buildMe(first, last, state.authUser.uid);
  saveMe();
  setDraftCard();
  showClassStep();
});

nodes.backToName.addEventListener("click", showNameStep);
nodes.signOut.addEventListener("click", signOut);
nodes.googleSignIn.addEventListener("click", googleSignIn);
nodes.authSignOut.addEventListener("click", signOut);
nodes.addClassToggle.addEventListener("click", openCreateClass);
nodes.adminCancel.addEventListener("click", closeAdminForm);
nodes.railAdd.addEventListener("click", openAdminForm);
nodes.adminForm.addEventListener("submit", publishClass);
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
  else clearTyping();
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
  if (state.me) markOffline();
});

buildChannels();
setDraftCard();
paintAdminChrome();
showAuthStep();
watchClasses();
watchPresence();
onAuthStateChanged(auth, (user) => {
  state.authReady = true;
  if (!user) {
    if (heartbeat) clearInterval(heartbeat);
    if (rosterTick) clearInterval(rosterTick);
    heartbeat = null;
    rosterTick = null;
    clearAuthSession();
    return;
  }
  resumeAfterAuth(user);
});
