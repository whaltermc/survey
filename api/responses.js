// api/responses.js
// Replaces: getDocs(query(collection(db, "responses"), orderBy("createdAt", "desc")))
// Gated the same way the old Firestore rule required sign-in for reads:
// "allow read: if request.auth != null"

import { getDb } from "../lib/mongodb.js";
import { isAuthenticated } from "../lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!isAuthenticated(req)) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  try {
    const db = await getDb();
    const responses = await db.collection("responses")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    res.status(200).json({ responses });
  } catch (err) {
    console.error("responses error:", err);
    res.status(500).json({ error: "Could not load responses" });
  }
}
