import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ALL_CARDS } from "../src/game/cards.js";

const root = process.cwd();
const cardDir = path.join(root, "public", "assets", "cards");
const soundDir = path.join(root, "public", "assets", "sounds");

await mkdir(cardDir, { recursive: true });
await mkdir(soundDir, { recursive: true });

for (const card of ALL_CARDS) {
  await writeFile(path.join(cardDir, `${card.id}.svg`), renderCardPlaceholder(card), "utf8");
}

const sounds = [
  { name: "draw", kind: "draw", duration: 0.28 },
  { name: "play", kind: "play", duration: 0.32 },
  { name: "play-soft", kind: "playSoft", duration: 0.24 },
  { name: "supply", kind: "supply", duration: 0.24 },
  { name: "toggle", kind: "toggle", duration: 0.16 }
];

for (const sound of sounds) {
  await writeFile(path.join(soundDir, `${sound.name}.wav`), renderWav(sound.kind, sound.duration));
}

console.log(`Generated ${ALL_CARDS.length} card placeholders and ${sounds.length} sound files.`);

function renderCardPlaceholder(card) {
  const palette = getPalette(card);
  const type = card.type.toUpperCase();
  const statLine = card.type === "unit" ? `${card.attack}/${card.defense}` : card.type === "supply" ? "SUPPLY" : `${card.cost} SUP`;
  const escapedName = escapeXml(card.name);
  const escapedType = escapeXml(type);
  const escapedTags = escapeXml((card.tags || []).join(" / ") || "COMMAND");
  const escapedStats = escapeXml(String(statLine));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320" viewBox="0 0 480 320" role="img" aria-label="${escapedName} placeholder art">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="${palette.dark}"/>
      <stop offset="0.52" stop-color="${palette.mid}"/>
      <stop offset="1" stop-color="${palette.deep}"/>
    </linearGradient>
    <radialGradient id="lamp" cx="30%" cy="16%" r="70%">
      <stop offset="0" stop-color="#ead48a" stop-opacity="0.62"/>
      <stop offset="0.5" stop-color="#ead48a" stop-opacity="0.13"/>
      <stop offset="1" stop-color="#ead48a" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="480" height="320" rx="18" fill="url(#bg)"/>
  <rect width="480" height="320" rx="18" fill="url(#lamp)"/>
  <path d="M42 210 C116 146 168 248 238 188 S358 170 430 116" fill="none" stroke="#f0ddb0" stroke-width="7" stroke-opacity="0.26"/>
  <path d="M58 74 H422 M82 110 H398 M96 146 H382 M72 182 H408 M116 218 H364" stroke="#f8e8bd" stroke-width="2" stroke-opacity="0.18"/>
  <path d="M106 246 L138 220 L170 250 L212 214 L270 244 L330 202 L386 238" fill="none" stroke="#101617" stroke-width="10" stroke-opacity="0.42"/>
  <circle cx="124" cy="108" r="27" fill="none" stroke="#e3c87e" stroke-width="5" stroke-opacity="0.55"/>
  <path d="M124 74 V142 M90 108 H158 M106 90 L142 126 M142 90 L106 126" stroke="#e3c87e" stroke-width="4" stroke-opacity="0.55"/>
  <rect x="256" y="78" width="142" height="72" rx="8" fill="#0b1112" fill-opacity="0.34" stroke="#ead48a" stroke-opacity="0.24"/>
  <path d="M278 126 H374 M278 104 H350" stroke="#ead48a" stroke-width="5" stroke-linecap="round" stroke-opacity="0.4"/>
  <text x="240" y="284" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#f3e3b4" opacity="0.92">${escapedName}</text>
  <text x="34" y="42" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#f3e3b4" opacity="0.92">${escapedType}</text>
  <text x="446" y="42" text-anchor="end" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#f3e3b4" opacity="0.92">${escapedStats}</text>
  <text x="240" y="64" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#d7c28a" opacity="0.82">${escapedTags}</text>
</svg>
`;
}

function getPalette(card) {
  const palettes = {
    supply: { dark: "#243128", mid: "#786f45", deep: "#121918" },
    tactic: { dark: "#302a23", mid: "#82533a", deep: "#171313" },
    operation: { dark: "#1e2d37", mid: "#5c6a70", deep: "#111719" },
    unit: { dark: "#26312d", mid: "#6b694b", deep: "#111817" }
  };
  return palettes[card.type] || palettes.unit;
}

function escapeXml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&apos;"
  }[char]));
}

function renderWav(kind, durationSeconds) {
  const sampleRate = 44100;
  const totalSamples = Math.max(1, Math.floor(sampleRate * durationSeconds));
  const data = Buffer.alloc(totalSamples * 2);

  for (let i = 0; i < totalSamples; i += 1) {
    const t = i / sampleRate;
    const env = Math.pow(1 - i / totalSamples, 1.65);
    const sample = Math.max(-1, Math.min(1, renderSample(kind, t, env)));
    data.writeInt16LE(Math.round(sample * 32767), i * 2);
  }

  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

function renderSample(kind, t, env) {
  if (kind === "draw") {
    const sweep = sine(520 + t * 1800, t) * 0.32;
    const paper = noise(t) * 0.12;
    return (sweep + paper) * env;
  }
  if (kind === "play") {
    return (saw(150, t) * 0.26 + sine(86, t) * 0.28 + noise(t) * 0.08) * env;
  }
  if (kind === "playSoft") {
    return (sine(122, t) * 0.2 + sine(240, t) * 0.08) * env;
  }
  if (kind === "supply") {
    return (square(300, t) * 0.13 + sine(520, t) * 0.12) * env;
  }
  return sine(430 + t * 500, t) * 0.18 * env;
}

function sine(frequency, t) {
  return Math.sin(Math.PI * 2 * frequency * t);
}

function square(frequency, t) {
  return sine(frequency, t) >= 0 ? 1 : -1;
}

function saw(frequency, t) {
  return 2 * ((t * frequency) % 1) - 1;
}

function noise(t) {
  const x = Math.sin(t * 12347.13) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}
