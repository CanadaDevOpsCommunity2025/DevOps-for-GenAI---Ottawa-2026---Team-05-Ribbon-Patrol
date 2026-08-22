# Functional Specification Document: GitPet

## 1. Executive Summary & Core Philosophy

Repository work often hides important context across branches, remotes, and local changes. GitPet makes that state visible without requiring a terminal-first investigation.\
GitPet is a repository management companion with ambient awareness. It maps repository signals to an expressive pet state. It explains issues clearly and proposes one safe Git action for approval.<br>

GitPet follows a simple repository loop:<br>

1. **Notice:** The pet makes repository health visible at a glance.<br>
2. **Understand:** The developer receives an evidence-based explanation in plain language.<br>
3. **Resolve:** The developer approves a bounded, reversible repository action.<br>

#### 2. Product Objectives & Target Metrics

* **At-a-glance repository status:** Surface healthy, attention, and blocked states through posture, mood, and color.<br>
* **Lower cognitive load:** Explain branch divergence, conflicts, and uncommitted work in plain language.<br>
* **Human-approved actions:** Require confirmation for every write operation.<br>
* **Explainable recommendations:** Show repository evidence, expected impact, and reversal steps.<br>
* **Safer Git habits:** Reward review, clean handoffs, and verified repository state.<br>

#### 3. Core Mechanics & State Machine

**Health & Emotional State Mapping**

The pet state combines **Repository Health** and **Repository Symptom**. Health conveys urgency. Symptoms identify the repository condition.<br>

| **Health** | **Health %** | **Visual treatment**         | **Operator meaning**                        |
| ---------- | ------------ | ---------------------------- | ------------------------------------------- |
| Healthy    | 90–100%      | Relaxed, playful, green glow | Branch is synchronized and clean            |
| Attention  | 60–89%       | Uneasy, amber pulse          | Review local or remote differences          |
| Blocked    | 1–59%        | Distressed, red pulse        | Resolve a conflict or protect work          |
| Unsafe     | 0%           | Still, grayscale             | Action could lose work without intervention |

| **Symptom**    | **Pet expression**  | **Repository signal**                     |
| -------------- | ------------------- | ----------------------------------------- |
| Behind remote  | Pulling on a leash  | Local branch is behind its upstream       |
| Unpushed work  | Carrying a backpack | Commits or changes exist only locally     |
| Merge conflict | Tangled yarn        | Conflicting files block a merge or rebase |
| Stale branch   | Sleepy and dusty    | Branch is merged or inactive              |
| Detached HEAD  | Looking lost        | HEAD does not point to a named branch     |

**Repository practice**

Practice mechanics reward safe repository work, not fast clicks. They remain secondary to the task at hand.<br>

* **Change review:** Award a Clean Commit streak when the developer reviews a proposed diff.<br>
* **Verified sync:** Award progress after branch status is confirmed clean and synchronized.<br>
* **Safe handoff:** Award Branch Stewardy for merging or archiving a branch with clear context.<br>

#### 4. End-to-End User Experience & Interaction Loop

```
  [ Healthy Pet ]  --->  ( Repository Changes )  --->  [ Pet Signals a Symptom ]
         ^                                                       |
         |                                                       v
  [ Verified Repository ] <--- ( Developer Approves ) <--- [ Evidence-Based Guidance ]
```

**1. Idle repository awareness**

* The developer keeps GitPet open beside their editor or terminal.<br>
* The pet idles while the active branch is clean and synchronized.<br>
* A compact top bar displays repository, branch, sync status, and Clean Commit streak.<br>

**2. Repository change and emotional shift**

* A repository event occurs, such as remote commits, uncommitted changes, or a merge conflict.<br>
* The health bar changes, ambient accents shift, and the pet adopts a matching expression.<br>

**3. Conversational repository guidance**

* The developer opens the chat: _"What needs attention?"_ or _"Status report!"_\
  <br>
*   The assistant reads structured repository metadata and responds with supporting signals:<br>

    > _"`feature/cart` is three commits behind `origin/feature/cart`. You also have two uncommitted files. Save or stash those changes before pulling."_\
    > <br>

**4. Safe action and approval gate**

*   The assistant generates one concrete, bounded repository action:<br>

    > **Recommended action:** Stash local changes, then pull from `origin/feature/cart`.\\
    >
    > **Confidence:** High\\
    >
    > **Expected result:** Preserve local work and synchronize the branch.\\
    >
    > **Reversal:** Restore the stash after the pull.\
    > <br>
* The UI shows evidence, confidence, expected impact, and reversal before the action card.<br>
* The UI renders a **Preview changes** view before approval.<br>
* The developer can inspect affected files, commits, and branch movement.<br>
* The UI renders an interactive **Confirm & tidy** action card in the chat stream.<br>
* The pet recovers only after repository status is rechecked.<br>
* The UI then shows a concise repository summary and verified state.<br>

#### 5. Live Demo Scenarios (The Repository Matrix)

The hackathon MVP perfects one deterministic scenario: a branch synchronization conflict. It demonstrates the complete notice-understand-resolve loop in under 90 seconds.<br>

```
+-----------------------------------------------------------------------------------+
|                              REPOSITORY SCENARIO MATRIX                           |
+-----------------------------------------------------------------------------------+
| Scenario         | MVP Status      | GitPet guidance          | Target action     |
+------------------+-----------------+--------------------------+-------------------+
| Behind + changes | Full demo       | Protect local work first | stash then pull   |
| Merge conflict   | Scenario card   | Resolve two changed files| open diff         |
| Stale branch     | Scenario card   | Branch is already merged | archive branch    |
+-----------------------------------------------------------------------------------+
```

**MVP scenario: Remote updates with local work**

* Repository profile: The remote branch gains three commits. Two local files remain uncommitted.<br>
* Pet emotion: Carrying an overfilled backpack and pulling toward the remote.<br>
* GitPet explanation: _"`feature/cart` is behind by three commits. Your local edits are not committed. Stash them before pulling to avoid mixing unfinished work with incoming changes."_\
  <br>
* Proposed action: Stash local changes, then pull remote commits.<br>
* Verification: The branch matches its upstream and the local work remains recoverable.<br>

**Demo sequence**

1. Show the calm pet and a clean, synchronized branch.<br>
2. Trigger remote commits and local edits. Show the visual shift.<br>
3. Ask for a status report. Review the evidence-backed recommendation.<br>
4. Preview and approve the safe action. Verify synchronization and preserved work.<br>

#### 6. UI & Visual Design Specification

The UI follows a strict Minimalist Neumorphic / Flat-Modern web styling guide to avoid visual noise:<br>

* Color Palette:<br>
  * _Canvas Background:_ Slate Light (`#F8FAFC`) / Off-White (`#FAF9F7`)<br>
  * _Card Surfaces:_ Pure White (`#FFFFFF`) with subtle border lines (`#E2E8F0`)<br>
  * _Accent Primaries:_ Repository Blue (`#2563EB`) and Sync Green (`#10B981`)<br>
  * _Attention Accents:_ Amber (`#F59E0B`) and Conflict Crimson (`#EF4444`)<br>
* Layout Topology:<br>
  * Top Bar (Header): Pet name, repository, current branch, and status chip.<br>
  * Center Canvas: The pet stage, symptom expression, and health aura.<br>
  * Bottom Section: A streamlined chat stream with evidence and approval cards.<br>
  * Repository Drawer: An expandable panel for branch, commit, and working-tree details.<br>

#### 7. Team Sprint Division (8-Hour Hackathon Plan)

```
[ Track A: UI & Visuals ] ----> Component Library ----> Canvas & Pet Animation ----+
                                                                                  |
[ Track B: AI & Tools ]   ----> Prompt Engineering  --> Git Action Engine     -----+---> [ Integration &
                                                                                  |       Demo Rehearsal ]
[ Track C: State Engine ] ----> Mock Repository API --> State Transitions     ----+
                                                                                  |
[ Track D: Narrative ]    ----> Pitch Deck Design   --> Mock Repository Data  ----+
```

* Role 1: Frontend & Visual Experience (UI Lead)<br>
  * Build main canvas, responsive layout, animated pet container, and chat log component.<br>
  * Implement ambient styling transitions based on backend state.<br>
* Role 2: Prompt Engineering & LLM Routing (AI Lead)<br>
  * Construct a persona-driven prompt that cites repository evidence and confidence.<br>
  * Wire approved repository actions to the mock state engine.<br>
* Role 3: State Machine & REST Engine (Backend Lead)<br>
  * Build a lightweight repository-state service for status, scenarios, and actions.<br>
  * Implement branch divergence, local edits, and post-action verification.<br>
* Role 4: Scenario Content & Pitch Strategy (Product/Pitch Lead)<br>
  * Write realistic branch-divergence data and an evidence narrative.<br>
  * Construct a high-impact 5-slide pitch deck and rehearse the 90-second demo.<br>

#### 8. Explicit Out-Of-Scope Guardrails

To ensure complete delivery within the 8-hour sprint window, the following are strictly prohibited:<br>

* Kubernetes, observability dashboards, infrastructure alerts, and deployment pipelines.<br>
* Automatic pushes, merges, rebases, resets, or deletions without developer approval.<br>
* Live repository hosting integrations for the MVP.<br>
* Persistent databases or multi-tenant user authentication.<br>
* Autonomous actions or background state changes.<br>
