import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { SymptomType, HealthLevel } from '../types';
import { MascotAccessory } from './PetStage';

interface PixelPetGraphicProps {
  symptom: SymptomType;
  healthLevel: HealthLevel;
  isHovered: boolean;
  mousePos: { x: number; y: number };
  isBlinking: boolean;
  reactionType: 'idle' | 'pet' | 'coffee' | 'sparkle';
  accessory: MascotAccessory;
}

export interface PixelRect {
  x: number;
  y: number;
  w?: number;
  h?: number;
  c: string;
}

export const PixelPetGraphic: React.FC<PixelPetGraphicProps> = ({
  symptom,
  healthLevel,
  isHovered,
  mousePos,
  isBlinking,
  reactionType,
  accessory,
}) => {
  const [frame, setFrame] = useState(0);

  // 4-frame stepped clock for smooth retro animation
  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((prev) => (prev + 1) % 4);
    }, 240);
    return () => clearInterval(timer);
  }, []);

  const isUnsafe = healthLevel === 'Unsafe';
  const isSleeping = symptom === 'stale_branch';
  const isConflicted = symptom === 'merge_conflict';
  const isHazard = symptom === 'destructive_hazard';
  const isBehind = symptom === 'behind_remote';
  const isUnpushed = symptom === 'unpushed_work';
  const isDetached = symptom === 'detached_head';
  const isClean = symptom === 'clean_sync';

  // Breathing and antenna bob
  const bobY = isSleeping ? (frame % 2 === 0 ? 0 : 1) : frame === 1 || frame === 3 ? -1 : 0;
  const antWiggleL = frame === 1 ? -1 : frame === 3 ? 1 : 0;
  const antWiggleR = frame === 1 ? 1 : frame === 3 ? -1 : 0;

  // Eye tracking offset (clamped -1, 0, 1)
  const lookX = Math.max(-1, Math.min(1, Math.round(mousePos.x / 2)));
  const lookY = Math.max(-1, Math.min(1, Math.round(mousePos.y / 2)));

  // Refined Master Color Palette based on reference image
  const P = {
    // Outlines (Rich deep plum/indigo, clean and defined)
    OUTLINE: '#270838',
    OUTLINE_SOFT: '#3B0E54',
    // Left Side: Vibrant Pink / Magenta
    PINK_HL: '#FF75B5',
    PINK_LIGHT: '#F43F5E',
    PINK_MID: '#E11D48',
    PINK_DARK: '#BE123C',
    // Right Side: Vibrant Violet / Purple
    PURPLE_HL: '#C084FC',
    PURPLE_LIGHT: '#A855F7',
    PURPLE_MID: '#7E22CE',
    PURPLE_DARK: '#581C87',
    // Screen Frame & Face
    SCREEN_BEZEL: '#374151',
    SCREEN_BG: '#E2E8F0',
    SCREEN_BG_LIGHT: '#F8FAFC',
    SCREEN_SHADOW: '#CBD5E1',
    // Eyes & Blush
    EYE_DARK: '#1E1B4B',
    EYE_SHINE: '#FFFFFF',
    BLUSH: '#FB7185',
    LED_ORANGE: '#FB923C',
    // Mat / Rug
    RUG_LIGHT: '#D8B4FE',
    RUG_MID: '#C084FC',
    RUG_DARK: '#9333EA',
    RUG_SHADOW: '#7E22CE',
    // Props & Accents
    GOLD: '#F59E0B',
    GOLD_LIGHT: '#FEF08A',
    CYAN: '#06B6D4',
    CYAN_LIGHT: '#67E8F9',
    RED: '#EF4444',
    GREEN: '#10B981',
  };

  const scale = 4; // 4px per pixel unit

  const draw = (pixels: PixelRect[], customScale = scale) => {
    return pixels.map((p, i) => (
      <rect
        key={i}
        x={p.x * customScale}
        y={(p.y + bobY) * customScale}
        width={(p.w || 1) * customScale}
        height={(p.h || 1) * customScale}
        fill={p.c}
        shapeRendering="crispEdges"
      />
    ));
  };

  // --- 1. SITTING MAT / RUG (Smooth rounded purple cloud rug) ---
  const rugPixels: PixelRect[] = [
    // Outer Border
    { x: 7, y: 31, w: 26, h: 6, c: P.OUTLINE },
    { x: 9, y: 30, w: 22, h: 8, c: P.OUTLINE },
    { x: 12, y: 29, w: 16, h: 10, c: P.OUTLINE },
    // Rug Fill
    { x: 8, y: 32, w: 24, h: 4, c: P.RUG_MID },
    { x: 10, y: 31, w: 20, h: 6, c: P.RUG_LIGHT },
    { x: 13, y: 30, w: 14, h: 8, c: P.RUG_LIGHT },
    // Rug Bottom Shadow & Depth
    { x: 10, y: 35, w: 20, h: 1, c: P.RUG_DARK },
    { x: 12, y: 36, w: 16, h: 1, c: P.RUG_SHADOW },
  ];

  // --- 2. ROBOT BODY & SITTING LEGS ---
  const bodyPixels: PixelRect[] = [
    // Body Outline
    { x: 13, y: 23, w: 14, h: 7, c: P.OUTLINE },
    { x: 14, y: 22, w: 12, h: 9, c: P.OUTLINE },
    // Left Side Body (Pink)
    { x: 14, y: 23, w: 6, h: 7, c: P.PINK_MID },
    { x: 14, y: 23, w: 3, h: 6, c: P.PINK_LIGHT },
    // Right Side Body (Purple)
    { x: 20, y: 23, w: 6, h: 7, c: P.PURPLE_MID },
    { x: 23, y: 23, w: 3, h: 6, c: P.PURPLE_DARK },

    // Left Sitting Foot (Pink)
    { x: 11, y: 26, w: 4, h: 5, c: P.OUTLINE },
    { x: 12, y: 27, w: 2, h: 3, c: P.PINK_LIGHT },
    { x: 12, y: 29, w: 2, h: 1, c: P.PINK_DARK },

    // Right Sitting Foot (Purple)
    { x: 25, y: 26, w: 4, h: 5, c: P.OUTLINE },
    { x: 26, y: 27, w: 2, h: 3, c: P.PURPLE_LIGHT },
    { x: 26, y: 29, w: 2, h: 1, c: P.PURPLE_DARK },

    // Front Right Sitting Leg
    { x: 19, y: 27, w: 4, h: 5, c: P.OUTLINE },
    { x: 20, y: 28, w: 2, h: 3, c: P.PURPLE_MID },
    { x: 20, y: 30, w: 2, h: 1, c: P.PURPLE_DARK },

    // Tiny Left Arm
    { x: 12, y: 23, w: 2, h: 4, c: P.OUTLINE },
    { x: 12, y: 24, w: 1, h: 2, c: P.PINK_LIGHT },
  ];

  // --- 3. TV HEAD CHASSIS & BEZEL ---
  const tvHeadPixels: PixelRect[] = [
    // Outer TV Outline (Rounded Rectangle)
    { x: 9, y: 7, w: 22, h: 16, c: P.OUTLINE },
    { x: 8, y: 9, w: 24, h: 12, c: P.OUTLINE },
    { x: 10, y: 6, w: 20, h: 18, c: P.OUTLINE },

    // Left Ear Speaker (Pink)
    { x: 6, y: 12, w: 3, h: 6, c: P.OUTLINE },
    { x: 7, y: 13, w: 1, h: 4, c: P.PINK_LIGHT },
    { x: 6, y: 13, w: 1, h: 4, c: P.PINK_MID },

    // Right Ear Speaker (Purple)
    { x: 31, y: 12, w: 3, h: 6, c: P.OUTLINE },
    { x: 32, y: 13, w: 1, h: 4, c: P.PURPLE_LIGHT },
    { x: 33, y: 13, w: 1, h: 4, c: P.PURPLE_DARK },

    // TV Housing Split Gradient (Pink on Left, Purple on Right)
    // Left half (Pink)
    { x: 9, y: 7, w: 11, h: 16, c: P.PINK_MID },
    { x: 8, y: 9, w: 12, h: 12, c: P.PINK_MID },
    { x: 10, y: 6, w: 10, h: 18, c: P.PINK_MID },
    // Pink Highlights (Top & Left)
    { x: 10, y: 7, w: 9, h: 2, c: P.PINK_HL },
    { x: 9, y: 9, w: 2, h: 10, c: P.PINK_HL },

    // Right half (Purple)
    { x: 20, y: 7, w: 11, h: 16, c: P.PURPLE_MID },
    { x: 20, y: 9, w: 12, h: 12, c: P.PURPLE_MID },
    { x: 20, y: 6, w: 10, h: 18, c: P.PURPLE_MID },
    // Purple Shadows (Right & Bottom)
    { x: 28, y: 9, w: 2, h: 12, c: P.PURPLE_DARK },
    { x: 12, y: 22, w: 16, h: 1, c: P.PURPLE_DARK },

    // Screen Bezel (Dark inner border)
    { x: 11, y: 9, w: 18, h: 12, c: P.OUTLINE },
    { x: 10, y: 10, w: 20, h: 10, c: P.OUTLINE },

    // Screen Face (Clean Grey/Silver monitor display)
    { x: 12, y: 10, w: 16, h: 10, c: P.SCREEN_BG },
    { x: 11, y: 11, w: 18, h: 8, c: P.SCREEN_BG },
    // Screen Highlight (Top & Left)
    { x: 12, y: 10, w: 16, h: 1, c: P.SCREEN_BG_LIGHT },
    { x: 11, y: 11, w: 1, h: 7, c: P.SCREEN_BG_LIGHT },
    // Screen Shadow (Bottom)
    { x: 12, y: 19, w: 16, h: 1, c: P.SCREEN_SHADOW },

    // Power / Health Status LED (Center bottom bezel)
    { x: 19, y: 22, w: 2, h: 1, c: isHazard ? P.RED : isClean ? P.GREEN : P.LED_ORANGE },
  ];

  // --- 4. ANTENNAS (Pink Left with Orb, Purple Right Angled with Orb) ---
  const antennaPixels: PixelRect[] = [
    // Left Antenna (Vertical with Pink Ball)
    { x: 14 + antWiggleL, y: 4, w: 2, h: 3, c: P.OUTLINE },
    { x: 13 + antWiggleL, y: 1, w: 4, h: 4, c: P.OUTLINE },
    { x: 14 + antWiggleL, y: 2, w: 2, h: 2, c: P.PINK_LIGHT },
    { x: 14 + antWiggleL, y: 2, w: 1, h: 1, c: P.PINK_HL },

    // Right Antenna (Angled with Purple Ball)
    { x: 23, y: 5, w: 2, h: 2, c: P.OUTLINE },
    { x: 24 + antWiggleR, y: 3, w: 2, h: 3, c: P.OUTLINE },
    { x: 25 + antWiggleR, y: 1, w: 4, h: 4, c: P.OUTLINE },
    { x: 26 + antWiggleR, y: 2, w: 2, h: 2, c: P.PURPLE_LIGHT },
    { x: 26 + antWiggleR, y: 2, w: 1, h: 1, c: P.PURPLE_HL },
  ];

  // --- 5. SCREEN EYES & MOUTH (High-Detail Anime Expressions) ---
  const renderFace = () => {
    // A. Sleeping Face (Stale Branch)
    if (isSleeping) {
      return (
        <g>
          {/* Left Sleeping Line - - */}
          <rect x={13 * scale} y={(14 + bobY) * scale} width={4 * scale} height={1 * scale} fill={P.EYE_DARK} />
          {/* Right Sleeping Line - - */}
          <rect x={23 * scale} y={(14 + bobY) * scale} width={4 * scale} height={1 * scale} fill={P.EYE_DARK} />
          {/* Blush Bars */}
          <rect x={12 * scale} y={(16 + bobY) * scale} width={3 * scale} height={1 * scale} fill={P.BLUSH} />
          <rect x={25 * scale} y={(16 + bobY) * scale} width={3 * scale} height={1 * scale} fill={P.BLUSH} />
          {/* Cute Mouth */}
          <rect x={18 * scale} y={(16 + bobY) * scale} width={4 * scale} height={1 * scale} fill={P.EYE_DARK} />
        </g>
      );
    }

    // B. Joyful / Petted Face (Happy Squints ^ ^)
    if (reactionType === 'pet') {
      return (
        <g>
          {/* Left Joyful Arch */}
          <rect x={13 * scale} y={(13 + bobY) * scale} width={4 * scale} height={1 * scale} fill={P.EYE_DARK} />
          <rect x={12 * scale} y={(14 + bobY) * scale} width={1 * scale} height={2 * scale} fill={P.EYE_DARK} />
          <rect x={17 * scale} y={(14 + bobY) * scale} width={1 * scale} height={2 * scale} fill={P.EYE_DARK} />

          {/* Right Joyful Arch */}
          <rect x={23 * scale} y={(13 + bobY) * scale} width={4 * scale} height={1 * scale} fill={P.EYE_DARK} />
          <rect x={22 * scale} y={(14 + bobY) * scale} width={1 * scale} height={2 * scale} fill={P.EYE_DARK} />
          <rect x={27 * scale} y={(14 + bobY) * scale} width={1 * scale} height={2 * scale} fill={P.EYE_DARK} />

          {/* Cheeks Blush */}
          <rect x={12 * scale} y={(16 + bobY) * scale} width={3 * scale} height={1 * scale} fill={P.BLUSH} />
          <rect x={25 * scale} y={(16 + bobY) * scale} width={3 * scale} height={1 * scale} fill={P.BLUSH} />

          {/* Open Joyful Smile */}
          <rect x={18 * scale} y={(16 + bobY) * scale} width={4 * scale} height={2 * scale} fill={P.EYE_DARK} />
          <rect x={19 * scale} y={(17 + bobY) * scale} width={2 * scale} height={1 * scale} fill={P.BLUSH} />
        </g>
      );
    }

    // C. Blinking Frame
    if (isBlinking) {
      return (
        <g>
          <rect x={13 * scale} y={(14 + bobY) * scale} width={4 * scale} height={1 * scale} fill={P.EYE_DARK} />
          <rect x={23 * scale} y={(14 + bobY) * scale} width={4 * scale} height={1 * scale} fill={P.EYE_DARK} />
          <rect x={12 * scale} y={(16 + bobY) * scale} width={3 * scale} height={1 * scale} fill={P.BLUSH} />
          <rect x={25 * scale} y={(16 + bobY) * scale} width={3 * scale} height={1 * scale} fill={P.BLUSH} />
          <rect x={18 * scale} y={(16 + bobY) * scale} width={4 * scale} height={1 * scale} fill={P.EYE_DARK} />
        </g>
      );
    }

    // D. Conflicted / Dizzy Face (Merge Conflict)
    if (isConflicted) {
      return (
        <g>
          {/* Left Spiral */}
          <rect x={13 * scale} y={(12 + bobY) * scale} width={4 * scale} height={4 * scale} fill={P.EYE_DARK} rx={1} />
          <rect x={14 * scale} y={(13 + bobY) * scale} width={2 * scale} height={2 * scale} fill="#EF4444" />
          <rect x={14 * scale} y={(13 + bobY) * scale} width={1 * scale} height={1 * scale} fill="#FFFFFF" />

          {/* Right Spiral */}
          <rect x={23 * scale} y={(12 + bobY) * scale} width={4 * scale} height={4 * scale} fill={P.EYE_DARK} rx={1} />
          <rect x={24 * scale} y={(13 + bobY) * scale} width={2 * scale} height={2 * scale} fill="#EF4444" />
          <rect x={25 * scale} y={(13 + bobY) * scale} width={1 * scale} height={1 * scale} fill="#FFFFFF" />

          {/* Wavy Mouth */}
          <rect x={17 * scale} y={(16 + bobY) * scale} width={2 * scale} height={1 * scale} fill={P.EYE_DARK} />
          <rect x={19 * scale} y={(17 + bobY) * scale} width={2 * scale} height={1 * scale} fill={P.EYE_DARK} />
          <rect x={21 * scale} y={(16 + bobY) * scale} width={2 * scale} height={1 * scale} fill={P.EYE_DARK} />
        </g>
      );
    }

    // E. Destructive Hazard (Alarmed Big Eyes)
    if (isHazard) {
      return (
        <g>
          {/* Left Alarmed Eye */}
          <rect x={13 * scale} y={(12 + bobY) * scale} width={4 * scale} height={5 * scale} fill="#FFFFFF" />
          <rect x={13 * scale} y={(12 + bobY) * scale} width={4 * scale} height={5 * scale} stroke={P.EYE_DARK} strokeWidth={scale} fill="none" />
          <rect x={14 * scale} y={(13 + bobY) * scale} width={2 * scale} height={2 * scale} fill="#DC2626" />

          {/* Right Alarmed Eye */}
          <rect x={23 * scale} y={(12 + bobY) * scale} width={4 * scale} height={5 * scale} fill="#FFFFFF" />
          <rect x={23 * scale} y={(12 + bobY) * scale} width={4 * scale} height={5 * scale} stroke={P.EYE_DARK} strokeWidth={scale} fill="none" />
          <rect x={24 * scale} y={(13 + bobY) * scale} width={2 * scale} height={2 * scale} fill="#DC2626" />

          {/* Open 'O' Mouth */}
          <rect x={18 * scale} y={(16 + bobY) * scale} width={4 * scale} height={2 * scale} fill={P.EYE_DARK} />
        </g>
      );
    }

    // F. DEFAULT: Big Glossy Anime Eyes from Reference Image
    const eyeL_X = 13 + lookX;
    const eyeL_Y = 12 + lookY;
    const eyeR_X = 23 + lookX;
    const eyeR_Y = 12 + lookY;

    return (
      <g>
        {/* Left Big Glossy Eye (4x5) */}
        <rect x={13 * scale} y={(12 + bobY) * scale} width={4 * scale} height={5 * scale} fill={P.EYE_DARK} rx={1} />
        {/* Left Highlight (Top Left corner glint) */}
        <rect x={(eyeL_X) * scale} y={(eyeL_Y + bobY) * scale} width={2 * scale} height={2 * scale} fill={P.EYE_SHINE} />

        {/* Right Big Glossy Eye (4x5) */}
        <rect x={23 * scale} y={(12 + bobY) * scale} width={4 * scale} height={5 * scale} fill={P.EYE_DARK} rx={1} />
        {/* Right Highlight (Top Left corner glint) */}
        <rect x={(eyeR_X) * scale} y={(eyeR_Y + bobY) * scale} width={2 * scale} height={2 * scale} fill={P.EYE_SHINE} />

        {/* Cheeks Blush (Bright pink horizontal bars from reference image) */}
        <rect x={12 * scale} y={(16 + bobY) * scale} width={3 * scale} height={1 * scale} fill={P.BLUSH} />
        <rect x={25 * scale} y={(16 + bobY) * scale} width={3 * scale} height={1 * scale} fill={P.BLUSH} />

        {/* Cute Smile Line from reference image */}
        {reactionType === 'coffee' ? (
          <g>
            <rect x={17 * scale} y={(16 + bobY) * scale} width={6 * scale} height={2 * scale} fill={P.EYE_DARK} />
            <rect x={18 * scale} y={(17 + bobY) * scale} width={4 * scale} height={1 * scale} fill={P.BLUSH} />
          </g>
        ) : (
          <g>
            <rect x={17 * scale} y={(16 + bobY) * scale} width={6 * scale} height={1 * scale} fill={P.EYE_DARK} />
            <rect x={16 * scale} y={(15 + bobY) * scale} width={1 * scale} height={1 * scale} fill={P.EYE_DARK} />
            <rect x={23 * scale} y={(15 + bobY) * scale} width={1 * scale} height={1 * scale} fill={P.EYE_DARK} />
          </g>
        )}
      </g>
    );
  };

  // Symptom Props
  const renderSymptomProps = () => {
    // 1. Snoozing Nightcap & Floating Zs (Stale Branch)
    if (isSleeping) {
      return (
        <g>
          {/* Nightcap perched on TV */}
          <rect x={13 * scale} y={(3 + bobY) * scale} width={10 * scale} height={4 * scale} fill={P.PURPLE_LIGHT} />
          <rect x={12 * scale} y={(6 + bobY) * scale} width={12 * scale} height={2 * scale} fill="#FFFFFF" />
          <rect x={8 * scale} y={(2 + bobY) * scale} width={6 * scale} height={3 * scale} fill={P.PURPLE_DARK} />
          <rect x={6 * scale} y={(3 + bobY) * scale} width={3 * scale} height={3 * scale} fill={P.GOLD_LIGHT} />

          {/* Floating Pixel Zs */}
          <g opacity={frame % 2 === 0 ? 0.95 : 0.6}>
            <rect x={29 * scale} y={(5 - (frame % 3)) * scale} width={4 * scale} height={1 * scale} fill={P.PURPLE_LIGHT} />
            <rect x={31 * scale} y={(6 - (frame % 3)) * scale} width={2 * scale} height={1 * scale} fill={P.PURPLE_LIGHT} />
            <rect x={29 * scale} y={(7 - (frame % 3)) * scale} width={4 * scale} height={1 * scale} fill={P.PURPLE_LIGHT} />
          </g>
        </g>
      );
    }

    // 2. Behind Remote (Leash Strain)
    if (isBehind) {
      return (
        <g>
          {/* Cyber Leash to Remote */}
          <path
            d={`M ${28 * scale} ${(23 + bobY) * scale} Q ${33 * scale} ${(23 + bobY) * scale} ${38 * scale} ${(21 + (frame % 2)) * scale}`}
            fill="none"
            stroke={P.GOLD}
            strokeWidth={3}
            strokeDasharray="4 2"
          />
          {/* Sweatdrop */}
          <g transform={`translate(${29 * scale}, ${(7 + bobY) * scale})`}>
            <rect x={1 * scale} y={0} width={1 * scale} height={1 * scale} fill={P.CYAN_LIGHT} />
            <rect x={0} y={1 * scale} width={3 * scale} height={2 * scale} fill={P.CYAN} />
            <rect x={1 * scale} y={3 * scale} width={1 * scale} height={1 * scale} fill={P.CYAN} />
          </g>
        </g>
      );
    }

    // 3. Adventurer Backpack (Unpushed Work)
    if (isUnpushed) {
      return (
        <g transform={`translate(${6 * scale}, ${(20 + bobY) * scale})`}>
          <rect x={0} y={0} width={5 * scale} height={8 * scale} fill="#92400E" rx={1} />
          <rect x={1 * scale} y={1 * scale} width={3 * scale} height={6 * scale} fill="#D97706" />
          <rect x={2 * scale} y={3 * scale} width={2 * scale} height={2 * scale} fill={P.GOLD_LIGHT} />
        </g>
      );
    }

    // 4. Merge Conflict Cables
    if (isConflicted) {
      return (
        <g>
          <path
            d={`M ${8 * scale} ${(18 + bobY) * scale} L ${32 * scale} ${(26 + bobY) * scale} M ${8 * scale} ${(25 + bobY) * scale} L ${32 * scale} ${(18 + bobY) * scale}`}
            stroke={P.RED}
            strokeWidth="3"
            strokeDasharray="4 3"
          />
        </g>
      );
    }

    // 5. Destructive Hazard (Siren & Riot Shield)
    if (isHazard) {
      return (
        <g>
          {/* Siren */}
          <rect
            x={18 * scale}
            y={(2 + bobY) * scale}
            width={4 * scale}
            height={4 * scale}
            fill={frame % 2 === 0 ? P.RED : P.GOLD_LIGHT}
            rx={1}
          />
          <rect x={17 * scale} y={(6 + bobY) * scale} width={6 * scale} height={1 * scale} fill={P.OUTLINE} />

          {/* Riot Shield in Front */}
          <g transform={`translate(${16 * scale}, ${(22 + bobY) * scale})`}>
            <rect x={0} y={0} width={8 * scale} height={9 * scale} fill={P.RED} rx={2} />
            <rect x={1 * scale} y={1 * scale} width={6 * scale} height={7 * scale} fill="#991B1B" />
            <rect x={3 * scale} y={2 * scale} width={2 * scale} height={3 * scale} fill="#FFFFFF" />
            <rect x={3 * scale} y={6 * scale} width={2 * scale} height={1 * scale} fill="#FFFFFF" />
          </g>
        </g>
      );
    }

    // 6. Hologram / Detached Head (Detached Head)
    if (isDetached) {
      return (
        <g>
          {/* Cyber Halo Ring */}
          <rect x={14 * scale} y={(1 + bobY) * scale} width={12 * scale} height={1 * scale} fill={P.CYAN_LIGHT} />
          <rect x={13 * scale} y={(2 + bobY) * scale} width={14 * scale} height={1 * scale} fill={P.CYAN} />
        </g>
      );
    }

    // 7. Pristine Sparkles (Clean Sync)
    if (isClean) {
      return (
        <g>
          <g transform={`translate(${(31 + (frame % 2)) * scale}, ${(4 - (frame % 2)) * scale})`}>
            <rect x={1 * scale} y={0} width={1 * scale} height={3 * scale} fill={P.GREEN} />
            <rect x={0} y={1 * scale} width={3 * scale} height={1 * scale} fill={P.GREEN} />
            <rect x={1 * scale} y={1 * scale} width={1 * scale} height={1 * scale} fill="#A7F3D0" />
          </g>
          <g transform={`translate(${(4 - (frame % 2)) * scale}, ${(8 + (frame % 2)) * scale})`}>
            <rect x={1 * scale} y={0} width={1 * scale} height={3 * scale} fill={P.GREEN} />
            <rect x={0} y={1 * scale} width={3 * scale} height={1 * scale} fill={P.GREEN} />
            <rect x={1 * scale} y={1 * scale} width={1 * scale} height={1 * scale} fill="#A7F3D0" />
          </g>
        </g>
      );
    }

    return null;
  };

  // Wearable Accessories
  const renderAccessory = () => {
    switch (accessory) {
      case 'headphones':
        return (
          <g>
            <rect x={9 * scale} y={(5 + bobY) * scale} width={22 * scale} height={2 * scale} fill={P.OUTLINE} />
            {/* Left Ear-cup */}
            <rect x={5 * scale} y={(11 + bobY) * scale} width={4 * scale} height={8 * scale} fill={P.CYAN} rx={1} />
            <rect x={6 * scale} y={(13 + bobY) * scale} width={2 * scale} height={(frame % 3 + 2) * scale} fill={P.CYAN_LIGHT} />
            {/* Right Ear-cup */}
            <rect x={31 * scale} y={(11 + bobY) * scale} width={4 * scale} height={8 * scale} fill={P.CYAN} rx={1} />
            <rect x={32 * scale} y={(13 + bobY) * scale} width={2 * scale} height={((frame + 1) % 3 + 2) * scale} fill={P.CYAN_LIGHT} />
          </g>
        );

      case 'cyber_visor':
        return (
          <g>
            <rect x={10 * scale} y={(11 + bobY) * scale} width={20 * scale} height={4 * scale} fill={P.CYAN} opacity={0.9} />
            <rect x={11 * scale} y={(12 + bobY) * scale} width={18 * scale} height={2 * scale} fill="#EC4899" />
            <rect x={(12 + ((frame * 4) % 15)) * scale} y={(11 + bobY) * scale} width={2 * scale} height={4 * scale} fill="#FFFFFF" />
          </g>
        );

      case 'coffee_mug':
        return (
          <g transform={`translate(${27 * scale}, ${(22 + bobY) * scale})`}>
            <rect x={0} y={0} width={5 * scale} height={6 * scale} fill="#FFFFFF" rx={1} />
            <rect x={1 * scale} y={1 * scale} width={3 * scale} height={4 * scale} fill="#78350F" />
            <rect x={5 * scale} y={1 * scale} width={2 * scale} height={4 * scale} fill="#FFFFFF" />
            <rect x={2 * scale} y={2 * scale} width={2 * scale} height={2 * scale} fill={P.PINK_LIGHT} />
            <g opacity={frame % 2 === 0 ? 0.9 : 0.4}>
              <rect x={1 * scale} y={-3 * scale - (frame % 2) * scale} width={1 * scale} height={2 * scale} fill="#CBD5E1" />
              <rect x={3 * scale} y={-4 * scale - (frame % 2) * scale} width={1 * scale} height={2 * scale} fill="#CBD5E1" />
            </g>
          </g>
        );

      case 'gold_badge':
        return (
          <g transform={`translate(${18 * scale}, ${(24 + bobY) * scale})`}>
            <rect x={1 * scale} y={0} width={3 * scale} height={5 * scale} fill={P.GOLD} />
            <rect x={0} y={1 * scale} width={5 * scale} height={3 * scale} fill={P.GOLD} />
            <rect x={1 * scale} y={1 * scale} width={3 * scale} height={3 * scale} fill={P.GOLD_LIGHT} />
          </g>
        );

      case 'wizard_hat':
        return (
          <g transform={`translate(${11 * scale}, ${(0 + bobY) * scale})`}>
            <rect x={0} y={6 * scale} width={18 * scale} height={2 * scale} fill={P.PURPLE_DARK} rx={1} />
            <rect x={3 * scale} y={4 * scale} width={12 * scale} height={2 * scale} fill={P.PURPLE_MID} />
            <rect x={5 * scale} y={2 * scale} width={8 * scale} height={2 * scale} fill={P.PURPLE_LIGHT} />
            <rect x={7 * scale} y={0} width={4 * scale} height={2 * scale} fill={P.PURPLE_LIGHT} />
            <rect x={8 * scale} y={3 * scale} width={2 * scale} height={2 * scale} fill={P.GOLD_LIGHT} />
          </g>
        );

      default:
        return null;
    }
  };

  // Squash & Stretch Physics
  const getPhysics = () => {
    if (reactionType === 'pet') {
      return {
        scaleX: [1, 1.12, 0.92, 1.04, 1],
        scaleY: [1, 0.88, 1.1, 0.96, 1],
        y: [0, -10, 0],
      };
    }
    if (reactionType === 'coffee') {
      return {
        scaleX: [1, 0.92, 1.08, 0.98, 1],
        scaleY: [1, 1.14, 0.88, 1.02, 1],
        y: [0, -14, 0],
      };
    }
    if (reactionType === 'sparkle') {
      return {
        scaleX: [1, 1.08, 0.95, 1],
        scaleY: [1, 1.08, 0.95, 1],
        rotate: [0, -4, 4, 0],
      };
    }
    return {
      y: isUnsafe ? 0 : isHovered ? -5 : 0,
      scaleX: 1,
      scaleY: 1,
    };
  };

  return (
    <motion.div
      className="relative flex items-center justify-center select-none"
      animate={getPhysics()}
      transition={
        reactionType !== 'idle'
          ? { duration: 0.5, ease: 'easeOut' }
          : { duration: 0.2 }
      }
    >
      <svg
        viewBox="0 0 160 160"
        className="w-52 h-52 drop-shadow-md overflow-visible select-none"
        style={{
          imageRendering: 'pixelated',
          shapeRendering: 'crispEdges',
        }}
      >
        {/* Cozy Purple Pixel Rug */}
        {draw(rugPixels)}

        {/* Sitting Body & Feet */}
        {draw(bodyPixels)}

        {/* Antennas */}
        {draw(antennaPixels)}

        {/* Rounded TV Head Chassis & Bezel */}
        {draw(tvHeadPixels)}

        {/* Big Glossy Eyes & Face */}
        {renderFace()}

        {/* Symptom Props */}
        {renderSymptomProps()}

        {/* Wearable Accessories */}
        {renderAccessory()}
      </svg>
    </motion.div>
  );
};
