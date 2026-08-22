# Architecture & System Design Document: GitPet

**Project:** GitPet (Ribbon DevSecOps Companion)  
**Version:** 1.0.0-production  
**Team:** Ribbon Patrol (Team 05)  
**Standard:** C4 Model / NIST & OWASP DevSecOps Reference Architecture

---

## 1. High-Level System Architecture

```
                                  +---------------------------------------+
                                  |         DEVELOPER CLIENT (UI)         |
                                  |  - React 19 + TypeScript + Vite       |
                                  |  - Framer Motion Pet Stage            |
                                  |  - Markdown Chat + Diff Highlighting  |
                                  |  - Live Audio / Web Speech & Canvas   |
                                  +-------------------+-------------------+
                                                      |
                                                      | HTTP REST & WebSocket (Port 3000)
                                                      v
+---------------------------------------------------------------------------------------------------------+
|                                    GITPET BACKEND SERVICE ENGINE (Node.js)                              |
|                                                                                                         |
|  +-------------------------+     +-------------------------------+     +-----------------------------+  |
|  |   Security Sanitizer    |     |    State & Scenario Engine    |     |      AI Gateway Client      |  |
|  | - Token Redaction       |     | - Divergence calculator       |     | - Gemini 2.5 Flash / Pro    |  |
|  | - Shell Injection Guard |     | - Health % scoring (0-100%)   |     | - Imagen 3 Studio           |  |
|  | - Tool Scope Allowlist  |     | - Deterministic Demo Sandboxes|     | - Gemini Live Bidirectional |  |
|  +-------------------------+     +-------------------------------+     +-----------------------------+  |
|               |                                  |                                    |                 |
|               +─────────────────+────────────────+────────────────────────────────────+                 |
|                                 |                                                                       |
|                                 v                                                                       |
|  +---------------------------------------------------------------------------------------------------+  |
|  |                 Operational Telemetry, Health Checks & Audit Ring Buffer (/api/audit-logs)         |  |
|  +---------------------------------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------------------------------+
                    |                                                     |
                    | (Safe, Read-Only CLI Scan)                          | (TLS 1.3 / Authenticated API Key)
                    v                                                     v
      +----------------------------+                        +----------------------------+
      | LOCAL GIT ENGINE WORKSPACE |                        |    GOOGLE GEMINI CLOUD     |
      | - branch / ahead / behind  |                        | - Structured JSON actions  |
      | - working tree status      |                        | - Multimodal Live streams  |
      | - human-confirmed writes   |                        | - Imagen 3 Generation      |
      +----------------------------+                        +----------------------------+
```

### 1.1 System Context Diagram (C4 Context)
Describes the boundaries of GitPet, showing how users interact with the client, and how the Node.js backend secure gateway connects safely to local workspace Git commands and Google Cloud APIs.

```mermaid
graph TD
    %% Styling
    classDef main fill:#2a2b36,stroke:#7c3aed,stroke-width:2px,color:#ffffff;
    classDef ext fill:#1e1e24,stroke:#4b5563,stroke-width:1px,color:#d1d5db;
    classDef client fill:#1e3a8a,stroke:#3b82f6,stroke-width:2px,color:#ffffff;

    Dev["Developer (User)"]:::main
    
    subgraph GitPet Platform
        UI["GitPet React Frontend<br/>(Vite App)"]:::client
        BE["GitPet Node.js Backend<br/>(Secure Gateway Server)"]:::main
    end

    subgraph Local Workspace
        GitCLI["Local Git CLI / Workspace"]:::ext
    end

    subgraph External Cloud Services
        Gemini["Google Gemini Cloud API<br/>(LLM / Multimodal Live)"]:::ext
        Imagen["Gemini Imagen 3 Studio<br/>(Asset Customizer)"]:::ext
    end

    Dev -->|Interacts / Voice / UI| UI
    UI <-->|"HTTP REST & WebSocket (Port 3000)"| BE
    BE <-->|Safe, Read-Only CLI Scan / Human-Confirmed Writes| GitCLI
    BE <-->|TLS 1.3 / Redacted API Keys| Gemini
    BE <-->|Image Customization Requests| Imagen
```

### 1.2 Container & Component Diagram
Details the core subsystems running within both the Frontend Client (React) and the Backend Gateway Service (Node.js).

```mermaid
graph TB
    %% Styling
    classDef module fill:#1e293b,stroke:#0f172a,color:#f8fafc;
    classDef group fill:none,stroke:#475569,stroke-dasharray: 5 5;

    subgraph ClientContainer [Frontend App Container]
        App["App.tsx Orchestrator<br/>(State Machine / Mood)"]:::module
        PetStage["PetStage.tsx<br/>(SVG / Aura Glow / Animations)"]:::module
        ChatStream["ChatStream.tsx<br/>(Markdown / Diff Previews)"]:::module
        LiveVoice["LiveVoiceModal.tsx<br/>(Audio Visualizer / Live Audio)"]:::module
        ImageStudio["ImageStudioModal.tsx<br/>(Imagen Avatar Studio)"]:::module
    end

    subgraph ServerContainer [Backend Gateway Service Container]
        API["REST Router / Express API"]:::module
        WS["WebSocket Server<br/>(Gemini Live Streamer)"]:::module
        Sanitizer["Security Sanitizer<br/>(Secret Redactor)"]:::module
        ActionPolicy["Safety Gate & Action Policy<br/>(Git Command Allowlist)"]:::module
        Telemetry["Observability Subsystem<br/>(FIFO Audit Ring Buffer)"]:::module
        Fallback["Graceful Fallback Subsystem<br/>(Offline Rules)"]:::module
    end

    %% Interactions
    App --> PetStage
    App --> ChatStream
    App --> LiveVoice
    App --> ImageStudio

    ChatStream -->|REST API Requests| API
    LiveVoice <-->|WebSocket Stream| WS
    ImageStudio -->|REST API Requests| API

    API --> Sanitizer
    API --> ActionPolicy
    API --> Telemetry
    API --> Fallback

    WS --> Sanitizer
```

### 1.3 Safe Git Command Execution Flow
Illustrates how the user requested action is analyzed, vetted for safety, authorized, and executed.

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer
    participant UI as React UI (App.tsx)
    participant BE as Backend Server (server.ts)
    participant SG as Safety Gate & Sanitizer
    participant Git as Local Git Engine
    participant LLM as Gemini Cloud API

    Dev->>UI: Request Sync/Resolve (e.g., Divergent branch)
    UI->>BE: POST /api/git/analyze
    BE->>SG: Check request & redact any secrets (ghp_*, AIza*)
    SG->>LLM: Analyze divergence & proposed resolution steps
    LLM-->>SG: Return confidence score, structured steps & safety evaluation
    SG-->>UI: Return analysis details, warning, and preview confirmation
    UI->>Dev: Show mood aura (Tangled yarn / stress) + Diff + Approve button
    
    alt User Rejects
        Dev->>UI: User clicks Cancel
        UI->>UI: Restore normal UI loop (Safe state)
    else User Confirms
        Dev->>UI: User clicks Confirm / Run Remediation
        UI->>BE: POST /api/git/execute (Explicit approval payload)
        BE->>SG: Verify command matches allowed, safe non-destructive scope
        alt Command is Allowed
            BE->>Git: Execute CLI Command (e.g., git stash && git pull)
            Git-->>BE: Command Output / Success Status
            BE->>UI: Return Success + Audit Logs + Reversal Plan
            UI->>Dev: Mood Aura increases to Healthy (100% glow)
        else Command contains destructive flags (--force, reset --hard)
            BE-->>UI: Blocked: Command violates DevSecOps safety rules
            UI->>Dev: Display blocked warning badge
        end
    end
```

### 1.4 Real-Time Bidirectional Voice Stream Sequence
Illustrates the WebSocket bridge used to deliver low-latency voice assistance with the Gemini Live API.

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer
    participant UI as LiveVoiceModal (Web Audio)
    participant BE as Backend WebSocket Server
    participant GeminiLive as Gemini Live WebSocket API

    Dev->>UI: Open Live Voice Modal
    UI->>BE: Establish WebSocket (ws://localhost:3000/live)
    BE->>GeminiLive: Authenticate & Initiate Secure TLS Stream
    GeminiLive-->>BE: Connection Established
    BE-->>UI: Live Stream Active (Audio Context Started)

    loop Conversation Loop
        Dev->>UI: Speak (Mic Audio Captured)
        UI->>BE: Send PCM Audio Chunks (Binary WS)
        BE->>GeminiLive: Forward secure Audio bytes
        GeminiLive-->>BE: Stream Response Voice Chunks (PCM Audio)
        BE-->>UI: Forward Voice Chunks + Text Transcript
        UI->>Dev: Play Audio out (Speakers) & animate Canvas visualizer
    end

    Dev->>UI: Click Close / Stop
    UI->>BE: Close client WebSocket
    BE->>GeminiLive: Close upstream secure session
```

---

## 2. Component Design & Responsibilities

### 2.1 Frontend Client (`src/`)
- **`App.tsx`**: Central orchestrator managing state machines for pet mood, active scenario, selected AI model persona, chat histories, and modal dialogs.
- **`PetStage.tsx`**: Interactive visual stage rendering SVG animations, health aura glows, emotional expressions (leash pull, tangled yarn, backpack), XP progression, and level badges.
- **`ChatStream.tsx`**: Full Markdown chat stream rendering assistant reasoning, cited repository evidence, risk confidence scores, syntax-highlighted diff previews, and interactive approval cards.
- **`LiveVoiceModal.tsx`**: Real-time microphone capture, audio visualizer, and low-latency bidirectional WebSocket connection streaming to the Gemini Live API.
- **`ImageStudioModal.tsx`**: Pet avatar customizer interfacing with Gemini Imagen 3 for prompt generation, asset preview isolation, and promotion.
- **`TopologyModal.tsx` & `DiffModal.tsx`**: Interactive visual representations of the Git DAG branch topology and file-level side-by-side diffs.

### 2.2 Backend Gateway Service (`server.ts`)
- **Security & Redaction Layer**: Intercepts all outgoing prompts to strip authorization headers, personal access tokens (`ghp_...`), and Google API keys (`AIza...`).
- **Safety Gate & Action Policy**: Guarantees that no mutating Git command (`git stash`, `git pull`, `git checkout`) can be executed without an explicit confirmation payload sent from the client preview modal. Destructive commands (`--force`, `reset --hard`) are rejected at the parser level.
- **Observability Subsystem**: Maintains an in-memory FIFO ring buffer of audited interactions, recording timestamp, model type, latency in milliseconds, prompt tokens, and status codes.
- **Graceful Fallback Subsystem**: Provides deterministic, rule-based responses if the Gemini API is unreachable or rate-limited.

---

## 3. Production Deployment & Security Path

1. **Build Artifacts:** Compiles frontend via Vite into optimized static assets (`dist/`) and bundles the server into `dist/server.cjs` via `esbuild`.
2. **Containerization / Cloud Target:** Ready for containerized deployment (e.g. Google Cloud Run, AWS ECS, or Kubernetes) using standard Node.js alpine images.
3. **Zero Secrets in Source:** All sensitive configuration is isolated in environment variables (`GEMINI_API_KEY`, `APP_URL`).
4. **Automated CI/CD:** GitHub Actions workflow executes linting, unit tests, adversarial security tests, Gitleaks scanning, and SBOM generation on every push.
