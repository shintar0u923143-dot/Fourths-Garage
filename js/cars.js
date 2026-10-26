// Car roster. Each car has stats used by both race modes and a body style for drawing.
// Stats are 1-10 for kid-friendly balance.
const CARS = [
  {
    id: "roadster", name: "Roadster", brand: "Tesla", emoji: "⚡",
    body: "roadster", accel: 9, top: 7, grip: 6, color: "#e10600",
    note: "Electric, super quick off the line!"
  },
  {
    id: "supra", name: "Supra", brand: "Toyota", emoji: "🐍",
    body: "coupe", accel: 8, top: 8, grip: 7, color: "#ff8c00",
    note: "Legendary Japanese sports car"
  },
  {
    id: "miata", name: "Miata", brand: "Mazda", emoji: "🌸",
    body: "roadster", accel: 6, top: 6, grip: 9, color: "#2ecc71",
    note: "Light and super smooth in corners"
  },
  {
    id: "f1", name: "F1 Car", brand: "Formula 1", emoji: "🏎️",
    body: "f1", accel: 10, top: 10, grip: 10, color: "#1e88e5",
    note: "The fastest on the track!"
  },
  {
    id: "lambo", name: "Huracán", brand: "Lamborghini", emoji: "🐂",
    body: "coupe", accel: 9, top: 9, grip: 8, color: "#ffd23f",
    note: "Bull power!"
  },
  {
    id: "ferrari", name: "Prancing", brand: "Ferrari", emoji: "🐎",
    body: "coupe", accel: 9, top: 9, grip: 8, color: "#dc0000",
    note: "Red and proud"
  }
];

const PAINTS = [
  { name: "Red", hex: "#e10600" },
  { name: "Blue", hex: "#1e88e5" },
  { name: "Yellow", hex: "#ffd23f" },
  { name: "Green", hex: "#2ecc71" },
  { name: "Purple", hex: "#8e44ad" },
  { name: "Orange", hex: "#ff8c00" },
  { name: "White", hex: "#f5f5f5" },
  { name: "Black", hex: "#222222" }
];

const STRIPES = [
  { name: "None", hex: null },
  { name: "White", hex: "#ffffff" },
  { name: "Black", hex: "#111111" },
  { name: "Gold", hex: "#ffd700" },
  { name: "Pink", hex: "#ff4fa3" }
];

const WHEELS = [
  { id: "chrome", name: "Chrome", hex: "#c9d1d9" },
  { id: "gold", name: "Gold", hex: "#d4a017" },
  { id: "black", name: "Black", hex: "#333" },
  { id: "neon", name: "Neon", hex: "#39ff14" }
];

const SPOILERS = [
  { id: "none", name: "None" },
  { id: "wing", name: "Wing" },
  { id: "tall", name: "Tall" }
];

const STICKERS = [
  { id: "none", name: "None", glyph: "" },
  { id: "star", name: "Star", glyph: "★" },
  { id: "bolt", name: "Bolt", glyph: "⚡" },
  { id: "flame", name: "Flame", glyph: "🔥" },
  { id: "number", name: "No. 1", glyph: "1" }
];

// Default customisation
const DEFAULT_BUILD = { paint: "#e10600", stripe: null, wheels: "chrome", spoiler: "none", sticker: "none" };
