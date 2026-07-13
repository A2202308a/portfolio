#!/usr/bin/env node
/**
 * AI Change Watcher — portfolio automation demo.
 *
 * Watches any set of web pages, and when one changes, uses an LLM to write a
 * one-line plain-English summary of WHAT changed (not just "it changed"), then
 * pushes it to Slack / Discord / email.
 *
 * This is the shape of a very common paid gig: "monitor X and tell me when
 * something meaningful happens." Competitor price pages, a supplier's stock
 * page, a government/regulatory page, a job board, a changelog.
 *
 * Runs with zero setup in DEMO mode (no keys, no network) so a client can see
 * it work. Flip the env vars to make it real.
 *
 *   node watch.mjs            # demo mode: simulated pages + simulated LLM
 *   LLM_API_KEY=... node watch.mjs   # real: fetch pages + real LLM summary
 *
 * Env:
 *   LLM_BASE_URL   OpenAI-compatible endpoint (default https://api.openai.com/v1)
 *   LLM_API_KEY    your key (absent -> demo mode)
 *   LLM_MODEL      model id (default gpt-4o-mini)
 *   SLACK_WEBHOOK  optional; if set, changes are posted here
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";

const DEMO = !process.env.LLM_API_KEY;
const STATE_DIR = ".watcher";
const STATE = `${STATE_DIR}/state.json`;

// --- what to watch. In a real gig these come from a config the client edits. ---
const TARGETS = [
  { name: "Acme pricing",  url: "https://example.com/pricing" },
  { name: "Supplier stock", url: "https://example.com/product/x" },
];

// ---------------------------------------------------------------- fetch page text
async function getText(url, prevForDemo) {
  if (DEMO) return demoPage(url, prevForDemo);
  const res = await fetch(url, { headers: { "user-agent": "change-watcher/1.0" } });
  const html = await res.text();
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8000);
}

// -------------------------------------------------------------- summarize a diff
async function summarize(name, before, after) {
  if (DEMO) return demoSummary(name);
  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({
    baseURL: process.env.LLM_BASE_URL || "https://api.openai.com/v1",
    apiKey: process.env.LLM_API_KEY,
  });
  const res = await client.chat.completions.create({
    model: process.env.LLM_MODEL || "gpt-4o-mini",
    messages: [
      { role: "system", content:
        "You monitor web pages. Given the BEFORE and AFTER text of a page, reply with ONE short sentence stating exactly what meaningfully changed (a price, a number, a status, added/removed text). If nothing meaningful changed, reply exactly 'no meaningful change'." },
      { role: "user", content: `PAGE: ${name}\n\nBEFORE:\n${before}\n\nAFTER:\n${after}` },
    ],
    temperature: 0,
  });
  return res.choices[0].message.content.trim();
}

// --------------------------------------------------------------------- notify
async function notify(name, url, summary) {
  const line = `🔔 *${name}* changed — ${summary}\n${url}`;
  console.log("\n" + line + "\n");
  if (process.env.SLACK_WEBHOOK) {
    await fetch(process.env.SLACK_WEBHOOK, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: line }),
    });
  }
}

// ------------------------------------------------------------------------ main
async function main() {
  if (!existsSync(STATE_DIR)) await mkdir(STATE_DIR, { recursive: true });
  const state = existsSync(STATE) ? JSON.parse(await readFile(STATE, "utf8")) : {};

  console.log(`AI Change Watcher — ${DEMO ? "DEMO mode (simulated pages + LLM)" : "LIVE"}`);
  console.log(`Watching ${TARGETS.length} page(s)…\n`);

  for (const t of TARGETS) {
    const prev = state[t.url];
    const text = await getText(t.url, prev);
    const hash = createHash("sha1").update(text).digest("hex");

    if (!prev) {
      console.log(`· ${t.name}: first check, baseline saved.`);
    } else if (prev.hash !== hash) {
      const summary = await summarize(t.name, prev.text || "", text);
      if (!/^no meaningful change/i.test(summary)) {
        await notify(t.name, t.url, summary);
      } else {
        console.log(`· ${t.name}: changed, but nothing meaningful.`);
      }
    } else {
      console.log(`· ${t.name}: no change.`);
    }
    state[t.url] = { hash, text };
  }

  await writeFile(STATE, JSON.stringify(state, null, 2));
  console.log("\nDone. Schedule this on cron / GitHub Actions to run every N minutes.");
}

// ------------------------------------------------------- demo stand-ins (no net)
function demoPage(url, prev) {
  // First run returns a baseline; second run (state exists) returns a changed page.
  const changed = prev != null;
  if (url.endsWith("/pricing"))
    return changed ? "Acme Pro plan $49 per month. Free trial 7 days."
                   : "Acme Pro plan $39 per month. Free trial 14 days.";
  return changed ? "Widget X — Out of stock." : "Widget X — In stock, ships in 2 days.";
}
function demoSummary(name) {
  return name === "Acme pricing"
    ? "Pro went from $39 to $49/mo and the trial dropped from 14 to 7 days."
    : "Widget X went from in-stock (ships in 2 days) to out of stock.";
}

main().catch((e) => { console.error(e); process.exit(1); });
