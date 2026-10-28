/**
 * Lucky Draw client demo data (local only).
 *
 *   node scripts/seed-lucky-draw-demo.js                      # Andheri West at its real location
 *   node scripts/seed-lucky-draw-demo.js --lat=19.13 --lng=72.83   # Andheri West at your location
 *   node scripts/seed-lucky-draw-demo.js --clear              # remove every draw: the list shows its empty state
 *
 * Safe to rerun: it deletes the six demo draws (by name, for the demo merchant) and recreates
 * them with dates relative to "now", so "entries closed 1 hour ago" is true again after a rerun.
 *
 * What it sets up for test-merchant@scratchx.local:
 *  - subscription on the Smart plan (features.canUseLuckyDraw = true)
 *  - three active stores with locations: Andheri West, Bandra, Thane
 *  - six Lucky Draws, one per draw type and stage (type keys; the screens show live_online as
 *    "Digital draw" and digital as "Live online draw"):
 *      Diwali     digital,     entries open
 *      Navratri   live_online, entries closed 1h ago, ready to reveal, 5 prize levels (QR + staff entries)
 *      Ganesh     physical,    entries closed 1h ago, ready to pick winners, 4 prize levels (staff entries)
 *      Monsoon    digital,     completed, claim codes printed
 *      Weekend    physical,    entries open (staff add entries at the counter)
 *      New Year   live_online, draft
 *  With --clear it keeps the account, plan and stores but removes every draw of the merchant.
 *
 * Refuses to run against a non-local MongoDB.
 */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Account from '../models/accountModel.js';
import Store from '../models/storeModel.js';
import Subscription from '../models/subscriptionModel.js';
import SubscriptionPlan from '../models/subscriptionPlanModel.js';
import LuckyDrawCampaign from '../models/luckyDrawCampaignModel.js';
import LuckyDraw from '../models/luckyDrawModel.js';
import LuckyDrawEntry from '../models/luckyDrawEntryModel.js';
import LuckyDrawWinner from '../models/luckyDrawWinnerModel.js';
import { CLAIM_EXPIRY_DAYS, MAX_PRIZE_IMAGE_BYTES } from '../lib/luckyDraw/constants.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(ROOT, '.env.local'), quiet: true });
dotenv.config({ path: path.join(ROOT, '.env'), quiet: true });

const MERCHANT_EMAIL = 'test-merchant@scratchx.local';
const BASE_URL = process.env.DEMO_BASE_URL || 'http://localhost:3000';
const DEMO_NAMES = {
  diwali: 'Diwali Dhamaka Lucky Draw',
  navratri: 'Navratri Nights Draw',
  ganesh: 'Ganesh Utsav Draw',
  monsoon: 'Monsoon Mega Draw',
  weekend: 'Weekend Bonanza',
  newYear: 'New Year Draw',
};

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const IST_MS = 330 * MINUTE;

// ── args ──────────────────────────────────────────────────────────────────────
function arg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}
const andheriLat = Number(arg('lat') ?? process.env.DEMO_LAT ?? 19.1364);
const andheriLng = Number(arg('lng') ?? process.env.DEMO_LNG ?? 72.8296);
if (!Number.isFinite(andheriLat) || !Number.isFinite(andheriLng) || Math.abs(andheriLat) > 90 || Math.abs(andheriLng) > 180) {
  console.error('Invalid --lat / --lng');
  process.exit(1);
}

// ── deterministic randomness, so every run shows the same customers ────────────
function seededRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = seededRng(20261011);
const pick = (list) => list[Math.floor(rng() * list.length)];
const between = (min, max) => min + rng() * (max - min);
const intBetween = (min, max) => Math.floor(between(min, max + 1));

// ── dates (IST wall clock helpers) ───────────────────────────────────────────
/** `days` from today (IST calendar day) at HH:mm IST. */
function istDayAt(days, hhmm, now) {
  const [h, m] = hhmm.split(':').map(Number);
  const shifted = new Date(now.getTime() + IST_MS);
  const utc = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate() + days, h, m);
  return new Date(utc - IST_MS);
}
/** A random moment in store hours (10:00–21:30 IST) between two dates. */
function shopTimeBetween(from, to) {
  for (let i = 0; i < 50; i++) {
    const t = new Date(between(from.getTime(), to.getTime()));
    const istHour = new Date(t.getTime() + IST_MS).getUTCHours() + new Date(t.getTime() + IST_MS).getUTCMinutes() / 60;
    if (istHour >= 10 && istHour <= 21.5) return t;
  }
  return new Date(between(from.getTime(), to.getTime()));
}

// ── simple generated prize pictures (PNG, no image libraries) ────────────────
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const circle = (cx, cy, r) => (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
const ring = (cx, cy, r1, r2) => (x, y) => {
  const d = (x - cx) ** 2 + (y - cy) ** 2;
  return d <= r2 * r2 && d >= r1 * r1;
};
function rect(x0, y0, x1, y1, rad = 0) {
  return (x, y) => {
    if (x < x0 || x > x1 || y < y0 || y > y1) return false;
    const cx = Math.min(Math.max(x, x0 + rad), x1 - rad);
    const cy = Math.min(Math.max(y, y0 + rad), y1 - rad);
    return (x - cx) ** 2 + (y - cy) ** 2 <= rad * rad;
  };
}
function poly(points) {
  return (x, y) => {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [xi, yi] = points[i];
      const [xj, yj] = points[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
}
const and = (...shapes) => (x, y) => shapes.every((s) => s(x, y));
const not = (shape) => (x, y) => !shape(x, y);
function star(cx, cy, outer, inner) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return poly(pts);
}

function renderPng(bg, layers, size = 240, ss = 3) {
  const bgRgb = hex(bg);
  const compiled = layers.map(([shape, color]) => [shape, hex(color)]);
  const rowLen = size * 3 + 1;
  const raw = Buffer.alloc(rowLen * size);
  for (let py = 0; py < size; py++) {
    raw[py * rowLen] = 0;
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const x = (px + (sx + 0.5) / ss) / size;
          const y = (py + (sy + 0.5) / ss) / size;
          let c = bgRgb;
          for (const [shape, color] of compiled) if (shape(x, y)) c = color;
          r += c[0];
          g += c[1];
          b += c[2];
        }
      }
      const n = ss * ss;
      const o = py * rowLen + 1 + px * 3;
      raw[o] = Math.round(r / n);
      raw[o + 1] = Math.round(g / n);
      raw[o + 2] = Math.round(b / n);
    }
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  if (png.length > MAX_PRIZE_IMAGE_BYTES) throw new Error(`Generated image is ${png.length} bytes, over the limit`);
  return `data:image/png;base64,${png.toString('base64')}`;
}

function coin(bg, edge, face, mark) {
  return renderPng(bg, [
    [circle(0.5, 0.5, 0.42), '#FFFFFF'],
    [circle(0.5, 0.5, 0.34), edge],
    [circle(0.5, 0.5, 0.29), face],
    [ring(0.5, 0.5, 0.25, 0.265), edge],
    [star(0.5, 0.51, 0.15, 0.065), mark],
    [and(ring(0.5, 0.5, 0.305, 0.33), (x, y) => x < 0.42 && y < 0.42), '#FFFFFF'],
  ]);
}
function ticket(bg, body, accent, line) {
  const notchL = circle(0.1, 0.5, 0.06);
  const notchR = circle(0.9, 0.5, 0.06);
  return renderPng(bg, [
    [and(rect(0.1, 0.28, 0.9, 0.72, 0.04), not(notchL), not(notchR)), body],
    [rect(0.62, 0.28, 0.68, 0.72), accent],
    [poly([[0.65, 0.3], [0.55, 0.2], [0.58, 0.32]]), accent],
    [poly([[0.65, 0.3], [0.75, 0.2], [0.72, 0.32]]), accent],
    [rect(0.18, 0.39, 0.5, 0.44, 0.02), line],
    [rect(0.18, 0.5, 0.42, 0.54, 0.02), line],
    [rect(0.18, 0.59, 0.36, 0.63, 0.02), line],
  ]);
}
function trophy(bg, metal, dark) {
  const bowl = (x, y) => (circle(0.5, 0.3, 0.22)(x, y) && y >= 0.3) || rect(0.28, 0.18, 0.72, 0.3)(x, y);
  return renderPng(bg, [
    [circle(0.5, 0.48, 0.42), '#FFFFFF'],
    [and(ring(0.27, 0.33, 0.06, 0.09), (x) => x < 0.3), metal],
    [and(ring(0.73, 0.33, 0.06, 0.09), (x) => x > 0.7), metal],
    [bowl, metal],
    [rect(0.33, 0.21, 0.4, 0.4, 0.03), '#FFFFFF'],
    [rect(0.46, 0.5, 0.54, 0.66), dark],
    [rect(0.36, 0.65, 0.64, 0.72, 0.02), metal],
    [rect(0.3, 0.72, 0.7, 0.8, 0.02), dark],
    [star(0.56, 0.32, 0.07, 0.03), dark],
  ]);
}
const PICTURES = {
  tv: () =>
    renderPng('#E8F0FE', [
      [circle(0.5, 0.48, 0.42), '#FFFFFF'],
      [poly([[0.4, 0.84], [0.6, 0.84], [0.55, 0.7], [0.45, 0.7]]), '#4B5563'],
      [rect(0.1, 0.22, 0.9, 0.71, 0.03), '#111827'],
      [rect(0.14, 0.26, 0.86, 0.67, 0.01), '#2563EB'],
      [poly([[0.14, 0.26], [0.42, 0.26], [0.14, 0.52]]), '#3B82F6'],
      [poly([[0.5, 0.26], [0.6, 0.26], [0.32, 0.67], [0.22, 0.67]]), '#60A5FA'],
      [rect(0.3, 0.83, 0.7, 0.86, 0.015), '#374151'],
    ]),
  goldCoin: () => coin('#FFF7E0', '#B8860B', '#F5C518', '#D4A017'),
  silverCoin: () => coin('#EEF2F7', '#7C8899', '#D5DCE4', '#9AA5B4'),
  voucherPink: () => ticket('#FDECEF', '#E11D48', '#FBBF24', '#FDA4AF'),
  voucherBlue: () => ticket('#E0F2FE', '#0284C7', '#FACC15', '#7DD3FC'),
  movieTicket: () => ticket('#FFF1E6', '#EA580C', '#1F2937', '#FDBA74'),
  trophyGold: () => trophy('#FFF7E0', '#E0A800', '#8A6D00'),
  trophySilver: () => trophy('#EEF2F7', '#A3ADBA', '#5B6573'),
  trophyBronze: () => trophy('#FBEEE4', '#C77B3B', '#7A4A22'),
  washingMachine: () =>
    renderPng('#E0F2FE', [
      [rect(0.22, 0.14, 0.78, 0.86, 0.05), '#94A3B8'],
      [rect(0.235, 0.155, 0.765, 0.845, 0.04), '#FFFFFF'],
      [rect(0.235, 0.155, 0.765, 0.3, 0.04), '#E5E7EB'],
      [rect(0.3, 0.2, 0.48, 0.25, 0.01), '#38BDF8'],
      [circle(0.67, 0.225, 0.035), '#64748B'],
      [circle(0.5, 0.57, 0.2), '#94A3B8'],
      [circle(0.5, 0.57, 0.16), '#7DD3FC'],
      [and(circle(0.5, 0.57, 0.16), (x, y) => y > 0.62), '#38BDF8'],
      [circle(0.44, 0.51, 0.035), '#E0F2FE'],
    ]),
  mixer: () =>
    renderPng('#FEF3C7', [
      [circle(0.5, 0.5, 0.42), '#FFFFFF'],
      [and(ring(0.68, 0.4, 0.06, 0.1), (x) => x > 0.64), '#9CA3AF'],
      [poly([[0.32, 0.22], [0.68, 0.22], [0.62, 0.6], [0.38, 0.6]]), '#D1D5DB'],
      [poly([[0.36, 0.25], [0.44, 0.25], [0.42, 0.56], [0.4, 0.56]]), '#F3F4F6'],
      [rect(0.3, 0.15, 0.7, 0.23, 0.02), '#374151'],
      [rect(0.28, 0.6, 0.72, 0.85, 0.04), '#DC2626'],
      [circle(0.5, 0.72, 0.05), '#FCA5A5'],
    ]),
  giftBox: () =>
    renderPng('#F3E8FF', [
      [circle(0.5, 0.52, 0.42), '#FFFFFF'],
      [rect(0.24, 0.42, 0.76, 0.82, 0.02), '#7C3AED'],
      [rect(0.2, 0.32, 0.8, 0.44, 0.02), '#8B5CF6'],
      [rect(0.46, 0.32, 0.54, 0.82), '#FBBF24'],
      [poly([[0.5, 0.32], [0.34, 0.18], [0.3, 0.3]]), '#F59E0B'],
      [poly([[0.5, 0.32], [0.66, 0.18], [0.7, 0.3]]), '#F59E0B'],
    ]),
};
const imageCache = new Map();
const picture = (key) => {
  if (!imageCache.has(key)) imageCache.set(key, PICTURES[key]());
  return imageCache.get(key);
};

// ── customers ────────────────────────────────────────────────────────────────
const FIRST = [
  'Aarav', 'Vivaan', 'Aditya', 'Rohan', 'Arjun', 'Kabir', 'Ishaan', 'Siddharth', 'Rahul', 'Amit', 'Vikram',
  'Nikhil', 'Pranav', 'Harsh', 'Manish', 'Suresh', 'Rajesh', 'Deepak', 'Sanjay', 'Tushar', 'Omkar', 'Yash',
  'Priya', 'Ananya', 'Diya', 'Sneha', 'Pooja', 'Kavya', 'Neha', 'Riya', 'Meera', 'Anjali', 'Shreya', 'Isha',
  'Sakshi', 'Swati', 'Nidhi', 'Aishwarya', 'Komal', 'Rupali', 'Sunita', 'Lata', 'Farah', 'Zoya', 'Imran', 'Faisal',
  'Joseph', 'Sharon', 'Gurpreet', 'Harleen',
];
const LAST = [
  'Sharma', 'Patel', 'Mehta', 'Shah', 'Desai', 'Joshi', 'Kulkarni', 'Deshpande', 'Patil', 'Pawar', 'Jadhav',
  'Iyer', 'Nair', 'Menon', 'Reddy', 'Rao', 'Gupta', 'Agarwal', 'Verma', 'Singh', 'Chauhan', 'Kapoor', 'Malhotra',
  'Bhatt', 'Thakkar', 'Naik', 'Sawant', 'Gaikwad', 'Shaikh', 'Khan', 'Fernandes', "D'Souza", 'Pillai', 'Bose', 'Banerjee',
];
const usedPhones = new Set(['9876543210', '9876543211']);
const usedNames = new Set();
function customer() {
  let name;
  do name = `${pick(FIRST)} ${pick(LAST)}`;
  while (usedNames.has(name));
  usedNames.add(name);
  let phone;
  do phone = `${pick(['98', '99', '97', '96', '93', '90', '88', '87', '82', '81', '79', '70', '62'])}${String(intBetween(0, 99999999)).padStart(8, '0')}`;
  while (usedPhones.has(phone));
  usedPhones.add(phone);
  const email = `${name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '')}@example.com`;
  return { name, phone, email };
}
/** A point `meters` away from (lat, lng) in a random direction. */
function nearby(lat, lng, meters) {
  const bearing = rng() * 2 * Math.PI;
  return {
    lat: lat + (meters * Math.cos(bearing)) / 111320,
    lng: lng + (meters * Math.sin(bearing)) / (111320 * Math.cos((lat * Math.PI) / 180)),
  };
}
/** A believable bill at or above the minimum: most just over it, some much bigger. */
function billAbove(min) {
  const base = Math.max(min, 500);
  const amount = rng() < 0.7 ? between(base, base * 1.8) : between(base * 1.8, base * 4);
  return Math.max(min, Math.round(amount / 10) * 10);
}

// ── db helpers ───────────────────────────────────────────────────────────────
/** Validates with the Mongoose model, then inserts raw so createdAt/updatedAt can be set. */
async function insertValidated(Model, docs) {
  if (!docs.length) return [];
  const built = [];
  for (const data of docs) {
    const doc = new Model(data);
    await doc.validate();
    built.push({ ...doc.toObject({ depopulate: true }), createdAt: data.createdAt, updatedAt: data.updatedAt ?? data.createdAt });
  }
  await Model.collection.insertMany(built);
  return built;
}
/** An ObjectId whose timestamp is `date`, so entries sort by _id in the order they were made (draws replay in _id order). */
const idAt = (date) =>
  new mongoose.Types.ObjectId(Math.floor(date.getTime() / 1000).toString(16).padStart(8, '0') + crypto.randomBytes(8).toString('hex'));
/** Same id on every run, so the demo URLs stay valid after a reset. */
const demoId = (name) =>
  new mongoose.Types.ObjectId(crypto.createHash('md5').update(`lucky-draw-demo:${name}`).digest('hex').slice(0, 24));
const CLAIM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
async function uniqueClaimCodes(count) {
  const codes = new Set();
  while (codes.size < count) {
    let code = '';
    for (let i = 0; i < 8; i++) code += CLAIM_ALPHABET[crypto.randomInt(CLAIM_ALPHABET.length)];
    if (!codes.has(code) && !(await LuckyDrawWinner.exists({ claimCode: code }))) codes.add(code);
  }
  return [...codes];
}

/** `count` entries spread over store hours between two dates, each from a different customer. */
function makeEntries({ count, from, to, stores: storeList, minBill, campaignId, drawId, source, addedBy = null }) {
  return Array.from({ length: count }, () => shopTimeBetween(from, to)).map((at) => {
    const who = customer();
    const store = pick(storeList);
    const base = {
      _id: idAt(at),
      campaignId, drawId, storeId: store._id,
      customerName: who.name, customerPhone: who.phone, customerEmail: who.email, consent: true,
      billAmount: billAbove(minBill), entriesGranted: 1, source,
      addedByAccountId: source === 'staff' ? addedBy : null,
      createdAt: at,
    };
    if (source === 'staff') return base;
    const meters = Math.round(between(15, 1500));
    const spot = nearby(store.latitude, store.longitude, meters);
    return { ...base, distanceMeters: meters, customerLatitude: spot.lat, customerLongitude: spot.lng };
  });
}

/** Numbers entries 1..N in the order they were made, inserts them and moves the campaign's counter on. */
async function insertEntries(campaignId, entries) {
  const numbered = [...entries].sort((a, b) => a.createdAt - b.createdAt).map((e, i) => ({ ...e, entryNumber: i + 1 }));
  await insertValidated(LuckyDrawEntry, numbered);
  await LuckyDrawCampaign.updateOne({ _id: campaignId }, { $set: { entryCounter: numbered.length } });
  return numbered;
}

function snapshot(store) {
  return {
    storeId: store._id,
    storeName: store.store_name,
    storeCode: store.store_code,
    address: store.address,
    city: store.city,
    state: store.state,
    pincode: store.pincode,
    latitude: store.latitude,
    longitude: store.longitude,
    status: 'active',
  };
}
const prize = (rank, prizeDescription, prizeValue, quantity, imageKey) => ({
  rank,
  prizeDescription,
  prizeValue,
  quantity,
  imageUrl: imageKey ? picture(imageKey) : null,
});

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  const uri = process.env.MONGODB_URI || process.env.DB_URL;
  if (!uri) throw new Error('MONGODB_URI is not set in .env.local or .env');
  const host = uri.replace(/^mongodb(\+srv)?:\/\/([^@]*@)?/, '').split(/[/?]/)[0];
  if (!/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)) {
    throw new Error(`Refusing to seed demo data into a non-local database (${host}).`);
  }
  if (process.env.OTP_PROVIDER && process.env.OTP_PROVIDER !== 'console') {
    console.warn(`⚠  OTP_PROVIDER=${process.env.OTP_PROVIDER}: SMS will be really sent. Set it to "console" for the demo.`);
  }

  await mongoose.connect(uri);
  const now = new Date();
  console.log(`Seeding Lucky Draw demo into ${host}/${mongoose.connection.name} at ${now.toISOString()}`);

  // Plans and test accounts (the repo's own seeds read .env, so pass the URI through).
  const childEnv = { ...process.env, MONGODB_URI: uri };
  if (!(await SubscriptionPlan.exists({ name: 'Smart' }))) {
    console.log('Smart plan missing: running seed:plans');
    execFileSync('node', ['scripts/seed-subscription-plans.js'], { cwd: ROOT, env: childEnv, stdio: 'inherit' });
  }
  if (!(await Account.exists({ email: MERCHANT_EMAIL }))) {
    console.log('Test merchant missing: running seed:accounts');
    execFileSync('node', ['scripts/seed-test-accounts.js'], { cwd: ROOT, env: childEnv, stdio: 'inherit' });
  }
  const smart = await SubscriptionPlan.findOne({ name: 'Smart' }).lean();
  if (!smart?.features?.canUseLuckyDraw) throw new Error('The Smart plan does not have features.canUseLuckyDraw = true');
  const merchant = await Account.findOne({ email: MERCHANT_EMAIL }).lean();
  if (!merchant) throw new Error(`${MERCHANT_EMAIL} not found`);

  // Subscription → Smart.
  const sub = await Subscription.findOne({ ownerId: merchant._id, ownerType: 'merchant' });
  if (sub) {
    sub.planId = smart._id;
    sub.planType = 'SMART';
    sub.status = 'active';
    await sub.save();
  } else {
    await Subscription.create({
      ownerId: merchant._id,
      ownerType: 'merchant',
      merchantId: merchant._id,
      planId: smart._id,
      planType: 'SMART',
      status: 'active',
      billingCycle: 'one-time',
      purchaseDate: now,
      unlimitedScratches: {
        isActive: true,
        grantedAt: now,
        validUntil: new Date(now.getTime() + 90 * DAY),
        scratchValidityType: 'quarterly',
        daysRemaining: 90,
      },
    });
  }
  console.log('✓ Subscription on the Smart plan');

  // Stores.
  const STORES = [
    {
      key: 'andheri', store_name: 'Andheri West', store_code: 'SXDEMOAW',
      address: 'Shop 4, Lokhandwala Market, Andheri West', city: 'Mumbai', state: 'Maharashtra', pincode: '400053',
      latitude: andheriLat, longitude: andheriLng, contact_person: 'Rakesh Mehta', contact_number: '9820011223',
    },
    {
      key: 'bandra', store_name: 'Bandra', store_code: 'SXDEMOBD',
      address: '22 Linking Road, Bandra West', city: 'Mumbai', state: 'Maharashtra', pincode: '400050',
      latitude: 19.0607, longitude: 72.8362, contact_person: 'Sonal Kapoor', contact_number: '9820044556',
    },
    {
      key: 'thane', store_name: 'Thane', store_code: 'SXDEMOTH',
      address: 'Shop 11, Ghodbunder Road, Thane West', city: 'Thane', state: 'Maharashtra', pincode: '400607',
      latitude: 19.2296, longitude: 72.9736, contact_person: 'Vinod Patil', contact_number: '9820077889',
    },
  ];
  const stores = {};
  for (const { key, ...data } of STORES) {
    let store = await Store.findOne({ merchant_id: merchant._id, store_name: data.store_name });
    const codeOwner = await Store.findOne({ store_code: data.store_code }).select('merchant_id').lean();
    if (codeOwner && String(codeOwner.merchant_id) !== String(merchant._id)) {
      throw new Error(`Store code ${data.store_code} belongs to another merchant`);
    }
    if (!store) store = codeOwner ? await Store.findById(codeOwner._id) : new Store({ merchant_id: merchant._id });
    store.set({ ...data, status: 'active', isDeleted: false, deletedAt: null });
    await store.save();
    stores[key] = store.toObject();
  }
  console.log(`✓ Stores: Andheri West (${andheriLat}, ${andheriLng}), Bandra, Thane`);

  // Every Lucky Draw of the demo merchant goes (demo ones and any made by hand before the client flow),
  // so no old-style draw is left to break the screens.
  const old = await LuckyDrawCampaign.find({
    $or: [{ merchantId: merchant._id }, { _id: { $in: Object.values(DEMO_NAMES).map(demoId) } }],
  })
    .select('_id')
    .lean();
  if (old.length) {
    const ids = old.map((c) => c._id);
    await LuckyDrawWinner.deleteMany({ campaignId: { $in: ids } });
    await LuckyDrawEntry.deleteMany({ campaignId: { $in: ids } });
    await LuckyDraw.deleteMany({ campaignId: { $in: ids } });
    await LuckyDrawCampaign.deleteMany({ _id: { $in: ids } });
    console.log(`✓ Removed ${old.length} older demo draw(s)`);
  }
  if (process.argv.includes('--clear')) {
    console.log(`\nNo lucky draws left for ${MERCHANT_EMAIL}: ${BASE_URL}/lucky-draws shows the empty state.`);
    console.log('Rerun without --clear to bring the demo draws back.');
    return;
  }

  const created = {};
  const base = (data) => ({ merchantId: merchant._id, description: '', entryCounter: 0, ...data });

  // a) Diwali: digital, entries open, one entries-close extension.
  {
    const startDate = istDayAt(-10, '10:00', now);
    const endDate = istDayAt(20, '21:00', now);
    const revealDate = istDayAt(22, '19:00', now);
    const originalClose = istDayAt(15, '21:00', now);
    const createdAt = istDayAt(-11, '16:20', now);
    const [campaign] = await insertValidated(LuckyDrawCampaign, [
      base({
        _id: demoId(DEMO_NAMES.diwali),
        name: DEMO_NAMES.diwali,
        description: 'Shop for ₹2,000 or more this Diwali and win a 43-inch Smart TV, gold coins or gift vouchers.',
        drawType: 'digital', minBillAmount: 2000,
        assignedStores: [snapshot(stores.andheri), snapshot(stores.bandra), snapshot(stores.thane)],
        startDate, endDate, revealDate, status: 'active',
        prizeTiers: [
          prize(1, '43-inch Smart TV', 20000, 1, 'tv'),
          prize(2, 'Gold coin', 5000, 5, 'goldCoin'),
          prize(3, 'Gift voucher', 3000, 10, 'voucherPink'),
        ],
        createdAt, updatedAt: istDayAt(-5, '11:05', now),
      }),
    ]);
    const drawId = new mongoose.Types.ObjectId();
    const entries = makeEntries({
      count: 40, from: startDate, to: new Date(now.getTime() - 20 * MINUTE),
      stores: [stores.andheri, stores.bandra], minBill: 2000, campaignId: campaign._id, drawId, source: 'qr',
    });
    const extendedAt = istDayAt(-5, '11:05', now);
    const phonesBefore = new Set(entries.filter((e) => e.createdAt < extendedAt).map((e) => e.customerPhone));
    await insertValidated(LuckyDraw, [
      {
        _id: drawId, campaignId: campaign._id, periodStart: startDate, drawDate: revealDate, status: 'scheduled',
        dateHistory: [
          {
            kind: 'entries_close', previousDate: originalClose, newDate: endDate,
            changedByAccountId: merchant._id, changedAt: extendedAt,
            reason: 'Customers asked for more time to shop before Diwali',
            entrantsNotified: true, entrantsNotifiedCount: phonesBefore.size,
          },
        ],
        createdAt: startDate, updatedAt: extendedAt,
      },
    ]);
    await insertEntries(campaign._id, entries);
    created.diwali = { id: campaign._id, entries: entries.length };
  }

  // b) Navratri: live online, QR + staff entries; entries closed 1 hour ago, ready to start the reveal.
  {
    const endDate = new Date(now.getTime() - HOUR);
    const startDate = istDayAt(-14, '10:00', now);
    const [campaign] = await insertValidated(LuckyDrawCampaign, [
      base({
        _id: demoId(DEMO_NAMES.navratri),
        name: DEMO_NAMES.navratri,
        description: 'Scan the QR code with your Navratri bill, or ask at the counter. Winners are revealed live.',
        drawType: 'live_online', minBillAmount: 1000,
        assignedStores: [snapshot(stores.andheri), snapshot(stores.bandra), snapshot(stores.thane)],
        startDate, endDate, revealDate: endDate, status: 'active',
        prizeTiers: [
          prize(1, 'Gold coin', 10000, 1, 'goldCoin'),
          prize(2, 'Silver coin', 2000, 3, 'silverCoin'),
          prize(3, 'Gift voucher', 500, 6, 'voucherPink'),
          prize(4, 'Movie tickets for two', 300, 8, 'movieTicket'),
          prize(5, 'Sweets box', 150, 10, 'giftBox'),
        ],
        createdAt: istDayAt(-15, '12:40', now), updatedAt: istDayAt(-1, '20:15', now),
      }),
    ]);
    const drawId = new mongoose.Types.ObjectId();
    await insertValidated(LuckyDraw, [
      { _id: drawId, campaignId: campaign._id, periodStart: startDate, drawDate: endDate, status: 'scheduled', createdAt: startDate },
    ]);
    const period = { from: startDate, to: new Date(endDate.getTime() - 10 * MINUTE), stores: [stores.andheri, stores.bandra, stores.thane], minBill: 1000, campaignId: campaign._id, drawId };
    const entries = await insertEntries(campaign._id, [
      ...makeEntries({ ...period, count: 30, source: 'qr' }),
      ...makeEntries({ ...period, count: 22, source: 'staff', addedBy: merchant._id }),
    ]);
    created.navratri = { id: campaign._id, entries: entries.length };
  }

  // c) Ganesh: physical, staff entries only; entries closed 1 hour ago, ready to pick the winners.
  {
    const endDate = new Date(now.getTime() - HOUR);
    const startDate = istDayAt(-21, '10:00', now);
    const [campaign] = await insertValidated(LuckyDrawCampaign, [
      base({
        _id: demoId(DEMO_NAMES.ganesh),
        name: DEMO_NAMES.ganesh,
        description: 'Any bill of ₹1,500 or more during Ganesh Utsav gets an entry slip at the counter.',
        drawType: 'physical', minBillAmount: 1500,
        assignedStores: [snapshot(stores.thane), snapshot(stores.andheri)],
        startDate, endDate, revealDate: endDate, status: 'active',
        prizeTiers: [
          prize(1, 'Gold hamper', 8000, 1, 'trophyGold'),
          prize(2, 'Silver hamper', 2000, 3, 'trophySilver'),
          prize(3, 'Bronze hamper', 1000, 6, 'trophyBronze'),
          prize(4, 'Gift voucher', 250, 8, 'voucherBlue'),
        ],
        createdAt: istDayAt(-22, '15:10', now), updatedAt: istDayAt(-2, '19:30', now),
      }),
    ]);
    const drawId = new mongoose.Types.ObjectId();
    await insertValidated(LuckyDraw, [
      { _id: drawId, campaignId: campaign._id, periodStart: startDate, drawDate: endDate, status: 'scheduled', createdAt: startDate },
    ]);
    const entries = await insertEntries(campaign._id, makeEntries({
      count: 45, from: startDate, to: new Date(endDate.getTime() - 10 * MINUTE),
      stores: [stores.thane, stores.andheri], minBill: 1500, campaignId: campaign._id, drawId, source: 'staff', addedBy: merchant._id,
    }));
    created.ganesh = { id: campaign._id, entries: entries.length };
  }

  // d) Monsoon: digital, finished ~3 weeks ago, 16 winners (11 redeemed, 5 notified).
  {
    const startDate = istDayAt(-52, '10:00', now);
    const endDate = istDayAt(-23, '21:00', now);
    const revealDate = istDayAt(-21, '19:00', now);
    const prizeTiers = [
      prize(1, 'Front-load washing machine', 15000, 1, 'washingMachine'),
      prize(2, 'Mixer grinder', 3000, 5, 'mixer'),
      prize(3, 'Gift voucher', 2000, 10, 'voucherBlue'),
    ];
    const [campaign] = await insertValidated(LuckyDrawCampaign, [
      base({
        _id: demoId(DEMO_NAMES.monsoon),
        name: DEMO_NAMES.monsoon,
        description: 'Monsoon sale lucky draw: every bill of ₹1,500 or more is an entry.',
        drawType: 'digital', minBillAmount: 1500,
        assignedStores: [snapshot(stores.andheri), snapshot(stores.bandra), snapshot(stores.thane)],
        startDate, endDate, revealDate, status: 'ended', prizeTiers,
        createdAt: istDayAt(-54, '11:30', now), updatedAt: revealDate,
      }),
    ]);
    const drawId = new mongoose.Types.ObjectId();
    const executedAt = new Date(revealDate.getTime() + 2 * MINUTE);
    const entries = await insertEntries(campaign._id, makeEntries({
      count: 60, from: startDate, to: endDate, stores: [stores.andheri, stores.bandra, stores.thane],
      minBill: 1500, campaignId: campaign._id, drawId, source: 'qr',
    }));
    await insertValidated(LuckyDraw, [
      {
        _id: drawId, campaignId: campaign._id, periodStart: startDate, drawDate: revealDate, status: 'completed',
        triggeredBy: { source: 'manual', accountId: merchant._id }, executedAt,
        randomSeed: crypto.randomBytes(8).toString('hex'),
        prizeTiersSnapshot: prizeTiers, entryCount: entries.length, winnerCount: 16,
        reveal: { revealedCount: prizeTiers.length, startedAt: executedAt, completedAt: executedAt },
        createdAt: startDate, updatedAt: executedAt,
      },
    ]);

    // 16 distinct winning entries; grand prize, 4 of 5 mixers and 6 of 10 vouchers claimed.
    const pool = [...entries];
    const chosen = [];
    while (chosen.length < 16) chosen.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    const slots = [...Array(1).fill(prizeTiers[0]), ...Array(5).fill(prizeTiers[1]), ...Array(10).fill(prizeTiers[2])];
    const redeemedSlots = new Set([0, 1, 2, 3, 4, 6, 7, 9, 10, 12, 14]);
    const codes = await uniqueClaimCodes(16);
    const expiresAt = new Date(executedAt.getTime() + CLAIM_EXPIRY_DAYS * DAY);
    const notifiedAt = new Date(executedAt.getTime() + 1 * MINUTE);
    const winners = slots.map((tier, i) => {
      const entry = chosen[i];
      const redeemed = redeemedSlots.has(i);
      const redeemedAt = redeemed ? shopTimeBetween(new Date(executedAt.getTime() + 12 * HOUR), new Date(now.getTime() - DAY)) : undefined;
      return {
        drawId, campaignId: campaign._id, merchantId: merchant._id, rank: tier.rank,
        entryId: entry._id, customerName: entry.customerName, customerPhone: entry.customerPhone, customerEmail: entry.customerEmail,
        prizeDescription: tier.prizeDescription, prizeValue: tier.prizeValue, claimCode: codes[i],
        status: redeemed ? 'redeemed' : 'notified', notifiedAt, expiresAt,
        ...(redeemed ? { redeemedAt, redeemedByAccountId: merchant._id, redeemedAtStoreId: entry.storeId } : {}),
        createdAt: executedAt, updatedAt: redeemed ? redeemedAt : notifiedAt,
      };
    });
    await insertValidated(LuckyDrawWinner, winners);
    created.monsoon = { id: campaign._id, entries: entries.length, winners };
  }

  // e) Weekend Bonanza: physical, entries open now (staff add entries at the counter during the demo).
  {
    const startDate = istDayAt(-2, '10:00', now);
    const endDate = istDayAt(3, '21:00', now);
    const revealDate = istDayAt(4, '18:00', now);
    const createdAt = istDayAt(-3, '17:45', now);
    const [campaign] = await insertValidated(LuckyDrawCampaign, [
      base({
        _id: demoId(DEMO_NAMES.weekend),
        name: DEMO_NAMES.weekend,
        description: 'Shop this weekend for a chance to win movie tickets for two.',
        drawType: 'physical', minBillAmount: 1000,
        assignedStores: [snapshot(stores.andheri), snapshot(stores.bandra)],
        startDate, endDate, revealDate, status: 'active',
        prizeTiers: [
          prize(1, 'Movie tickets for two', 1000, 1, 'movieTicket'),
          prize(2, 'Popcorn combo voucher', 300, 4, 'voucherPink'),
          prize(3, 'Cold drink voucher', 100, 6, 'voucherBlue'),
        ],
        createdAt, updatedAt: createdAt,
      }),
    ]);
    const drawId = new mongoose.Types.ObjectId();
    await insertValidated(LuckyDraw, [
      { _id: drawId, campaignId: campaign._id, periodStart: startDate, drawDate: revealDate, status: 'scheduled', createdAt },
    ]);
    const entries = await insertEntries(campaign._id, makeEntries({
      count: 12, from: startDate, to: new Date(now.getTime() - 30 * MINUTE),
      stores: [stores.andheri, stores.bandra], minBill: 1000, campaignId: campaign._id, drawId, source: 'staff', addedBy: merchant._id,
    }));
    created.weekend = { id: campaign._id, entries: entries.length };
  }

  // f) New Year: live online draft, no draw.
  {
    const year = new Date(now.getTime() + IST_MS).getUTCFullYear();
    const ist = (y, mo, d, h, mi) => new Date(Date.UTC(y, mo - 1, d, h, mi) - IST_MS);
    const createdAt = new Date(now.getTime() - 2 * HOUR);
    const [campaign] = await insertValidated(LuckyDrawCampaign, [
      base({
        _id: demoId(DEMO_NAMES.newYear),
        name: DEMO_NAMES.newYear,
        description: 'Ring in the new year: every bill of ₹1,500 or more is an entry.',
        drawType: 'live_online', minBillAmount: 1500,
        assignedStores: [snapshot(stores.andheri), snapshot(stores.bandra), snapshot(stores.thane)],
        startDate: ist(year, 12, 24, 10, 0), endDate: ist(year + 1, 1, 2, 21, 0), revealDate: ist(year + 1, 1, 4, 19, 0),
        status: 'draft',
        prizeTiers: [
          prize(1, 'Smartwatch', 6000, 1, 'giftBox'),
          prize(2, 'Gift voucher', 1500, 5, 'voucherBlue'),
          prize(3, 'Party hamper', 800, 8, 'voucherPink'),
        ],
        createdAt, updatedAt: createdAt,
      }),
    ]);
    created.newYear = { id: campaign._id };
  }

  // ── summary ────────────────────────────────────────────────────────────────
  const rows = [
    ['diwali', 'Live online draw · entries open', null],
    ['navratri', 'Digital draw · ready to reveal live, 5 prize levels', 'live'],
    ['ganesh', 'Physical draw · ready to pick winners, 4 prize levels', 'pick'],
    ['monsoon', 'Live online draw · completed', null],
    ['weekend', 'Physical draw · entries open (Add entry)', null],
    ['newYear', 'Digital draw · draft', null],
  ];
  console.log('\nDemo draws:');
  for (const [key, stage, action] of rows) {
    const id = String(created[key].id);
    console.log(`\n  ${DEMO_NAMES[key]}  [${stage}]  id ${id}`);
    console.log(`    owner page   ${BASE_URL}/lucky-draws/${id}`);
    if (action) console.log(`    ${action.padEnd(12)} ${BASE_URL}/lucky-draws/${id}/${action}`);
    console.log(`    public page  ${BASE_URL}/lucky-draw/${id}`);
    console.log(`    results page ${BASE_URL}/lucky-draw/${id}/reveal`);
  }
  const notClaimed = created.monsoon.winners.filter((w) => w.status === 'notified');
  console.log('\nMonsoon claim codes not yet redeemed (use on /lucky-draws/redeem):');
  for (const w of notClaimed) console.log(`    ${w.claimCode}  ${w.prizeDescription}  ${w.customerName}`);
  console.log(`\nLog in as ${MERCHANT_EMAIL} (log out and back in if you were already signed in).`);
}

main()
  .then(() => mongoose.disconnect())
  .catch(async (error) => {
    console.error('✗', error.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
