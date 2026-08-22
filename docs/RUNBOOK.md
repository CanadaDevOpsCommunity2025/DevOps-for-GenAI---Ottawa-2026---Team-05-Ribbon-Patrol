# Operations & SRE Runbook: GitPet
**Service:** GitPet DevSecOps AI Companion  
**Maintainer:** Team 05 - Ribbon Patrol  
**SLO Target:** 99.9% Uptime | <800ms Average Telemetry Response | 0 Unintended Data Losses

---

## 1. System Architecture & Component Health

```
                                  +-----------------------+
                                  |   Web Browser / UI    |
                                  |  (React 19 + Vite)    |
                                  +-----------+-----------+
                                              | HTTP & WebSocket
                                              v
+-----------------------------------------------------------------------------------+
| Node.js / Express Server (Port 3000)                                              |
|                                                                                   |
|  - GET /api/health        -> Returns uptime, memory usage, API key status        |
|  - GET /api/audit-logs    -> Returns FIFO array of live audited API events        |
|  - GET /api/git/live-status -> Safe, read-only scanner of local workspace         |
|  - POST /api/chat         -> AI-assisted / rule-based resolution recommendation   |
|  - POST /api/imagen/generate -> Bounded avatar preview generation                 |
+-----------------------------------------------------------------------------------+
```

---

## 2. Health Monitoring & Observability

### Health Check Endpoint: `GET /api/health`
Query the health check to inspect operational metrics:
```bash
curl -s http://localhost:3000/api/health | jq .
```
**Example Response:**
```json
{
  "status": "healthy",
  "service": "GitPet DevSecOps AI Engine",
  "geminiAvailable": true,
  "geminiModelPrimary": "gemini-2.5-flash",
  "geminiModelPro": "gemini-2.5-pro",
  "timestamp": "2026-08-22T16:22:00.000Z",
  "uptimeSeconds": 1420,
  "memoryUsageMb": 64,
  "telemetry": {
    "totalAuditedRequests": 18,
    "averageLatencyMs": 145
  }
}
```

### Audit Logs Endpoint: `GET /api/audit-logs?limit=20`
Inspect recent requests, latencies, model invocations, and approval flags:
```bash
curl -s http://localhost:3000/api/audit-logs | jq .
```

---

## 3. Incident Response & Troubleshooting

### Scenario A: Gemini API Key Missing or Invalid
- **Symptoms:** `/api/health` reports `"geminiAvailable": false`.
- **System Behavior:** Automatic graceful degradation. The application switches to rule-based state machine logic without crashing.
- **Remediation:** Verify `.env` has a valid `GEMINI_API_KEY="..."` and restart the service (`npm run dev`).

### Scenario B: High Latency or API Rate Limiting (HTTP 429)
- **Symptoms:** Latency spikes in `/api/audit-logs`.
- **System Behavior:** Express backend catches the error, serves the fallback resolution card, and sets confidence to fallback mode.
- **Remediation:** Switch model persona to **Gemini 2.5 Flash** (faster, higher rate limits) or check Google AI Studio quota.

### Scenario C: WebSocket Connection Dropped
- **Symptoms:** Live audio/vision modal shows reconnecting banner.
- **System Behavior:** Exponential backoff retry on client side.
- **Remediation:** Ensure port 3000 is unblocked and firewall permits WebSocket upgrades (`Upgrade: websocket`).

---

## 4. Disaster Recovery & Emergency Rollback Procedures

If an accidental Git mutation occurs despite preview boundaries, follow standard reversal steps:

| State | Recovery Command |
| :--- | :--- |
| **Stashed work needs restoring** | `git stash pop` or `git stash apply stash@{0}` |
| **Branch switched unintentionally** | `git switch -` |
| **Accidental merge in progress** | `git merge --abort` |
| **Accidental rebase in progress** | `git rebase --abort` |
| **Revert to previous commit safely** | `git reset --keep HEAD@{1}` |

---

## 5. Capacity & Scalability Plan

- **Concurrency:** Node.js event loop handles 1,000+ active WebSocket connections per core.
- **Memory Footprint:** In-memory asset and audit buffers are strictly capped (max 200 FIFO entries, <100MB RSS memory).
- **Cost Controls:** Default model is set to `gemini-2.5-flash` with aggressive token caps (`maxOutputTokens: 500`) to maintain cost efficiency at scale.
