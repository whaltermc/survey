// api/submit-response.js
// Replaces: addDoc(collection(db, "responses"), {...}) from the old Firebase version.
// Anyone can POST here (same as the old Firestore rule "allow create: if true").

import { getDb } from "../lib/mongodb.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const data = req.body;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  try {
    const db = await getDb();
    await db.collection("responses").insertOne({
      ...data,
      createdAt: new Date()
    });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("submit-response error:", err);
    res.status(500).json({ error: "Could not save response" });
  }
}
