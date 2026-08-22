# Software Bill of Materials (SBOM) & Supply Chain Security

**Project:** GitPet (Ribbon DevSecOps Assistant)  
**License:** MIT License  
**Compliance Standard:** OpenSSF Supply Chain Security Guidelines / CycloneDX Compatible

---

## 1. Direct Dependencies & Licensing

| Package Name | Version | License | Ecosystem | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `@google/genai` | `^0.1.2` | Apache-2.0 | npm | Official Google Gemini & Imagen Generative AI SDK |
| `react` | `^19.0.0` | MIT | npm | Reactive UI rendering engine |
| `react-dom` | `^19.0.0` | MIT | npm | DOM renderer for React 19 |
| `express` | `^4.21.2` | MIT | npm | Backend HTTP & REST API server |
| `ws` | `^8.18.0` | MIT | npm | WebSocket client & server for low-latency live audio streaming |
| `motion` | `^12.4.2` | MIT | npm | Smooth hardware-accelerated animations for pet stage & UI |
| `lucide-react` | `^0.475.0` | ISC | npm | Accessible UI icon library |
| `canvas-confetti` | `^1.9.3` | ISC | npm | Streak celebration and level-up visual effects |
| `clsx` | `^2.1.1` | MIT | npm | Conditional CSS class merging utility |
| `tailwind-merge` | `^3.0.1` | MIT | npm | Conflict-free Tailwind class resolution |
| `dotenv` | `^16.4.7` | BSD-2-Clause | npm | Environment variable management |

---

## 2. Development & Tooling Dependencies

| Package Name | Version | License | Purpose |
| :--- | :--- | :--- | :--- |
| `vite` | `^6.1.0` | MIT | Next-generation frontend build tooling and HMR dev server |
| `typescript` | `~5.7.2` | Apache-2.0 | Static type safety and contract enforcement |
| `vitest` | `^3.0.5` | MIT | Unit and adversarial security test runner |
| `tailwindcss` | `^4.0.6` | MIT | Utility-first CSS styling engine |
| `esbuild` | `^0.25.0` | MIT | Ultra-fast Node server bundling |
| `tsx` | `^4.19.2` | MIT | TypeScript execution engine for development |

---

## 3. Supply Chain Security Controls

1. **Automated Vulnerability Auditing:** Continuous `npm audit` run in CI/CD pipeline.
2. **Deterministic Locking:** `package-lock.json` and `bun.lock` committed to prevent dependency drift or unverified version resolution.
3. **Reproducible SBOM Extraction:** Generate a fresh complete JSON dependency inventory at any time with:
   ```bash
   npm run sbom
   # Output generated to sbom-inventory.json
   ```
