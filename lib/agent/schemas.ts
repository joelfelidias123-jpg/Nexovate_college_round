# Nexus P3 (AI Agent + Security) — Module README

This directory (`lib/agent/`) implements Person 3's **AI Workflow Planner, Two-Layer Zod Validator, Hardcoded Demo Fallback, Security & Privacy Gate, Mockable Tool Clients, Sequential Executor, and Audit Logger** per the Nexus Hackathon Context Handoff Document.

---

## 1. File Structure

```text
lib/agent/
  ├── tools.ts          # Frozen TOOL_REGISTRY whitelist (contract with P1/P2/P4)
  ├── schemas.ts        # Two-layer validation: Zod structure + per-tool required params
  ├── fallbackPlans.ts  # Pre-computed plans for the 3 rehearsed demo prompts
  ├── llmPlanner.ts     # Single provider-agnostic LLM adapter (3s timeout -> fallback)
  ├── db.ts             # Isolated data-access layer (swap in P1's Supabase client)
  ├── audit.ts          # Audit logger for all plans, tool calls, approvals & denials
  ├── security.ts       # Role gate (assertCanApprove) + Prompt/PII/Rate-Limit/Replay guards
  ├── toolClients.ts    # Mockable P2/P4 HTTP bridge (controlled via USE_MOCKS)
  ├── executor.ts       # Sequential step runner with placeholder resolution & error isolation
  └── orchestrator.ts   # Ties submitPrompt, approveRun, and rejectRun together

app/api/agent/
  ├── prompt/route.ts   # POST /api/agent/prompt (and GET /api/agent/prompt for run history)
  ├── approve/route.ts  # POST /api/agent/approve
  ├── reject/route.ts   # POST /api/agent/reject
  ├── run/[id]/route.ts # GET  /api/agent/run/:id
  └── audit/route.ts    # GET  /api/agent/audit

app/agent/
  └── page.tsx          # Agent Screen React UI (Prompt box, Timeline, Approval Gate, Audit Tab)
```

---

## 2. Environment Variables (`.env.local`)

```env
# Optional: Gemini free-tier API key (or generic LLM_API_URL + LLM_API_KEY)
# If omitted or rate-limited (HTTP 429), fallbackPlans.ts kicks in automatically.
GEMINI_API_KEY=your_gemini_key_here

# Keep "true" until P2 and P4 endpoints are live, then flip to "false"
USE_MOCKS=true
P2_API_URL=http://localhost:3000/api
P4_API_URL=http://localhost:3000/api
```

---

## 3. Integrated Security Measures (`lib/agent/security.ts`)

All security checks follow the exact `throw UnauthorizedError -> orchestrator catches -> logAudit() -> clean UI error` pattern:
1. **`assertCanApprove(user)`**: Enforces that only `admin` can approve or reject a run (`403` + `APPROVE_DENIED_UNAUTHORIZED` in audit log).
2. **`assertSafeAndPrivatePrompt(prompt)`**: Blocks prompt-injection/XSS/SQLi patterns (`PROMPT_BLOCKED_SECURITY`) and scrubs accidentally pasted API keys, card numbers, or emails before calling the external LLM.
3. **`assertWithinRateLimit(userId)`**: Sliding-window cap (15 requests / 60s) to protect free-tier LLM quotas.
4. **`assertNotReplayedApproval(runId)`**: Atomic lock preventing double-click or replay attacks from sending duplicate campaigns or double-billing usage.
5. **`scrubSensitivePayload(payload)`**: Redacts secrets and masks emails in step outputs and audit log entries.
