# Sophron

Sophron is a consequence layer for autonomous agents. It sits between an agent's proposed action and execution, runs a bounded causal evaluation, exposes assumptions and unknowns, and returns an **Approve / Modify / Block** decision with safeguards.

## MVP

The repository now contains:

- `index.html` — public landing page.
- `app.html` — interactive consequence-engine MVP.
- `api/evaluate.js` — Vercel serverless endpoint for model-backed evaluations.
- `assets/` — Sophron brand assets.

The MVP is deliberately bounded. It does **not** recursively simulate every possible future. It evaluates up to three causal orders and stops earlier when further speculation would not materially change the decision. Missing information is surfaced as an evidence gap instead of triggering another layer of simulation.

## Product flow

1. An agent proposes a goal and action.
2. Sophron receives environment context and constraints.
3. The evaluator surfaces material assumptions.
4. It rolls out direct, indirect, and decision-changing downstream consequences.
5. It scores risk and confidence.
6. It returns:
   - `approve`
   - `modify`
   - `block`
7. It suggests safeguards and a safer, goal-preserving revised action.

## Run locally

Because the application includes a Vercel API route, the easiest local setup is with the Vercel CLI.

```bash
vercel dev
```

Then open the local URL and navigate to `/app.html`.

The frontend contains a deterministic local evaluator, so the demo remains usable even when the model route is unavailable.

## Enable the model-backed evaluator

Add these environment variables in Vercel:

```
OPENAI_API_KEY=...
SOPHRON_MODEL=gpt-6-luna
```

`SOPHRON_MODEL` is optional; the API currently defaults to `gpt-6-luna`.

Never expose `OPENAI_API_KEY` in browser code. The key is only read by the serverless function.

## API

### `POST /api/evaluate`

Example request:

```json
{
  "goal": "Restore reliability after a production error spike.",
  "action": "Roll back the payments service across 100% of production.",
  "context": "Checkout errors rose immediately after deploy.",
  "constraints": "Prefer reversible, staged changes."
}
```

The response contains a bounded evaluation with assumptions, consequences, failure modes, unknowns, safeguards, risk, confidence, a verdict, and a revised action.

## MVP thesis

The first product wedge is not a universal world simulator. It is a **decision preflight layer** for consequential agent actions.

That gives Sophron a concrete interface:

```
agent proposal
      ↓
Sophron consequence check
      ↓
approve / modify / block
      ↓
execution layer
```

The long-term system can add environment-specific models, live telemetry, learned dynamics, historical outcome calibration, and domain-specific evaluators without changing that interface.
