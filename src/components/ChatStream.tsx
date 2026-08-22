import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send,
  Sparkles,
  Bot,
  User,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Eye,
  RotateCcw,
  AlertTriangle,
  Loader2,
  ChevronRight,
  Volume2,
  VolumeX,
  Zap,
  Cpu,
  Brain,
  Shield,
  GraduationCap,
  Dog,
  Mic,
} from 'lucide-react';
import { ChatMessage, RecommendedAction, RepositoryState, ChatRole, ModelTier } from '../types';

interface ChatStreamProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (text: string, role?: ChatRole, tier?: ModelTier) => void;
  onPreviewAction: (action: RecommendedAction) => void;
  onExecuteAction: (action: RecommendedAction) => void;
  state: RepositoryState;
  executingActionId: string | null;
  selectedRole: ChatRole;
  setSelectedRole: (role: ChatRole) => void;
  selectedTier: ModelTier;
  setSelectedTier: (tier: ModelTier) => void;
  onOpenVoiceModal: () => void;
}

export const ChatStream: React.FC<ChatStreamProps> = ({
  messages,
  isLoading,
  onSendMessage,
  onPreviewAction,
  onExecuteAction,
  state,
  executingActionId,
  selectedRole,
  setSelectedRole,
  selectedTier,
  setSelectedTier,
  onOpenVoiceModal,
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, executingActionId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText.trim(), selectedRole, selectedTier);
    setInputText('');
  };

  const handleCopy = (cmd: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(cmd).catch(() => {});
      }
    } catch (_) {}
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const handleTTS = async (msgId: string, text: string) => {
    if (speakingMessageId === msgId) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setSpeakingMessageId(null);
      return;
    }

    setSpeakingMessageId(msgId);

    try {
      const res = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();

      if (data.success && data.audioBase64) {
        try {
          const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.catch((e) => {
              console.warn('Audio play interrupted:', e);
              setSpeakingMessageId(null);
            });
          }
          audio.onended = () => setSpeakingMessageId(null);
          audio.onerror = () => setSpeakingMessageId(null);
          return;
        } catch (audioErr) {
          console.warn('Audio instantiation error:', audioErr);
        }
      }
    } catch (_) {}

    // Fallback browser speech synthesis
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.replace(/[*#`_]/g, ''));
      utterance.pitch = 1.1;
      utterance.rate = 1.0;
      utterance.onend = () => setSpeakingMessageId(null);
      utterance.onerror = () => setSpeakingMessageId(null);
      window.speechSynthesis.speak(utterance);
    } else {
      setSpeakingMessageId(null);
    }
  };

  const quickPrompts = [
    'Status report! What needs attention?',
    'EMERGENCY: What is the work-loss risk?',
    'Explain branch divergence',
    'How safe is pulling from upstream?',
    'Review uncommitted files',
    'Show git DAG topology',
  ];

  const ROLES: { id: ChatRole; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'byte_mascot', label: 'Byte Mascot', icon: <Dog className="w-3.5 h-3.5" />, desc: 'Friendly, ambient companion' },
    { id: 'senior_architect', label: 'Architect', icon: <Cpu className="w-3.5 h-3.5" />, desc: 'Deep DAG & topological analysis' },
    { id: 'safety_auditor', label: 'Auditor', icon: <Shield className="w-3.5 h-3.5" />, desc: 'Zero data-loss compliance' },
    { id: 'git_tutor', label: 'Tutor', icon: <GraduationCap className="w-3.5 h-3.5" />, desc: 'Mental models & pedagogy' },
  ];

  const TIERS: { id: ModelTier; label: string; model: string; icon: React.ReactNode }[] = [
    { id: 'fast', label: 'Fast', model: 'gemini-3.1-flash-lite', icon: <Zap className="w-3 h-3 text-amber-500" /> },
    { id: 'general', label: 'General', model: 'gemini-3.5-flash', icon: <Sparkles className="w-3 h-3 text-blue-500" /> },
    { id: 'deep', label: 'Deep', model: 'gemini-3.1-pro-preview', icon: <Brain className="w-3 h-3 text-purple-500" /> },
  ];

  return (
    <div
      id="gitpet-chat-container"
      className="flex flex-col h-full bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden"
    >
      {/* Chat Header & Role / Model Selector */}
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">Multi-Turn Gemini Companion</h3>
              <p className="text-[10px] text-slate-400">Evidence-based advice & reversible Git actions</p>
            </div>
          </div>

          {/* Live Voice Mode Quick Launcher */}
          <button
            id="chat-live-voice-btn"
            onClick={onOpenVoiceModal}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            title="Start hands-free live voice conversation"
          >
            <Mic className="w-3 h-3 text-indigo-600" />
            <span>Live Voice</span>
          </button>
        </div>

        {/* Roles & Model Tiers Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/40 text-[11px]">
          {/* Persona Selector */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Role:</span>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
              {ROLES.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role.id)}
                  className={`px-2 py-0.5 rounded-md font-medium text-xs flex items-center gap-1 transition-all cursor-pointer ${
                    selectedRole === role.id
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title={role.desc}
                >
                  {role.icon}
                  <span className="hidden sm:inline">{role.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Model Speed / Depth Tier */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Model:</span>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
              {TIERS.map((tier) => (
                <button
                  key={tier.id}
                  onClick={() => setSelectedTier(tier.id)}
                  className={`px-2 py-0.5 rounded-md font-medium text-xs flex items-center gap-1 transition-all cursor-pointer ${
                    selectedTier === tier.id
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title={`Powered by ${tier.model}`}
                >
                  {tier.icon}
                  <span>{tier.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 max-h-[520px] min-h-[340px]">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`flex items-start gap-2.5 max-w-[94%] sm:max-w-[88%] ${
                msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
                  msg.sender === 'user'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-800 border border-slate-200/80 shadow-2xs'
                }`}
              >
                {msg.sender === 'user' ? <User className="w-3.5 h-3.5" /> : '🐕'}
              </div>

              {/* Bubble */}
              <div className="space-y-3 w-full">
                <div
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed text-left ${
                    msg.sender === 'user'
                      ? 'bg-slate-900 text-slate-100 rounded-tr-xs'
                      : 'bg-slate-50/80 border border-slate-200/80 text-slate-800 rounded-tl-xs shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-slate-200/40 text-[10px] text-slate-400">
                    <span className="font-semibold text-slate-600">
                      {msg.sender === 'user'
                        ? 'You'
                        : msg.role === 'senior_architect'
                        ? 'Senior Git Architect'
                        : msg.role === 'safety_auditor'
                        ? 'Safety Auditor'
                        : msg.role === 'git_tutor'
                        ? 'Git Tutor'
                        : 'Byte Companion'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {msg.modelUsed && (
                        <span className="px-1.5 py-0.2 bg-white text-slate-500 rounded border border-slate-200/60 text-[9px] font-mono">
                          {msg.modelUsed}
                        </span>
                      )}
                      <span>{msg.timestamp}</span>
                      {msg.sender === 'assistant' && (
                        <button
                          onClick={() => handleTTS(msg.id, msg.text)}
                          className="p-1 hover:text-slate-800 text-slate-400 transition-colors cursor-pointer"
                          title="Read aloud with Byte's voice"
                        >
                          {speakingMessageId === msg.id ? (
                            <VolumeX className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="whitespace-pre-line">{msg.text}</p>

                  {/* Evidence summary bullet points */}
                  {msg.evidenceSummary && msg.evidenceSummary.evidencePoints?.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200/60">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Repository Evidence Signals
                      </div>
                      <ul className="space-y-1 text-[11px] text-slate-600">
                        {msg.evidenceSummary.evidencePoints.map((pt, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-blue-500 mt-0.5 font-bold">•</span>
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Recommended Safe Action Card */}
                {msg.recommendedAction && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`p-4 rounded-2xl bg-white border shadow-sm text-left space-y-3 ${
                      state.healthLevel === 'Unsafe' || msg.recommendedAction.riskLevel === 'Hazard'
                        ? 'border-rose-300 ring-2 ring-rose-500/10'
                        : 'border-slate-200/90'
                    }`}
                  >
                    {/* Action Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`p-1.5 rounded-lg ${
                            state.healthLevel === 'Unsafe' || msg.recommendedAction.riskLevel === 'Hazard'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <div
                            className={`text-[10px] font-bold uppercase tracking-wider ${
                              state.healthLevel === 'Unsafe' || msg.recommendedAction.riskLevel === 'Hazard'
                                ? 'text-rose-700'
                                : 'text-blue-600'
                            }`}
                          >
                            {state.healthLevel === 'Unsafe'
                              ? 'Emergency Work-Loss Prevention'
                              : 'Recommended Safe Action'}
                          </div>
                          <h4 className="text-xs font-bold text-slate-900">{msg.recommendedAction.title}</h4>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {msg.recommendedAction.confidence} ({msg.recommendedAction.confidenceScore}%)
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            msg.recommendedAction.riskLevel === 'Hazard'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300 font-extrabold'
                              : msg.recommendedAction.riskLevel === 'Safe'
                              ? 'bg-slate-100 text-slate-700 border border-slate-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {msg.recommendedAction.riskLevel}
                        </span>
                      </div>
                    </div>

                    {/* Summary */}
                    <p className="text-xs text-slate-600 leading-normal">{msg.recommendedAction.summary}</p>

                    {/* Command Box */}
                    <div className="relative group">
                      <div className="p-2.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] flex items-center justify-between gap-2 overflow-x-auto">
                        <span>{msg.recommendedAction.command}</span>
                        <button
                          onClick={() => handleCopy(msg.recommendedAction!.command)}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors shrink-0 cursor-pointer"
                          title="Copy command"
                        >
                          {copiedCmd === msg.recommendedAction.command ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expected Impact & Reversal note */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                      <div>
                        <span className="font-semibold text-slate-700">Expected Result:</span>
                        <p className="text-slate-600 mt-0.5">{msg.recommendedAction.expectedResult}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-amber-800 flex items-center gap-1">
                          <RotateCcw className="w-3 h-3 text-amber-600" /> Safe Reversal:
                        </span>
                        <p className="text-amber-900/90 font-mono text-[10px] mt-0.5 break-all">
                          {msg.recommendedAction.reversalStep}
                        </p>
                      </div>
                    </div>

                    {/* Interactive Approval & Preview Buttons */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        id={`preview-action-btn-${msg.id}`}
                        onClick={() => onPreviewAction(msg.recommendedAction!)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>Preview Changes</span>
                      </button>

                      {msg.executed ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Action Verified & Synchronized</span>
                        </div>
                      ) : (
                        <button
                          id={`confirm-tidy-action-btn-${msg.id}`}
                          onClick={() => onExecuteAction(msg.recommendedAction!)}
                          disabled={executingActionId === msg.recommendedAction.id}
                          className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer ${
                            state.healthLevel === 'Unsafe' || msg.recommendedAction.riskLevel === 'Hazard'
                              ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                              : 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/10'
                          }`}
                        >
                          {executingActionId === msg.recommendedAction.id ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Preserving & Synchronizing...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>
                                {state.healthLevel === 'Unsafe'
                                  ? 'Confirm Safe Preservation'
                                  : 'Confirm & Tidy Action'}
                              </span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Execution Success Card */}
                {msg.executionResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{msg.executionResult.message}</span>
                    </div>
                    <div className="flex items-center gap-1 font-bold text-emerald-800 text-[11px]">
                      <span>{msg.executionResult.previousHealth}%</span>
                      <ChevronRight className="w-3 h-3 text-emerald-500" />
                      <span className="text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-emerald-300">
                        {msg.executionResult.newHealth}%
                      </span>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-slate-500 pl-2">
            <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs">
              🐕
            </div>
            <div className="flex items-center gap-1.5 bg-slate-100/80 border border-slate-200/60 px-3 py-2 rounded-2xl">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-600 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-600 animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-600 animate-bounce [animation-delay:0.4s]" />
              <span className="text-[11px] text-slate-500 ml-1">
                Consulting {selectedTier === 'deep' ? 'gemini-3.1-pro' : selectedTier === 'fast' ? 'gemini-3.1-flash-lite' : 'gemini-3.5-flash'}...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      <div className="px-4 py-2 bg-slate-50/50 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        <Sparkles className="w-3 h-3 text-slate-400 shrink-0" />
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => onSendMessage(prompt, selectedRole, selectedTier)}
            disabled={isLoading}
            className="text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200/80 transition-colors whitespace-nowrap shrink-0 shadow-2xs cursor-pointer"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-3 sm:p-3.5 border-t border-slate-100 bg-white flex items-center gap-2">
        <input
          id="gitpet-chat-input"
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Ask ${selectedRole === 'senior_architect' ? 'Architect' : selectedRole === 'safety_auditor' ? 'Safety Auditor' : selectedRole === 'git_tutor' ? 'Git Tutor' : 'Byte'} about repos, stashes, or safe commands...`}
          disabled={isLoading}
          className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all placeholder:text-slate-400"
        />
        <button
          id="gitpet-chat-send-btn"
          type="submit"
          disabled={!inputText.trim() || isLoading}
          className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-40 disabled:hover:bg-slate-900 transition-all shadow-2xs cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
