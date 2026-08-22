import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Heart,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Coffee,
} from 'lucide-react';
import { RepositoryState, HealthLevel } from '../types';
import {
  playPetChirpSound,
  playPurrSound,
  playCoffeeSlurpSound,
  playAccessoryEquipSound,
} from '../utils/audioEffects';
import { PixelPetGraphic } from './PixelPetGraphic';

export type MascotAccessory =
  | 'none'
  | 'headphones'
  | 'cyber_visor'
  | 'coffee_mug'
  | 'gold_badge'
  | 'wizard_hat';

interface PetStageProps {
  state: RepositoryState;
  onPetClick?: () => void;
  petTriggerTimestamp?: number;
  customAvatarUrl?: string;
  onOpenImageStudio?: () => void;
}

interface FloatingParticle {
  id: number;
  x: number;
  y: number;
  text: string;
  type: 'heart' | 'coffee' | 'sparkle' | 'shield';
}

const ACCESSORY_LIST: { id: MascotAccessory; label: string; icon: string }[] = [
  { id: 'none', label: 'Classic Bot', icon: '🤖' },
  { id: 'headphones', label: 'Dev Headphones', icon: '🎧' },
  { id: 'cyber_visor', label: 'AR Cyber Visor', icon: '👓' },
  { id: 'coffee_mug', label: 'Hot Coffee Mug', icon: '☕' },
  { id: 'gold_badge', label: 'Patrol Badge', icon: '🎀' },
  { id: 'wizard_hat', label: 'Git Wizard Hat', icon: '🎩' },
];

const MASCOT_QUIPS = [
  "I'm keeping your branch drift and uncommitted work safe!",
  "Pro-tip: Atomic commits make rebasing painless.",
  "Remember to pull before pushing to keep history linear!",
  "Stashing your work first ensures zero overwrite risk.",
  "You're doing great! Let's ship clean code today.",
  "Beep boop! Ready to help you ship flawless code.",
];

export const PetStage: React.FC<PetStageProps> = ({
  state,
  onPetClick,
  petTriggerTimestamp,
  customAvatarUrl,
  onOpenImageStudio,
}) => {
  const [particles, setParticles] = useState<FloatingParticle[]>([]);
  const [isHovered, setIsHovered] = useState(false);
  const [activeAccessory, setActiveAccessory] = useState<MascotAccessory>('none');
  const [currentQuipIndex, setCurrentQuipIndex] = useState(0);
  const [bubbleText, setBubbleText] = useState<string>('');
  const [isBubbleVisible, setIsBubbleVisible] = useState(true);
  const [reactionType, setReactionType] = useState<'idle' | 'pet' | 'coffee' | 'sparkle'>('idle');
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Update contextual bubble message based on repo state and actions
  useEffect(() => {
    if (state.healthLevel === 'Unsafe') {
      setBubbleText('🚨 Work-loss risk! Stash or commit before pulling!');
    } else if (state.healthLevel === 'Blocked') {
      setBubbleText('🧶 Conflict alert! Let me help you inspect the conflicting files.');
    } else if (state.healthLevel === 'Attention') {
      setBubbleText(`👀 Origin is ahead by ${state.currentBranch.behindCount} commits. Ready to sync!`);
    } else {
      setBubbleText('🌿 Pristine repository! All green and synchronized.');
    }
  }, [state.healthLevel, state.currentBranch.behindCount]);

  // Autonomous Natural Blinking Loop (every 3.2 - 5.2s)
  useEffect(() => {
    let blinkTimeout: NodeJS.Timeout;
    const scheduleNextBlink = () => {
      const delay = 3000 + Math.random() * 2200;
      blinkTimeout = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          scheduleNextBlink();
        }, 160);
      }, delay);
    };

    scheduleNextBlink();
    return () => clearTimeout(blinkTimeout);
  }, []);

  // Track mouse coordinates across the stage container
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2 - 10;

    const dx = (e.clientX - centerX) / (rect.width / 2);
    const dy = (e.clientY - centerY) / (rect.height / 2);

    const clampedX = Math.max(-1, Math.min(1, dx)) * 3.5;
    const clampedY = Math.max(-1, Math.min(1, dy)) * 2.5;

    setMousePos({ x: clampedX, y: clampedY });
  }, []);

  const handleMouseLeave = () => {
    setIsHovered(false);
    setMousePos({ x: 0, y: 0 });
  };

  // Trigger floating hearts & reactions
  useEffect(() => {
    if (petTriggerTimestamp) {
      triggerPetReaction(120, 70);
    }
  }, [petTriggerTimestamp]);

  const triggerPetReaction = (x = 120, y = 70) => {
    const isUnsafe = state.healthLevel === 'Unsafe' || state.healthPercentage === 0;
    const newP: FloatingParticle = {
      id: Date.now() + Math.random(),
      x: x + (Math.random() * 30 - 15),
      y: y + (Math.random() * 20 - 10),
      text: isUnsafe ? '*protects branch*' : '*beeps happily*',
      type: isUnsafe ? 'shield' : 'heart',
    };

    setParticles((prev) => [...prev, newP]);
    setReactionType('pet');
    playPurrSound();

    if (!isUnsafe) {
      setBubbleText(
        Math.random() > 0.5 ? '💖 *Happy beep* thanks for the pet!' : '✨ Feeling loved & ready to code!'
      );
      setIsBubbleVisible(true);
    }

    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => p.id !== newP.id));
    }, 1200);

    setTimeout(() => {
      setReactionType('idle');
    }, 600);
  };

  const handleStageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    triggerPetReaction(x, y);

    if (onPetClick) {
      onPetClick();
    }
  };

  // Action: Feed Coffee to Bot
  const handleFeedCoffee = (e: React.MouseEvent) => {
    e.stopPropagation();
    playCoffeeSlurpSound();
    setReactionType('coffee');
    setActiveAccessory('coffee_mug');

    const newP: FloatingParticle = {
      id: Date.now(),
      x: 130 + (Math.random() * 20 - 10),
      y: 70,
      text: '☕ +100 Energy!',
      type: 'coffee',
    };

    setParticles((prev) => [...prev, newP]);
    setBubbleText('⚡ Fresh coffee! Code velocity boosted!');
    setIsBubbleVisible(true);

    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => p.id !== newP.id));
    }, 1200);

    setTimeout(() => {
      setReactionType('idle');
    }, 700);
  };

  // Action: Cycle Wearable Accessory
  const handleCycleAccessory = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = ACCESSORY_LIST.findIndex((a) => a.id === activeAccessory);
    const nextIndex = (currentIndex + 1) % ACCESSORY_LIST.length;
    const nextAccessory = ACCESSORY_LIST[nextIndex];

    setActiveAccessory(nextAccessory.id);
    playAccessoryEquipSound();
    setReactionType('sparkle');

    const newP: FloatingParticle = {
      id: Date.now(),
      x: 120,
      y: 60,
      text: `${nextAccessory.icon} ${nextAccessory.label}`,
      type: 'sparkle',
    };

    setParticles((prev) => [...prev, newP]);
    setBubbleText(`✨ Equipped: ${nextAccessory.label}!`);
    setIsBubbleVisible(true);

    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => p.id !== newP.id));
    }, 1200);

    setTimeout(() => {
      setReactionType('idle');
    }, 600);
  };

  // Action: Ask Bot / Cycle Quips
  const handleCycleQuip = (e: React.MouseEvent) => {
    e.stopPropagation();
    playPetChirpSound();
    const nextIndex = (currentQuipIndex + 1) % MASCOT_QUIPS.length;
    setCurrentQuipIndex(nextIndex);
    setBubbleText(MASCOT_QUIPS[nextIndex]);
    setIsBubbleVisible(true);
  };

  // Health theme colors
  const getHealthTheme = (level: HealthLevel) => {
    switch (level) {
      case 'Healthy':
        return {
          glow: 'rgba(16, 185, 129, 0.16)',
          pulseColor: 'border-emerald-400 bg-emerald-500/10 text-emerald-700',
          barBg: 'bg-emerald-500',
          badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
          icon: CheckCircle2,
          moodLabel: 'Relaxed & Playful',
          auraShadow: '0 0 50px rgba(16, 185, 129, 0.22)',
        };
      case 'Attention':
        return {
          glow: 'rgba(245, 158, 11, 0.16)',
          pulseColor: 'border-amber-400 bg-amber-500/10 text-amber-700',
          barBg: 'bg-amber-500',
          badgeBg: 'bg-amber-50 text-amber-800 border-amber-200/80',
          icon: AlertTriangle,
          moodLabel: 'Uneasy & Alert',
          auraShadow: '0 0 50px rgba(245, 158, 11, 0.22)',
        };
      case 'Blocked':
        return {
          glow: 'rgba(239, 68, 68, 0.16)',
          pulseColor: 'border-rose-400 bg-rose-500/10 text-rose-700',
          barBg: 'bg-rose-500',
          badgeBg: 'bg-rose-50 text-rose-800 border-rose-200/80',
          icon: ShieldAlert,
          moodLabel: 'Distressed & Blocked',
          auraShadow: '0 0 50px rgba(239, 68, 68, 0.28)',
        };
      case 'Unsafe':
        return {
          glow: 'rgba(225, 29, 72, 0.2)',
          pulseColor: 'border-rose-500 bg-rose-500/10 text-rose-800',
          barBg: 'bg-rose-600',
          badgeBg: 'bg-rose-50 text-rose-800 border-rose-300 ring-2 ring-rose-400/20',
          icon: ShieldAlert,
          moodLabel: 'Guarded & Alert (0%)',
          auraShadow: '0 0 50px rgba(225, 29, 72, 0.35)',
        };
      default:
        return {
          glow: 'rgba(100, 116, 139, 0.15)',
          pulseColor: 'border-slate-400 bg-slate-500/10 text-slate-700',
          barBg: 'bg-slate-500',
          badgeBg: 'bg-slate-100 text-slate-700 border-slate-300',
          icon: ShieldAlert,
          moodLabel: 'Still & Protected',
          auraShadow: '0 0 35px rgba(100, 116, 139, 0.2)',
        };
    }
  };

  const isUnsafe = state.healthLevel === 'Unsafe' || state.healthPercentage === 0;
  const theme = getHealthTheme(state.healthLevel);
  const StatusIcon = theme.icon;

  return (
    <div
      ref={containerRef}
      id="gitpet-stage-container"
      role="region"
      aria-label={
        isUnsafe
          ? 'Repository Status: Unsafe (0% Health) - Immediate work-loss hazard detected'
          : `Repository Status: ${state.healthLevel} (${state.healthPercentage}% Health)`
      }
      onClick={handleStageClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full rounded-2xl bg-white border p-4 sm:p-5 shadow-xs overflow-hidden select-none cursor-pointer transition-all duration-300 hover:shadow-md ${
        isUnsafe ? 'border-rose-300 ring-2 ring-rose-500/10' : 'border-slate-200/80'
      }`}
    >
      {/* Background ambient radial glow */}
      <motion.div
        className="absolute inset-0 pointer-events-none transition-all duration-700"
        animate={{
          background: `radial-gradient(circle at 50% 45%, ${theme.glow} 0%, rgba(255,255,255,0) 70%)`,
        }}
      />

      {/* Floating particles (Hearts, Coffee, Sparkles) */}
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 1, scale: 0.5, y: p.y, x: p.x }}
            animate={{
              opacity: 0,
              scale: 1.3,
              y: p.y - 60,
              x: p.x + (Math.random() * 24 - 12),
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
            className={`absolute pointer-events-none z-30 flex items-center gap-1.5 font-semibold text-xs bg-white/95 px-2.5 py-1 rounded-full shadow-md border ${
              p.type === 'coffee'
                ? 'text-amber-700 border-amber-200'
                : p.type === 'sparkle'
                ? 'text-indigo-600 border-indigo-200'
                : isUnsafe
                ? 'text-slate-700 border-slate-300'
                : 'text-rose-600 border-rose-200'
            }`}
          >
            {p.type === 'coffee' ? (
              <Coffee className="w-3.5 h-3.5 text-amber-600" />
            ) : p.type === 'sparkle' ? (
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            ) : (
              <Heart
                className={`w-3.5 h-3.5 ${
                  isUnsafe ? 'fill-slate-500 text-slate-500' : 'fill-rose-500 text-rose-500'
                }`}
              />
            )}
            <span>{p.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Top stage details: Mood badge & Health meter */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${theme.badgeBg}`}
          >
            <StatusIcon className={`w-3.5 h-3.5 ${isUnsafe ? 'text-rose-700' : ''}`} />
            <span className="tracking-wide">{state.healthLevel.toUpperCase()}</span>
            <span className="opacity-40">•</span>
            <span className={`font-normal ${isUnsafe ? 'text-rose-900 font-semibold' : 'text-slate-600'}`}>
              {theme.moodLabel}
            </span>
          </div>
        </div>

        {/* Health Progress Bar */}
        <div className="flex items-center gap-2 min-w-[140px]">
          <span className="text-[11px] font-mono font-bold text-slate-400">HP</span>
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/80 p-0.5">
            <motion.div
              className={`h-full rounded-full ${theme.barBg}`}
              initial={{ width: 0 }}
              animate={{ width: `${state.healthPercentage}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
          <span className="text-xs font-bold text-slate-700 w-9 text-right font-mono">
            {state.healthPercentage}%
          </span>
        </div>
      </div>

      {/* Center Stage: Thought Bubble + Mascot Canvas (Clean, no box frame) */}
      <div className="relative z-10 flex flex-col items-center justify-center pt-1 pb-2">
        {/* Dynamic Contextual Thought/Speech Bubble */}
        <AnimatePresence>
          {isBubbleVisible && bubbleText && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.94 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => {
                e.stopPropagation();
                handleCycleQuip(e);
              }}
              className="relative mb-2 max-w-[280px] bg-slate-900/90 backdrop-blur-md text-white text-[11px] font-medium px-3.5 py-1.5 rounded-2xl shadow-md border border-slate-700/60 text-center cursor-pointer hover:bg-slate-900 transition-colors group"
            >
              <p className="leading-snug">{bubbleText}</p>
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-slate-900/90 rotate-45 border-r border-b border-slate-700/60" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mascot Center Habitat Platform (Clean, open & frameless) */}
        <div className="relative flex items-center justify-center w-60 h-48 my-1">
          {/* Ambient pulse circle around pet */}
          <motion.div
            animate={{
              scale: [1, 1.06, 1],
              opacity: [0.35, 0.7, 0.35],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              boxShadow: theme.auraShadow,
            }}
            className="absolute w-36 h-36 rounded-full pointer-events-none"
          />

          {/* Interactive Pixel TV-Head Robot Pet */}
          <div className={`transition-all duration-500 z-10 ${isUnsafe ? 'grayscale contrast-125' : ''}`}>
            {customAvatarUrl ? (
              <img
                src={customAvatarUrl}
                alt="Custom Companion Avatar"
                className="w-48 h-48 object-contain pixelated drop-shadow-md"
              />
            ) : (
              <PixelPetGraphic
                symptom={state.primarySymptom}
                healthLevel={state.healthLevel}
                isHovered={isHovered}
                mousePos={mousePos}
                isBlinking={isBlinking}
                reactionType={reactionType}
                accessory={activeAccessory}
              />
            )}
          </div>
        </div>

        {/* Symptom diagnosis caption */}
        <div className="mt-1 text-center max-w-md">
          <h3 className="text-sm font-bold text-slate-900 flex items-center justify-center gap-1.5">
            <span>{state.symptomTitle}</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            {state.operatorMeaning}
          </p>
        </div>
      </div>

      {/* Interactive Mascot Action Dock */}
      <div className="relative z-10 flex items-center justify-between gap-1.5 pt-2 mt-2 border-t border-slate-100/90">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerPetReaction();
            }}
            title="Pet Companion (Spacebar shortcut)"
            className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-600 border border-slate-200/70 text-[11px] font-semibold flex items-center gap-1 transition-all active:scale-95 shadow-2xs"
          >
            <span>🐾</span>
            <span>Pet</span>
          </button>

          <button
            type="button"
            onClick={handleFeedCoffee}
            title="Give companion a cup of coffee"
            className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-amber-50 hover:text-amber-700 text-slate-600 border border-slate-200/70 text-[11px] font-semibold flex items-center gap-1 transition-all active:scale-95 shadow-2xs"
          >
            <span>☕</span>
            <span>Fuel</span>
          </button>

          <button
            type="button"
            onClick={handleCycleAccessory}
            title="Change wearable accessory"
            className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 border border-slate-200/70 text-[11px] font-semibold flex items-center gap-1 transition-all active:scale-95 shadow-2xs"
          >
            <span>🎩</span>
            <span>Outfit</span>
          </button>

          <button
            type="button"
            onClick={handleCycleQuip}
            title="Ask for git tips"
            className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-600 text-slate-600 border border-slate-200/70 text-[11px] font-semibold flex items-center gap-1 transition-all active:scale-95 shadow-2xs"
          >
            <span>💬</span>
            <span>Ask</span>
          </button>

          {onOpenImageStudio && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenImageStudio();
              }}
              title="Open Image Studio for custom avatars"
              className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 hover:text-purple-700 text-purple-600 border border-purple-200/70 text-[11px] font-semibold flex items-center gap-1 transition-all active:scale-95 shadow-2xs"
            >
              <span>🎨</span>
              <span>Studio</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
          <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded font-semibold text-slate-600">
            Space
          </kbd>
          <span className="hidden sm:inline">to pet</span>
        </div>
      </div>
    </div>
  );
};
