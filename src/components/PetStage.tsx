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
import { RepositoryState, SymptomType, HealthLevel } from '../types';
import {
  playPetChirpSound,
  playPurrSound,
  playCoffeeSlurpSound,
  playAccessoryEquipSound,
} from '../utils/audioEffects';

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
  { id: 'none', label: 'Classic Byte', icon: '🐾' },
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
  "Purrrrr... best software engineer ever.",
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

  // Autonomous Natural Blinking Loop (every 3.5 - 5.5s)
  useEffect(() => {
    let blinkTimeout: NodeJS.Timeout;
    const scheduleNextBlink = () => {
      const delay = 3200 + Math.random() * 2500;
      blinkTimeout = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          scheduleNextBlink();
        }, 150);
      }, delay);
    };

    scheduleNextBlink();
    return () => clearTimeout(blinkTimeout);
  }, []);

  // Track mouse coordinates across the stage container to calculate clamped eye pupil offsets
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2 - 10;

    const dx = (e.clientX - centerX) / (rect.width / 2);
    const dy = (e.clientY - centerY) / (rect.height / 2);

    // Clamped eye tracking offset
    const clampedX = Math.max(-1, Math.min(1, dx)) * 4.5;
    const clampedY = Math.max(-1, Math.min(1, dy)) * 3.5;

    setMousePos({ x: clampedX, y: clampedY });
  }, []);

  const handleMouseLeave = () => {
    setIsHovered(false);
    setMousePos({ x: 0, y: 0 });
  };

  // Trigger floating hearts & reactions on programmatic pet trigger (e.g. from Space shortcut)
  useEffect(() => {
    if (petTriggerTimestamp) {
      triggerPetReaction(120, 80);
    }
  }, [petTriggerTimestamp]);

  const triggerPetReaction = (x = 120, y = 80) => {
    const isUnsafe = state.healthLevel === 'Unsafe' || state.healthPercentage === 0;
    const newP: FloatingParticle = {
      id: Date.now() + Math.random(),
      x: x + (Math.random() * 30 - 15),
      y: y + (Math.random() * 20 - 10),
      text: isUnsafe ? '*guards uncommitted work*' : '*purrs happily*',
      type: isUnsafe ? 'shield' : 'heart',
    };

    setParticles((prev) => [...prev, newP]);
    setReactionType('pet');
    playPurrSound();

    if (!isUnsafe) {
      setBubbleText(
        Math.random() > 0.5 ? '💖 Purrrrr... thanks for the pet!' : '✨ Feeling loved & ready to code!'
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

  // Action: Feed Coffee to Byte
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
    setBubbleText('⚡ Ahhh fresh coffee! Code velocity boosted to maximum!');
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
    setBubbleText(`✨ Equipped: ${nextAccessory.label}! Looking sharp.`);
    setIsBubbleVisible(true);

    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => p.id !== newP.id));
    }, 1200);

    setTimeout(() => {
      setReactionType('idle');
    }, 600);
  };

  // Action: Ask Byte / Cycle Quips
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
          glow: 'rgba(16, 185, 129, 0.22)',
          pulseColor: 'border-emerald-400 bg-emerald-500/10 text-emerald-700',
          barBg: 'bg-emerald-500',
          badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
          icon: CheckCircle2,
          moodLabel: 'Relaxed & Playful',
          auraShadow: '0 0 40px rgba(16, 185, 129, 0.28)',
        };
      case 'Attention':
        return {
          glow: 'rgba(245, 158, 11, 0.22)',
          pulseColor: 'border-amber-400 bg-amber-500/10 text-amber-700',
          barBg: 'bg-amber-500',
          badgeBg: 'bg-amber-50 text-amber-800 border-amber-200/80',
          icon: AlertTriangle,
          moodLabel: 'Uneasy & Alert',
          auraShadow: '0 0 40px rgba(245, 158, 11, 0.3)',
        };
      case 'Blocked':
        return {
          glow: 'rgba(239, 68, 68, 0.22)',
          pulseColor: 'border-rose-400 bg-rose-500/10 text-rose-700',
          barBg: 'bg-rose-500',
          badgeBg: 'bg-rose-50 text-rose-800 border-rose-200/80',
          icon: ShieldAlert,
          moodLabel: 'Distressed & Blocked',
          auraShadow: '0 0 40px rgba(239, 68, 68, 0.35)',
        };
      case 'Unsafe':
        return {
          glow: 'rgba(225, 29, 72, 0.2)',
          pulseColor: 'border-rose-500 bg-rose-500/10 text-rose-800',
          barBg: 'bg-rose-600',
          badgeBg: 'bg-rose-50 text-rose-800 border-rose-300 ring-2 ring-rose-400/20',
          icon: ShieldAlert,
          moodLabel: 'Guarded & Alert (0%)',
          auraShadow: '0 0 40px rgba(225, 29, 72, 0.35)',
        };
      default:
        return {
          glow: 'rgba(100, 116, 139, 0.2)',
          pulseColor: 'border-slate-400 bg-slate-500/10 text-slate-700',
          barBg: 'bg-slate-500',
          badgeBg: 'bg-slate-100 text-slate-700 border-slate-300',
          icon: ShieldAlert,
          moodLabel: 'Still & Protected',
          auraShadow: '0 0 35px rgba(100, 116, 139, 0.25)',
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
          background: `radial-gradient(circle at 50% 45%, ${theme.glow} 0%, rgba(255,255,255,0) 68%)`,
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
              scale: 1.35,
              y: p.y - 65,
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
          <span className="text-[11px] font-medium text-slate-400">Health</span>
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60 p-0.5">
            <motion.div
              className={`h-full rounded-full ${theme.barBg}`}
              initial={{ width: 0 }}
              animate={{ width: `${state.healthPercentage}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
          <span className="text-xs font-bold text-slate-700 w-8 text-right font-mono">
            {state.healthPercentage}%
          </span>
        </div>
      </div>

      {/* Center Stage: Thought Bubble + Expressive Mascot Canvas */}
      <div className="relative z-10 flex flex-col items-center justify-center pt-1 pb-2">
        {/* Dynamic Contextual Thought/Speech Bubble */}
        <AnimatePresence>
          {isBubbleVisible && bubbleText && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.92 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => {
                e.stopPropagation();
                handleCycleQuip(e);
              }}
              className="relative mb-2 max-w-[280px] bg-slate-900/90 backdrop-blur-md text-white text-[11px] font-medium px-3.5 py-1.5 rounded-2xl shadow-lg border border-slate-700/60 text-center cursor-pointer hover:bg-slate-900 transition-colors group"
            >
              <p className="leading-snug">{bubbleText}</p>
              {/* Pointer triangle */}
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900/90 rotate-45 border-r border-b border-slate-700/60" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mascot Center Platform */}
        <div className="relative flex items-center justify-center w-60 h-44">
          {/* Ambient pulse circle around pet */}
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
              opacity: [0.5, 0.85, 0.5],
            }}
            transition={{
              duration: 2.8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              boxShadow: theme.auraShadow,
            }}
            className="absolute w-36 h-36 rounded-full pointer-events-none"
          />

          {/* Interactive Vector Pet with Organic Physics & Reactions */}
          <div className={`transition-all duration-500 ${isUnsafe ? 'grayscale contrast-125' : ''}`}>
            <PetGraphic
              symptom={state.primarySymptom}
              healthLevel={state.healthLevel}
              isHovered={isHovered}
              mousePos={mousePos}
              isBlinking={isBlinking}
              reactionType={reactionType}
              accessory={activeAccessory}
            />
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
            title="Pet Byte (Spacebar shortcut)"
            className="px-2 py-1 rounded-lg bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-600 border border-slate-200/70 text-[11px] font-semibold flex items-center gap-1 transition-all active:scale-95 shadow-2xs"
          >
            <span>🐾</span>
            <span>Pet</span>
          </button>

          <button
            type="button"
            onClick={handleFeedCoffee}
            title="Give Byte a cup of coffee"
            className="px-2 py-1 rounded-lg bg-slate-50 hover:bg-amber-50 hover:text-amber-700 text-slate-600 border border-slate-200/70 text-[11px] font-semibold flex items-center gap-1 transition-all active:scale-95 shadow-2xs"
          >
            <span>☕</span>
            <span>Fuel</span>
          </button>

          <button
            type="button"
            onClick={handleCycleAccessory}
            title="Change Byte's wearable accessory"
            className="px-2 py-1 rounded-lg bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 border border-slate-200/70 text-[11px] font-semibold flex items-center gap-1 transition-all active:scale-95 shadow-2xs"
          >
            <span>🎩</span>
            <span>Outfit</span>
          </button>

          <button
            type="button"
            onClick={handleCycleQuip}
            title="Ask Byte for git tips"
            className="px-2 py-1 rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-600 text-slate-600 border border-slate-200/70 text-[11px] font-semibold flex items-center gap-1 transition-all active:scale-95 shadow-2xs"
          >
            <span>💬</span>
            <span>Ask</span>
          </button>
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

// Sub-component: Expressive Vector Mascot Graphic with Blinking, Tracking & Wearables
interface PetGraphicProps {
  symptom: SymptomType;
  healthLevel: HealthLevel;
  isHovered: boolean;
  mousePos: { x: number; y: number };
  isBlinking: boolean;
  reactionType: 'idle' | 'pet' | 'coffee' | 'sparkle';
  accessory: MascotAccessory;
}

const PetGraphic: React.FC<PetGraphicProps> = ({
  symptom,
  healthLevel,
  isHovered,
  mousePos,
  isBlinking,
  reactionType,
  accessory,
}) => {
  const isUnsafe = healthLevel === 'Unsafe';

  // Base natural float animation
  const bounceDuration =
    symptom === 'merge_conflict' ? 0.9 : symptom === 'stale_branch' ? 3.6 : 1.9;

  // Squash-and-stretch dynamic scale mapping
  const getScaleAnimation = () => {
    if (reactionType === 'pet') {
      return {
        scaleX: [1, 1.14, 0.92, 1.04, 1],
        scaleY: [1, 0.86, 1.1, 0.96, 1],
        y: [0, -10, 0],
      };
    }
    if (reactionType === 'coffee') {
      return {
        scaleX: [1, 0.94, 1.08, 0.98, 1],
        scaleY: [1, 1.12, 0.9, 1.03, 1],
        y: [0, -14, 0],
      };
    }
    if (reactionType === 'sparkle') {
      return {
        scaleX: [1, 1.08, 0.96, 1],
        scaleY: [1, 1.08, 0.96, 1],
        rotate: [0, -4, 4, 0],
      };
    }
    return {
      y: isUnsafe ? 0 : isHovered ? -7 : [0, -5, 0],
      scaleX: 1,
      scaleY: 1,
    };
  };

  return (
    <motion.div
      className="relative flex items-center justify-center"
      animate={getScaleAnimation()}
      transition={
        reactionType !== 'idle'
          ? { duration: 0.55, ease: 'easeOut' }
          : isUnsafe
          ? { duration: 0 }
          : {
              duration: bounceDuration,
              repeat: Infinity,
              repeatType: 'reverse' as const,
              ease: 'easeInOut' as const,
            }
      }
    >
      <svg
        viewBox="0 0 200 180"
        className="w-48 h-40 drop-shadow-sm overflow-visible select-none"
      >
        <defs>
          {/* Main body radial and linear gradients for cute 3D depth */}
          <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="45%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>

          <linearGradient id="bellyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#DBEAFE" />
          </linearGradient>

          <linearGradient id="earGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#93C5FD" />
            <stop offset="50%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1E40AF" />
          </linearGradient>

          <linearGradient id="backpackGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>

          {/* Cyber Visor Gradient */}
          <linearGradient id="cyberVisorGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#EC4899" stopOpacity="0.9" />
          </linearGradient>

          {/* Wizard Hat Gradient */}
          <linearGradient id="wizardHatGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#4C1D95" />
          </linearGradient>
        </defs>

        {/* Tail */}
        <motion.path
          d="M 60 120 C 40 115, 30 90, 45 80 C 52 75, 60 85, 55 98"
          fill="none"
          stroke="#2563EB"
          strokeWidth="8"
          strokeLinecap="round"
          animate={{
            rotate: isUnsafe
              ? 0
              : symptom === 'clean_sync' || reactionType === 'pet'
              ? [-22, 32, -22]
              : symptom === 'stale_branch'
              ? [0, 0]
              : [-6, 12, -6],
            originX: '60px',
            originY: '120px',
          }}
          transition={
            isUnsafe
              ? { duration: 0 }
              : {
                  duration:
                    symptom === 'clean_sync' || reactionType === 'pet' ? 0.35 : 1.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }
          }
        />

        {/* Pet Body */}
        <ellipse cx="100" cy="115" rx="43" ry="35" fill="url(#bodyGradient)" />
        {/* Pet Belly */}
        <ellipse cx="100" cy="118" rx="27" ry="21" fill="url(#bellyGradient)" />

        {/* Left Ear */}
        <motion.path
          d="M 72 56 C 60 25, 75 15, 82 45 Z"
          fill="url(#earGradient)"
          animate={{
            rotate: isUnsafe
              ? -6
              : reactionType === 'pet'
              ? [-18, -2]
              : symptom === 'behind_remote'
              ? [-12, -8]
              : symptom === 'merge_conflict'
              ? [-18, 5, -18]
              : [-4, 4, -4],
            originX: '78px',
            originY: '50px',
          }}
          transition={isUnsafe ? { duration: 0 } : { duration: 1.2, repeat: Infinity }}
        />

        {/* Right Ear */}
        <motion.path
          d="M 128 56 C 140 25, 125 15, 118 45 Z"
          fill="url(#earGradient)"
          animate={{
            rotate: isUnsafe
              ? 6
              : reactionType === 'pet'
              ? [2, 18]
              : symptom === 'behind_remote'
              ? [8, 12]
              : symptom === 'merge_conflict'
              ? [5, -18, 5]
              : [4, -4, 4],
            originX: '122px',
            originY: '50px',
          }}
          transition={isUnsafe ? { duration: 0 } : { duration: 1.2, repeat: Infinity }}
        />

        {/* Pet Head */}
        <ellipse cx="100" cy="72" rx="35" ry="31" fill="url(#bodyGradient)" />

        {/* Paws */}
        <ellipse cx="77" cy="143" rx="10" ry="7" fill="#1D4ED8" />
        <ellipse cx="123" cy="143" rx="10" ry="7" fill="#1D4ED8" />

        {/* Cheeks Blush (Expands on pet / happy) */}
        <motion.circle
          cx="83"
          cy="75"
          r={reactionType === 'pet' ? 6.5 : 4.5}
          fill="#F472B6"
          opacity={reactionType === 'pet' ? 0.85 : 0.55}
          animate={{
            scale: reactionType === 'pet' ? [1, 1.2, 1] : 1,
          }}
          transition={{ duration: 0.6 }}
        />
        <motion.circle
          cx="117"
          cy="75"
          r={reactionType === 'pet' ? 6.5 : 4.5}
          fill="#F472B6"
          opacity={reactionType === 'pet' ? 0.85 : 0.55}
          animate={{
            scale: reactionType === 'pet' ? [1, 1.2, 1] : 1,
          }}
          transition={{ duration: 0.6 }}
        />

        {/* ================= MASCOT FACIAL EXPRESSIONS ================= */}
        {/* 1. DESTRUCTIVE HAZARD STATE */}
        {symptom === 'destructive_hazard' && (
          <g>
            <circle cx="89" cy="67" r="6" fill="#FFFFFF" />
            <circle cx="89" cy="67" r="3.5" fill="#DC2626" />
            <circle cx="111" cy="67" r="6" fill="#FFFFFF" />
            <circle cx="111" cy="67" r="3.5" fill="#DC2626" />
            <circle cx="100" cy="74" r="3" fill="#1E293B" />
            <line
              x1="94"
              y1="80"
              x2="106"
              y2="80"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Warning Shield Badge */}
            <g transform="translate(76, 102)">
              <motion.path
                d="M 24 2 L 44 8 L 44 26 C 44 38, 24 46, 24 46 C 24 46, 4 38, 4 26 L 4 8 Z"
                fill="#DC2626"
                stroke="#FEE2E2"
                strokeWidth="2"
                animate={{ scale: [1, 1.05, 1], opacity: [0.92, 1, 0.92] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              />
              <text
                x="24"
                y="29"
                fontSize="20"
                fontWeight="900"
                fill="#FFFFFF"
                textAnchor="middle"
              >
                !
              </text>
            </g>
            <circle
              cx="100"
              cy="115"
              r="50"
              fill="none"
              stroke="#EF4444"
              strokeWidth="2"
              strokeDasharray="5 3"
              opacity="0.75"
            />
          </g>
        )}

        {/* 2. MERGE CONFLICT STATE */}
        {symptom === 'merge_conflict' && (
          <g>
            <g transform="translate(86, 64)">
              <circle cx="4" cy="4" r="6" fill="#FFFFFF" />
              <path d="M 1 4 Q 4 1 7 4 Q 4 7 1 4" fill="none" stroke="#EF4444" strokeWidth="2" />
            </g>
            <g transform="translate(106, 64)">
              <circle cx="4" cy="4" r="6" fill="#FFFFFF" />
              <path d="M 1 4 Q 4 1 7 4 Q 4 7 1 4" fill="none" stroke="#EF4444" strokeWidth="2" />
            </g>
            <circle cx="100" cy="74" r="3" fill="#1E293B" />
            <path
              d="M 94 80 Q 97 77 100 80 Q 103 83 106 80"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Tangled Yarn */}
            <motion.path
              d="M 70 100 C 60 70, 130 60, 120 110 C 110 150, 75 125, 95 95 C 115 65, 140 120, 80 130"
              fill="none"
              stroke="#EF4444"
              strokeWidth="3.5"
              strokeLinecap="round"
              animate={{
                strokeDasharray: ['8 4', '4 8', '8 4'],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <path
              d="M 65 115 C 80 140, 135 130, 130 90 C 125 50, 75 60, 85 85"
              fill="none"
              stroke="#38BDF8"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <text x="145" y="65" fontSize="16" fontWeight="bold" fill="#EF4444">
              &lt;&lt;&lt;
            </text>
            <text x="40" y="85" fontSize="16" fontWeight="bold" fill="#EF4444">
              &gt;&gt;&gt;
            </text>
          </g>
        )}

        {/* 3. STALE BRANCH (Snoozing) */}
        {symptom === 'stale_branch' && (
          <g>
            <path
              d="M 85 68 Q 90 73 95 68"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M 105 68 Q 110 73 115 68"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="100" cy="74" r="3" fill="#1E293B" />
            <path d="M 80 48 C 75 25, 110 20, 120 48 Z" fill="#6366F1" />
            <circle cx="73" cy="24" r="5" fill="#FEF08A" />
            <motion.text
              x="135"
              y="50"
              fontSize="12"
              fontWeight="bold"
              fill="#818CF8"
              animate={{ opacity: [0, 1, 0], y: [50, 35] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
            >
              Z
            </motion.text>
            <motion.text
              x="145"
              y="38"
              fontSize="16"
              fontWeight="bold"
              fill="#6366F1"
              animate={{ opacity: [0, 1, 0], y: [38, 20] }}
              transition={{ duration: 2, delay: 0.7, repeat: Infinity, ease: 'easeOut' }}
            >
              Z
            </motion.text>
            <path d="M 50 120 L 65 130 M 50 125 L 60 135" stroke="#CBD5E1" strokeWidth="1.5" />
          </g>
        )}

        {/* 4. BEHIND REMOTE (Leash pulling) */}
        {symptom === 'behind_remote' && (
          <g>
            {/* Interactive Eye Tracking + Blinking */}
            {isBlinking ? (
              <g>
                <line x1="84" y1="68" x2="96" y2="68" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="104" y1="68" x2="116" y2="68" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
              </g>
            ) : (
              <g>
                <circle cx="90" cy="68" r="5.5" fill="#FFFFFF" />
                <circle cx={90 + mousePos.x * 0.6} cy={68 + mousePos.y * 0.6} r="3" fill="#0F172A" />
                <circle cx={89 + mousePos.x * 0.6} cy={67 + mousePos.y * 0.6} r="1" fill="#FFFFFF" />

                <circle cx="110" cy="68" r="5.5" fill="#FFFFFF" />
                <circle cx={110 + mousePos.x * 0.6} cy={68 + mousePos.y * 0.6} r="3" fill="#0F172A" />
                <circle cx={109 + mousePos.x * 0.6} cy={67 + mousePos.y * 0.6} r="1" fill="#FFFFFF" />
              </g>
            )}
            <circle cx="100" cy="74" r="3" fill="#1E293B" />
            <ellipse cx="100" cy="79" rx="3.5" ry="2.5" fill="#FFFFFF" />
            <motion.path
              d="M 100 95 C 130 98, 160 110, 190 100"
              fill="none"
              stroke="#F59E0B"
              strokeWidth="4"
              strokeDasharray="4 3"
              animate={{
                strokeDashoffset: [0, -14],
              }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <rect x="86" y="90" width="28" height="6" rx="3" fill="#F59E0B" />
            <path
              d="M 175 92 L 188 98 L 175 104"
              fill="none"
              stroke="#F59E0B"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </g>
        )}

        {/* 5. UNPUSHED WORK (Backpack) */}
        {symptom === 'unpushed_work' && (
          <g>
            {isBlinking ? (
              <g>
                <line x1="84" y1="67" x2="96" y2="67" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="104" y1="67" x2="116" y2="67" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
              </g>
            ) : (
              <g>
                <circle cx="90" cy="67" r="5.5" fill="#FFFFFF" />
                <circle cx={90 + mousePos.x * 0.6} cy={65 + mousePos.y * 0.6} r="3" fill="#0F172A" />
                <circle cx={89 + mousePos.x * 0.6} cy={64 + mousePos.y * 0.6} r="1" fill="#FFFFFF" />

                <circle cx="110" cy="67" r="5.5" fill="#FFFFFF" />
                <circle cx={110 + mousePos.x * 0.6} cy={65 + mousePos.y * 0.6} r="3" fill="#0F172A" />
                <circle cx={109 + mousePos.x * 0.6} cy={64 + mousePos.y * 0.6} r="1" fill="#FFFFFF" />
              </g>
            )}
            <circle cx="100" cy="74" r="3" fill="#1E293B" />
            <path
              d="M 96 79 Q 100 81 104 79"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Backpack */}
            <g transform="translate(48, 88)">
              <rect
                x="0"
                y="0"
                width="26"
                height="32"
                rx="6"
                fill="url(#backpackGrad)"
                stroke="#B45309"
                strokeWidth="1.5"
              />
              <rect x="4" y="6" width="18" height="10" rx="3" fill="#FEF3C7" />
              <circle cx="13" cy="11" r="2.5" fill="#D97706" />
              <line x1="13" y1="13" x2="13" y2="24" stroke="#D97706" strokeWidth="2" />
              <circle cx="13" cy="24" r="2.5" fill="#D97706" />
              <path d="M 22 4 C 32 8, 32 24, 22 28" fill="none" stroke="#92400E" strokeWidth="2.5" />
            </g>
          </g>
        )}

        {/* 6. DETACHED HEAD STATE */}
        {symptom === 'detached_head' && (
          <g>
            <circle cx="89" cy="67" r="6" fill="#FFFFFF" />
            <circle cx={88 + mousePos.x * 0.5} cy={67 + mousePos.y * 0.5} r="3" fill="#64748B" />
            <circle cx="111" cy="67" r="6" fill="#FFFFFF" />
            <circle cx={112 + mousePos.x * 0.5} cy={67 + mousePos.y * 0.5} r="3" fill="#64748B" />
            <circle cx="100" cy="74" r="3" fill="#1E293B" />
            <ellipse cx="100" cy="79" rx="3" ry="2" fill="#FFFFFF" />
            <motion.ellipse
              cx="100"
              cy="34"
              rx="18"
              ry="8"
              fill="none"
              stroke="#94A3B8"
              strokeWidth="2"
              strokeDasharray="4 3"
              animate={{ rotate: [0, 360], originX: '100px', originY: '34px' }}
              transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
            />
          </g>
        )}

        {/* 7. CLEAN & PRISTINE (Happy & Interactive) */}
        {symptom === 'clean_sync' && (
          <g>
            {reactionType === 'pet' ? (
              // Joyful squints when petted
              <g>
                <path d="M 85 68 Q 91 61 97 68" fill="none" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M 103 68 Q 109 61 115 68" fill="none" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />
              </g>
            ) : isBlinking ? (
              <g>
                <line x1="85" y1="68" x2="97" y2="68" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
                <line x1="103" y1="68" x2="115" y2="68" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
              </g>
            ) : (
              // Glossy Curious Eyes tracking cursor
              <g>
                <circle cx="91" cy="67" r="6" fill="#FFFFFF" />
                <circle cx={91 + mousePos.x * 0.6} cy={67 + mousePos.y * 0.6} r="3.8" fill="#0F172A" />
                <circle cx={89.5 + mousePos.x * 0.6} cy={65.5 + mousePos.y * 0.6} r="1.6" fill="#FFFFFF" />

                <circle cx="109" cy="67" r="6" fill="#FFFFFF" />
                <circle cx={109 + mousePos.x * 0.6} cy={67 + mousePos.y * 0.6} r="3.8" fill="#0F172A" />
                <circle cx={107.5 + mousePos.x * 0.6} cy={65.5 + mousePos.y * 0.6} r="1.6" fill="#FFFFFF" />
              </g>
            )}

            {/* Cute Nose */}
            <circle cx="100" cy="74" r="3.5" fill="#1E293B" />
            {/* Smiling Mouth */}
            <path
              d="M 94 78 Q 100 84 106 78"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Pristine Sparkles */}
            <circle cx="145" cy="45" r="3" fill="#10B981" />
            <circle cx="55" cy="65" r="2.5" fill="#10B981" />
            <path
              d="M 148 40 L 152 40 M 150 38 L 150 42"
              stroke="#10B981"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>
        )}

        {/* ================= WEARABLE ACCESSORIES ================= */}
        {/* A. Dev Headphones */}
        {accessory === 'headphones' && (
          <g>
            {/* Headband */}
            <path
              d="M 68 64 C 68 34, 132 34, 132 64"
              fill="none"
              stroke="#0F172A"
              strokeWidth="5"
              strokeLinecap="round"
            />
            {/* Left Ear-cup */}
            <rect x="62" y="56" width="10" height="20" rx="4" fill="#3B82F6" stroke="#0F172A" strokeWidth="2" />
            <motion.line
              x1="67"
              y1="61"
              x2="67"
              y2="71"
              stroke="#60A5FA"
              strokeWidth="2"
              strokeLinecap="round"
              animate={{ strokeWidth: [1, 3, 1] }}
              transition={{ duration: 0.6, repeat: Infinity }}
            />
            {/* Right Ear-cup */}
            <rect x="128" y="56" width="10" height="20" rx="4" fill="#3B82F6" stroke="#0F172A" strokeWidth="2" />
            <motion.line
              x1="133"
              y1="61"
              x2="133"
              y2="71"
              stroke="#60A5FA"
              strokeWidth="2"
              strokeLinecap="round"
              animate={{ strokeWidth: [3, 1, 3] }}
              transition={{ duration: 0.6, repeat: Infinity }}
            />
          </g>
        )}

        {/* B. AR Cyber Visor */}
        {accessory === 'cyber_visor' && (
          <g>
            <motion.path
              d="M 76 60 L 124 60 L 120 74 L 80 74 Z"
              fill="url(#cyberVisorGrad)"
              stroke="#38BDF8"
              strokeWidth="1.5"
              animate={{ opacity: [0.85, 1, 0.85] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <line x1="82" y1="67" x2="118" y2="67" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="3 2" />
          </g>
        )}

        {/* C. Hot Coffee Mug */}
        {accessory === 'coffee_mug' && (
          <g transform="translate(125, 120)">
            {/* Mug body */}
            <rect x="0" y="0" width="18" height="20" rx="3" fill="#F8FAFC" stroke="#0F172A" strokeWidth="1.5" />
            {/* Coffee handle */}
            <path d="M 18 4 C 23 4, 23 16, 18 16" fill="none" stroke="#0F172A" strokeWidth="1.5" />
            {/* Heart on mug */}
            <path d="M 9 9 C 7 7, 5 9, 9 13 C 13 9, 11 7, 9 9 Z" fill="#EF4444" />
            {/* Animated rising steam wisps */}
            <motion.path
              d="M 5 -2 C 3 -6, 7 -10, 5 -14"
              fill="none"
              stroke="#94A3B8"
              strokeWidth="1.5"
              strokeLinecap="round"
              animate={{ opacity: [0, 0.8, 0], y: [-2, -8] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
            />
            <motion.path
              d="M 12 -2 C 10 -6, 14 -10, 12 -14"
              fill="none"
              stroke="#94A3B8"
              strokeWidth="1.5"
              strokeLinecap="round"
              animate={{ opacity: [0, 0.8, 0], y: [-2, -8] }}
              transition={{ duration: 1.6, delay: 0.6, repeat: Infinity, ease: 'easeOut' }}
            />
          </g>
        )}

        {/* D. Ribbon Patrol Gold Badge */}
        {accessory === 'gold_badge' && (
          <g transform="translate(93, 107)">
            <polygon
              points="7,0 9,5 14,5 10,9 12,14 7,11 2,14 4,9 0,5 5,5"
              fill="#F59E0B"
              stroke="#B45309"
              strokeWidth="1"
            />
            <circle cx="7" cy="7" r="2.5" fill="#FEF3C7" />
          </g>
        )}

        {/* E. Wizard Hat */}
        {accessory === 'wizard_hat' && (
          <g transform="translate(74, 18)">
            {/* Brim */}
            <ellipse cx="26" cy="36" rx="30" ry="7" fill="#4C1D95" stroke="#312E81" strokeWidth="1" />
            {/* Cone */}
            <polygon points="26,0 48,34 4,34" fill="url(#wizardHatGrad)" stroke="#312E81" strokeWidth="1" />
            {/* Band */}
            <path d="M 7 31 Q 26 36 45 31" fill="none" stroke="#F59E0B" strokeWidth="3" />
            {/* Star */}
            <polygon
              points="26,16 27.5,20 31.5,20 28.5,22.5 29.5,26.5 26,24 22.5,26.5 23.5,22.5 20.5,20 24.5,20"
              fill="#FEF08A"
            />
          </g>
        )}
      </svg>
    </motion.div>
  );
};
