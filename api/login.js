// api/login.js
// Replaces: signInWithEmailAndPassword(auth, ADMIN_EMAIL, password)
// There's one admin, so this just checks the password against an env var
// and hands back a signed cookie instead of a Firebase ID token.

import { createSessionCookie } from "../lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { password } = req.body || {};
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error("ADMIN_PASSWORD environment variable is not set");
    res.status(500).json({ error: "Server not configured" });
    return;
  }

  if (!password || password !== adminPassword) {
    res.status(401).json({ error: "Incorrect password" });
    return;
  }

  res.setHeader("Set-Cookie", createSessionCookie());
  res.status(200).json({ ok: true });
}
