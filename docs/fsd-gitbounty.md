# Functional Specification Document: GitBounty

## Functional Specification Document: GitBounty

### 1. Executive Summary & Product Vision

Engineering teams consistently struggle with technical debt management. Maintenance tasks—such as updating obsolete dependencies, refactoring brittle logic, backfilling missing tests, and addressing security permissions—are repeatedly deferred in favor of feature velocity.\
GitBounty reframes repository hygiene as a persistent, economy-driven simulation. By treating technical debt resolution as an active resource-gathering loop, it applies incremental progression mechanics to platform engineering. The platform replaces subjective backlog grooming with an automated, data-driven market economy where an AI Arbiter autonomously scans codebases, values structural vulnerabilities, and issues priced bounties. When developers submit remediation pull requests, the Arbiter evaluates the diff against strict criteria and releases instant payouts, driving a continuous cycle of incremental platform improvement.<br>

### 2. Core Economic & Incremental Progression Mechanics

The platform operates on a closed-loop economy driven by dynamic pricing and progressive reward mechanics.<br>

* The Debt Appraisal Metric: Tech debt is quantified into a standard internal credit currency (🪙). Every issue is assigned a base value determined by raw remediation effort and scaled by operational risk multipliers.<br>
* Dynamic Bounty Pricing Formula:<br>
  * $$ $\text{Base Effort Units (1–10)} \times 50\text{ Credits}$ $$<br>
  * $$ $\text{Severity / Risk Multiplier (1.0x to 3.0x)}$ $$<br>
  * $$ $\text{Aging Multiplier (+5\% value per sprint left unaddressed)}$ $$<br>
* The Incremental Feedback Loop:<br>
  * Acquire Contract: Contributor locks a bounty from the active board.<br>
  * Remediate & Submit: Contributor commits code matching the exact acceptance schema.<br>
  * Automated Audit: AI Arbiter validates the diff in under 15 seconds.<br>
  * Yield & Compounding Ranks: Credits are deposited to the contributor's balance; aggregate debt elimination unlocks higher-tier contributor badges and multiplier perks.<br>

### 3. Targeted Code Smells & Architectural Anti-Patterns

For the scope of automated analysis and verification, the AI Arbiter classifies technical debt into five distinct domains:<br>

| **Category**           | **Targeted Anti-Pattern**        | **Detection Criteria**                                                                                                              | **Base Credit Yield**       |
| ---------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Test & Coverage Debt   | Brittle / Missing Assertions     | Functions containing zero assertions, mock-heavy non-verifying tests, or unhandled negative edge cases.                             | $$ $150 - 300\text{ 🪙}$ $$ |
| Architectural Rot      | God-Classes & High Coupling      | Monolithic classes exceeding 300 LOC, methods with cyclomatic complexity $$ $> 10$ $$, or nested branching $$ $> 4$ $$ layers deep. | $$ $350 - 600\text{ 🪙}$ $$ |
| Observability Debt     | Naked Exception Handling         | Blind `try/catch` blocks swallowing errors, missing contextual trace IDs, or unformatted standard output logging.                   | $$ $100 - 250\text{ 🪙}$ $$ |
| Security & Permissions | Wildcard IAM & Hardcoded Config  | Open CIDR blocks, wildcard IAM definitions (`"Action": "*"`), or credentials committed outside secret stores.                       | $$ $400 - 800\text{ 🪙}$ $$ |
| Interface / API Drift  | Undocumented / Untyped Contracts | Public-facing REST endpoints missing structured request/response schemas, type signatures, or error contracts.                      | $$ $100 - 200\text{ 🪙}$ $$ |

### 4. User Roles & Experience Journey

#### User Personas

* The Contributor (Developer / SRE): Interacts with the marketplace to select optimization tasks during sprint lulls, views concrete acceptance requirements, submits fixes, and tracks leaderboard progression.<br>
* The Arbiter (Autonomous AI Agent): Operates as the impartial auditor. Ingests static code blocks, generates machine-readable contracts with verifiable acceptance criteria, and grades incoming pull requests.<br>
* The Platform Lead (Observer / Manager): Monitors overall repository health via macro metrics: Total Tech Debt Eliminated, Mean Time to Remediation (MTTR), and team velocity allocations.<br>

#### Step-by-Step Experience Journey

1. Marketplace Discovery: The Contributor opens the web dashboard, sorted by highest payout or target domain (e.g., `#Testing`, `#Security`).<br>
2. Contract Inspection: Selecting a bounty displays the offending code snippet, file path, structural smell rationale, and a checklist of required fixes.<br>
3. Claiming & Execution: The Contributor assigns the bounty to their handle. The bounty status transitions from `AVAILABLE` to `IN_PROGRESS`.<br>
4. Submission: The Contributor creates a Pull Request referencing the bounty identifier (e.g., `Fixes BOUNTY-204`).<br>
5. Instant Arbitration: The Arbiter intercepts the submission via webhook, evaluates the diff against the checklist, and posts the audit decision.<br>
6. Settlement: On approval, the bounty transitions to `RESOLVED`, credits are credited to the developer's profile, and the team-wide total debt counter decrements.<br>

### 5. Comprehensive Functional Feature Specifications

#### 5.1. Dynamic Bounty Generation Engine

* Batch & On-Demand Ingestion: Capable of ingesting single source files or directory scans.<br>
* Contract Definition Output: Generates structured bounty objects containing:<br>
  * `bounty_id`: Unique alphanumeric key (e.g., `BOUNTY-089`).<br>
  * `title` & `category`: Concise summary and debt classification.<br>
  * `location`: Target file path and exact line range.<br>
  * `valuation`: Calculated credit payout and risk tier.<br>
  * `acceptance_criteria`: 3 to 5 discrete, objectively verifiable requirements.<br>

#### 5.2. Minimalist Kanban Marketplace Interface

The UI strictly adheres to a minimalist styling guide—monochrome/high-contrast palette, zero non-functional graphics, fast scannability, and fixed layout density.<br>

* Kanban Swimlanes:<br>
  * Open Bounties: Unclaimed tasks organized by credit tier.<br>
  * Under Review: PR submitted, pending Arbiter verification.<br>
  * Resolved / Paid: Completed bounties archiving recent payouts.<br>
* Quick-Filter Bar: Toggles to isolate bounties by category (`Security`, `Testing`, `Refactor`) or sort by payout yield.<br>
* Bounty Detail Drawer: A slide-over panel displaying the exact code snippet, context, and copyable branch naming helpers.<br>
* Leaderboard & System Metrics HUD: A persistent header component displaying total debt eliminated ($), active team credits, and top 5 ranking engineers.<br>

#### 5.3. Automated Code Arbiter & Verifier

* Diff Evaluation Pipeline: Compares the base branch against the PR diff specifically targeting the lines identified in the contract.<br>
* Checklist Validation: Evaluates every acceptance criterion individually (True/False status).<br>
* Regression & Injection Guard: Flags any newly introduced syntax errors, hardcoded fallbacks, or broken contracts added in the PR diff.<br>
* Automated Review Output:<br>
  * _Passed:_ Emits approval event, triggers ledger credit, and issues positive badge.<br>
  * _Failed:_ Emits detailed rejection breakdown citing the exact unmet acceptance criterion and suggested adjustment.<br>

#### 5.4. Persistent Ledger & Reward Store

* Contributor Ledger: Maintains user profiles, transaction logs, timestamps, and aggregate bounty completions.<br>
* Tier & Badge Mechanics:<br>
  * _Level 1: Code Janitor_ (0 – 1,000 🪙)<br>
  * _Level 2: Refactor Specialist_ (1,001 – 3,000 🪙)<br>
  * _Level 3: Architecture Sentinel_ (3,001+ 🪙)<br>

### 6. System Interactions, Workflows & Validations

#### 6.1. End-to-End Workflow Diagram

```
[ Codebase Ingestion ] ──> [ AI Arbiter Appraisal ] ──> [ Publish to Marketplace ]
                                                                   │
                                                                   ▼
[ Contributor Wallet ] <── [ Auto-Payout / Settle ] <── [ Diff Verification ] <── [ PR Submission ]
```

#### 6.2. Arbitration State Machine

```
   ┌─────────────┐       Assign        ┌─────────────┐
   │  AVAILABLE  │ ──────────────────> │ IN_PROGRESS │
   └─────────────┘                     └─────────────┘
          │                                   │
          │ Expire / Unclaim                  │ Submit PR
          ▼                                   ▼
   ┌─────────────┐   Fail Criteria     ┌─────────────┐
   │  AVAILABLE  │ <────────────────── │   REVIEW    │
   └─────────────┘                     └─────────────┘
                                              │ Pass Criteria
                                              ▼
                                       ┌─────────────┐
                                       │  RESOLVED   │
                                       └─────────────┘
```

#### 6.3. Business Logic & Validation Constraints

* Single Claim Concurrency: A contributor may only hold an active lock on one bounty at a time to prevent hoarding.<br>
* Contract Expiration: Unsubmitted claims automatically return to the open pool after 24 hours of inactivity.<br>
* Strict Verification Determinism: The Arbiter requires a 100% pass rate on all acceptance criteria before issuing a payout; partial payouts are disabled to enforce code quality.

### 7. Hackathon MVP Scope & Boundaries

| **Component**  | **In-Scope for 6-Hour Sprint**                                          | **Explicitly Out of Scope**                                                  |
| -------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Code Ingestion | Ingestion of pre-seeded mock code blocks and targeted sample repos.     | Full enterprise multi-repo real-time GitHub App syncing.                     |
| AI Arbitration | LLM-based structured evaluation of diffs against acceptance criteria.   | Dynamic execution of live test suites or sandbox container runners.          |
| Frontend UI    | Minimalist single-page dashboard (Kanban, Leaderboard, Audit Modal).    | Complex user settings, OAuth login flows, or dark/light theme configurators. |
| Persistence    | In-memory or local persistent store for bounty state and user balances. | Distributed multi-tenant SQL database deployments.                           |
| Integrations   | Direct REST payload submission simulating PR checks.                    | Bi-directional Slack bots and enterprise PagerDuty webhook wiring.           |
