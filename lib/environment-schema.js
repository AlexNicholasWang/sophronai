const environmentSemanticSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 100 },
    architecture: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        properties: {
          component: { type: "string" },
          responsibility: { type: "string" },
          paths: { type: "array", items: { type: "string" }, maxItems: 8 },
          dependsOn: { type: "array", items: { type: "string" }, maxItems: 8 }
        },
        required: ["component", "responsibility", "paths", "dependsOn"],
        additionalProperties: false
      }
    },
    affordances: {
      type: "array",
      maxItems: 10,
      items: {
        type: "object",
        properties: {
          action: { type: "string" },
          scope: { type: "string" },
          preconditions: { type: "array", items: { type: "string" }, maxItems: 6 },
          evidence: { type: "array", items: { type: "string" }, maxItems: 8 },
          risk: { type: "string", enum: ["low", "medium", "high"] }
        },
        required: ["action", "scope", "preconditions", "evidence", "risk"],
        additionalProperties: false
      }
    },
    invariants: {
      type: "array",
      maxItems: 10,
      items: {
        type: "object",
        properties: {
          rule: { type: "string" },
          why: { type: "string" },
          evidence: { type: "array", items: { type: "string" }, maxItems: 8 },
          strength: { type: "string", enum: ["observed", "inferred"] }
        },
        required: ["rule", "why", "evidence", "strength"],
        additionalProperties: false
      }
    },
    hazards: {
      type: "array",
      maxItems: 10,
      items: {
        type: "object",
        properties: {
          hazard: { type: "string" },
          impact: { type: "string" },
          evidence: { type: "array", items: { type: "string" }, maxItems: 8 },
          severity: { type: "string", enum: ["low", "medium", "high", "critical"] }
        },
        required: ["hazard", "impact", "evidence", "severity"],
        additionalProperties: false
      }
    },
    unknowns: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          whyItMatters: { type: "string" },
          probe: { type: "string" }
        },
        required: ["question", "whyItMatters", "probe"],
        additionalProperties: false
      }
    },
    executionContract: {
      type: "object",
      properties: {
        beforeWrite: { type: "array", items: { type: "string" }, maxItems: 8 },
        verifyAfter: { type: "array", items: { type: "string" }, maxItems: 8 },
        protectedAreas: { type: "array", items: { type: "string" }, maxItems: 8 },
        preferredChangeStyle: { type: "array", items: { type: "string" }, maxItems: 8 }
      },
      required: ["beforeWrite", "verifyAfter", "protectedAreas", "preferredChangeStyle"],
      additionalProperties: false
    },
    observations: {
      type: "array",
      maxItems: 12,
      items: {
        type: "object",
        properties: {
          fact: { type: "string" },
          evidence: { type: "array", items: { type: "string" }, maxItems: 8 },
          confidence: { type: "string", enum: ["low", "medium", "high"] }
        },
        required: ["fact", "evidence", "confidence"],
        additionalProperties: false
      }
    }
  },
  required: [
    "summary",
    "confidence",
    "architecture",
    "affordances",
    "invariants",
    "hazards",
    "unknowns",
    "executionContract",
    "observations"
  ],
  additionalProperties: false
};

const actionEvaluationSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    verdict: { type: "string", enum: ["approve", "modify", "block"] },
    confidence: { type: "number", minimum: 0, maximum: 100 },
    overallRisk: { type: "number", minimum: 0, maximum: 100 },
    environmentGrounding: {
      type: "object",
      properties: {
        snapshot: { type: "string" },
        evidenceUsed: {
          type: "array",
          maxItems: 10,
          items: {
            type: "object",
            properties: {
              path: { type: "string" },
              why: { type: "string" }
            },
            required: ["path", "why"],
            additionalProperties: false
          }
        },
        affectedAreas: { type: "array", items: { type: "string" }, maxItems: 10 },
        missingEvidence: { type: "array", items: { type: "string" }, maxItems: 8 }
      },
      required: ["snapshot", "evidenceUsed", "affectedAreas", "missingEvidence"],
      additionalProperties: false
    },
    admissibility: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["pass", "review", "deny"] },
        rationale: { type: "string" },
        categories: { type: "array", items: { type: "string" }, maxItems: 8 }
      },
      required: ["status", "rationale", "categories"],
      additionalProperties: false
    },
    constraintChecks: {
      type: "array",
      maxItems: 10,
      items: {
        type: "object",
        properties: {
          constraint: { type: "string" },
          status: { type: "string", enum: ["satisfied", "violated", "uncertain"] },
          explanation: { type: "string" }
        },
        required: ["constraint", "status", "explanation"],
        additionalProperties: false
      }
    },
    preconditions: { type: "array", items: { type: "string" }, maxItems: 10 },
    executionPlan: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        properties: {
          step: { type: "integer", minimum: 1, maximum: 8 },
          action: { type: "string" },
          target: { type: "string" },
          reason: { type: "string" },
          verification: { type: "string" },
          reversible: { type: "boolean" }
        },
        required: ["step", "action", "target", "reason", "verification", "reversible"],
        additionalProperties: false
      }
    },
    predictedEffects: {
      type: "array",
      maxItems: 7,
      items: {
        type: "object",
        properties: {
          order: { type: "integer", minimum: 1, maximum: 3 },
          outcome: { type: "string" },
          likelihood: { type: "string", enum: ["low", "medium", "high"] },
          impact: { type: "string", enum: ["low", "medium", "high", "critical"] },
          rationale: { type: "string" }
        },
        required: ["order", "outcome", "likelihood", "impact", "rationale"],
        additionalProperties: false
      }
    },
    safeguards: { type: "array", items: { type: "string" }, maxItems: 8 },
    revisedAction: { type: "string" },
    stopReason: { type: "string" }
  },
  required: [
    "summary",
    "verdict",
    "confidence",
    "overallRisk",
    "environmentGrounding",
    "admissibility",
    "constraintChecks",
    "preconditions",
    "executionPlan",
    "predictedEffects",
    "safeguards",
    "revisedAction",
    "stopReason"
  ],
  additionalProperties: false
};

module.exports = {
  environmentSemanticSchema,
  actionEvaluationSchema
};
