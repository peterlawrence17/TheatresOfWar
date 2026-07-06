import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ALL_CARDS } from "../src/game/cards.js";

const root = process.cwd();
const cardDir = path.join(root, "public", "assets", "cards");
const soundDir = path.join(root, "public", "assets", "sounds");

await mkdir(cardDir, { recursive: true });
await mkdir(soundDir, { recursive: true });

for (const card of ALL_CARDS) {
  await writeFile(path.join(cardDir, `${card.id}.svg`), renderCardArt(card), "utf8");
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

console.log(`Generated ${ALL_CARDS.length} card art files and ${sounds.length} sound files.`);

function renderCardArt(card) {
  const palette = getPalette(card);
  const escapedName = escapeXml(card.name);
  const seed = hashString(card.id);
  const terrain = renderTerrain(card, palette, seed);
  const motif = renderMotif(card, palette, seed);
  const sparks = renderSparks(palette, seed);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320" viewBox="0 0 480 320" role="img" aria-label="${escapedName} card art">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="${palette.dark}"/>
      <stop offset="0.52" stop-color="${palette.mid}"/>
      <stop offset="1" stop-color="${palette.deep}"/>
    </linearGradient>
    <radialGradient id="lamp" cx="${22 + seed % 48}%" cy="${10 + seed % 28}%" r="78%">
      <stop offset="0" stop-color="${palette.light}" stop-opacity="0.68"/>
      <stop offset="0.46" stop-color="${palette.light}" stop-opacity="0.16"/>
      <stop offset="1" stop-color="${palette.light}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="ground" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="#070a0a" stop-opacity="0.82"/>
      <stop offset="0.5" stop-color="${palette.deep}" stop-opacity="0.58"/>
      <stop offset="1" stop-color="#070a0a" stop-opacity="0.88"/>
    </linearGradient>
    <filter id="grain">
      <feTurbulence baseFrequency="0.72" numOctaves="2" seed="${seed % 89}" type="fractalNoise"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer>
        <feFuncA type="table" tableValues="0 0.18"/>
      </feComponentTransfer>
      <feBlend mode="overlay" in2="SourceGraphic"/>
    </filter>
    <clipPath id="round">
      <rect width="480" height="320" rx="18"/>
    </clipPath>
  </defs>
  <g clip-path="url(#round)">
    <rect width="480" height="320" fill="url(#bg)"/>
    <rect width="480" height="320" fill="url(#lamp)"/>
    <path d="M0 ${190 + seed % 32} C80 ${158 + seed % 30} 132 ${214 - seed % 34} 224 ${184 + seed % 26} S370 ${150 + seed % 46} 480 ${124 + seed % 48} V320 H0 Z" fill="${palette.shadow}" opacity="0.34"/>
    <path d="M0 238 C102 205 146 246 232 218 S380 194 480 172 V320 H0 Z" fill="url(#ground)"/>
    ${terrain}
    <path d="M52 78 H426 M86 112 H396 M72 146 H412 M104 180 H370 M128 214 H350" stroke="${palette.light}" stroke-width="2" stroke-opacity="0.12"/>
    ${motif}
    ${sparks}
    <rect width="480" height="320" fill="#000" opacity="0.08" filter="url(#grain)"/>
    <path d="M22 292 C106 252 162 290 236 252 S368 240 458 206" fill="none" stroke="${palette.light}" stroke-width="7" stroke-linecap="round" stroke-opacity="0.12"/>
  </g>
</svg>
`;
}

function getPalette(card) {
  const palettes = {
    common: { dark: "#28332d", mid: "#6f6743", deep: "#111817", light: "#ead48a", shadow: "#0d1112", accent: "#d5b76f" },
    uk: { dark: "#18314c", mid: "#38617e", deep: "#0e1822", light: "#b7c6d8", shadow: "#091016", accent: "#d9c078" },
    de: { dark: "#252727", mid: "#585548", deep: "#101111", light: "#c7b68c", shadow: "#080909", accent: "#d0b56f" },
    fr: { dark: "#18345f", mid: "#46678d", deep: "#101825", light: "#d7d9d6", shadow: "#0b1018", accent: "#c7b15e" },
    it: { dark: "#1f4c37", mid: "#547553", deep: "#101a14", light: "#d8c98c", shadow: "#0a100d", accent: "#c9b879" },
    ru: { dark: "#551a1a", mid: "#88402d", deep: "#170d0d", light: "#d5c7a1", shadow: "#0d0909", accent: "#d0a055" },
    jp: { dark: "#5a221d", mid: "#83503e", deep: "#160d0b", light: "#d8c49a", shadow: "#0d0908", accent: "#d2a15e" },
    us: { dark: "#1b3858", mid: "#546b76", deep: "#101820", light: "#c8ad68", shadow: "#091016", accent: "#d8bd72" },
    au: { dark: "#244634", mid: "#6d7447", deep: "#101812", light: "#d2b16d", shadow: "#0a100c", accent: "#d7bd72" },
    token: { dark: "#26312b", mid: "#6e6543", deep: "#121715", light: "#e0c77d", shadow: "#0b0f0e", accent: "#cda85e" }
  };
  return palettes[getFactionPrefix(card)] || palettes.common;
}

function getFactionPrefix(card) {
  if (card.id.startsWith("token-")) return "token";
  const prefix = card.id.split("-")[0];
  return ["uk", "de", "fr", "it", "ru", "jp", "us", "au"].includes(prefix) ? prefix : "common";
}

function renderTerrain(card, palette, seed) {
  const id = card.id.toLowerCase();
  if (id.includes("desert") || id.includes("tobruk") || id.includes("rats")) {
    return `<path d="M0 226 C80 196 150 224 230 206 S384 182 480 196 V320 H0 Z" fill="${palette.accent}" opacity="0.24"/>
    <path d="M60 244 C130 226 188 250 256 232 S364 214 444 230" fill="none" stroke="${palette.light}" stroke-width="6" stroke-opacity="0.16"/>`;
  }
  if (id.includes("jungle") || id.includes("kokoda") || id.includes("island")) {
    return `<path d="M34 78 C54 134 48 202 26 284 M96 58 C120 140 108 214 72 306 M410 72 C382 150 386 224 430 302" stroke="${palette.shadow}" stroke-width="18" stroke-linecap="round" opacity="0.42"/>
    <path d="M24 86 L74 116 L44 134 M84 70 L134 104 L98 126 M404 84 L358 118 L396 134" fill="none" stroke="${palette.light}" stroke-width="7" stroke-linecap="round" stroke-opacity="0.18"/>`;
  }
  if (id.includes("navy") || id.includes("destroyer") || id.includes("boat") || id.includes("cruiser") || id.includes("yamato") || id.includes("liberty") || id.includes("iowa")) {
    return `<path d="M0 208 C86 188 130 226 214 206 S348 180 480 204 V320 H0 Z" fill="#1e3f50" opacity="0.38"/>
    <path d="M30 230 C96 212 142 240 206 224 S334 204 448 226" fill="none" stroke="${palette.light}" stroke-width="4" stroke-opacity="0.18"/>`;
  }
  if (id.includes("winter")) {
    return `<path d="M0 212 C90 184 162 222 236 196 S382 176 480 190 V320 H0 Z" fill="#d6dfdc" opacity="0.2"/>
    <path d="M72 84 L80 104 M72 84 L60 100 M72 84 V62 M72 84 L92 78" stroke="${palette.light}" stroke-width="4" stroke-opacity="0.28"/>`;
  }
  return `<path d="M42 230 L82 198 L122 238 L178 190 L244 226 L316 176 L418 230" fill="none" stroke="${palette.shadow}" stroke-width="15" stroke-linejoin="round" stroke-opacity="0.42"/>
  <path d="M42 226 L82 194 L122 234 L178 186 L244 222 L316 172 L418 226" fill="none" stroke="${palette.light}" stroke-width="4" stroke-linejoin="round" stroke-opacity="0.14"/>`;
}

function renderMotif(card, palette, seed) {
  const tags = new Set(card.tags || []);
  const id = card.id.toLowerCase();
  if (card.type === "supply" || id.includes("convoy") || id.includes("logistics")) return renderConvoy(palette, seed);
  if (tags.has("Aircraft") || id.includes("air") || id.includes("spitfire") || id.includes("stuka") || id.includes("zero") || id.includes("mustang") || id.includes("b17") || id.includes("il2")) return renderAircraft(palette, seed);
  if (tags.has("Tank") || id.includes("tank") || id.includes("panzer") || id.includes("t34") || id.includes("sherman") || id.includes("matilda") || id.includes("ha-go") || id.includes("m13")) return renderTank(palette, seed);
  if (tags.has("Naval") || id.includes("boat") || id.includes("destroyer") || id.includes("cruiser") || id.includes("yamato") || id.includes("battleship") || id.includes("torpedo")) return renderShip(palette, seed);
  if (card.type === "operation" || id.includes("radar") || id.includes("intercept") || id.includes("doctrine") || id.includes("mobilization")) return renderOperation(palette, seed);
  if (card.type === "tactic" || id.includes("barrage") || id.includes("raid") || id.includes("sabotage") || id.includes("strike") || id.includes("offensive")) return renderTactic(palette, seed);
  return renderInfantry(palette, seed);
}

function renderAircraft(palette, seed) {
  const x = 218 + seed % 38;
  return `<g fill="${palette.shadow}" stroke="${palette.light}" stroke-opacity="0.32" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M${x} 124 L${x + 144} 160 L${x + 30} 176 L${x - 106} 160 Z" fill="${palette.shadow}" opacity="0.74"/>
    <path d="M${x + 5} 110 L${x + 28} 232 L${x - 2} 246 L${x - 26} 232 Z" fill="${palette.shadow}" opacity="0.82"/>
    <path d="M${x - 52} 184 L${x - 108} 220 M${x + 62} 184 L${x + 126} 220" opacity="0.42"/>
    <path d="M64 74 L112 88 L72 102 Z M354 74 L420 92 L366 106 Z" fill="${palette.shadow}" opacity="0.44" stroke="none"/>
  </g>`;
}

function renderTank(palette, seed) {
  const y = 178 + seed % 18;
  return `<g fill="${palette.shadow}" stroke="${palette.light}" stroke-opacity="0.28" stroke-width="5" stroke-linejoin="round">
    <path d="M104 ${y + 56} H350 L386 ${y + 86} H82 Z" opacity="0.86"/>
    <path d="M156 ${y + 34} H258 L292 ${y + 58} H130 Z" opacity="0.78"/>
    <path d="M250 ${y + 42} L410 ${y + 18}" fill="none" stroke-width="9" stroke-linecap="round"/>
    <circle cx="132" cy="${y + 86}" r="18"/><circle cx="186" cy="${y + 86}" r="18"/><circle cx="240" cy="${y + 86}" r="18"/><circle cx="294" cy="${y + 86}" r="18"/>
    <path d="M78 ${y + 98} H394" fill="none" stroke-width="12" stroke-linecap="round" opacity="0.55"/>
  </g>`;
}

function renderShip(palette, seed) {
  const y = 178 + seed % 20;
  return `<g fill="${palette.shadow}" stroke="${palette.light}" stroke-opacity="0.28" stroke-width="5" stroke-linejoin="round">
    <path d="M72 ${y + 74} H372 L420 ${y + 42} L392 ${y + 100} H112 Z" opacity="0.84"/>
    <path d="M164 ${y + 34} H260 L286 ${y + 70} H140 Z" opacity="0.7"/>
    <path d="M242 ${y + 42} L380 ${y + 18} M214 ${y + 38} L88 ${y + 20}" fill="none" stroke-width="8" stroke-linecap="round"/>
    <path d="M120 ${y + 112} C190 ${y + 88} 258 ${y + 130} 340 ${y + 100}" fill="none" stroke-width="7" stroke-opacity="0.22"/>
  </g>`;
}

function renderInfantry(palette, seed) {
  const offset = seed % 20;
  return `<g fill="${palette.shadow}" stroke="${palette.light}" stroke-opacity="0.25" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    ${renderSoldier(142 + offset, 132)}
    ${renderSoldier(232 - offset, 116)}
    ${renderSoldier(320 + offset / 2, 142)}
    <path d="M104 238 C164 210 218 242 278 212 S374 200 430 226" fill="none" stroke="${palette.light}" stroke-width="5" stroke-opacity="0.16"/>
  </g>`;
}

function renderSoldier(x, y) {
  return `<circle cx="${x}" cy="${y}" r="18"/>
    <path d="M${x - 24} ${y - 4} H${x + 24}" fill="none"/>
    <path d="M${x} ${y + 18} L${x - 18} ${y + 82} M${x} ${y + 18} L${x + 24} ${y + 80}" fill="none"/>
    <path d="M${x - 8} ${y + 44} L${x + 72} ${y + 12}" fill="none" stroke-width="8"/>`;
}

function renderOperation(palette, seed) {
  const x = 134 + seed % 28;
  return `<g fill="${palette.shadow}" stroke="${palette.light}" stroke-opacity="0.28" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="${x}" y="114" width="210" height="128" rx="12" opacity="0.72"/>
    <path d="M${x + 26} 148 H${x + 180} M${x + 26} 180 H${x + 150} M${x + 26} 212 H${x + 166}" opacity="0.68"/>
    <circle cx="${x + 166}" cy="154" r="28" fill="none" stroke-width="7"/>
    <path d="M${x + 166} 104 V204 M${x + 116} 154 H${x + 216}" opacity="0.72"/>
    <path d="M82 246 L168 210 L254 246 L336 198 L420 230" fill="none" stroke-width="7" stroke-opacity="0.16"/>
  </g>`;
}

function renderTactic(palette, seed) {
  const x = 238 + seed % 42;
  return `<g fill="${palette.shadow}" stroke="${palette.light}" stroke-opacity="0.3" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M${x} 118 L${x + 26} 170 L${x + 84} 174 L${x + 36} 208 L${x + 48} 266 L${x} 228 L${x - 50} 266 L${x - 34} 208 L${x - 88} 174 L${x - 26} 168 Z" fill="${palette.accent}" fill-opacity="0.32"/>
    <path d="M54 250 C126 206 168 218 226 170 S344 108 432 92" fill="none" stroke-width="9" stroke-opacity="0.34"/>
    <path d="M392 80 L432 92 L406 126" fill="none" stroke-width="9" stroke-opacity="0.34"/>
    <circle cx="${x}" cy="188" r="42" fill="none" stroke-width="8"/>
  </g>`;
}

function renderConvoy(palette, seed) {
  const y = 186 + seed % 16;
  return `<g fill="${palette.shadow}" stroke="${palette.light}" stroke-opacity="0.28" stroke-width="5" stroke-linejoin="round">
    <rect x="92" y="${y}" width="116" height="54" rx="6" opacity="0.78"/>
    <path d="M208 ${y + 14} H252 L278 ${y + 54} H208 Z" opacity="0.78"/>
    <rect x="306" y="${y + 12}" width="82" height="42" rx="5" opacity="0.6"/>
    <circle cx="122" cy="${y + 60}" r="14"/><circle cx="190" cy="${y + 60}" r="14"/><circle cx="246" cy="${y + 60}" r="14"/><circle cx="330" cy="${y + 60}" r="12"/><circle cx="376" cy="${y + 60}" r="12"/>
    <path d="M68 ${y + 82} H414" fill="none" stroke-width="10" stroke-linecap="round" opacity="0.42"/>
  </g>`;
}

function renderSparks(palette, seed) {
  const parts = [];
  for (let i = 0; i < 9; i += 1) {
    const x = 42 + ((seed * (i + 3) * 19) % 396);
    const y = 42 + ((seed * (i + 5) * 13) % 176);
    const r = 2 + ((seed + i) % 4);
    parts.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${palette.light}" opacity="${0.1 + (i % 4) * 0.04}"/>`);
  }
  return parts.join("\n    ");
}

function hashString(value) {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
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
