# Phase 1: Core API & State Completeness

## Overview

Phase 1 establishes the rock-solid foundation for GitPet’s **Notice → Understand → Resolve** repository companion experience. It implements the essential state models, safety guarantees, API route aliases, and live workspace scanning required for a dependable demo.

---

## Deliverables in Phase 1

* **[1.1 Unsafe State and Destructive Anomaly](1.1-unsafe-state-and-destructive-anomaly.md)**
  * Models immediate work-loss hazards (e.g. upstream force-pushes with uncommitted local work) strictly at **0% health**.
  * Visual treatment shifts the mascot to frozen grayscale with a restrained alert pulse.
  * Ensures zero automatic Git writes and guarantees bounded, 100% reversible recovery proposals (`git stash`, backup branches).
  * High-precedence state evaluation ensures work-loss risks override all lower-severity signals.

* **[1.2 AI Route Aliases and Asset Approval](1.2-ai-route-aliases-and-asset-approval.md)**
  * Implements specification-compliant routes alongside legacy client routes without duplicating model logic:
    * `POST /api/ai/chat` & `POST /api/chat`
    * `POST /api/ai/images/generate` & `POST /api/images/generate`
    * `POST /api/ai/images/edit` & `POST /api/images/edit`
    * `POST /api/ai/images/:id/approve` & `POST /api/images/:id/approve`
    * `GET /api/ai/images/approved` & `GET /api/images/approved`
  * Enforces temporary preview lifecycles with TTL expiry, explicit approval promotion, idempotency, and audit logging with sensitive data redaction.

* **[1.3 Live Workspace Git Status Scanner](1.3-live-workspace-git-status-scanner.md)**
  * Provides opt-in read-only inspection of the active local Git repository via `GET /api/git/live-status`.
  * Normalizes branch identity, ahead/behind counts, uncommitted dirty files, and commit history into the standard repository snapshot shape.
  * Implements argument-based process execution, timeouts, directory boundary checks, and robust handling for detached HEAD, missing upstream, and non-repository workspaces.

---

## Verification Checklist

| Area | Check | Status |
| :--- | :--- | :--- |
| **Lint & Type Safety** | `npm run lint` (`tsc --noEmit`) passes with 0 errors | ✅ Verified |
| **Production Build** | `npm run build` bundles client (Vite) and backend (esbuild) with 0 errors | ✅ Verified |
| **Unsafe State** | Selecting Unsafe preset displays 0% health, grayscale still pet, and loss warning | ✅ Verified |
| **AI Routes** | Both `/api/ai/*` and legacy endpoints return validated structured JSON | ✅ Verified |
| **Asset Approval** | Preview assets can be promoted once, idempotently re-approved, or safely rejected | ✅ Verified |
| **Live Scanner** | Active repository is scanned in read-only mode without executing writes | ✅ Verified |
