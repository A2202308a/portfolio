# AI Support Assistant — embeddable widget

A drop-in support chat widget that answers customer questions from **your own docs**, cites its source, and hands off to a human when it isn't confident. One `<script>` tag on any site. Built on the OpenAI-compatible chat API, so you can point it at OpenAI, Anthropic, or a cheaper endpoint without touching the code.

**▶ Live demo:** _[deploy this folder to GitHub Pages / Vercel and put the link here]_

## Why it's built this way

- **Grounded, not hallucinating.** Answers come from a knowledge base you control (your help docs, FAQ, product copy) via retrieval, so the bot doesn't make things up.
- **Cites its source.** Every answer shows which doc it came from — builds trust and makes wrong answers easy to catch.
- **Knows when to hand off.** Low-confidence questions route to a human/ticket instead of guessing.
- **Provider-agnostic.** The generation call is the standard OpenAI chat format. Swap `baseURL` + `apiKey` to run it on whatever LLM is cheapest for you.

## The demo vs. production

This repo runs in **demo mode**: a small local knowledge base + keyword retrieval, zero backend, zero API key — so you can click it immediately. The UX (retrieve → grounded answer → cite source → human handoff) is exactly the production flow. To go live you swap the local lookup for two calls:

```js
// 1) retrieve the most relevant chunks of YOUR docs for the question
const context = await retrieve(userQuestion);   // vector search over your docs

// 2) generate a grounded answer — standard OpenAI-compatible call
import OpenAI from "openai";
const client = new OpenAI({
  baseURL: process.env.LLM_BASE_URL,   // OpenAI, Anthropic, or a cheaper endpoint
  apiKey:  process.env.LLM_API_KEY,
});

const res = await client.chat.completions.create({
  model: process.env.LLM_MODEL,
  messages: [
    { role: "system", content:
      "You are a support assistant. Answer ONLY from the context below. " +
      "If the answer isn't in it, say you're not sure and offer a human handoff. " +
      "Cite the source title." },
    { role: "user", content: `Context:\n${context}\n\nQuestion: ${userQuestion}` },
  ],
});
```

The API key lives on a small server endpoint, never in the browser.

## What you get

- Embeddable widget (launcher + panel), responsive, light/dark, keyboard-accessible
- Source citations + human-handoff fallback
- Suggested-question chips to guide first-time users
- Your branding (colors, name, avatar) via a few CSS variables

## Deploy

Static — host the folder anywhere (GitHub Pages, Vercel, Netlify, Cloudflare Pages). For the live LLM version, add one serverless function that holds the API key and does retrieve + generate.

---

_Built by **Async** — I build AI integrations & automation for SaaS teams. Need this wired to your docs and live in a few days? 17625389909@163.com_
