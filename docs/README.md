# Functional Specification Document: KubePet

## 1. Executive Summary & Core Philosophy

Traditional observability tools force engineers to correlate metrics, logs, and alerts under pressure. That work delays the first safe response during an incident.\
KubePet is an incident copilot with ambient awareness. It turns Kubernetes signals into an expressive pet state, explains the likely cause with evidence, and proposes one safe recovery action for human approval.<br>

KubePet follows a simple incident loop:<br>

1. **Notice:** The pet makes cluster health visible from across the room.<br>
2. **Understand:** The operator receives an evidence-based explanation in plain language.<br>
3. **Recover:** The operator approves a bounded, reversible remediation action.<br>

#### 2. Product Objectives & Target Metrics



* Sub-Second Ambient Status: Enable any engineer across the room to discern whether the cluster is healthy, degraded, or failing based on pet posture, mood, and canvas color palette.<br>
* Lower-Cognitive-Load Triage: Reduce early investigation effort through plain-language, evidence-based explanations.<br>
* Human-Approved Recovery: Let the AI propose one bounded, reversible tool call that requires operator confirmation.<br>
* Explainable Recommendations: Show the signals, confidence, expected impact, and rollback path for every action.<br>
* Reliability Practice: Reinforce evidence review, verified recovery, and post-incident follow-through.<br>

#### 3. Core Mechanics & State Machine



**Health & Emotional State Mapping**



The pet state combines two vectors: **Health** and **Symptom**. Health conveys urgency. Symptoms reveal the failure pattern.<br>

| **Health**  | **Health %** | **Visual treatment**         | **Operator meaning** |
| ----------- | ------------ | ---------------------------- | -------------------- |
| Healthy     | 90–100%      | Relaxed, playful, green glow | Normal operation     |
| Degraded    | 60–89%       | Uneasy, amber pulse          | Investigate soon     |
| Critical    | 1–59%        | Distressed, red pulse        | Act now              |
| Unavailable | 0%           | Still, grayscale             | Service outage       |

| **Symptom** | **Pet expression**      | **Example signal**                |
| ----------- | ----------------------- | --------------------------------- |
| Overloaded  | Sweating, sprinting     | CPU saturation and rising latency |
| Memory sick | Nauseous, spinning eyes | OOM kills and restart loops       |
| Isolated    | Shivering or frozen     | Node `NotReady`                   |
| Unavailable | Ghostly or still        | No healthy serving pods           |

**Reliability Practice**



Reliability mechanics reward safe operations, not fast clicks. They remain secondary to incident response.<br>

* Evidence Review: Award a Reliability Streak when the operator reviews the recommendation evidence.<br>
* Verified Recovery: Award progress only after health signals return to baseline.<br>
* Incident Closure: Award Runbook Mastery for completing the concise incident summary.<br>

#### 4. End-to-End User Experience & Interaction Loop



```
  [ Healthy Pet ]  --->  ( Incident Triggered )  --->  [ Pet Signals Distress ]
         ^                                                       |
         |                                                       v
  [ Verified Recovery ] <--- ( Operator Approves ) <--- [ Evidence-Based Diagnosis ]
```

**1. Idle Ambient Monitoring**



* The operator keeps KubePet open on an ambient monitor or pinned browser tab.<br>
* The pet idles peacefully while health metrics sit at baseline.<br>
* A minimalist top telemetry bar displays Cluster Health, Latency, and Reliability Streak.<br>

**2. Anomaly Ingestion & Emotional Shift**



* An infrastructure fault occurs (or is simulated via the Chaos Engine).<br>
* The health bar depletes, ambient UI accents transition to warning colors, and the pet immediately shifts into its distress animation.<br>

**3. Conversational Root-Cause Analysis**



* The user opens the chat box: _"What's hurting?"_ or _"Status report!"_\
  <br>
*   The LLM ingests the structured incident payload and responds in character with supporting signals:<br>

    > _"I am overwhelmed. `checkout-service` is using 98% CPU, 504 responses increased 420%, and all 2 pods are busy. This is capacity saturation."_\
    > <br>

**4. Agentic Remediation & Approval Gate**



*   The AI generates one concrete, bounded tool-execution proposal:<br>

    > **Recommended action:** `scale_deployment(service="checkout-service", replicas=8)`\\
    >
    > **Confidence:** High\\
    >
    > **Expected result:** Reduce CPU pressure and 504 responses.\\
    >
    > **Rollback:** Scale the deployment back to 2 replicas.\
    > <br>
* The UI shows evidence, confidence, expected impact, and rollback before the action card.<br>
* The UI renders an interactive \[Confirm & Heal] action card within the chat stream.<br>
* Upon user click, the agent triggers the mock remediation endpoint.<br>
* The pet recovers only after signals return to baseline.<br>
* The UI then shows a concise incident summary and verified-recovery state.<br>

#### 5. Live Demo Scenarios (The Chaos Matrix)



The hackathon MVP perfects one deterministic scenario: a traffic spike. It demonstrates the complete notice-understand-recover loop in under 90 seconds.<br>

```
+-----------------------------------------------------------------------------------+
|                                 CHAOS SCENARIO MATRIX                             |
+-----------------------------------------------------------------------------------+
| Scenario         | MVP Status      | AI Diagnosis             | Target Tool Call  |
+------------------+-----------------+--------------------------+-------------------+
| Traffic Spike    | Full demo       | Checkout capacity issue  | scale_replicas    |
| Memory Leak      | Scenario card   | OOM kill loop in Auth    | rollback_version  |
| Dead Node        | Scenario card   | Node NotReady            | cordon_and_drain  |
+-----------------------------------------------------------------------------------+
```

**MVP scenario: Black Friday Traffic Surge**



* Telemetry Profile: Request rate surges 500%, CPU spikes to 100%, HTTP 504 timeouts spike.<br>
* Pet Emotion: Hyperventilating, sprinting on a hamster wheel, sweat drops.<br>
* AI Explanation: _"Too many people are knocking at the door. `checkout-service` has only 2 pods, CPU is 98%, and 504s increased 420%."_\
  <br>
* Agentic Action: `scale_deployment(service="checkout-service", replicas=8)`.<br>
* Verification: CPU falls below 60%, latency normalizes, and 504 responses return to baseline.<br>

**Demo sequence**



1. Show the calm pet and healthy checkout service.<br>
2. Trigger the traffic spike and show the immediate visual shift.<br>
3. Ask for a status report and review the evidence-backed recommendation.<br>
4. Approve scaling, verify recovery, and display the incident summary.<br>

#### 6. UI & Visual Design Specification



The UI follows a strict Minimalist Neumorphic / Flat-Modern web styling guide to avoid visual noise:<br>

* Color Palette:<br>
  * _Canvas Background:_ Slate Light (`#F8FAFC`) / Off-White (`#FAF9F7`)<br>
  * _Card Surfaces:_ Pure White (`#FFFFFF`) with subtle border lines (`#E2E8F0`)<br>
  * _Accent Primaries:_ Vibrant SRE Blue (`#2563EB`) and Emerald Healthy (`#10B981`)<br>
  * _Alert Accents:_ Amber Degraded (`#F59E0B`) and Crimson Outage (`#EF4444`)<br>
* Layout Topology:<br>
  * Top Bar (Header): Pet Name, Reliability Streak, and Global Status Chip (Healthy / Degraded / Critical / Unavailable).<br>
  * Center Canvas: The pet stage, symptom expression, and health aura.<br>
  * Bottom Section: A streamlined chat stream with an evidence and approval card.<br>
  * Debug Drawer: An expandable panel for raw mock telemetry during the live presentation.<br>

#### 7. Team Sprint Division (8-Hour Hackathon Plan)



```
[ Track A: UI & Visuals ] ----> Component Library ----> Canvas & Pet Animation ----+
                                                                                  |
[ Track B: AI & Tools ]   ----> Prompt Engineering  --> Function Call Engine  -----+---> [ Integration &
                                                                                  |       Demo Rehearsal ]
[ Track C: State Engine ] ----> Mock Backend REST   --> State Transitions     ----+
                                                                                  |
[ Track D: Narrative ]    ----> Pitch Deck Design   --> Mock Log Generation   ----+
```

* Role 1: Frontend & Visual Experience (UI Lead)<br>
  * Build main canvas, responsive layout, animated pet container, and chat log component.<br>
  * Implement ambient styling transitions based on backend state.<br>
* Role 2: Prompt Engineering & LLM Routing (AI Lead)<br>
  * Construct a persona-driven prompt that cites incident evidence and confidence.<br>
  * Wire the `scale` tool call to the mock recovery endpoint.<br>
* Role 3: State Machine & REST Engine (Backend Lead)<br>
  * Build lightweight state API with endpoints: `GET /status`, `POST /chaos/:scenarioId`, and `POST /remediate`.<br>
  * Implement the traffic-spike state transition and post-remediation verification.<br>
* Role 4: Scenario Content & Pitch Strategy (Product/Pitch Lead)<br>
  * Write the realistic traffic-spike payload and evidence narrative.<br>
  * Construct a high-impact 5-slide pitch deck and rehearse the 90-second demo.<br>

#### 8. Explicit Out-Of-Scope Guardrails



To ensure complete delivery within the 8-hour sprint window, the following are strictly prohibited:<br>

* Connecting live cloud providers (AWS, GCP, live Kubernetes clusters).<br>
* Persistent databases or multi-tenant user authentication.<br>
* Real-time voice-to-text / text-to-speech pipelines.<br>
* Autonomous background time-decay mechanics (state must remain stable until deliberately triggered).
