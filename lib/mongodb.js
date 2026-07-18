// lib/mongodb.js
// Reusable MongoDB connection, cached so repeated serverless invocations
// on Vercel reuse the same connection instead of opening a new one per request.
//
// ── Setup ──────────────────────────────────────────────────────
// 1. Create a free cluster at https://www.mongodb.com/cloud/atlas
// 2. Database Access → add a user with a password
// 3. Network Access → allow access from anywhere (0.0.0.0/0) so Vercel can connect
// 4. Connect → Drivers → copy the connection string
// 5. Set it as the MONGODB_URI environment variable (see .env.example)

import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "habits_survey";

if (!uri) {
  throw new Error(
    "Missing MONGODB_URI environment variable. Set it in your .env file locally, " +
    "or under Vercel → Project → Settings → Environment Variables."
  );
}

// In serverless environments the module scope can be reused between
// invocations of the same warm instance, so cache the promise on the
// global object to avoid opening a new connection every call.
let clientPromise = globalThis._mongoClientPromise;

if (!clientPromise) {
  const client = new MongoClient(uri);
  clientPromise = client.connect();
  globalThis._mongoClientPromise = clientPromise;
}

export async function getDb() {
  const client = await clientPromise;
  return client.db(dbName);
}
