/* POST /api/ask — the AI console's answer endpoint.
 *
 * The console has always answered from the knowledge base in data.js by
 * keyword lookup. This lets it answer questions the keywords miss, in its own
 * words, without inventing facts: the knowledge base goes in as the system
 * prompt and the model is told to stay inside it.
 *
 * Two things are deliberate:
 *
 * 1. data.js is loaded here, not copied. It is the same file the browser
 *    loads — a second copy of the knowledge base would be stale the day
 *    someone edits one of them. It is an IIFE that assigns to `window`, so a
 *    window stub is all it takes.
 *
 * 2. Every failure path answers 200 with `{ fallback: true }` rather than an
 *    error status. The client then falls back to the local lookup, which
 *    already answers every question the site was built to answer. A visitor
 *    sees a working console, not a broken one — whether the key is missing,
 *    the budget is spent, or Anthropic is down.
 */
const Anthropic = require("@anthropic-ai/sdk");

// data.js expects a browser. A bare object is enough for it to attach to.
if (typeof global.window === "undefined") global.window = {};
require("../data.js");
const MCD = global.window.MCD || {};

const MODEL = "claude-haiku-4-5";
const MAX_TOKENS = 400;          // an answer in the console is a paragraph, not an essay
const MAX_QUESTION = 500;        // characters accepted from the client

/* A bucket per IP, in the instance's memory.
 *
 * This is a brake, not a wall: Vercel may run several instances, and each has
 * its own map, so a determined caller gets a multiple of the limit. The wall
 * is the spend limit configured in the Anthropic console — provider-enforced,
 * and the only ceiling that cannot be worked around. What this buys is that
 * one script cannot burn a month's budget in an afternoon and leave the
 * console dead for everyone else.
 */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 8;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const seen = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  // The map would otherwise grow for the life of the instance.
  if (hits.size > 5000) hits.clear();
  if (seen.length >= MAX_PER_WINDOW) {
    hits.set(ip, seen);
    return true;
  }
  seen.push(now);
  hits.set(ip, seen);
  return false;
}

function systemPrompt() {
  const kb = (MCD.KB || [])
    .map((e) => "- " + String(e.a).replace(/<[^>]+>/g, "").replace(/\s+/g, " "))
    .join("\n");
  const services = (MCD.SERVICES || [])
    .map((s) => "- " + s.h + ": " + String(s.p).replace(/<[^>]+>/g, ""))
    .join("\n");

  return [
    "You answer questions on the website of McCain Digital, a two-person software studio in Bavaria.",
    "",
    "Everything you know about the studio is below. Answer ONLY from it.",
    "If the answer is not in there, say so plainly in one sentence and point to info@mccain-digital.com.",
    "Never invent a price, a timeline, a client, or a case study — inventing a client reference would be a legal problem, not just a mistake.",
    "",
    "WHAT THE STUDIO DOES",
    services,
    "",
    "WHAT IS KNOWN",
    kb,
    "",
    "HOW TO WRITE",
    "Plain, adult, short. Two or three sentences is usually the whole answer.",
    "No greeting, no sign-off, no 'great question', no bullet lists unless the answer is genuinely a list.",
    "Write as 'we'. Answer in the language the question was asked in.",
    "You may use <b> for emphasis. No other markup, no markdown."
  ].join("\n");
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "POST only" });
  }

  const q = String((req.body && req.body.q) || "").trim().slice(0, MAX_QUESTION);
  if (!q) return res.status(400).json({ error: "no question" });

  if (!process.env.ANTHROPIC_API_KEY) {
    // Not an error the visitor should see: the console answers locally.
    return res.status(200).json({ fallback: true, reason: "no key configured" });
  }

  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) {
    return res.status(200).json({ fallback: true, reason: "rate limited" });
  }

  try {
    const client = new Anthropic();   // reads ANTHROPIC_API_KEY
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt(),
      messages: [{ role: "user", content: q }]
    });

    if (message.stop_reason === "refusal") {
      return res.status(200).json({ fallback: true, reason: "refusal" });
    }

    const text = (message.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    if (!text) return res.status(200).json({ fallback: true, reason: "empty" });

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ answer: text, model: MODEL });
  } catch (err) {
    // Rate limit, spend cap, outage, bad key — all the same to the visitor.
    const reason = err && err.status ? "api " + err.status : "api error";
    return res.status(200).json({ fallback: true, reason });
  }
};
