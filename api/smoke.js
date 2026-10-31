const understand = require("./understand");
const evaluate = require("./evaluate");

async function invoke(handler, body) {
  let statusCode = 200;
  let payload = null;
  const req = { method: "POST", body };
  const res = {
    setHeader() {},
    status(code) { statusCode = code; return this; },
    json(value) { payload = value; return value; }
  };
  await handler(req, res);
  return { statusCode, payload };
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const compiled = await invoke(understand, {
    repoUrl: "https://github.com/AlexNicholasWang/sophronai"
  });

  if (compiled.statusCode !== 200 || !compiled.payload?.environment) {
    return res.status(500).json({
      ok: false,
      stage: "understand",
      statusCode: compiled.statusCode,
      error: compiled.payload?.error,
      code: compiled.payload?.code
    });
  }

  const environment = compiled.payload.environment;
  const evaluated = await invoke(evaluate, {
    goal: "Ensure the landing page contact integration does not crash later JavaScript.",
    action: "Delete the old document.getElementById(\"f\").addEventListener contact-form submit handler from index.html.",
    constraints: "Do not change the Google Form embed. Do not make unrelated UI changes.",
    environment
  });

  const e = evaluated.payload?.evaluation;

  return res.status(evaluated.statusCode === 200 ? 200 : 500).json({
    ok: evaluated.statusCode === 200,
    environment: {
      id: environment.environmentId,
      snapshot: environment.snapshot.sha,
      filesObserved: environment.structural.totalFiles,
      evidence: environment.evidence.map((x) => x.path),
      summary: environment.semantic.summary,
      architecture: environment.semantic.architecture.map((x) => ({
        component: x.component,
        paths: x.paths
      })),
      invariants: environment.semantic.invariants.slice(0, 5)
    },
    source: evaluated.payload?.source,
    groundingProbe: evaluated.payload?.groundingProbe,
    action: e ? {
      verdict: e.verdict,
      summary: e.summary,
      evidenceUsed: e.environmentGrounding.evidenceUsed,
      missingEvidence: e.environmentGrounding.missingEvidence,
      plan: e.executionPlan,
      revisedAction: e.revisedAction
    } : {
      statusCode: evaluated.statusCode,
      error: evaluated.payload?.error,
      code: evaluated.payload?.code
    }
  });
};
