import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  Sparkles,
  RefreshCw,
  MessageSquare,
  Activity,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Zap,
} from 'lucide-react';
import { LiveVoiceState, LiveTranscriptItem, RepositoryState } from '../types';
import { floatTo16BitPCM, arrayBufferToBase64, LiveAudioQueue } from '../utils/audioStreamer';

interface LiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  repoState: RepositoryState;
  onExecuteAction?: () => void;
}

export const LiveVoiceModal: React.FC<LiveVoiceModalProps> = ({
  isOpen,
  onClose,
  repoState,
}) => {
  const [voiceState, setVoiceState] = useState<LiveVoiceState>('disconnected');
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<LiveTranscriptItem[]>([
    {
      id: 'tx_init',
      sender: 'byte',
      text: `Woof! I'm Byte, your ambient Git companion. I'm listening—ask me about branch ${repoState.currentBranch?.name}, pending pulls, or conflict risks!`,
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [statusMessage, setStatusMessage] = useState('Ready to connect voice session');

  const wsRef = useRef<WebSocket | null>(null);
  const audioQueueRef = useRef<LiveAudioQueue>(new LiveAudioQueue());
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const transcriptBottomRef = useRef<HTMLDivElement>(null);

  // Auto scroll transcript
  useEffect(() => {
    transcriptBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Connect WebSocket & Mic on open
  useEffect(() => {
    if (isOpen) {
      startVoiceSession();
    } else {
      stopVoiceSession();
    }
    return () => {
      stopVoiceSession();
    };
  }, [isOpen]);

  const startVoiceSession = async () => {
    try {
      setVoiceState('connecting');
      setStatusMessage('Connecting to gemini-3.1-flash-live-preview...');

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setVoiceState('connected');
        setStatusMessage('Live API voice channel active (Zephyr voice)');
        ws.send(
          JSON.stringify({
            type: 'text',
            text: `[System Context: Active repository ${repoState.repoName}, branch ${repoState.currentBranch.name}, behind ${repoState.currentBranch.behindCount}, ahead ${repoState.currentBranch.aheadCount}, ${(repoState.workingTree || []).length} uncommitted files.]`,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'ready' || data.type === 'fallback_ready') {
            setVoiceState('listening');
            setStatusMessage('Byte is listening to your microphone...');
          } else if (data.type === 'audio' && data.audio) {
            setVoiceState('speaking');
            audioQueueRef.current.enqueueChunk(data.audio);
          } else if (data.type === 'text' && data.text) {
            setTranscript((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.sender === 'byte') {
                return [
                  ...prev.slice(0, -1),
                  { ...last, text: `${last.text} ${data.text}`.trim() },
                ];
              } else {
                return [
                  ...prev,
                  {
                    id: `tx_${Date.now()}`,
                    sender: 'byte',
                    text: data.text,
                    timestamp: new Date().toLocaleTimeString(),
                  },
                ];
              }
            });
          } else if (data.type === 'interrupted') {
            audioQueueRef.current.stopAll();
            setVoiceState('listening');
          } else if (data.type === 'turnComplete') {
            setVoiceState('listening');
          }
        } catch (err) {
          console.error('Error parsing live WS msg:', err);
        }
      };

      ws.onerror = (err) => {
        console.warn('WebSocket error in live voice:', err);
        setVoiceState('error');
        setStatusMessage('WebSocket connection fallback active');
      };

      ws.onclose = () => {
        setVoiceState('disconnected');
      };

      await startMicrophone(ws);
    } catch (err: any) {
      console.error('Failed to start voice session:', err);
      setVoiceState('error');
      setStatusMessage(err?.message || 'Could not initialize microphone or voice socket.');
    }
  };

  const startMicrophone = async (ws: WebSocket) => {
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setStatusMessage('Microphone access simulated or unavailable. You can tap quick questions.');
        startVisualizer();
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      micStreamRef.current = stream;

      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) {
        startVisualizer();
        return;
      }
      const audioCtx = new AudioCtxClass({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      source.connect(analyser);
      analyser.connect(processor);
      processor.connect(audioCtx.destination);

      processor.onaudioprocess = (e) => {
        if (isMuted) return;
        if (ws.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const pcmBuffer = floatTo16BitPCM(inputData);
        const base64Audio = arrayBufferToBase64(pcmBuffer);

        ws.send(
          JSON.stringify({
            type: 'audio',
            audio: base64Audio,
          })
        );
      };

      startVisualizer();
    } catch (micErr: any) {
      console.warn('Microphone permission not granted:', micErr);
      setStatusMessage('Microphone access simulated or muted. You can tap quick questions.');
    }
  };

  const startVisualizer = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      if (analyserRef.current && voiceState !== 'disconnected') {
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);

        const barWidth = (width / bufferLength) * 2.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * height * 0.85;
          const isSpeakingState = voiceState === 'speaking';
          ctx.fillStyle = isSpeakingState
            ? `rgb(244, 63, 94)`
            : `rgb(${59 + i * 2}, ${130 + i}, ${246})`;

          ctx.fillRect(x, height / 2 - barHeight / 2, barWidth - 1, barHeight || 2);
          x += barWidth + 1;
        }
      } else {
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        for (let i = 0; i < width; i++) {
          const y = height / 2 + Math.sin(i * 0.05 + Date.now() * 0.003) * 4;
          ctx.lineTo(i, y);
        }
        ctx.stroke();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();
  };

  const stopVoiceSession = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (_) {}
      audioContextRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (_) {}
      wsRef.current = null;
    }
    audioQueueRef.current.stopAll();
    setVoiceState('disconnected');
  };

  const handleSendTextPrompt = (text: string) => {
    setTranscript((prev) => [
      ...prev,
      {
        id: `tx_user_${Date.now()}`,
        sender: 'user',
        text,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'text', text }));
    } else {
      setTimeout(() => {
        setTranscript((prev) => [
          ...prev,
          {
            id: `tx_reply_${Date.now()}`,
            sender: 'byte',
            text: `Woof! Your current branch is "${repoState.currentBranch.name}" with ${repoState.currentBranch.behindCount} incoming commits. Stash uncommitted changes before pulling!`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      }, 500);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="live-voice-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
      >
        <motion.div
          id="live-voice-modal-container"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 font-sans"
        >
          {/* Top Header */}
          <div
            id="live-voice-header"
            className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-xs transition-colors ${
                    voiceState === 'speaking'
                      ? 'bg-rose-600'
                      : voiceState === 'listening'
                      ? 'bg-indigo-600 animate-pulse'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  <Radio className="w-4 h-4 text-white" />
                </div>
                {voiceState === 'listening' && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-slate-900 animate-ping"></span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-100">Live Voice with Byte</h2>
                  <span className="px-2 py-0.2 text-[10px] font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700 rounded-full">
                    gemini-3.1-flash-live-preview
                  </span>
                </div>
                <p className="text-xs text-slate-400">{statusMessage}</p>
              </div>
            </div>
            <button
              id="live-voice-close-btn"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Animated Audio Visualizer Stage */}
          <div
            id="live-voice-stage"
            className="p-6 bg-slate-950/90 border-b border-slate-800 flex flex-col items-center justify-center space-y-4"
          >
            <div className="relative">
              <motion.div
                animate={{
                  scale: voiceState === 'speaking' ? [1, 1.06, 1] : 1,
                }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className={`w-20 h-20 rounded-full border-2 flex items-center justify-center text-3xl shadow-xl transition-colors ${
                  voiceState === 'speaking'
                    ? 'border-rose-500 bg-rose-950/40'
                    : voiceState === 'listening'
                    ? 'border-indigo-500 bg-indigo-950/40'
                    : 'border-slate-700 bg-slate-900'
                }`}
              >
                🐕
              </motion.div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.2 bg-slate-800 border border-slate-700 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider text-slate-300">
                {voiceState}
              </div>
            </div>

            {/* Waveform Canvas */}
            <div className="w-full h-14 bg-slate-900/60 rounded-xl p-2 border border-slate-800 flex items-center justify-center overflow-hidden">
              <canvas
                ref={canvasRef}
                width={500}
                height={56}
                className="w-full h-full"
              />
            </div>

            {/* Control bar */}
            <div className="flex items-center gap-2.5">
              <button
                id="live-voice-mute-btn"
                onClick={() => setIsMuted(!isMuted)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl border flex items-center gap-2 transition-colors cursor-pointer ${
                  isMuted
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                    : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                }`}
              >
                {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
                {isMuted ? 'Muted (Tap to unmute)' : 'Microphone Live'}
              </button>

              <button
                id="live-voice-reconnect-btn"
                onClick={startVoiceSession}
                className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
                title="Restart Connection"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Real-time Conversation Transcript */}
          <div
            id="live-voice-transcript"
            className="flex-1 max-h-52 overflow-y-auto p-4 space-y-3 bg-slate-900/40 text-xs"
          >
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <MessageSquare className="w-3 h-3" />
              Live Conversation Feed
            </div>

            {transcript.map((item) => (
              <div
                key={item.id}
                className={`flex flex-col ${
                  item.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                    item.sender === 'user'
                      ? 'bg-slate-100 text-slate-900 rounded-br-none font-medium'
                      : 'bg-slate-800 border border-slate-700/80 text-slate-200 rounded-bl-none'
                  }`}
                >
                  <div className="font-semibold text-[10px] mb-0.5 opacity-70">
                    {item.sender === 'user' ? 'You (Voice)' : 'Byte (Companion)'} • {item.timestamp}
                  </div>
                  <p>{item.text}</p>
                </div>
              </div>
            ))}
            <div ref={transcriptBottomRef} />
          </div>

          {/* Quick Voice Questions */}
          <div
            id="live-voice-quick-prompts"
            className="p-4 border-t border-slate-800 bg-slate-950/80 space-y-2"
          >
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Quick Voice Inquiries:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                'How healthy is my repository right now?',
                'Can I safely pull origin main without conflicts?',
                'Explain my uncommitted working tree changes.',
                'What is the next single recommended action?',
              ].map((query, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendTextPrompt(query)}
                  className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg transition-colors text-left flex items-center gap-1.5 cursor-pointer"
                >
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>{query}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
