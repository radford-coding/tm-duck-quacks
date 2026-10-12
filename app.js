"use strict";

const BUTTONS = [
  { label: "yes", lines: ["yes"], quacks: 1, lang: "en" },
  { label: "no", lines: ["no"], quacks: 2, lang: "en" },
  { label: "maybe", lines: ["maybe"], quacks: 3, lang: "en" },
  { label: "I am not a goose", lines: ["I am not", "a goose"], quacks: 0, lang: "fr" },
];

const FRENCH_PHRASE = "Je ne suis pas une oie";

let uid = 0;

function sealSVG(lines, rotation, textTilt) {
  const id = "seal-" + uid++;
  const longest = Math.max(...lines.map((l) => l.length));
  const fontSize = Math.min(17, 84 / longest);
  const lineHeight = fontSize * 1.16;
  const total = (lines.length - 1) * lineHeight;
  const startY = 60 - total / 2;

  const text = lines
    .map((line, i) => {
      const y = startY + i * lineHeight;
      return `<text class="wax-text" x="60" y="${y}" font-size="${fontSize}" text-anchor="middle" dominant-baseline="central">${line}</text>`;
    })
    .join("");

  return `
<svg class="seal" viewBox="0 0 120 120" role="img" aria-hidden="true" focusable="false">
  <defs>
    <radialGradient id="wax-${id}" cx="38%" cy="30%" r="78%">
      <stop offset="0%" stop-color="#e05555" />
      <stop offset="42%" stop-color="#b52424" />
      <stop offset="100%" stop-color="#6b0c0c" />
    </radialGradient>
    <radialGradient id="press-${id}" cx="40%" cy="34%" r="72%">
      <stop offset="0%" stop-color="#c92c2c" />
      <stop offset="68%" stop-color="#8c1414" />
      <stop offset="100%" stop-color="#580909" />
    </radialGradient>
    <filter id="sh-${id}" x="-35%" y="-35%" width="170%" height="170%">
      <feDropShadow dx="0" dy="3.5" stdDeviation="3.2" flood-color="#1c0a00" flood-opacity="0.5" />
    </filter>
  </defs>
  <g filter="url(#sh-${id})">
    <g fill="url(#wax-${id})" transform="rotate(${rotation} 60 60)">
      <circle cx="60" cy="60" r="40" />
      <circle cx="60" cy="21" r="9" />
      <circle cx="60" cy="99" r="8" />
      <circle cx="21" cy="60" r="9" />
      <circle cx="99" cy="63" r="10" />
      <circle cx="32" cy="32" r="6.5" />
      <circle cx="89" cy="89" r="7" />
      <circle cx="89" cy="30" r="6" />
      <circle cx="33" cy="90" r="7.5" />
      <circle cx="60" cy="12" r="5" />
      <circle cx="106" cy="49" r="4.5" />
      <circle cx="14" cy="72" r="4.5" />
    </g>
  </g>
  <g transform="rotate(${rotation} 60 60)">
    <circle cx="60" cy="60" r="33" fill="url(#press-${id})" />
    <circle cx="60" cy="60" r="33" fill="none" stroke="#7c0d0d" stroke-width="1.6" opacity="0.65" />
    <circle cx="60" cy="60" r="28.5" fill="none" stroke="#ffd9c2" stroke-width="0.7" opacity="0.35" />
    <circle cx="60" cy="60" r="36.5" fill="none" stroke="#7c0d0d" stroke-width="0.8" opacity="0.4" />
  </g>
  <g transform="rotate(${textTilt} 60 60)">
    ${text}
  </g>
</svg>`;
}

function buildButtons() {
  const grid = document.getElementById("grid");
  BUTTONS.forEach((btn, i) => {
    const el = document.createElement("button");
    el.className = "seal-btn";
    el.type = "button";
    el.setAttribute("aria-label", btn.label);
    el.dataset.index = String(i);
    el.innerHTML =
      sealSVG(btn.lines, (i * 53 + 17) % 360, (i % 2 === 0 ? -4 : 4)) +
      `<span class="sr-only">${btn.label}</span>`;
    el.addEventListener("click", () => activate(btn, el));
    grid.appendChild(el);
  });
}

/* ------------------------- Audio ------------------------- */

const QUACK_SRC = "quack_5.mp3";
const QUACK_GAP = 0.31;

let quackBuffer = null;

let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function loadQuack() {
  if (quackBuffer) return Promise.resolve(quackBuffer);
  const ctx = getAudioCtx();
  return fetch(QUACK_SRC)
    .then((res) => res.arrayBuffer())
    .then((data) => ctx.decodeAudioData(data))
    .then((buffer) => {
      quackBuffer = buffer;
      return buffer;
    });
}

function playQuacks(count) {
  if (count <= 0) return;
  const ctx = getAudioCtx();
  loadQuack().then((buffer) => {
    const start = ctx.currentTime + 0.02;
    for (let i = 0; i < count; i++) {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      src.start(start + i * QUACK_GAP);
    }
  });
}

loadQuack().catch(() => {});

/* --------------------- French voice ---------------------- */

let frenchVoice = null;

function pickVoice() {
  if (!("speechSynthesis" in window)) return;
  const voices = window.speechSynthesis.getVoices();
  frenchVoice =
    voices.find((v) => /fr[-_]FR/i.test(v.lang)) ||
    voices.find((v) => /^fr/i.test(v.lang)) ||
    null;
}

if ("speechSynthesis" in window) {
  pickVoice();
  window.speechSynthesis.addEventListener("voiceschanged", pickVoice);
}

function speakFrench() {
  if (!("speechSynthesis" in window)) {
    playQuacks(2);
    return;
  }
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(FRENCH_PHRASE);
  utter.lang = "fr-FR";
  if (!frenchVoice) pickVoice();
  if (frenchVoice) utter.voice = frenchVoice;
  utter.rate = 0.92;
  utter.pitch = 0.85;
  utter.volume = 1;
  window.speechSynthesis.speak(utter);
}

/* ------------------------ Trigger ------------------------ */

const SILENCE_MS = 2000;
let lastPress = 0;

function activate(btn, el) {
  const now = Date.now();
  if (now - lastPress < SILENCE_MS) return;
  lastPress = now;

  el.classList.add("pressed");
  window.setTimeout(() => el.classList.remove("pressed"), 160);

  if (btn.lang === "fr") {
    speakFrench();
  } else {
    playQuacks(btn.quacks);
  }
}

document.addEventListener("DOMContentLoaded", buildButtons);
