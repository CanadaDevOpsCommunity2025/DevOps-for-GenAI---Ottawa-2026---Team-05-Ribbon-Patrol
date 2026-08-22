# DevOps for GenAI - Ottawa 2026: Team 05 - Ribbon Patrol

## Project Overview

**Project Name:** Ribbon AI-Powered DevSecOps Assistant (GitPet)  
**Team Name:** Ribbon Patrol  
**Event:** DevOps for GenAI - Ottawa Hackathon Series 2026  

### Team Members
- **Project Lead:** Aliasgar Husain (`Alhusain@rbbn.com`)
- **Participants:** Aliasgar Husain, Dilvir Singh Saini (Did not attend), Lucas Whitaker, David Castelli, Faris Nour

---

## 🐾 About GitPet / Ribbon AI-Powered DevSecOps Assistant

**GitPet** is an interactive, ambient DevSecOps repository companion. Powered by **Google Gemini API** (`@google/genai`), it provides developers with real-time repository health scoring, intelligent Git workflow recommendations, interactive simulated scenario practice, multimodal vision/image generation capabilities, and live voice interactions.

### Key Features
- 🐶 **Interactive Ambient Companion ("Byte"):** Live pet stage with mood states, animations, XP, level tracking, and customizable avatars.
- 🤖 **Multi-Role AI Assistance:** Switch between different AI personas:
  - **Byte (Mascot):** Friendly, developer-humor ambient guide.
  - **Senior Architect:** Deep Git topology, rebase vs merge strategy, DAG structure analysis.
  - **Safety Auditor:** Focuses on zero data-loss, safe rollback, stash verification, and clean resets.
  - **Git Tutor:** Teaches Git internal models (blobs, trees, commit objects, staging index).
- 🧠 **Dynamic AI Model Selection:** Toggle between `Gemini 2.5 Flash` (Fast & lightweight) and `Gemini 2.5 Pro` (Deep reasoning & auditing).
- ⚡ **Real-time Live Audio & Vision Modal:** Interactive voice interface streaming to Gemini Live API.
- 🎨 **Pet Avatar Studio (Image Gen):** Custom avatar generation for your mascot using Gemini Imagen / Image generation capabilities.
- 🧪 **Interactive Scenarios:** Practice solving branch drift, merge conflicts, uncommitted diffs, and clean repository flows in a safe sandbox.
- 📊 **Repository Health & Practice Stats:** Automatic health metrics scoring, daily streak tracking, and interactive pitch deck presentation mode.

---

## 🛠️ Technology Stack

- **Frontend:** React 19, TypeScript, Vite, TailwindCSS v4, Framer Motion (`motion`), Lucide Icons, Canvas Confetti
- **Backend Server:** Node.js, Express, WebSocket (`ws`), `tsx`, `esbuild`
- **AI Integration:** `@google/genai` (Google Gemini SDK)

---

## 🚀 Getting Started & Setup Guide

### 1. Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: `v18.0.0` or higher (`v20.x` or `>=22.x` recommended)
- **Package Manager**: `npm` (comes with Node.js) or `bun` / `yarn`

Verify Node version:
```bash
node -v
npm -v
```

---

### 2. Installation

Clone the repository and navigate into the project directory:

```bash
git clone https://github.com/lucaswhitaker22/DevOps-for-GenAI---Ottawa-2026---Team-05-Ribbon-Patrol.git
cd DevOps-for-GenAI---Ottawa-2026---Team-05-Ribbon-Patrol
```

Install all dependencies:

```bash
npm install
```

---

### 3. Environment Configuration

Create a `.env` file in the root directory (you can base it on `.env.example`):

```bash
cp .env.example .env
```

Open `.env` and add your **Google Gemini API Key**:

```env
# Required for Gemini AI API calls (Chat, Image Gen, Audio/Vision)
GEMINI_API_KEY="your_actual_gemini_api_key_here"

# Optional: The host URL for live deployment or local endpoint
APP_URL="http://localhost:3000"
```

> **Note:** If `GEMINI_API_KEY` is not provided, the application will fallback to robust rule-based responses so you can still demonstrate and navigate the interface.

---

### 4. Running the Project

#### **Development Mode (Recommended)**
Runs the Express server integrated with Vite middleware for live hot-reloading:

```bash
npm run dev
```
Open your browser and navigate to: **`http://localhost:3000`**

#### **Production Build & Server Run**
To test the production CJS bundle output:

1. Build the frontend assets and server bundle:
   ```bash
   npm run build
   ```
2. Start the production Node server:
   ```bash
   npm run start
   ```
Navigate to: **`http://localhost:3000`**

---

## 📜 Available Scripts

| Script | Description |
| :--- | :--- |
| `npm run dev` | Starts the TypeScript development server with hot reloading on port 3000 |
| `npm run build` | Bundles frontend with Vite & builds server to `dist/server.cjs` via `esbuild` |
| `npm run start` | Executes the built production server (`dist/server.cjs`) |
| `npm run test` | Runs the automated unit and adversarial security test suite (Vitest) |
| `npm run sbom` | Generates a complete JSON dependency inventory / SBOM |
| `npm run preview` | Previews the Vite static build |
| `npm run lint` | Runs TypeScript type checking without emitting files |
| `npm run clean` | Removes `dist/` build output |

---

## 🔒 Security, AI Governance & Production Documentation

To satisfy the **DevOps for GenAI Hackathon 2026 Production Standards**, comprehensive documentation and test evidence have been integrated into this repository:

1. 🛡️ **[Security Threat Model & STRIDE Analysis](docs/SECURITY_THREAT_MODEL.md):** Trust boundaries, secret sanitization, tool permissions, and OWASP LLM Top 10 defenses.
2. 📋 **[AI Governance & System Card](docs/AI_GOVERNANCE.md):** Model traceability (Gemini 2.5 Flash/Pro), data classification, human oversight matrix, and incident escalation protocols.
3. 📖 **[Operations & SRE Runbook](docs/RUNBOOK.md):** Live health monitoring (`/api/health`), audit telemetry (`/api/audit-logs`), troubleshooting, and failure recovery.
4. ⚙️ **[CI/CD Pipeline (.github/workflows/ci.yml)](.github/workflows/ci.yml):** Automated TypeScript linting, adversarial test suites, Gitleaks secret scanning, and SBOM artifact generation.

---

## 🤖 8. AI Usage Disclosure

In accordance with Hackathon Guideline **P-06 (AI Transparency)** and **Item 8 (AI Usage Disclosure)**, AI tools assisted the development process as follows:

### Runtime AI Integration (Application Level)
- **Google Gemini 2.5 Flash / Pro:** Serves as the primary/secondary LLM inference engine for DevSecOps guidance and scenario tutoring.
- **Imagen 3:** Powering the Pet Avatar Studio for pixel-art mascot sprite generation.
- **Gemini Live API:** Handles low-latency bidirectional streaming for live audio/vision interactions.

### Development & Coding Assistance (Human-in-the-Loop)
- **Google AI Studio:** Used for rapid prompt prototyping, system instruction iteration, and raw model parameter tuning.
- **Antigravity (Gemini):** Used as pair-programming assistant for boilerplate typescript setup, UI styling, and React component structuring.
- **Claude Code:** Assisted in writing automated Vitest unit/integration tests and refining safety sanitizers.
- **Microsoft Copilot:** Utilized for real-time code completions, formatting, and markdown documentation drafting.

All AI-suggested code, safety filters, and test boundaries were fully reviewed, audited, and approved by the team.

---

## 📁 Repository Structure

```
├── .github/workflows/      # GitHub Actions CI/CD (Lint, Test, Secret Scan, SBOM, Build)
├── docs/                   # Architecture, Governance, Threat Model, Runbook & Roadmaps
│   ├── AI_GOVERNANCE.md    # AI System Card, Model Card, Human Oversight Matrix
│   ├── SECURITY_THREAT_MODEL.md # STRIDE Threat Model & OWASP LLM Mitigations
│   ├── RUNBOOK.md          # SRE & Operational Troubleshooting Guide
│   └── kubepet/roadmap/    # Multi-phase engineering roadmap
├── src/
│   ├── components/         # React components (PetStage, ChatStream, TopBar, Modals, etc.)
│   ├── data/               # Scenario presets and practice stats
│   ├── types.ts            # TypeScript interfaces & types
│   ├── App.tsx             # Main dashboard UI logic & state management
│   ├── index.css           # Tailwind & base styling
│   └── main.tsx            # React application entry point
├── tests/
│   └── security.test.ts    # Adversarial prompt injection & action approval gate tests
├── server.ts               # Express server, WebSocket endpoints & Gemini API service integration
├── dist/                   # Production build output
├── .env.example            # Environment variables template
├── package.json            # Dependencies and npm scripts
├── tsconfig.json           # TypeScript configuration
└── vite.config.ts          # Vite configuration
```

---

## 💡 Features Walkthrough

1. **Interactive Chat & Advice:** Ask Byte or switch personas to analyze Git issues, review branch drift, or safely resolve conflicts.
2. **Scenario Switcher:** Select scenarios like *Behind Main (Branch Drift)*, *Merge Conflict*, or *Clean Repo* to test AI recommendations.
3. **Live Voice & Vision:** Click the microphone icon to initiate a Gemini Live WebSocket audio/video session.
4. **Pet Image Studio:** Click the palette/avatar icon to generate custom pet avatars with custom prompts.
5. **Pitch Deck Mode:** Click the "Pitch Deck" button in the navigation header to open an interactive slide presentation detailing the project's architecture, value proposition, and roadmap.
6. **Live Telemetry & Health:** Query `/api/health` and `/api/audit-logs` for real-time observability into model latency and audited actions.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

