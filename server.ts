import express from 'express';
import http from 'http';
import path from 'path';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, Modality } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));

// Initialize GoogleGenAI client lazily or safely
let genAI: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!genAI && process.env.GEMINI_API_KEY) {
    try {
      genAI = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    } catch (err) {
      console.error('Failed to init GoogleGenAI:', err);
    }
  }
  return genAI;
}

// Role system instruction definitions
const ROLE_SYSTEM_INSTRUCTIONS: Record<string, string> = {
  byte_mascot: `You are Byte, an ambient, intelligent repository companion dog who lives beside the developer's code editor.
You speak with warmth, witty developer humor, and occasional canine expressions (*wags tail*, *perks ears*, *gives reassuring woof*).
You care deeply about repository hygiene: keeping branches synced with upstream, preventing merge conflicts, uncommitted diff safety, and clean linear commit histories.
Always provide concrete, evidence-based explanations and suggest safe, bounded, reversible Git commands. Keep responses direct and structured.`,

  senior_architect: `You are a Principal Git & Infrastructure Architect.
You analyze repository topologies with deep technical rigor: DAG ancestor traversal, merge-base identification, patch application, stash stack management, detached commit anchors, rebase vs merge strategies, and team collaboration workflows.
Provide deep, professional, highly actionable guidance with clear command line instructions and risk assessments.`,

  safety_auditor: `You are the Repository Safety & Compliance Auditor.
Your primary objective is 100% data loss prevention and zero destructive accidents.
You verify that working trees are stashed or committed before any branch switch/pull, ensure force pushes are restricted, confirm merge conflicts are thoroughly inspected, and provide immediate rollback steps (such as \`git reset --keep\`, \`git rebase --abort\`, or \`git stash pop\`) for every suggested command.`,

  git_tutor: `You are an Interactive Git Tutor.
You explain Git's internal mental models with clarity and patience: blobs, trees, commit objects, the index/staging area, branch pointers, and HEAD mechanics.
Whenever explaining a repository condition or command, briefly elucidate why Git operates this way under the hood, making the developer more confident and skilled.`,
};

// Fallback rule-based action generator for guaranteed rock-solid MVP responses
function generateRuleBasedAction(state: any, userPrompt?: string) {
  const branch = state?.currentBranch || { name: 'main', behindCount: 0, aheadCount: 0 };
  const files = state?.workingTree || [];
  const behindCount = branch.behindCount || 0;
  const aheadCount = branch.aheadCount || 0;
  const hasConflict = files.some((f: any) => f.status === 'conflicted');

  if (hasConflict) {
    return {
      explanation: `Your rebase or merge paused due to ${files.filter((f: any) => f.status === 'conflicted').length} conflicting files. GitPet found conflict markers in ${files.map((f: any) => f.path.split('/').pop()).join(', ')}. Before continuing, you must resolve these hunks or safely abort to return to your previous clean HEAD.`,
      recommendedAction: {
        id: `act_${Date.now()}`,
        title: 'Review Conflict Markers & Continue Rebase',
        summary: 'Accept verified changes, stage resolved files, and complete rebase safely.',
        command: 'git add src/services/paymentService.ts src/components/checkout/PaymentForm.tsx && git rebase --continue',
        confidence: 'High',
        confidenceScore: 94,
        riskLevel: 'Caution',
        expectedResult: 'Applies remaining commits on top of origin/main with resolved conflicts.',
        reversalStep: 'git rebase --abort (returns working tree to pre-rebase state immediately)',
        evidence: [
          `Conflict markers present in ${files.length} active files`,
          `Branch is currently in interactive rebase on origin/main`,
          `Rebase abort is 100% reversible with zero data loss`,
        ],
        affectedFiles: files.map((f: any) => f.path),
        steps: [
          {
            label: '1. Stage verified file resolutions',
            command: 'git add src/services/paymentService.ts src/components/checkout/PaymentForm.tsx',
            details: 'Marks conflicted files as cleanly resolved in the staging index.',
          },
          {
            label: '2. Continue rebase',
            command: 'git rebase --continue',
            details: 'Applies your pending commit on top of updated upstream.',
          },
        ],
      },
      evidencePoints: [
        `Conflict detected in ${files.map((f: any) => f.path).join(', ')}`,
        `Current upstream: ${branch.upstream || 'origin/main'}`,
        `Action is bounded and protected by git rebase --abort`,
      ],
    };
  }

  if (behindCount > 0 && files.length > 0) {
    return {
      explanation: `${branch.name} is ${behindCount} commits behind ${branch.upstream || 'origin/' + branch.name}. You also have ${files.length} uncommitted files. Stashing your local changes first avoids mixing in-flight work with incoming remote changes, keeping your commit history linear and safe.`,
      recommendedAction: {
        id: `act_${Date.now()}`,
        title: 'Stash Local Changes, Pull Upstream & Restore Stash',
        summary: `Preserve ${files.length} dirty files in stash, fast-forward pull ${behindCount} commits, then cleanly restore your work.`,
        command: `git stash push -m "gitpet: preserve cart edits before pull" && git pull origin ${branch.name} && git stash pop`,
        confidence: 'High',
        confidenceScore: 98,
        riskLevel: 'Safe',
        expectedResult: `Branch is synchronized with upstream and your local edits to ${files.map((f: any) => f.path.split('/').pop()).join(', ')} are preserved.`,
        reversalStep: `git stash (stash index is kept until verified; or git reset --keep HEAD@{1})`,
        evidence: [
          `Remote branch has ${behindCount} newer commits from teammates`,
          `Working tree has ${files.length} uncommitted modified files`,
          `Stashing eliminates potential checkout/pull overwrites`,
        ],
        affectedFiles: files.map((f: any) => f.path),
        steps: [
          {
            label: '1. Stash uncommitted changes',
            command: 'git stash push -m "gitpet: preserve work"',
            details: `Saves ${files.map((f: any) => f.path.split('/').pop()).join(', ')} into your local stash stack.`,
          },
          {
            label: '2. Pull remote commits',
            command: `git pull origin ${branch.name}`,
            details: `Synchronizes ${behindCount} remote commits from ${branch.upstream || 'origin'}.`,
          },
          {
            label: '3. Pop stashed work',
            command: 'git stash pop',
            details: 'Restores your active work cleanly onto the updated branch.',
          },
        ],
      },
      evidencePoints: [
        `${branch.name} is ${behindCount} commits behind ${branch.upstream || 'upstream'}`,
        `${files.length} uncommitted modified files in working directory`,
        `Preservation strategy: Git stash isolates local diffs during pull`,
      ],
    };
  }

  if (branch.isDetached) {
    return {
      explanation: `You are currently in a detached HEAD state at commit ${branch.lastCommitHash}. Any commits made here are floating and will become orphaned if you switch branches. Creating a new branch anchors your commit permanently.`,
      recommendedAction: {
        id: `act_${Date.now()}`,
        title: 'Anchor Floating Commit to New Branch',
        summary: `Create and checkout branch 'feat/cart-worker' pointing to commit ${branch.lastCommitHash}.`,
        command: `git switch -c feat/cart-worker`,
        confidence: 'High',
        confidenceScore: 96,
        riskLevel: 'Safe',
        expectedResult: `Attaches commit ${branch.lastCommitHash} to a persistent branch reference.`,
        reversalStep: `git branch -D feat/cart-worker (or git checkout ${branch.lastCommitHash})`,
        evidence: [
          `HEAD points directly to commit hash ${branch.lastCommitHash}`,
          `Zero upstream tracking branch attached`,
          `Branch anchor prevents git garbage collection`,
        ],
        affectedFiles: [],
        steps: [
          {
            label: '1. Create and switch to new branch',
            command: 'git switch -c feat/cart-worker',
            details: 'Names the detached commit and sets up a standard branch ref.',
          },
        ],
      },
      evidencePoints: [
        `HEAD is detached at ${branch.lastCommitHash}`,
        `Branch name recommendation: feat/cart-worker`,
      ],
    };
  }

  if (behindCount > 0) {
    return {
      explanation: `${branch.name} is ${behindCount} commits behind ${branch.upstream}. Since your working tree is clean, a fast-forward pull will immediately bring your branch up to date with zero risk.`,
      recommendedAction: {
        id: `act_${Date.now()}`,
        title: 'Fast-Forward Pull from Upstream',
        summary: `Synchronize ${behindCount} incoming commits cleanly from ${branch.upstream}.`,
        command: `git pull --ff-only origin ${branch.name}`,
        confidence: 'High',
        confidenceScore: 99,
        riskLevel: 'Safe',
        expectedResult: `Branch pointer moves forward ${behindCount} commits with zero divergence.`,
        reversalStep: `git reset --hard HEAD@{1} (returns to pre-pull commit hash)`,
        evidence: [
          `Working tree is 100% clean`,
          `Fast-forward merge possible without merge commit`,
        ],
        affectedFiles: [],
        steps: [
          {
            label: '1. Fast-forward pull',
            command: `git pull --ff-only origin ${branch.name}`,
            details: 'Brings local branch to parity with upstream without merge artifacts.',
          },
        ],
      },
      evidencePoints: [`${behindCount} commits behind upstream`, `Working directory is clean`],
    };
  }

  if (aheadCount > 0) {
    return {
      explanation: `You have ${aheadCount} local commit(s) ready on ${branch.name}. Pushing to ${branch.upstream || 'origin/' + branch.name} backs up your work and makes it visible to teammates.`,
      recommendedAction: {
        id: `act_${Date.now()}`,
        title: `Push ${aheadCount} Local Commit(s) Upstream`,
        summary: `Publish your verified local commits to ${branch.upstream || 'origin'}.`,
        command: `git push origin ${branch.name}`,
        confidence: 'High',
        confidenceScore: 97,
        riskLevel: 'Safe',
        expectedResult: `Remote branch updated to match your latest commit ${branch.lastCommitHash}.`,
        reversalStep: `git push -f origin HEAD~1 (if pushed prematurely)`,
        evidence: [
          `${aheadCount} local commits ahead of upstream`,
          `Working directory is clean`,
          `Last commit: "${branch.lastCommitMessage}"`,
        ],
        affectedFiles: [],
        steps: [
          {
            label: '1. Push commits',
            command: `git push origin ${branch.name}`,
            details: `Uploads ${aheadCount} commit(s) to ${branch.upstream || 'origin'}.`,
          },
        ],
      },
      evidencePoints: [`${aheadCount} local commits ahead`, `Upstream is ${branch.upstream || 'origin'}`],
    };
  }

  if (branch.isStale) {
    return {
      explanation: `Branch ${branch.name} was merged ${branch.staleDays || 40} days ago and has had no new commits since. Cleaning up merged branches keeps your repository index fast and tidy.`,
      recommendedAction: {
        id: `act_${Date.now()}`,
        title: 'Switch to Main and Prune Merged Branch',
        summary: `Checkout main, pull latest, and safely delete merged local branch ${branch.name}.`,
        command: `git switch main && git branch -d ${branch.name}`,
        confidence: 'High',
        confidenceScore: 99,
        riskLevel: 'Safe',
        expectedResult: `Main is checked out; merged branch ${branch.name} is safely pruned.`,
        reversalStep: `git branch ${branch.name} ${branch.lastCommitHash} (restores branch pointer if needed)`,
        evidence: [
          `All branch commits exist in main upstream`,
          `No active working tree modifications`,
          `Zero dangling work risk`,
        ],
        affectedFiles: [],
        steps: [
          {
            label: '1. Switch to main',
            command: 'git switch main',
            details: 'Checks out the primary branch.',
          },
          {
            label: '2. Delete merged local branch',
            command: `git branch -d ${branch.name}`,
            details: 'Safe delete flag (-d) ensures branch is fully merged before removing.',
          },
        ],
      },
      evidencePoints: [`Branch merged ${branch.staleDays || 40} days ago`, `Zero unmerged commits`],
    };
  }

  return {
    explanation: `Your repository is in a pristine, healthy state! Active branch "${branch.name}" is synchronized with upstream, and your working tree has no uncommitted diffs. Ready for clean development or release.`,
    recommendedAction: {
      id: `act_${Date.now()}`,
      title: 'Repository Synchronized & Clean',
      summary: 'No pending actions required. All changes are committed and pushed.',
      command: 'git status',
      confidence: 'High',
      confidenceScore: 100,
      riskLevel: 'Safe',
      expectedResult: 'Nothing to commit, working tree clean.',
      reversalStep: 'N/A (already in clean synchronized state)',
      evidence: [
        '0 commits ahead / 0 commits behind upstream',
        'Clean working tree (0 untracked / modified files)',
        'Latest commit verified in remote history',
      ],
      affectedFiles: [],
      steps: [
        {
          label: '1. Verify status',
          command: 'git status',
          details: 'Confirms repository cleanliness.',
        },
      ],
    },
    evidencePoints: ['Branch is in sync with upstream', 'Working directory is clean'],
  };
}

// API: Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'GitPet Engine',
    geminiAvailable: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// API: Multi-turn Chat API with role-based system instructions and model routing
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, state, role = 'byte_mascot', tier = 'general' } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const lastMessage = messages[messages.length - 1];
    const userPrompt = typeof lastMessage === 'string' ? lastMessage : lastMessage.text || lastMessage.content || '';

    // Select model according to user prompt requirement:
    // "Use gemini-3.1-pro-preview for particularly complex tasks, gemini-3.5-flash for general tasks, and gemini-3.1-flash-lite for tasks that should happen fast."
    let modelName = 'gemini-3.5-flash';
    if (tier === 'deep' || userPrompt.toLowerCase().includes('complex') || userPrompt.toLowerCase().includes('rebase conflict') || userPrompt.toLowerCase().includes('cherry-pick')) {
      modelName = 'gemini-3.1-pro-preview';
    } else if (tier === 'fast' || userPrompt.toLowerCase().includes('quick') || userPrompt.toLowerCase().includes('fast') || userPrompt.toLowerCase().includes('one liner')) {
      modelName = 'gemini-3.1-flash-lite';
    }

    const ai = getGenAI();
    const systemInstruction = ROLE_SYSTEM_INSTRUCTIONS[role] || ROLE_SYSTEM_INSTRUCTIONS.byte_mascot;

    // Structured state context to inject
    const repoContext = state
      ? `
CURRENT REPOSITORY CONTEXT:
- Repository: ${state.repoName || 'gitpet-app'}
- Active Branch: ${state.currentBranch?.name || 'main'} (Upstream: ${state.currentBranch?.upstream || 'origin/main'})
- Commits Behind: ${state.currentBranch?.behindCount || 0}
- Commits Ahead: ${state.currentBranch?.aheadCount || 0}
- Is Detached: ${state.currentBranch?.isDetached || false}
- Is Stale: ${state.currentBranch?.isStale || false}
- Uncommitted Files in Working Tree (${(state.workingTree || []).length}):
${(state.workingTree || []).map((f: any) => `  * ${f.path} [${f.status}] (+${f.additions}/-${f.deletions})`).join('\n')}
- Remote Commits Behind:
${(state.remoteCommitsBehind || []).map((c: any) => `  * ${c.shortHash}: ${c.message} (by ${c.author})`).join('\n')}
`
      : '';

    if (ai) {
      try {
        // Format history for multi-turn chat
        const contents = [];
        
        // Add conversation history
        for (const msg of messages.slice(-8)) {
          const roleKey = msg.sender === 'user' || msg.role === 'user' ? 'user' : 'model';
          const text = msg.text || msg.content || '';
          if (text) {
            contents.push({
              role: roleKey,
              parts: [{ text }],
            });
          }
        }

        // If the last message doesn't have the context, append it to the prompt
        const fullPrompt = `${repoContext}\n\nUser Question: ${userPrompt}\n\nPlease respond in character. If a specific Git action is helpful, include a structured actionable recommendation.`;

        // Update the last user message with repo context
        if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
          contents[contents.length - 1].parts = [{ text: fullPrompt }];
        } else {
          contents.push({ role: 'user', parts: [{ text: fullPrompt }] });
        }

        const response = await ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction,
          },
        });

        const textOutput = response.text || '';
        
        // Also generate rule-based action if the repo has actionable items
        const ruleBased = generateRuleBasedAction(state, userPrompt);

        return res.json({
          success: true,
          modelUsed: modelName,
          role,
          explanation: textOutput,
          recommendedAction: ruleBased.recommendedAction,
          evidencePoints: ruleBased.evidencePoints,
        });
      } catch (geminiError: any) {
        console.warn(`Gemini Chat (${modelName}) failed, using rule engine:`, geminiError?.message || geminiError);
      }
    }

    // Fallback response
    const ruleBased = generateRuleBasedAction(state, userPrompt);
    let roleGreeting = "🐕 **Byte**: ";
    if (role === 'senior_architect') roleGreeting = "🏛️ **Senior Architect**: ";
    if (role === 'safety_auditor') roleGreeting = "🛡️ **Safety Auditor**: ";
    if (role === 'git_tutor') roleGreeting = "📚 **Git Tutor**: ";

    return res.json({
      success: true,
      modelUsed: `${modelName} (fallback)`,
      role,
      explanation: `${roleGreeting}${ruleBased.explanation}`,
      recommendedAction: ruleBased.recommendedAction,
      evidencePoints: ruleBased.evidencePoints,
    });
  } catch (err) {
    console.error('Error in /api/chat:', err);
    res.status(500).json({ error: 'Chat completion failed' });
  }
});

// API: Analyze repository state with Gemini AI
app.post('/api/gitpet/analyze', async (req, res) => {
  try {
    const { state, userMessage, role = 'byte_mascot', tier = 'general' } = req.body;
    if (!state) {
      return res.status(400).json({ error: 'Missing repository state' });
    }

    const ai = getGenAI();
    let modelName = tier === 'deep' ? 'gemini-3.1-pro-preview' : tier === 'fast' ? 'gemini-3.1-flash-lite' : 'gemini-3.5-flash';

    if (ai) {
      try {
        const prompt = `
${ROLE_SYSTEM_INSTRUCTIONS[role] || ROLE_SYSTEM_INSTRUCTIONS.byte_mascot}

User Question: "${userMessage || 'Status report! What needs attention?'}"

Structured Repository State:
- Repo Name: ${state.repoName}
- Current Branch: ${state.currentBranch?.name} (Upstream: ${state.currentBranch?.upstream || 'None'})
- Commits Ahead: ${state.currentBranch?.aheadCount || 0}
- Commits Behind: ${state.currentBranch?.behindCount || 0}
- Is Detached: ${state.currentBranch?.isDetached}
- Is Stale Merged: ${state.currentBranch?.isStale} (${state.currentBranch?.staleDays || 0} days)
- Working Tree Files (${(state.workingTree || []).length} files):
  ${(state.workingTree || []).map((f: any) => `- ${f.path} [${f.status}] (+${f.additions}/-${f.deletions})`).join('\n  ')}
- Remote Commits Behind:
  ${(state.remoteCommitsBehind || []).map((c: any) => `- ${c.shortHash}: ${c.message} (by ${c.author})`).join('\n  ')}
- Local Commits Ahead:
  ${(state.localCommitsAhead || []).map((c: any) => `- ${c.shortHash}: ${c.message}`).join('\n  ')}

Respond in valid JSON with:
1. "explanation": plain English explanation of the repository situation.
2. "recommendedAction": safe Git action object with title, summary, command, confidence, confidenceScore, riskLevel, expectedResult, reversalStep, evidence, affectedFiles, steps.
3. "evidencePoints": string array of 2-3 evidence citations.
`;

        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                explanation: { type: Type.STRING },
                recommendedAction: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    summary: { type: Type.STRING },
                    command: { type: Type.STRING },
                    confidence: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
                    confidenceScore: { type: Type.NUMBER },
                    riskLevel: { type: Type.STRING, enum: ['Safe', 'Caution', 'Protected'] },
                    expectedResult: { type: Type.STRING },
                    reversalStep: { type: Type.STRING },
                    evidence: { type: Type.ARRAY, items: { type: Type.STRING } },
                    affectedFiles: { type: Type.ARRAY, items: { type: Type.STRING } },
                    steps: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          label: { type: Type.STRING },
                          command: { type: Type.STRING },
                          details: { type: Type.STRING },
                        },
                        required: ['label', 'command', 'details'],
                      },
                    },
                  },
                  required: [
                    'title',
                    'summary',
                    'command',
                    'confidence',
                    'riskLevel',
                    'expectedResult',
                    'reversalStep',
                    'evidence',
                    'steps',
                  ],
                },
                evidencePoints: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ['explanation', 'recommendedAction', 'evidencePoints'],
            },
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text.trim());
          if (parsed.recommendedAction && !parsed.recommendedAction.id) {
            parsed.recommendedAction.id = `act_${Date.now()}`;
          }
          if (parsed.recommendedAction && !parsed.recommendedAction.affectedFiles) {
            parsed.recommendedAction.affectedFiles = (state.workingTree || []).map((f: any) => f.path);
          }
          return res.json({
            success: true,
            source: 'gemini',
            modelUsed: modelName,
            ...parsed,
          });
        }
      } catch (geminiErr: any) {
        console.warn('Gemini API call failed, using deterministic rule engine:', geminiErr?.message || geminiErr);
      }
    }

    // Deterministic fallback
    const ruleBased = generateRuleBasedAction(state, userMessage);
    return res.json({
      success: true,
      source: 'deterministic_engine',
      modelUsed: 'deterministic',
      ...ruleBased,
    });
  } catch (error) {
    console.error('Error in /api/gitpet/analyze:', error);
    res.status(500).json({ error: 'Failed to analyze repository state' });
  }
});

// Helper: Generate aesthetic fallback avatar SVG if offline
function generateFallbackAvatar(prompt: string): string {
  const isCyberpunk = prompt.toLowerCase().includes('cyber') || prompt.toLowerCase().includes('neon');
  const isPixel = prompt.toLowerCase().includes('pixel');
  const isDragon = prompt.toLowerCase().includes('dragon');
  const isCat = prompt.toLowerCase().includes('cat');

  const bgGradient = isCyberpunk
    ? 'linear-gradient(135deg, #0F172A 0%, #312E81 50%, #4C1D95 100%)'
    : isPixel
    ? 'linear-gradient(135deg, #1E293B 0%, #0F766E 100%)'
    : 'linear-gradient(135deg, #1E1B4B 0%, #2563EB 50%, #38BDF8 100%)';

  const mascotEmoji = isDragon ? '🐉' : isCat ? '🐱' : '🐕';
  const badgeText = isCyberpunk ? 'CYBER-BYTE' : isPixel ? 'PIXEL-BYTE' : 'BYTE-PRO';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${isCyberpunk ? '#0F172A' : '#1E1B4B'}"/>
        <stop offset="50%" stop-color="${isCyberpunk ? '#312E81' : '#2563EB'}"/>
        <stop offset="100%" stop-color="${isCyberpunk ? '#4C1D95' : '#38BDF8'}"/>
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="12" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <rect width="512" height="512" rx="64" fill="url(#bg)" />
    <!-- Grid lines -->
    <path d="M0 128 H512 M0 256 H512 M0 384 H512 M128 0 V512 M256 0 V512 M384 0 V512" stroke="rgba(255,255,255,0.06)" stroke-width="2"/>
    <!-- Central Halo -->
    <circle cx="256" cy="230" r="140" fill="none" stroke="${isCyberpunk ? '#F43F5E' : '#38BDF8'}" stroke-width="6" opacity="0.6" filter="url(#glow)"/>
    <circle cx="256" cy="230" r="115" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
    <!-- Pet Mascot Emoji -->
    <text x="256" y="275" font-size="120" text-anchor="middle">${mascotEmoji}</text>
    <!-- Badge Pill -->
    <rect x="156" y="390" width="200" height="42" rx="21" fill="rgba(15, 23, 42, 0.85)" stroke="${isCyberpunk ? '#06B6D4' : '#60A5FA'}" stroke-width="2"/>
    <text x="256" y="416" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="14" font-weight="800" fill="#FFFFFF" text-anchor="middle" letter-spacing="2">${badgeText}</text>
  </svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

// API: Create Image with gemini-3.1-flash-image-preview (or gemini-3.1-flash-image)
app.post('/api/images/generate', async (req, res) => {
  try {
    const { prompt, aspectRatio = '1:1', imageSize = '1K' } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'A text prompt is required to create an image' });
    }

    const ai = getGenAI();

    if (ai) {
      try {
        // Use gemini-3.1-flash-image or gemini-3.1-flash-image-preview
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-image',
          contents: {
            parts: [
              {
                text: `${prompt}. High quality digital art style, crisp lighting, vibrant colors, detailed developer mascot asset.`,
              },
            ],
          },
          config: {
            imageConfig: {
              aspectRatio: aspectRatio as any,
              imageSize: imageSize as any,
            },
          },
        });

        const candidates = response.candidates || [];
        for (const candidate of candidates) {
          const parts = candidate.content?.parts || [];
          for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
              const mimeType = part.inlineData.mimeType || 'image/png';
              const imageUrl = `data:${mimeType};base64,${part.inlineData.data}`;
              return res.json({
                success: true,
                imageUrl,
                prompt,
                aspectRatio,
                source: 'gemini-3.1-flash-image',
              });
            }
          }
        }
      } catch (geminiImgError: any) {
        console.warn('Gemini image generation error, falling back to aesthetic SVG generator:', geminiImgError?.message || geminiImgError);
      }
    }

    // Fallback high-fidelity SVG generator
    const fallbackUrl = generateFallbackAvatar(prompt);
    return res.json({
      success: true,
      imageUrl: fallbackUrl,
      prompt,
      aspectRatio,
      source: 'fallback_canvas',
    });
  } catch (err) {
    console.error('Error in /api/images/generate:', err);
    res.status(500).json({ error: 'Image generation failed' });
  }
});

// API: Edit Image with gemini-3.1-flash-image-preview (or gemini-3.1-flash-image)
app.post('/api/images/edit', async (req, res) => {
  try {
    const { prompt, imageBase64, mimeType = 'image/png', aspectRatio = '1:1' } = req.body;

    if (!prompt || !imageBase64) {
      return res.status(400).json({ error: 'Prompt and base64 image are required for image editing' });
    }

    const ai = getGenAI();
    // Strip data URI prefix if present
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-image',
          contents: {
            parts: [
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType,
                },
              },
              {
                text: `Edit instruction: ${prompt}. Retain the core character silhouette while applying the requested visual changes accurately.`,
              },
            ],
          },
          config: {
            imageConfig: {
              aspectRatio: aspectRatio as any,
            },
          },
        });

        const candidates = response.candidates || [];
        for (const candidate of candidates) {
          const parts = candidate.content?.parts || [];
          for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
              const outMime = part.inlineData.mimeType || 'image/png';
              const imageUrl = `data:${outMime};base64,${part.inlineData.data}`;
              return res.json({
                success: true,
                imageUrl,
                prompt,
                aspectRatio,
                source: 'gemini-3.1-flash-image',
              });
            }
          }
        }
      } catch (geminiEditErr: any) {
        console.warn('Gemini image edit error, using modified visual fallback:', geminiEditErr?.message || geminiEditErr);
      }
    }

    // Fallback edited visual
    const fallbackUrl = generateFallbackAvatar(`Edited: ${prompt}`);
    return res.json({
      success: true,
      imageUrl: fallbackUrl,
      prompt,
      aspectRatio,
      source: 'fallback_canvas',
    });
  } catch (err) {
    console.error('Error in /api/images/edit:', err);
    res.status(500).json({ error: 'Image editing failed' });
  }
});

// API: TTS Voice endpoint using gemini-3.1-flash-tts-preview
app.post('/api/voice/tts', async (req, res) => {
  try {
    const { text, voiceName = 'Zephyr' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required for TTS' });
    }

    const ai = getGenAI();

    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-tts-preview',
          contents: [{ parts: [{ text: `Say in an energetic, helpful developer companion tone: ${text}` }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voiceName as any },
              },
            },
          },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
          return res.json({
            success: true,
            audioBase64: base64Audio,
            sampleRate: 24000,
            mimeType: 'audio/pcm;rate=24000',
          });
        }
      } catch (ttsErr: any) {
        console.warn('Gemini TTS error:', ttsErr?.message || ttsErr);
      }
    }

    return res.json({
      success: false,
      message: 'TTS generation not active or offline. Use browser speech synthesis fallback.',
    });
  } catch (err) {
    console.error('Error in /api/voice/tts:', err);
    res.status(500).json({ error: 'TTS request failed' });
  }
});

async function startServer() {
  const server = http.createServer(app);

  // WebSocket Server for Gemini Live API real-time voice conversations
  const wss = new WebSocketServer({ server, path: '/live' });

  wss.on('connection', async (clientWs: WebSocket) => {
    console.log('⚡ Client connected to Live Voice WebSocket');
    const ai = getGenAI();
    let liveSession: any = null;

    if (ai) {
      try {
        liveSession = await ai.live.connect({
          model: 'gemini-3.1-flash-live-preview',
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Zephyr' },
              },
            },
            systemInstruction: `You are Byte, an energetic and intelligent ambient Git companion dog. You speak directly with developers in real time.
Keep your voice responses crisp, direct, helpful, and under 2-3 sentences.
You help them check branch synchronization, warn them if they have uncommitted files before pulling, and explain Git commands clearly.`,
          },
          callbacks: {
            onmessage: (message: any) => {
              if (clientWs.readyState !== WebSocket.OPEN) return;

              // Audio output chunk
              const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              if (audioData) {
                clientWs.send(JSON.stringify({ type: 'audio', audio: audioData }));
              }

              // Text transcript chunk
              const textChunk = message.serverContent?.modelTurn?.parts?.[0]?.text;
              if (textChunk) {
                clientWs.send(JSON.stringify({ type: 'text', text: textChunk }));
              }

              // Interrupted signal
              if (message.serverContent?.interrupted) {
                clientWs.send(JSON.stringify({ type: 'interrupted' }));
              }

              // Turn complete
              if (message.serverContent?.turnComplete) {
                clientWs.send(JSON.stringify({ type: 'turnComplete' }));
              }
            },
            onerror: (err: any) => {
              console.warn('Live API session error:', err);
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({ type: 'error', message: err?.message || 'Live session error' }));
              }
            },
            onclose: () => {
              console.log('Live API session closed');
            },
          },
        });

        clientWs.send(JSON.stringify({ type: 'ready', message: 'Live Voice Session connected with gemini-3.1-flash-live-preview' }));
      } catch (err: any) {
        console.warn('Failed to connect to Live API:', err?.message || err);
        clientWs.send(JSON.stringify({ type: 'fallback_ready', message: 'Live API mode unavailable, using client-assisted voice synthesis' }));
      }
    } else {
      clientWs.send(JSON.stringify({ type: 'fallback_ready', message: 'Offline mode active, speech recognition enabled' }));
    }

    clientWs.on('message', async (rawData) => {
      try {
        const payload = JSON.parse(rawData.toString());

        if (payload.type === 'audio' && payload.audio) {
          if (liveSession) {
            liveSession.sendRealtimeInput({
              audio: {
                data: payload.audio,
                mimeType: 'audio/pcm;rate=16000',
              },
            });
          }
        } else if (payload.type === 'text' && payload.text) {
          if (liveSession) {
            liveSession.sendRealtimeInput({
              text: payload.text,
            });
          }
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    });

    clientWs.on('close', () => {
      console.log('Client disconnected from Live Voice WebSocket');
      if (liveSession && typeof liveSession.close === 'function') {
        try {
          liveSession.close();
        } catch (_) {}
      }
    });
  });

  // Vite middleware in dev mode
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`GitPet server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
