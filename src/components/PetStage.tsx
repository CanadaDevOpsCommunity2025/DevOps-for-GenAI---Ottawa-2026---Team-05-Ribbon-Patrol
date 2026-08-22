import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Heart,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Info,
  Mic,
  Palette,
  Camera,
  Layers,
  Wand2,
} from 'lucide-react';
import { RepositoryState, SymptomType, HealthLevel } from '../types';

interface PetStageProps {
  state: RepositoryState;
  onPetClick?: () => void;
  petTriggerTimestamp?: number;
}

export const PetStage: React.FC<PetStageProps> = ({
  state,
  onPetClick,
  petTriggerTimestamp,
}) => {
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const [isHovered, setIsHovered] = useState(false);

  // Trigger floating hearts on programmatic pet trigger (e.g. from Space shortcut)
  useEffect(() => {
    if (petTriggerTimestamp) {
      const newHeart = {
        id: petTriggerTimestamp,
        x: 120 + (Math.random() * 40 - 20),
        y: 80 + (Math.random() * 30 - 15),
      };
      setHearts((prev) => [...prev, newHeart]);
      setTimeout(() => {
        setHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
      }, 1200);
    }
  }, [petTriggerTimestamp]);

  const handleStageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newHeart = { id: Date.now(), x, y };
    setHearts((prev) => [...prev, newHeart]);
    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
    }, 1200);

    if (onPetClick) {
      onPetClick();
    }
  };

  // Determine aura and theme colors based on health
  const getHealthTheme = (level: HealthLevel) => {
    switch (level) {
      case 'Healthy':
        return {
          glow: 'rgba(16, 185, 129, 0.18)',
          pulseColor: 'border-emerald-400 bg-emerald-500/10 text-emerald-700',
          barBg: 'bg-emerald-500',
          badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
          icon: CheckCircle2,
          moodLabel: 'Relaxed & Playful',
          auraShadow: '0 0 35px rgba(16, 185, 129, 0.22)',
        };
      case 'Attention':
        return {
          glow: 'rgba(245, 158, 11, 0.18)',
          pulseColor: 'border-amber-400 bg-amber-500/10 text-amber-700',
          barBg: 'bg-amber-500',
          badgeBg: 'bg-amber-50 text-amber-800 border-amber-200/80',
          icon: AlertTriangle,
          moodLabel: 'Uneasy & Alert',
          auraShadow: '0 0 35px rgba(245, 158, 11, 0.25)',
        };
      case 'Blocked':
        return {
          glow: 'rgba(239, 68, 68, 0.18)',
          pulseColor: 'border-rose-400 bg-rose-500/10 text-rose-700',
          barBg: 'bg-rose-500',
          badgeBg: 'bg-rose-50 text-rose-800 border-rose-200/80',
          icon: ShieldAlert,
          moodLabel: 'Distressed & Blocked',
          auraShadow: '0 0 35px rgba(239, 68, 68, 0.3)',
        };
      case 'Unsafe':
        return {
          glow: 'rgba(225, 29, 72, 0.15)',
          pulseColor: 'border-rose-500 bg-rose-500/10 text-rose-800',
          barBg: 'bg-rose-600',
          badgeBg: 'bg-rose-50 text-rose-800 border-rose-300 ring-2 ring-rose-400/20',
          icon: ShieldAlert,
          moodLabel: 'Guarded & Alert (0%)',
          auraShadow: '0 0 35px rgba(225, 29, 72, 0.3)',
        };
      default:
        return {
          glow: 'rgba(100, 116, 139, 0.18)',
          pulseColor: 'border-slate-400 bg-slate-500/10 text-slate-700',
          barBg: 'bg-slate-500',
          badgeBg: 'bg-slate-100 text-slate-700 border-slate-300',
          icon: ShieldAlert,
          moodLabel: 'Still & Protected',
          auraShadow: '0 0 30px rgba(100, 116, 139, 0.2)',
        };
    }
  };

  const isUnsafe = state.healthLevel === 'Unsafe' || state.healthPercentage === 0;
  const theme = getHealthTheme(state.healthLevel);
  const StatusIcon = theme.icon;

  return (
    <div
      id="gitpet-stage-container"
      role="region"
      aria-label={
        isUnsafe
          ? 'Repository Status: Unsafe (0% Health) - Immediate work-loss hazard detected'
          : `Repository Status: ${state.healthLevel} (${state.healthPercentage}% Health)`
      }
      onClick={handleStageClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative w-full rounded-2xl bg-white border p-5 sm:p-6 shadow-xs overflow-hidden select-none cursor-pointer transition-all duration-300 hover:shadow-sm ${
        isUnsafe ? 'border-rose-300 ring-2 ring-rose-500/10' : 'border-slate-200/80'
      }`}
    >
      {/* Background ambient radial glow */}
      <motion.div
        className="absolute inset-0 pointer-events-none transition-all duration-700"
        animate={{
          background: `radial-gradient(circle at 50% 45%, ${theme.glow} 0%, rgba(255,255,255,0) 65%)`,
        }}
      />

      {/* Floating click hearts */}
      <AnimatePresence>
        {hearts.map((h) => (
          <motion.div
            key={h.id}
            initial={{ opacity: 1, scale: 0.5, y: h.y, x: h.x }}
            animate={{ opacity: 0, scale: 1.4, y: h.y - 60, x: h.x + (Math.random() * 20 - 10) }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className={`absolute pointer-events-none z-30 flex items-center gap-1 font-medium text-xs bg-white/90 px-2 py-0.5 rounded-full shadow-sm ${
              isUnsafe ? 'text-slate-600 border border-slate-300' : 'text-rose-500'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isUnsafe ? 'fill-slate-500 text-slate-500' : 'fill-rose-500'}`} />
            <span>{isUnsafe ? '*guards uncommitted work*' : '*purrs safely*'}</span>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Top stage details: Mood badge & Health meter */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-3">
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
        <div className="flex items-center gap-2 min-w-[150px]">
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

      {/* Center Stage: The Expressive Pet Canvas */}
      <div className="relative z-10 flex flex-col items-center justify-center py-2 sm:py-4">
        <div className="relative flex items-center justify-center w-56 h-48">
          {/* Ambient pulse circle around pet */}
          <motion.div
            animate={{
              scale: [1, 1.04, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              boxShadow: theme.auraShadow,
            }}
            className="absolute w-40 h-40 rounded-full pointer-events-none"
          />

          {/* Interactive Vector Pet */}
          <div className={`transition-all duration-500 ${isUnsafe ? 'grayscale contrast-125' : ''}`}>
            <PetGraphic
              symptom={state.primarySymptom}
              healthLevel={state.healthLevel}
              isHovered={isHovered}
            />
          </div>
        </div>

        {/* Symptom diagnosis caption */}
        <div className="mt-2 text-center max-w-md">
          <h3 className="text-sm font-bold text-slate-900 flex items-center justify-center gap-1.5">
            <span>{state.symptomTitle}</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            {state.operatorMeaning}
          </p>
        </div>
      </div>

      {/* Floating hint at bottom */}
      <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-2.5 mt-2">
        <span className="flex items-center gap-1.5 flex-wrap">
          <Info className="w-3 h-3 text-slate-400" />
          <span>Click Byte or press</span>
          <kbd className="px-1.5 py-0.2 bg-slate-100 border border-slate-200 rounded text-[10px] font-mono font-semibold text-slate-600">
            Space
          </kbd>
          <span>to pet</span>
        </span>
        <span className="font-mono text-[10px] bg-slate-50 text-slate-500 border border-slate-200/60 px-1.5 py-0.2 rounded">
          {state.currentBranch.name}
        </span>
      </div>
    </div>
  );
};

// Sub-component: Expressive SVG Animated Pet Graphic
interface PetGraphicProps {
  symptom: SymptomType;
  healthLevel: HealthLevel;
  isHovered: boolean;
}

const PetGraphic: React.FC<PetGraphicProps> = ({ symptom, healthLevel, isHovered }) => {
  const isUnsafe = healthLevel === 'Unsafe';

  const bounceTransition = isUnsafe
    ? { duration: 0 }
    : {
        duration: symptom === 'merge_conflict' ? 0.8 : symptom === 'stale_branch' ? 3.5 : 1.8,
        repeat: Infinity,
        repeatType: 'reverse' as const,
        ease: 'easeInOut' as const,
      };

  return (
    <motion.div
      className="relative flex items-center justify-center"
      animate={{
        y: isUnsafe ? 0 : isHovered ? -6 : [0, -4, 0],
      }}
      transition={bounceTransition}
    >
      <svg
        viewBox="0 0 200 180"
        className="w-44 h-40 drop-shadow-2xs overflow-visible"
      >
        <defs>
          <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
          <linearGradient id="bellyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#EFF6FF" />
            <stop offset="100%" stopColor="#DBEAFE" />
          </linearGradient>
          <linearGradient id="earGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
          <linearGradient id="backpackGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
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
              : symptom === 'clean_sync'
              ? [-15, 25, -15]
              : symptom === 'stale_branch'
              ? [0, 0]
              : [-5, 10, -5],
            originX: '60px',
            originY: '120px',
          }}
          transition={
            isUnsafe
              ? { duration: 0 }
              : {
                  duration: symptom === 'clean_sync' ? 0.4 : 1.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }
          }
        />

        {/* Pet Body */}
        <ellipse cx="100" cy="115" rx="42" ry="34" fill="url(#bodyGradient)" />
        {/* Pet Belly */}
        <ellipse cx="100" cy="118" rx="26" ry="20" fill="url(#bellyGradient)" />

        {/* Pet Head */}
        <ellipse cx="100" cy="72" rx="34" ry="30" fill="url(#bodyGradient)" />

        {/* Left Ear */}
        <motion.path
          d="M 72 56 C 60 25, 75 15, 82 45 Z"
          fill="url(#earGradient)"
          animate={{
            rotate: isUnsafe
              ? -6
              : symptom === 'behind_remote'
              ? [-12, -8]
              : symptom === 'merge_conflict'
              ? [-18, 5, -18]
              : [-4, 4, -4],
            originX: '78px',
            originY: '50px',
          }}
          transition={isUnsafe ? { duration: 0 } : { duration: 1.4, repeat: Infinity }}
        />
        {/* Right Ear */}
        <motion.path
          d="M 128 56 C 140 25, 125 15, 118 45 Z"
          fill="url(#earGradient)"
          animate={{
            rotate: isUnsafe
              ? 6
              : symptom === 'behind_remote'
              ? [8, 12]
              : symptom === 'merge_conflict'
              ? [5, -18, 5]
              : [4, -4, 4],
            originX: '122px',
            originY: '50px',
          }}
          transition={isUnsafe ? { duration: 0 } : { duration: 1.4, repeat: Infinity }}
        />

        {/* Paws */}
        <ellipse cx="78" cy="142" rx="10" ry="7" fill="#1D4ED8" />
        <ellipse cx="122" cy="142" rx="10" ry="7" fill="#1D4ED8" />

        {/* Face Elements depending on symptom */}
        {symptom === 'destructive_hazard' && (
          <g>
            {/* Alert focused wide eyes */}
            <circle cx="90" cy="67" r="6" fill="#FFFFFF" />
            <circle cx="90" cy="67" r="3.5" fill="#DC2626" />
            <circle cx="110" cy="67" r="6" fill="#FFFFFF" />
            <circle cx="110" cy="67" r="3.5" fill="#DC2626" />
            {/* Focused nose & firm guarded mouth */}
            <circle cx="100" cy="74" r="3" fill="#1E293B" />
            <line x1="94" y1="80" x2="106" y2="80" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
            {/* Warning Shield & Work-Loss Barrier in front of mascot */}
            <g transform="translate(76, 102)">
              <motion.path
                d="M 24 2 L 44 8 L 44 26 C 44 38, 24 46, 24 46 C 24 46, 4 38, 4 26 L 4 8 Z"
                fill="#DC2626"
                stroke="#FEE2E2"
                strokeWidth="2"
                animate={{ scale: [1, 1.05, 1], opacity: [0.92, 1, 0.92] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              />
              <text x="24" y="29" fontSize="20" fontWeight="900" fill="#FFFFFF" textAnchor="middle">
                !
              </text>
            </g>
            {/* Hazard alert outline pulse ring */}
            <circle cx="100" cy="115" r="50" fill="none" stroke="#EF4444" strokeWidth="2" strokeDasharray="5 3" opacity="0.75" />
          </g>
        )}

        {symptom === 'clean_sync' && (
          <g>
            {/* Happy curved eyes */}
            <path d="M 86 68 Q 92 62 98 68" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
            <path d="M 102 68 Q 108 62 114 68" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
            {/* Cute nose */}
            <circle cx="100" cy="74" r="3.5" fill="#1E293B" />
            {/* Smiling mouth */}
            <path d="M 94 78 Q 100 84 106 78" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
            {/* Cheeks */}
            <circle cx="84" cy="74" r="4.5" fill="#F472B6" opacity="0.6" />
            <circle cx="116" cy="74" r="4.5" fill="#F472B6" opacity="0.6" />
            {/* Sparkles around */}
            <circle cx="145" cy="45" r="3" fill="#10B981" />
            <circle cx="55" cy="65" r="2.5" fill="#10B981" />
            <path d="M 148 40 L 152 40 M 150 38 L 150 42" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
          </g>
        )}

        {symptom === 'behind_remote' && (
          <g>
            {/* Alert determined eyes */}
            <circle cx="90" cy="68" r="5" fill="#FFFFFF" />
            <circle cx="91" cy="68" r="3" fill="#0F172A" />
            <circle cx="110" cy="68" r="5" fill="#FFFFFF" />
            <circle cx="111" cy="68" r="3" fill="#0F172A" />
            {/* Nose */}
            <circle cx="100" cy="74" r="3" fill="#1E293B" />
            {/* Small open mouth */}
            <ellipse cx="100" cy="79" rx="3.5" ry="2.5" fill="#FFFFFF" />
            {/* Leash pulling forward to the right! */}
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
            {/* Leash collar */}
            <rect x="86" y="90" width="28" height="6" rx="3" fill="#F59E0B" />
            {/* Pull motion arrows */}
            <path d="M 175 92 L 188 98 L 175 104" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}

        {symptom === 'unpushed_work' && (
          <g>
            {/* Looking up / wide eyes */}
            <circle cx="90" cy="67" r="5.5" fill="#FFFFFF" />
            <circle cx="90" cy="65" r="3" fill="#0F172A" />
            <circle cx="110" cy="67" r="5.5" fill="#FFFFFF" />
            <circle cx="110" cy="65" r="3" fill="#0F172A" />
            <circle cx="100" cy="74" r="3" fill="#1E293B" />
            <path d="M 96 79 Q 100 81 104 79" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
            {/* Heavy Backpack on Pet's back */}
            <g transform="translate(48, 88)">
              <rect x="0" y="0" width="26" height="32" rx="6" fill="url(#backpackGrad)" stroke="#B45309" strokeWidth="1.5" />
              <rect x="4" y="6" width="18" height="10" rx="3" fill="#FEF3C7" />
              {/* Commit stack icon in backpack */}
              <circle cx="13" cy="11" r="2.5" fill="#D97706" />
              <line x1="13" y1="13" x2="13" y2="24" stroke="#D97706" strokeWidth="2" />
              <circle cx="13" cy="24" r="2.5" fill="#D97706" />
              {/* Straps */}
              <path d="M 22 4 C 32 8, 32 24, 22 28" fill="none" stroke="#92400E" strokeWidth="2.5" />
            </g>
          </g>
        )}

        {symptom === 'merge_conflict' && (
          <g>
            {/* Distressed spiral/swirl eyes */}
            <g transform="translate(86, 64)">
              <circle cx="4" cy="4" r="6" fill="#FFFFFF" />
              <path d="M 1 4 Q 4 1 7 4 Q 4 7 1 4" fill="none" stroke="#EF4444" strokeWidth="2" />
            </g>
            <g transform="translate(106, 64)">
              <circle cx="4" cy="4" r="6" fill="#FFFFFF" />
              <path d="M 1 4 Q 4 1 7 4 Q 4 7 1 4" fill="none" stroke="#EF4444" strokeWidth="2" />
            </g>
            <circle cx="100" cy="74" r="3" fill="#1E293B" />
            {/* Wobbly wavy mouth */}
            <path d="M 94 80 Q 97 77 100 80 Q 103 83 106 80" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
            {/* Tangled Yarn all over */}
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
            {/* Conflict markers icon */}
            <text x="145" y="65" fontSize="16" fontWeight="bold" fill="#EF4444">
              &lt;&lt;&lt;
            </text>
            <text x="40" y="85" fontSize="16" fontWeight="bold" fill="#EF4444">
              &gt;&gt;&gt;
            </text>
          </g>
        )}

        {symptom === 'detached_head' && (
          <g>
            {/* Wide wandering confused eyes */}
            <circle cx="89" cy="67" r="6" fill="#FFFFFF" />
            <circle cx="88" cy="67" r="3" fill="#64748B" />
            <circle cx="111" cy="67" r="6" fill="#FFFFFF" />
            <circle cx="112" cy="67" r="3" fill="#64748B" />
            <circle cx="100" cy="74" r="3" fill="#1E293B" />
            <ellipse cx="100" cy="79" rx="3" ry="2" fill="#FFFFFF" />
            {/* Floating detached dashed circle above head */}
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
            {/* Spinning compass needle */}
            <g transform="translate(145, 50)">
              <circle cx="12" cy="12" r="12" fill="#FFFFFF" stroke="#64748B" strokeWidth="1.5" />
              <motion.path
                d="M 12 4 L 15 12 L 9 12 Z"
                fill="#EF4444"
                animate={{ rotate: [0, 180, 45, 270, 0], originX: '12px', originY: '12px' }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.path
                d="M 12 20 L 15 12 L 9 12 Z"
                fill="#64748B"
                animate={{ rotate: [0, 180, 45, 270, 0], originX: '12px', originY: '12px' }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              />
            </g>
          </g>
        )}

        {symptom === 'stale_branch' && (
          <g>
            {/* Sleeping closed eyes */}
            <path d="M 85 68 Q 90 73 95 68" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 105 68 Q 110 73 115 68" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="100" cy="74" r="3" fill="#1E293B" />
            {/* Little nightcap */}
            <path d="M 80 48 C 75 25, 110 20, 120 48 Z" fill="#6366F1" />
            <circle cx="73" cy="24" r="5" fill="#FEF08A" />
            {/* Snoozing Zzz particles */}
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
            {/* Cobweb detail on edge */}
            <path d="M 50 120 L 65 130 M 50 125 L 60 135" stroke="#CBD5E1" strokeWidth="1.5" />
          </g>
        )}
      </svg>
    </motion.div>
  );
};
