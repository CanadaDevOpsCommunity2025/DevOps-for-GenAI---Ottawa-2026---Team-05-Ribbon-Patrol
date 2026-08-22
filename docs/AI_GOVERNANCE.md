# AI Governance & Responsible AI System Card
**System Name:** GitPet AI DevSecOps Companion  
**Version:** 1.0.0-hackathon (August 2026)  
**Lead Organization:** Team 05 - Ribbon Patrol  
**Compliance Standards:** NIST AI Risk Management Framework (AI RMF 1.0), OWASP Agentic AI Guidelines

---

## 1. System & Model Overview

| Attribute | Specification |
| :--- | :--- |
| **Primary Generative Model** | Google Gemini 2.5 Flash (`gemini-2.5-flash`) via `@google/genai` SDK |
| **Deep Reasoning Model** | Google Gemini 2.5 Pro (`gemini-2.5-pro`) |
| **Multimodal Vision & Audio** | Gemini Live API / Multimodal Bidirectional WebSocket Streaming |
| **Image Generation Model** | Google Imagen 3 (`imagen-3.0-generate-002`) |
| **Deployment Target** | Node.js Express + React 19 Frontend (Hybrid Local/Cloud) |
| **Intended Users** | Software engineers, DevOps practitioners, open-source contributors |

---

## 2. Purpose, Scope & Prohibited Uses

### Intended Purpose
- Ambient visual monitoring of repository divergence (ahead/behind upstream, dirty working trees, merge conflicts).
- Natural language explanation of complex Git topology and branch drift.
- Human-approved generation of bounded, reversible Git synchronization actions (e.g. `stash -> pull -> pop`).

### Non-Goals
- Autonomous, unmonitored execution of Git commands against remote production repositories.
- Generation or replacement of application business logic.

### Prohibited Uses
- Automated force-pushing (`--force`, `--delete`) to protected upstream branches.
- Parsing, uploading, or processing classified or confidential source files without explicit team opt-in.

---

## 3. Data Governance & Privacy

```
                                  DATA LIFECYCLE
[ Local Workspace ] ──(Minimization)──► [ Sanitizer ] ──(Ephemeral Context)──► [ Gemini API ]
 (Working tree diffs,                    (Redacts keys,                           (Zero data retention,
  branch names, hashes)                   passwords, PII)                          TLS 1.3 encrypted)
```

1. **Data Minimization:** Only branch names, commit hashes, and file status counts are transmitted by default. Full diff contents are only inspected when the user explicitly queries a specific conflict.
2. **Secret Redaction:** Pre-flight sanitizers automatically strip API keys (`AIza...`), tokens, and credentials.
3. **Data Retention:** Zero training on user inputs. Queries are ephemeral and discarded after response synthesis.

---

## 4. Human-in-the-Loop Oversight Matrix

| Action Level | Description | Oversight Requirement | System Enforcement |
| :--- | :--- | :--- | :--- |
| **Level 0: Ambient Status** | Pet emotional state, health %, behind count | Fully Autonomous | Read-only CLI status |
| **Level 1: Conversational Q&A** | Chat explanations, Git topology tutoring | Autonomous Display | Read-only context query |
| **Level 2: Avatar Studio** | Generating new pet mascot skins | Interactive Preview | Asset Registry preview before approval |
| **Level 3: Safe Git Write** | Stashing, fast-forward pulls, branch creation | **Mandatory Human Approval** | Diff modal preview + Confirm button |
| **Level 4: High-Risk Git Write** | Destructive resets, force-pushing | **Blocked by Policy** | Hard rejection; agent cannot execute |

---

## 5. Model Transparency & Failure Handling

- **Confidence Scoring:** Every recommendation includes an explicit confidence score (e.g., 98%), risk classification (`Safe` / `Needs Review`), and an immediate reversal step.
- **Graceful Fallback:** If the Gemini API is unreachable or rate-limited, the system falls back seamlessly to deterministic rule-based algorithms with zero interruption to developer workflow.
- **Incident Escalation:** Developers can dismiss any AI recommendation, abort operations via the UI, or execute the documented reversal command.
