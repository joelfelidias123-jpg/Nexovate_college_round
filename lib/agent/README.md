# Nexus P3 (AI Agent + Security)
- `tools.ts`: Frozen TOOL_REGISTRY contract (P2 & P4)
- `schemas.ts`: Zod validation + per-step param check
- `fallbackPlans.ts`: Hardcoded safety net for the 3 rehearsed demo prompts
- `llmPlanner.ts`: Provider-agnostic LLM call (3s timeout -> fallback)
- `security.ts`: Role gate (assertCanApprove) + prompt/PII/rate-limit/replay guards
- `orchestrator.ts` & `executor.ts`: Sequential step runner + audit logging

## How to Run
1. Set `USE_MOCKS=true` (and optional `GEMINI_API_KEY`) in `.env.local`
2. Run `npm install zod` and `npm run dev`
3. Open `http://localhost:3000/agent`
