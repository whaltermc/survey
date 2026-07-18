// lib/auth.js
// A minimal signed-cookie session, standing in for Firebase Auth.
// There's only one admin, so this checks a single shared password
// (ADMIN_PASSWORD) and issues an HttpOnly cookie signed with SESSION_SECRET.
// No extra dependencies — just Node's built-in crypto module.

import crypto from "crypto";

const COOKIE_NAME = "admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "Missing SESSION_SECRET environment variable. Set it to any long random string " +
      "(see .env.example)."
    );
  }
  return secret;
}

function sign(value) {
  const hmac = crypto.createHmac("sha256", getSecret()).update(value).digest("hex");
  return `${value}.${hmac}`;
}

function verify(signedValue) {
  if (!signedValue) return null;
  const lastDot = signedValue.lastIndexOf(".");
  if (lastDot < 0) return null;
  const value = signedValue.slice(0, lastDot);
  const sig = signedValue.slice(lastDot + 1);
  const expectedSig = crypto.createHmac("sha256", getSecret()).update(value).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return value;
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  const out = {};
  header.split(";").forEach(pair => {
    const idx = pair.indexOf("=");
    if (idx < 0) return;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  });
  return out;
}

// Cookie flags: HttpOnly (not readable from JS), Secure (HTTPS only — fine on
// Vercel, but if testing over plain http locally you may need to drop this),
// SameSite=Strict since the admin page and API live on the same origin.
export function createSessionCookie() {
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000;
  const signed = sign(`admin.${expiresAt}`);
  return `${COOKIE_NAME}=${encodeURIComponent(signed)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${MAX_AGE_SECONDS}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

export function isAuthenticated(req) {
  const cookies = parseCookies(req);
  const value = verify(cookies[COOKIE_NAME]);
  if (!value) return false;
  const expiresAt = Number(value.split(".")[1]);
  return Number.isFinite(expiresAt) && Date.now() < expiresAt;
}
