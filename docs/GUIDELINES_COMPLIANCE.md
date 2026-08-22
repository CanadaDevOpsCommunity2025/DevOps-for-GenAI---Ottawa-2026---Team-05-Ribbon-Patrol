# Participant Guidelines & Evidence Compliance Matrix

**Project:** GitPet – Ambient DevSecOps Repository Companion  
**Team:** Ribbon Patrol (Team 05) – DevOps for GenAI Hackathon (Ottawa 2026)  
**Live URL / Demo Command:** `http://localhost:3000` (`npm run dev` or `npm run start`)

---

## Participant Compliance Checklist (P-01 to P-15)

| ID | Guideline Requirement | Status | Evidence Document / Artifact Location | Description & Implementation Summary |
| :--- | :--- | :---: | :--- | :--- |
| **P-01** | **Team size** (1–5 members per team) | **MET** | [README.md](../README.md#team-members), [docs/PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) | Team roster: Aliasgar Husain (Lead), Dilvir Singh Saini, Lucas Whitaker, David Castelli, Charisma Pulyala (5 members). |
| **P-02** | **Single theme** (Select one official theme/track) | **MET** | [README.md](../README.md#project-overview), [docs/PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md#1-project-name--theme) | Theme: **DevOps for Generative AI / Agentic Automation, Developer Ergonomics & DevSecOps**. |
| **P-03** | **Real problem** (Define concrete problem & measurable outcome) | **MET** | [docs/PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md#3-problem-statement--target-users), [docs/README.md](README.md#product-objectives) | Solves context fragmentation, fear of destructive Git commands, and cognitive overload during branch drift with ambient metrics & verifiable recovery. |
| **P-04** | **Working system** (Deliver live working use case / reproducible demo) | **MET** | [README.md](../README.md#-getting-started--setup-guide), Live app at `http://localhost:3000` | Full-stack interactive web application with ambient pet stage, AI persona chat, live audio/vision streaming, and sandbox scenarios. |
| **P-05** | **Production path** (Architecture, deployment, security, runbook) | **MET** | [docs/RUNBOOK.md](RUNBOOK.md), [docs/architecture/ARCHITECTURE.md](architecture/ARCHITECTURE.md), [.github/workflows/ci.yml](../.github/workflows/ci.yml) | Production build pipeline (`npm run build`), health/audit endpoints (`/api/health`, `/api/audit-logs`), and disaster recovery runbook. |
| **P-06** | **AI transparency** (Declare where GenAI/coding tools were used) | **MET** | [README.md](../README.md#-ai-usage--assisted-tooling-disclosure), [docs/AI_GOVERNANCE.md](AI_GOVERNANCE.md#1-system--model-overview) | Disclosed usage of Gemini 3.6 Flash, Gemini 3.6 Pro, Imagen 3, Gemini Live API, and AI-assisted pair programming during development. |
| **P-07** | **Security by design** (Threat modeling, AI/cloud/supply-chain mitigations) | **MET** | [docs/SECURITY_THREAT_MODEL.md](SECURITY_THREAT_MODEL.md), [tests/security.test.ts](../tests/security.test.ts) | STRIDE threat model, OWASP LLM Top 10 defenses, secret regex sanitization, and automated adversarial test suite. |
| **P-08** | **Governance** (Ownership, data handling, human oversight, escalation) | **MET** | [docs/AI_GOVERNANCE.md](AI_GOVERNANCE.md) | NIST AI RMF 1.0 aligned system card, 5-tier Human-in-the-Loop oversight matrix, and incident escalation protocols. |
| **P-09** | **Testing** (Functional, security, and failure-path tests) | **MET** | [tests/security.test.ts](../tests/security.test.ts), [tests/markdown.test.ts](../tests/markdown.test.ts), [docs/TEST_REPORT.md](TEST_REPORT.md) | 12 automated Vitest unit, security, and AI governance test cases covering prompt sanitization, jailbreak rejection, approval gates, traceability, fallback, and markdown chat rendering. |
| **P-10** | **Observability** (Logs, metrics, traces, operational telemetry) | **MET** | [docs/RUNBOOK.md](RUNBOOK.md#2-health-monitoring--observability), `GET /api/health`, `GET /api/audit-logs` | Structured health metrics, memory usage, API status, model latency tracking, and FIFO audit event ring buffer. |
| **P-11** | **Reproducibility** (Setup and dependency instructions without secrets) | **MET** | [README.md](../README.md#-getting-started--setup-guide), [.env.example](../.env.example) | Step-by-step setup instructions with sanitized environment variable template and zero hardcoded secrets. |
| **P-12** | **Responsible AI** (Privacy, safety, transparency, human oversight) | **MET** | [docs/AI_GOVERNANCE.md](AI_GOVERNANCE.md#3-data-governance--privacy), [docs/SECURITY_THREAT_MODEL.md](SECURITY_THREAT_MODEL.md#llm06-excessive-agency--unsafe-tool-execution) | Ephemeral data transmission, zero model retraining, mandatory human approval gate for Git mutations, and automated reversal plans. |
| **P-13** | **No secrets** (Never commit credentials, API keys, or private tokens) | **MET** | [docs/SECURITY_THREAT_MODEL.md](SECURITY_THREAT_MODEL.md#4-verification--continuous-security), [.github/workflows/ci.yml](../.github/workflows/ci.yml), `.gitignore` | Automated Gitleaks CI workflow scan, `.gitignore` configuration, and runtime token redactor. |
| **P-14** | **Supply chain** (Third-party dependencies, licenses, SBOM) | **MET** | [LICENSE](../LICENSE), [package.json](../package.json), [docs/SBOM_MANIFEST.md](SBOM_MANIFEST.md) | MIT License, audited direct/transitive dependencies, and CycloneDX/JSON SBOM generation script (`npm run sbom`). |
| **P-15** | **Demo integrity** (Clearly identify mocked/stubbed components) | **MET** | [docs/DEMO_NOTES.md](DEMO_NOTES.md), [docs/kubepet/roadmap/phase-3-voice-and-multimodal-hardening/3.3-end-to-end-demo-rehearsal-and-verification.md](kubepet/roadmap/phase-3-voice-and-multimodal-hardening/3.3-end-to-end-demo-rehearsal-and-verification.md) | Explicitly details deterministic demo sandbox scenarios vs. live workspace inspection mode and AI fallback behaviors. |

---

## Detailed Evidence Cross-Reference

- **Architecture & Production Runbook:** [docs/architecture/ARCHITECTURE.md](architecture/ARCHITECTURE.md) & [docs/RUNBOOK.md](RUNBOOK.md)
- **Security & Adversarial Defenses:** [docs/SECURITY_THREAT_MODEL.md](SECURITY_THREAT_MODEL.md) & [tests/security.test.ts](../tests/security.test.ts)
- **AI System Card & Human Oversight:** [docs/AI_GOVERNANCE.md](AI_GOVERNANCE.md)
- **Testing & Verification Results:** [docs/TEST_REPORT.md](TEST_REPORT.md)
- **Supply Chain & SBOM:** [docs/SBOM_MANIFEST.md](SBOM_MANIFEST.md)
- **Demo Script & Component Fidelity:** [docs/DEMO_NOTES.md](DEMO_NOTES.md)
