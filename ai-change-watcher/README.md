# AI Change Watcher

Watches any set of web pages and, when one changes, uses an LLM to tell you **what actually changed in plain English** — then pushes it to Slack, Discord, or email. Not "the page changed," but "Pro went from $39 to $49/mo and the trial dropped from 14 to 7 days."

This is the shape of a very common paid automation gig: *"monitor X and ping me when something meaningful happens."* Competitor price pages, a supplier's stock page, a regulatory/gov page, a changelog, a job board.

## Try it in 10 seconds (no setup, no API key)

```bash
node watch.mjs        # first run: saves a baseline
node watch.mjs        # second run: detects the change and summarizes it
```

Demo mode uses simulated pages and a simulated LLM so it runs with zero config. Output:

```
🔔 Acme pricing changed — Pro went from $39 to $49/mo and the trial dropped from 14 to 7 days.
🔔 Supplier stock changed — Widget X went from in-stock (ships in 2 days) to out of stock.
```

## Make it real

Set the env vars and it fetches live pages and calls a real LLM:

```bash
LLM_API_KEY=sk-...              \
LLM_BASE_URL=https://api.openai.com/v1  \   # or Anthropic / a cheaper OpenAI-compatible endpoint
LLM_MODEL=gpt-4o-mini           \
SLACK_WEBHOOK=https://hooks.slack.com/...   \
node watch.mjs
```

Then schedule it on cron or GitHub Actions to run every N minutes. Edit the `TARGETS` array (in production this is a config the client controls).

## How it works

1. Fetch each page, strip HTML to text.
2. Hash it; compare to last run's hash.
3. On change, send BEFORE + AFTER to an LLM with a strict prompt: *one sentence on what meaningfully changed, or "no meaningful change."*
4. Only meaningful changes trigger a notification — no noise from a reordered footer.

Provider-agnostic: the LLM call is the standard OpenAI chat format, so it runs on OpenAI, Anthropic, or whatever endpoint is cheapest.

## Why it's built this way

- **Signal, not noise.** Naive change detection screams every time a timestamp moves. Summarizing the diff with an LLM + a "no meaningful change" escape hatch means you only get pinged when it matters.
- **Cheap to run.** Only calls the LLM when the hash changed, and only sends a short diff.
- **Deployable anywhere.** One file, no database — state is a small JSON file.

---

_Built by **Async** — AI integrations & automation for SaaS and small teams. Need a monitor like this wired to your pages and your Slack? 17625389909@163.com_
