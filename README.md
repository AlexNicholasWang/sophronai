# Sophron

Sophron is an **environment compiler and execution boundary for autonomous agents**.

The core premise is simple: an agent should not act in an environment it has not first understood.

Instead of asking a model to reason from user-written context, Sophron observes the environment itself, compiles a versioned world state, exposes affordances/invariants/hazards/unknowns, and only then lets a downstream agent plan an action.

## Current MVP

The first environment adapter is GitHub repositories.

```
GitHub repository
      ↓
deterministic observer
      ↓
selected repository evidence
      ↓
versioned environment model
      ↓
freshness check before every action
      ↓
environment-grounded execution contract
```

The current product contains:

- `index.html` — public landing page.
- `app.html` — interactive environment-compiler MVP.
- `api/understand.js` — observes a repository and compiles an environment model.
- `api/evaluate.js` — re-observes the environment, checks freshness, and creates a grounded action contract.
- `lib/repo-observer.js` — deterministic GitHub repository observer.
- `lib/environment-schema.js` — structured environment/action contracts.
- `lib/openai.js` — shared structured model client.
- `docs/PRODUCT_THESIS.md` — the product boundary and differentiation.
- `assets/` — Sophron brand assets.

## What "understand the environment" means

For a repository, Sophron first computes facts that do not depend on an LLM:

- repository identity and branch;
- immutable commit SHA plus tree SHA;
- file count and source/test/docs/config/CI surfaces;
- dominant languages;
- package managers and selected framework/command signals;
- a ranked evidence set of manifests, docs, workflows, tests, config, and likely entry points.

Only after observation does a model compile those facts and file evidence into a semantic environment contract:

- architecture;
- agent affordances;
- invariants;
- hazards;
- unknowns and next probes;
- execution rules;
- evidence-backed observations.

Repository content is treated as untrusted data so prompt-like instructions inside a repo cannot redefine the compiler's role.

## Freshness is a product primitive

An environment model is tied to a repository snapshot.

Before Sophron produces an action plan, it resolves the repository to an immutable commit and observes it again. If the current commit SHA differs from the compiled snapshot, the request fails with `ENVIRONMENT_STALE` and the environment must be rebuilt. Evidence files are also read by that exact commit SHA, so structure and file contents cannot come from different repository moments.

That prevents an agent from planning against a world that no longer exists.

## Action flow

1. Compile the environment.
2. Give the agent a goal and proposed action.
3. Run safety/admissibility checks.
4. Re-observe the environment.
5. Reject stale environment models.
6. Compare the action with the compiled invariants, hazards, affordances, and user constraints.
7. Produce a grounded execution contract containing:
   - evidence used;
   - affected areas;
   - missing evidence;
   - preconditions;
   - concrete execution steps;
   - verification for every step;
   - bounded predicted effects;
   - safeguards;
   - approve / modify / block verdict.

The current web MVP stops at the execution contract. Repository mutation is intentionally not performed without an authorized execution runtime. The intended production integration is a GitHub App or sandboxed agent runtime that executes only after Sophron clears and grounds the action, then reports verification and observed outcomes back to Sophron.

## Why this is not a ChatGPT wrapper

The frontier model is one component in a larger control loop.

The product also contains:

- an environment-specific observer;
- deterministic state extraction;
- evidence selection;
- a versioned environment contract;
- freshness enforcement;
- hard safety boundaries;
- explicit uncertainty;
- verification requirements.

The long-term value is the trajectory created when the system records:

```
observed state
→ compiled environment model
→ proposed action
→ predicted effects
→ execution
→ verification
→ actual outcome
```

Those trajectories are what can eventually support learned environment dynamics and calibrated world models.

## API

### `POST /api/understand`

Request:

```json
{
  "repoUrl": "https://github.com/AlexNicholasWang/sophronai"
}
```

Returns a `sophron.environment.v1` contract containing the deterministic snapshot, structural scan, semantic environment model, and evidence index.

### `POST /api/evaluate`

Request:

```json
{
  "goal": "Improve reliability of the contact flow.",
  "action": "Remove the stale contact-form JavaScript without changing the embedded Google Form.",
  "constraints": "Prefer a minimal reversible change.",
  "environment": {
    "...": "the environment returned by /api/understand"
  }
}
```

The endpoint re-observes the repository before producing an action contract.

## Environment variables

Required:

```
OPENAI_API_KEY=...
```

Optional:

```
SOPHRON_ENV_MODEL=gpt-6-luna
SOPHRON_ACTION_MODEL=gpt-6-luna
SOPHRON_MODEL=gpt-6-luna
GITHUB_TOKEN=...
```

Environment compilation and action planning default to `gpt-6-luna` in the current MVP. `SOPHRON_ENV_MODEL` and `SOPHRON_ACTION_MODEL` can override the two workloads independently; `SOPHRON_MODEL` is the shared fallback.

`GITHUB_TOKEN` is optional for public repositories. Adding one increases GitHub REST API limits and will be important before meaningful production traffic and private-repository support.

Never put API credentials in browser code.

## Run locally

With the Vercel CLI:

```bash
vercel dev
```

Then open `/app.html`.

## Product direction

The repository adapter is intentionally the first wedge, not the whole company.

The stable abstraction is the **environment contract**. Future adapters can observe sandboxes, browsers, SaaS tools, cloud infrastructure, document sets, and internal systems while downstream agents consume the same state/action interface.

See [docs/PRODUCT_THESIS.md](docs/PRODUCT_THESIS.md) for the product quality bar and the features we explicitly should not build.
