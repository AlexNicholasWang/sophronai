# Sophron Product Thesis

## The product

Sophron is an **environment compiler and execution boundary for autonomous agents**.

An agent should not begin from a prompt plus a bag of tools. Before it acts, Sophron observes the environment, builds a versioned model of what exists, what can be changed, what must remain true, what is dangerous, and what is still unknown. Downstream agents then plan and execute against that model.

```
environment
    ↓
observer / adapter
    ↓
versioned environment model
    ├── observations
    ├── architecture
    ├── affordances
    ├── invariants
    ├── hazards
    ├── unknowns
    └── execution contract
    ↓
agent proposes action
    ↓
freshness + admissibility + impact check
    ↓
grounded execution plan
    ↓
tool / agent execution
    ↓
verification + observed outcome
    ↺
```

## Why this is not another codebase-context product

Repository indexing, semantic search, and code graphs are useful, but they are already a crowded category. Sophron should use those techniques where helpful, not make them the product.

The differentiated primitive is the **environment contract**:

1. **Versioned state** — every model is tied to an observed snapshot.
2. **Affordances** — what actions are available in this environment and under what preconditions.
3. **Invariants** — what must remain true while an agent changes the environment.
4. **Hazards** — environment-specific failure surfaces and blast radius.
5. **Unknowns** — missing evidence is explicit and paired with the next probe.
6. **Freshness** — an action cannot proceed against a stale environment model.
7. **Verification** — every action contract includes a way to check what happened.
8. **Outcome feedback** — later versions compare predicted effects with observed outcomes.

A context engine answers: **"What code is relevant?"**

Sophron should answer: **"What world am I in, what can I safely do here, what must stay true, and how will I know whether my action worked?"**

## First adapter: GitHub repositories

Repositories are a strong first environment because they have observable state, clear actions, native verification mechanisms, and meaningful invariants.

The first adapter deliberately does real observation before model reasoning:

- fetch repository metadata and a recursive tree;
- compute structural facts deterministically;
- identify high-signal manifests, docs, CI, tests, config, and likely entry points;
- read selected evidence;
- compile a semantic environment model grounded in named paths;
- snapshot the repository;
- re-observe before action planning;
- refuse to plan if the snapshot changed.

This is a wedge, not the final ontology.

## Next adapters

The environment contract should remain stable while observation changes.

Likely adapters:

- filesystem / sandbox;
- browser application;
- SaaS workspace via APIs/MCP;
- cloud infrastructure;
- data room / document collection;
- internal enterprise systems.

Do not build all of these before the repository loop works.

## What we should not build

- A generic chatbot that asks an LLM to imagine consequences from user-provided prose.
- A thin wrapper around a frontier model.
- A competing IDE or coding agent.
- A universal simulator that claims to model arbitrary real-world dynamics.
- A code search product whose differentiation is embeddings or a graph alone.
- An execution layer that silently acts when the environment model is stale or uncertain.

## Moat

The long-term moat is not the prompt used to compile the environment.

It is the data and infrastructure created by repeated environment-grounded action:

```
observed state
→ compiled environment model
→ proposed action
→ predicted affected areas / effects
→ execution
→ verification
→ actual outcome
```

Those trajectories can support:

- calibration of uncertainty;
- learned change-impact models;
- environment-specific dynamics;
- better probes before execution;
- reusable invariants and policies;
- benchmarks for whether an agent actually understood an environment before acting.

## Product quality bar

A Sophron result is useful only if it passes these checks:

- **specificity:** it names evidence from the actual environment;
- **freshness:** it is based on the current snapshot;
- **constraint fidelity:** it respects explicit and inferred invariants;
- **epistemic honesty:** it surfaces missing evidence instead of guessing;
- **actionability:** it gives the downstream agent concrete next steps;
- **verification:** it defines how to test the action;
- **portability:** the environment contract can be consumed by different agents/models.

If we cannot outperform a normal coding agent on those dimensions, the feature is not worth shipping.
