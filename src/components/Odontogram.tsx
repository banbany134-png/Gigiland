import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface OdontogramProps {
  teethStatus: Record<string, string>;
  onChange?: (toothNum: string, newStatus: string) => void;
  readOnly?: boolean;
}

// WHO/FDI teeth classifications and codes
export const PERMANENT_CODES = [
  { code: '0', label: '0 - Sehat (Sound)' },
  { code: '1', label: '1 - Karies / Gigi Berlubang (D)' },
  { code: '2', label: '2 - Tumpatan dengan Karies' },
  { code: '3', label: '3 - Tumpatan tanpa Karies (F)' },
  { code: '4', label: '4 - Gigi Dicabut karena Karies (M)' },
  { code: '5', label: '5 - Gigi Dicabut sebab lain' },
  { code: '6', label: '6 - Fissure Sealant' },
  { code: '7', label: '7 - Protesa Cekat / Crown / Implan' },
  { code: '8', label: '8 - Gigi Tidak Tumbuh (Unerupted)' },
  { code: '9', label: '9 - Lain-lain / Tidak Tercatat' }
];

export const DECIDUOUS_CODES = [
  { code: 'A', label: 'A - Sehat (Sound)' },
  { code: 'B', label: 'B - Karies / Gigi Berlubang (d)' },
  { code: 'C', label: 'C - Tumpatan dengan Karies' },
  { code: 'D', label: 'D - Tumpatan tanpa Karies (f)' },
  { code: 'E', label: 'E - Gigi Dicabut karena Karies (e)' },
  { code: 'F', label: 'F - Gigi Dicabut sebab lain' },
  { code: 'G', label: 'G - Fissure Sealant' },
  { code: 'H', label: 'H - Protesa Cekat / Crown / Implan' },
  { code: 'I', label: 'I - Gigi Tidak Tumbuh' },
  { code: 'J', label: 'J - Lain-lain / Tidak Tercatat' }
];

// Play cute Web Audio API sound effects
const playCuteSound = (type: 'pop' | 'success' | 'click' | 'open') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    if (type === 'pop') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(450, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1300, ctx.currentTime + 0.15);
      
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'success') {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.type = 'triangle';
      osc2.type = 'sine';
      
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc1.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
      
      osc2.frequency.setValueAtTime(523.25 * 1.5, ctx.currentTime);
      osc2.frequency.setValueAtTime(659.25 * 1.5, ctx.currentTime + 0.08);
      
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      
      osc1.start();
      osc1.stop(ctx.currentTime + 0.25);
      osc2.start();
      osc2.stop(ctx.currentTime + 0.25);
    } else if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(580, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.06);
      
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.06);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } else if (type === 'open') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    }
  } catch (err) {
    // Silent fail if blocked by browser autoplay policy
  }
};

// Tooth Svg Component
interface ToothSvgProps {
  val: string;
  num: string;
  isDeciduous: boolean;
}

const ToothSvg = ({ val, num, isDeciduous }: ToothSvgProps) => {
  let category: 'healthy' | 'caries' | 'filled' | 'extracted' | 'sealant' | 'crown' | 'unerupted' | 'other' = 'healthy';
  
  if (val === '1' || val === '2' || val === 'B' || val === 'C') {
    category = 'caries';
  } else if (val === '3' || val === 'D') {
    category = 'filled';
  } else if (val === '4' || val === '5' || val === 'E' || val === 'F') {
    category = 'extracted';
  } else if (val === '6' || val === 'G') {
    category = 'sealant';
  } else if (val === '7' || val === 'H') {
    category = 'crown';
  } else if (val === '8' || val === 'I') {
    category = 'unerupted';
  } else if (val === '9' || val === 'J') {
    category = 'other';
  }

  let fillGradientStart = '#FFFFFF';
  let fillGradientEnd = '#F1F5F9';
  let strokeColor = '#94A3B8';
  let faceColor = '#334155';
  
  if (category === 'healthy') {
    fillGradientStart = '#FFFFFF';
    fillGradientEnd = '#E0F2FE';
    strokeColor = '#38BDF8';
    faceColor = '#0369A1';
  } else if (category === 'caries') {
    fillGradientStart = '#F8FAFC';
    fillGradientEnd = '#F1F5F9';
    strokeColor = '#EF4444';
    faceColor = '#991B1B';
  } else if (category === 'filled') {
    fillGradientStart = '#F0FDF4';
    fillGradientEnd = '#DCFCE7';
    strokeColor = '#10B981';
    faceColor = '#065F46';
  } else if (category === 'sealant') {
    fillGradientStart = '#F5F3FF';
    fillGradientEnd = '#EDE9FE';
    strokeColor = '#8B5CF6';
    faceColor = '#5B21B6';
  } else if (category === 'crown') {
    fillGradientStart = '#FFFDF5';
    fillGradientEnd = '#FFFBEB';
    strokeColor = '#F59E0B';
    faceColor = '#78350F';
  } else if (category === 'unerupted') {
    fillGradientStart = 'transparent';
    fillGradientEnd = 'transparent';
    strokeColor = '#CBD5E1';
    faceColor = '#64748B';
  } else if (category === 'other') {
    fillGradientStart = '#F8FAFC';
    fillGradientEnd = '#F1F5F9';
    strokeColor = '#64748B';
    faceColor = '#334155';
  }

  const mainToothPath = "M 25,28 C 25,18 42,16 50,26 C 58,16 75,18 75,28 C 75,50 82,68 70,88 C 66,94 56,92 50,80 C 44,92 34,94 30,88 C 18,68 25,50 25,28 Z";

  return (
    <svg viewBox="0 0 100 100" className="w-12 h-12 select-none relative overflow-visible drop-shadow-sm">
      <defs>
        <linearGradient id={`tooth-grad-${num}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={fillGradientStart} />
          <stop offset="100%" stopColor={fillGradientEnd} />
        </linearGradient>
      </defs>

      {/* Sparkles underlay for healthy */}
      {category === 'healthy' && (
        <motion.g
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.95, 1.08, 0.95] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
        >
          {/* Sparkle 1 */}
          <path d="M 14,14 Q 18,18 18,18 Q 18,18 22,14 Q 18,18 18,18 Q 18,18 14,22 Q 18,18 18,18 Z" fill="#38BDF8" />
          {/* Sparkle 2 */}
          <path d="M 78,20 Q 81,22 81,22 Q 81,22 84,20 Q 81,22 81,22 Q 81,22 78,24 Q 81,22 81,22 Z" fill="#FDE047" />
        </motion.g>
      )}

      {/* Germ/Kuman pulsing near caries tooth */}
      {category === 'caries' && (
        <motion.g
          animate={{ y: [-2, 2, -2], x: [-1.5, 1.5, -1.5] }}
          transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
        >
          {/* Germ blob 1 */}
          <circle cx="12" cy="42" r="3" fill="#22C55E" />
          <line x1="12" y1="42" x2="8" y2="40" stroke="#22C55E" strokeWidth="1" />
          <line x1="12" y1="42" x2="14" y2="37" stroke="#22C55E" strokeWidth="1" />
          
          {/* Germ blob 2 */}
          <circle cx="86" cy="48" r="2.5" fill="#10B981" />
          <line x1="86" y1="48" x2="90" y2="46" stroke="#10B981" strokeWidth="1" />
        </motion.g>
      )}

      {/* Halo for Extracted (sleeping angel tooth!) */}
      {category === 'extracted' && (
        <g>
          {/* Cute angel halo */}
          <ellipse cx="50" cy="11" rx="16" ry="3.5" fill="none" stroke="#FDE047" strokeWidth="2" />
          {/* Tiny wings */}
          <path d="M 20,32 Q 10,27 14,19 Q 20,19 24,25" fill="#E2E8F0" opacity="0.8" />
          <path d="M 80,32 Q 90,27 86,19 Q 80,19 76,25" fill="#E2E8F0" opacity="0.8" />
        </g>
      )}

      {/* Main Tooth Body */}
      {category === 'extracted' ? (
        <path
          d={mainToothPath}
          fill={`url(#tooth-grad-${num})`}
          fillOpacity="0.3"
          stroke={strokeColor}
          strokeWidth="3"
          strokeDasharray="4 4"
        />
      ) : category === 'unerupted' ? (
        <g>
          <path
            d={mainToothPath}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.5"
            strokeDasharray="2 3"
          />
          <path d="M 15,75 Q 50,85 85,75" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="3 3" />
        </g>
      ) : (
        <path
          d={mainToothPath}
          fill={`url(#tooth-grad-${num})`}
          stroke={strokeColor}
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
      )}

      {/* CARIES SPOTS (decay details) */}
      {category === 'caries' && (
        <g fill="#451A03" opacity="0.9">
          <path d="M 33,25 C 31,23 35,19 39,21 C 43,23 41,27 37,27 C 35,27 34,26 33,25 Z" />
          <circle cx="67" cy="35" r="3.5" />
          <circle cx="61" cy="41" r="2" />
          
          {/* Pulsing red pain aura */}
          <motion.circle
            cx="37"
            cy="23"
            r="6"
            fill="#EF4444"
            opacity="0.3"
            animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ repeat: Infinity, duration: 1 }}
          />
        </g>
      )}

      {/* FILLED PLASTER (band-aid or filling patch) */}
      {category === 'filled' && (
        <g>
          {/* Plaster band aid crossing diagonally */}
          <path d="M 30,46 L 68,26 C 70,25 72,27 71,29 L 68,35 L 30,55 C 28,56 26,54 27,52 Z" fill="#FDBA74" stroke="#D97706" strokeWidth="1.5" />
          <circle cx="49" cy="38" r="1.5" fill="#EA580C" />
          {/* Shiny filling patch on the other side */}
          <rect x="52" y="44" width="12" height="6" rx="2" fill="#94A3B8" stroke="#475569" strokeWidth="1" transform="rotate(-15, 58, 47)" />
        </g>
      )}

      {/* FISSURE SEALANT (Shield icon/barrier at top) */}
      {category === 'sealant' && (
        <g>
          <path d="M 27,27 C 27,20 42,18 50,26 C 58,18 73,20 73,27 C 73,34 50,38 27,27 Z" fill="#A78BFA" stroke="#6D28D9" strokeWidth="1.5" opacity="0.9" />
          <circle cx="50" cy="23" r="2" fill="#FFFFFF" />
        </g>
      )}

      {/* CROWN (Cute royalty golden crown) */}
      {category === 'crown' && (
        <motion.g
          animate={{ y: [-1.5, 1.5, -1.5] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
        >
          <path
            d="M 32,22 L 36,9 L 46,16 L 56,7 L 66,16 L 76,9 L 80,22 Z"
            fill="#FBBF24"
            stroke="#D97706"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="36" cy="10" r="1.5" fill="#EF4444" />
          <circle cx="56" cy="8" r="1.5" fill="#3B82F6" />
          <circle cx="76" cy="10" r="1.5" fill="#10B981" />
          <rect x="42" y="18" width="28" height="4" fill="#F59E0B" rx="1" />
        </motion.g>
      )}

      {/* FACES & EXPRESSIONS */}
      {category === 'healthy' && (
        <g>
          <path d="M 36,44 Q 40,39 44,44" fill="none" stroke={faceColor} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 56,44 Q 60,39 64,44" fill="none" stroke={faceColor} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="32" cy="51" r="3.5" fill="#FDA4AF" opacity="0.85" />
          <circle cx="68" cy="51" r="3.5" fill="#FDA4AF" opacity="0.85" />
          <path d="M 44,52 Q 50,62 56,52 Z" fill={faceColor} />
          <path d="M 46,55 Q 50,59 54,55" fill="none" stroke="#F43F5E" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      )}

      {category === 'caries' && (
        <g>
          <line x1="36" y1="43" x2="44" y2="49" stroke={faceColor} strokeWidth="2.5" strokeLinecap="round" />
          <line x1="44" y1="43" x2="36" y2="49" stroke={faceColor} strokeWidth="2.5" strokeLinecap="round" />
          
          <line x1="56" y1="43" x2="64" y2="49" stroke={faceColor} strokeWidth="2.5" strokeLinecap="round" />
          <line x1="64" y1="43" x2="56" y2="49" stroke={faceColor} strokeWidth="2.5" strokeLinecap="round" />

          <path d="M 42,57 Q 46,53 50,57 T 58,57" fill="none" stroke={faceColor} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 33,52 C 33,55 31,57 29,55 C 29,52 33,50 33,52 Z" fill="#3B82F6" opacity="0.9" />
        </g>
      )}

      {category === 'filled' && (
        <g>
          <circle cx="38" cy="44" r="2.5" fill={faceColor} />
          <path d="M 56,44 Q 60,40 64,44" fill="none" stroke={faceColor} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="32" cy="49" r="2.5" fill="#FDA4AF" opacity="0.6" />
          <circle cx="68" cy="49" r="2.5" fill="#FDA4AF" opacity="0.6" />
          <path d="M 44,51 Q 50,55 56,51" fill="none" stroke={faceColor} strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )}

      {category === 'sealant' && (
        <g>
          <rect x="30" y="38" width="16" height="11" rx="3" fill="none" stroke={faceColor} strokeWidth="2" />
          <rect x="54" y="38" width="16" height="11" rx="3" fill="none" stroke={faceColor} strokeWidth="2" />
          <line x1="46" y1="43" x2="54" y2="43" stroke={faceColor} strokeWidth="2" />
          <path d="M 45,56 Q 50,60 55,56" fill="none" stroke={faceColor} strokeWidth="2" strokeLinecap="round" />
        </g>
      )}

      {category === 'crown' && (
        <g>
          <path d="M 34,45 Q 38,41 42,45" fill="none" stroke={faceColor} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 58,45 Q 62,41 66,45" fill="none" stroke={faceColor} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="31" cy="51" r="3" fill="#F43F5E" opacity="0.4" />
          <circle cx="69" cy="51" r="3" fill="#F43F5E" opacity="0.4" />
          <path d="M 44,52 Q 50,57 56,52 Z" fill={faceColor} />
        </g>
      )}

      {category === 'extracted' && (
        <g opacity="0.7">
          <path d="M 38,46 Q 42,49 46,46" fill="none" stroke={faceColor} strokeWidth="2" strokeLinecap="round" />
          <path d="M 54,46 Q 58,49 62,46" fill="none" stroke={faceColor} strokeWidth="2" strokeLinecap="round" />
          <path d="M 47,53 Q 50,55 53,53" fill="none" stroke={faceColor} strokeWidth="1.5" strokeLinecap="round" />
        </g>
      )}

      {category === 'unerupted' && (
        <g>
          <path d="M 38,46 Q 42,49 46,46" fill="none" stroke={faceColor} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 54,46 Q 58,49 62,46" fill="none" stroke={faceColor} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 48,53 Q 50,55 52,53" fill="none" stroke={faceColor} strokeWidth="1" strokeLinecap="round" />
          <text x="68" y="32" fill="#64748B" fontSize="10" fontWeight="bold" fontFamily="monospace">z</text>
          <text x="75" y="24" fill="#94A3B8" fontSize="13" fontWeight="bold" fontFamily="monospace">Z</text>
        </g>
      )}

      {category === 'other' && (
        <g>
          <circle cx="38" cy="44" r="2.5" fill={faceColor} />
          <circle cx="62" cy="44" r="4.5" fill="none" stroke={faceColor} strokeWidth="2" />
          <circle cx="62" cy="44" r="1.5" fill={faceColor} />
          <line x1="42" y1="53" x2="58" y2="53" stroke={faceColor} strokeWidth="2" strokeLinecap="round" />
          <text x="70" y="25" fill="#64748B" fontSize="14" fontWeight="black" fontFamily="sans-serif">?</text>
        </g>
      )}
    </svg>
  );
};

// Tooth Card Wrapper Component
interface ToothCardProps {
  key?: string;
  num: string;
  isDeciduous: boolean;
  teethStatus: Record<string, string>;
  onSelectTooth?: (num: string, isDeciduous: boolean) => void;
  readOnly?: boolean;
}

const ToothCard = ({ num, isDeciduous, teethStatus, onSelectTooth, readOnly = false }: ToothCardProps) => {
  const val = teethStatus[num] || (isDeciduous ? 'A' : '0');
  
  let podBg = 'bg-[#E0F2FE] dark:bg-slate-900/40';
  let podBorder = 'border-sky-200 dark:border-sky-500/20';
  let glowClass = 'dark:hover-glow-indigo';
  let isCaries = val === '1' || val === '2' || val === 'B' || val === 'C';
  let isFilled = val === '3' || val === 'D';
  let isExtracted = val === '4' || val === '5' || val === 'E' || val === 'F';
  let isSealant = val === '6' || val === 'G';
  let isCrown = val === '7' || val === 'H';

  if (isCaries) {
    podBg = 'bg-[#FCE7F3] dark:bg-pink-950/20';
    podBorder = 'border-pink-200 dark:border-pink-500/40';
    glowClass = 'dark:glow-pink dark:hover-glow-pink';
  } else if (isFilled) {
    podBg = 'bg-[#DCFCE7] dark:bg-emerald-950/20';
    podBorder = 'border-emerald-200 dark:border-emerald-500/40';
    glowClass = 'dark:glow-mint dark:hover-glow-mint';
  } else if (isExtracted) {
    podBg = 'bg-slate-100/50 dark:bg-slate-900/30';
    podBorder = 'border-slate-200/80 dark:border-slate-800/50';
  } else if (isSealant) {
    podBg = 'bg-[#F3E8FF] dark:bg-purple-950/20';
    podBorder = 'border-purple-200 dark:border-purple-500/40';
    glowClass = 'dark:glow-purple dark:hover-glow-purple';
  } else if (isCrown) {
    podBg = 'bg-[#FEF3C7] dark:bg-amber-950/20';
    podBorder = 'border-amber-200 dark:border-amber-500/40';
    glowClass = 'dark:glow-purple dark:hover-glow-purple';
  }

  const handleCardClick = () => {
    if (readOnly) return;
    playCuteSound('open');
    if (onSelectTooth) {
      onSelectTooth(num, isDeciduous);
    }
  };

  return (
    <motion.div
      whileHover={readOnly ? {} : { scale: 1.1, y: -3, rotate: [0, -1.5, 1.5, 0] }}
      transition={{
        scale: { type: "spring", stiffness: 450, damping: 14 },
        y: { type: "spring", stiffness: 450, damping: 14 },
        rotate: { duration: 0.3, ease: "easeInOut" }
      }}
      onClick={handleCardClick}
      className={`flex flex-col items-center justify-center p-2 rounded-2xl border ${podBg} ${podBorder} ${glowClass} ${readOnly ? '' : 'cursor-pointer'} transition-all w-[50px] sm:w-[56px] shadow-3xs select-none`}
    >
      <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 font-mono tracking-tight">{num}</span>
      
      <div className="my-1 flex items-center justify-center min-h-[44px]">
        <ToothSvg val={val} num={num} isDeciduous={isDeciduous} />
      </div>

      <div className="flex items-center gap-0.5">
        <span className={`text-[9px] font-extrabold font-mono px-1.5 py-0.5 rounded-md ${
          val === '0' || val === 'A' ? 'bg-sky-50 dark:bg-sky-950/30 text-sky-600' :
          isCaries ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-600' :
          isFilled ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600' :
          'bg-slate-100 dark:bg-slate-800 text-slate-600'
        }`}>{val}</span>
      </div>
    </motion.div>
  );
};

interface CodeOptionDetail {
  code: string;
  emoji: string;
  title: string;
  description: string;
  colorClass: string;
}

const getOptionDetails = (code: string): CodeOptionDetail => {
  const codeDetails: Record<string, Omit<CodeOptionDetail, 'code'>> = {
    '0': { emoji: '😁', title: 'Sehat (Sound)', description: 'Gigi bersih, kuat, bebas karies.', colorClass: 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/10 dark:hover:bg-emerald-950/20 border-emerald-200 text-emerald-800 dark:text-emerald-300' },
    '1': { emoji: '👾', title: 'Karies / Gigi Berlubang (D)', description: 'Ada lubang karies aktif pada permukaan gigi.', colorClass: 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/10 dark:hover:bg-rose-950/20 border-rose-200 text-rose-800 dark:text-rose-300' },
    '2': { emoji: '⚠️', title: 'Tumpatan dengan Karies', description: 'Gigi telah ditambal sebelumnya namun timbul karies baru.', colorClass: 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/10 dark:hover:bg-amber-950/20 border-amber-200 text-amber-800 dark:text-amber-300' },
    '3': { emoji: '🩹', title: 'Tumpatan Tanpa Karies (F)', description: 'Tambalan dalam kondisi baik, rapi, dan sehat.', colorClass: 'bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/10 dark:hover:bg-teal-950/20 border-teal-200 text-teal-800 dark:text-teal-300' },
    '4': { emoji: '❌', title: 'Gigi Dicabut krn Karies (M)', description: 'Gigi hilang/ompong akibat komplikasi lubang karies.', colorClass: 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/60 dark:hover:bg-slate-900 border-slate-300 text-slate-800 dark:text-slate-300' },
    '5': { emoji: '👻', title: 'Gigi Dicabut sebab lain', description: 'Gigi hilang karena kecelakaan, periodontal, dll.', colorClass: 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/40 dark:hover:bg-slate-900/80 border-slate-200 text-slate-700 dark:text-slate-400' },
    '6': { emoji: '🛡️', title: 'Fissure Sealant', description: 'Gigi terlindungi dengan cairan seal pelindung lekukan.', colorClass: 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/10 dark:hover:bg-indigo-950/20 border-indigo-200 text-indigo-800 dark:text-indigo-300' },
    '7': { emoji: '👑', title: 'Protesa Cekat / Crown / Implan', description: 'Gigi palsu, mahkota jaket, atau sekrup implan dental.', colorClass: 'bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/10 dark:hover:bg-violet-950/20 border-violet-200 text-violet-800 dark:text-violet-300' },
    '8': { emoji: '💤', title: 'Gigi Tidak Tumbuh (Unerupted)', description: 'Gigi permanen belum keluar atau masih di dalam gusi.', colorClass: 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900/50 dark:hover:bg-zinc-900 border-zinc-200 text-zinc-700 dark:text-zinc-400' },
    '9': { emoji: '❓', title: 'Lain-lain / Tidak Tercatat', description: 'Kelainan dental khusus lainnya yang tidak tercantum.', colorClass: 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/60 dark:hover:bg-slate-900 border-slate-200 text-slate-700 dark:text-slate-400' },

    'A': { emoji: '😁', title: 'Sehat (Sound)', description: 'Gigi sulung bersih, kuat, bebas karies.', colorClass: 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/10 dark:hover:bg-emerald-950/20 border-emerald-200 text-emerald-800 dark:text-emerald-300' },
    'B': { emoji: '👾', title: 'Karies / Gigi Berlubang (d)', description: 'Ada lubang karies aktif pada gigi sulung anak.', colorClass: 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/10 dark:hover:bg-rose-950/20 border-rose-200 text-rose-800 dark:text-rose-300' },
    'C': { emoji: '⚠️', title: 'Tumpatan dengan Karies', description: 'Gigi sulung ditambal sebelumnya tapi muncul karies baru.', colorClass: 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/10 dark:hover:bg-amber-950/20 border-amber-200 text-amber-800 dark:text-amber-300' },
    'D': { emoji: '🩹', title: 'Tumpatan tanpa Karies (f)', description: 'Tambalan gigi sulung rapi dan tidak ada karies.', colorClass: 'bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/10 dark:hover:bg-teal-950/20 border-teal-200 text-teal-800 dark:text-teal-300' },
    'E': { emoji: '❌', title: 'Gigi Dicabut krn Karies (e)', description: 'Gigi sulung tanggal/copot akibat karies parah.', colorClass: 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/60 dark:hover:bg-slate-900 border-slate-300 text-slate-800 dark:text-slate-300' },
    'F': { emoji: '👻', title: 'Gigi Dicabut sebab lain', description: 'Gigi sulung lepas secara alami (fisiologis/ompong).', colorClass: 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/40 dark:hover:bg-slate-900/80 border-slate-200 text-slate-700 dark:text-slate-400' },
    'G': { emoji: '🛡️', title: 'Fissure Sealant', description: 'Gigi sulung dilindungi dengan cairan pelindung fissure.', colorClass: 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/10 dark:hover:bg-indigo-950/20 border-indigo-200 text-indigo-800 dark:text-indigo-300' },
    'H': { emoji: '👑', title: 'Protesa Cekat / Crown / Implan', description: 'Crown mini penutup gigi sulung yang rapuh.', colorClass: 'bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/10 dark:hover:bg-violet-950/20 border-violet-200 text-violet-800 dark:text-violet-300' },
    'I': { emoji: '💤', title: 'Gigi Tidak Tumbuh', description: 'Gigi sulung belum keluar atau absen bawaan.', colorClass: 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900/50 dark:hover:bg-zinc-900 border-zinc-200 text-zinc-700 dark:text-zinc-400' },
    'J': { emoji: '❓', title: 'Lain-lain / Tidak Tercatat', description: 'Kelainan gigi sulung khusus lainnya.', colorClass: 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/60 dark:hover:bg-slate-900 border-slate-200 text-slate-700 dark:text-slate-400' }
  };

  return {
    code,
    ...(codeDetails[code] || {
      emoji: '🦷',
      title: 'Klasifikasi Dental',
      description: 'Klasifikasi standard WHO.',
      colorClass: 'bg-slate-50 dark:bg-slate-900 border-slate-250 text-slate-700'
    })
  };
};

export default function Odontogram({ teethStatus, onChange, readOnly = false }: OdontogramProps) {
  const [selectedTooth, setSelectedTooth] = useState<{ num: string; isDeciduous: boolean } | null>(null);

  // Tooth definitions
  const upperRightPerm = ['18', '17', '16', '15', '14', '13', '12', '11'];
  const upperLeftPerm = ['21', '22', '23', '24', '25', '26', '27', '28'];
  
  const upperRightDecid = ['55', '54', '53', '52', '51'];
  const upperLeftDecid = ['61', '62', '63', '64', '65'];
  
  const lowerRightDecid = ['85', '84', '83', '82', '81'];
  const lowerLeftDecid = ['71', '72', '73', '74', '75'];
  
  const lowerRightPerm = ['48', '47', '46', '45', '44', '43', '42', '41'];
  const lowerLeftPerm = ['31', '32', '33', '34', '35', '36', '37', '38'];

  const currentVal = selectedTooth 
    ? (teethStatus[selectedTooth.num] || (selectedTooth.isDeciduous ? 'A' : '0')) 
    : '';

  const handleSelectTooth = (num: string, isDeciduous: boolean) => {
    setSelectedTooth({ num, isDeciduous });
  };

  const handleStatusChange = (newStatus: string) => {
    if (selectedTooth && onChange) {
      onChange(selectedTooth.num, newStatus);
      playCuteSound('success');
      setSelectedTooth(null);
    }
  };

  const activeCodes = selectedTooth?.isDeciduous ? DECIDUOUS_CODES : PERMANENT_CODES;

  return (
    <div className="w-full bg-white/45 dark:bg-slate-900/30 backdrop-blur-md rounded-3xl p-5 border border-white/50 dark:border-white/10 shadow-md space-y-6 animate-fadeIn" id="odontogram-visual-card">
      <div className="flex items-center justify-between border-b border-white/30 dark:border-white/10 pb-3">
        <h4 className="text-xs font-black text-indigo-950 dark:text-indigo-200 uppercase tracking-widest flex items-center gap-2">
          🦷 Visualisasi Odontogram Karakter Gigi (FDI Two-Digit)
        </h4>
        <span className="text-[10px] bg-indigo-100/50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 px-2.5 py-1 rounded-full font-black border border-indigo-200/20 dark:border-indigo-900/30 uppercase tracking-wide">
          Standard WHO Oral Survey
        </span>
      </div>

      <div className="overflow-x-auto pb-2 scrollbar-thin">
        <div className="min-w-[760px] space-y-3 p-1">
          
          {/* UPPER DENTITION (Maxilla / RA) */}
          <div className="space-y-4">
            <div className="flex justify-between items-center text-[11px] font-black text-indigo-950/70 dark:text-indigo-300/70 uppercase tracking-wider px-2">
              <span>RA Kanan (Upper Right)</span>
              <span>RA Kiri (Upper Left)</span>
            </div>

            {/* Row 1 & Row 2 Grid */}
            <div className="flex items-center">
              {/* Left Side (RA Kanan) */}
              <div className="flex-1 pr-4">
                {/* Row 1: Permanent */}
                <div className="grid grid-cols-8 gap-1 justify-items-center">
                  {upperRightPerm.map(num => (
                    <ToothCard key={num} num={num} isDeciduous={false} teethStatus={teethStatus} onSelectTooth={handleSelectTooth} readOnly={readOnly} />
                  ))}
                </div>
                {/* Row 2: Deciduous (aligned to midline columns 4-8) */}
                <div className="grid grid-cols-8 gap-1 justify-items-center mt-3">
                  <div className="col-span-3"></div> {/* Empty space */}
                  {upperRightDecid.map(num => (
                    <ToothCard key={num} num={num} isDeciduous={true} teethStatus={teethStatus} onSelectTooth={handleSelectTooth} readOnly={readOnly} />
                  ))}
                </div>
              </div>

              {/* Vertical Midline Divider */}
              <div className="w-[3px] bg-slate-400 dark:bg-slate-700 self-stretch rounded-full mx-1"></div>

              {/* Right Side (RA Kiri) */}
              <div className="flex-1 pl-4">
                {/* Row 1: Permanent */}
                <div className="grid grid-cols-8 gap-1 justify-items-center">
                  {upperLeftPerm.map(num => (
                    <ToothCard key={num} num={num} isDeciduous={false} teethStatus={teethStatus} onSelectTooth={handleSelectTooth} readOnly={readOnly} />
                  ))}
                </div>
                {/* Row 2: Deciduous (aligned to midline columns 1-5) */}
                <div className="grid grid-cols-8 gap-1 justify-items-center mt-3">
                  {upperLeftDecid.map(num => (
                    <ToothCard key={num} num={num} isDeciduous={true} teethStatus={teethStatus} onSelectTooth={handleSelectTooth} readOnly={readOnly} />
                  ))}
                  <div className="col-span-3"></div> {/* Empty space */}
                </div>
              </div>
            </div>
          </div>

          {/* Horizontal Midline Divider */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t-2 border-slate-400/80 dark:border-slate-700"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-slate-400 dark:bg-slate-700 text-white dark:text-slate-200 font-extrabold text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-widest shadow-2xs">
                Garis Oklusal / Midline
              </span>
            </div>
          </div>

          {/* LOWER DENTITION (Mandible / RB) */}
          <div className="space-y-4">
            {/* Row 3 & Row 4 Grid */}
            <div className="flex items-center">
              {/* Left Side (RB Kanan) */}
              <div className="flex-1 pr-4">
                {/* Row 3: Deciduous (aligned to midline columns 4-8) */}
                <div className="grid grid-cols-8 gap-1 justify-items-center mb-3">
                  <div className="col-span-3"></div> {/* Empty space */}
                  {lowerRightDecid.map(num => (
                    <ToothCard key={num} num={num} isDeciduous={true} teethStatus={teethStatus} onSelectTooth={handleSelectTooth} readOnly={readOnly} />
                  ))}
                </div>
                {/* Row 4: Permanent */}
                <div className="grid grid-cols-8 gap-1 justify-items-center">
                  {lowerRightPerm.map(num => (
                    <ToothCard key={num} num={num} isDeciduous={false} teethStatus={teethStatus} onSelectTooth={handleSelectTooth} readOnly={readOnly} />
                  ))}
                </div>
              </div>

              {/* Vertical Midline Divider */}
              <div className="w-[3px] bg-slate-400 dark:bg-slate-700 self-stretch rounded-full mx-1"></div>

              {/* Right Side (RB Kiri) */}
              <div className="flex-1 pl-4">
                {/* Row 3: Deciduous (aligned to midline columns 1-5) */}
                <div className="grid grid-cols-8 gap-1 justify-items-center mb-3">
                  {lowerLeftDecid.map(num => (
                    <ToothCard key={num} num={num} isDeciduous={true} teethStatus={teethStatus} onSelectTooth={handleSelectTooth} readOnly={readOnly} />
                  ))}
                  <div className="col-span-3"></div> {/* Empty space */}
                </div>
                {/* Row 4: Permanent */}
                <div className="grid grid-cols-8 gap-1 justify-items-center">
                  {lowerLeftPerm.map(num => (
                    <ToothCard key={num} num={num} isDeciduous={false} teethStatus={teethStatus} onSelectTooth={handleSelectTooth} readOnly={readOnly} />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center text-[11px] font-black text-indigo-950/70 dark:text-indigo-300/70 uppercase tracking-wider px-2 pt-1">
              <span>RB Kanan (Lower Right)</span>
              <span>RB Kiri (Lower Left)</span>
            </div>
          </div>

        </div>
      </div>

      {/* Legend / Petunjuk Kode */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/40 dark:bg-slate-900/40 p-4 rounded-2xl border border-white/50 dark:border-white/10 text-xs shadow-inner">
        <div className="space-y-1.5">
          <span className="font-extrabold text-indigo-950 dark:text-indigo-200 block border-b border-indigo-950/10 dark:border-indigo-900/20 pb-1 uppercase text-[10px] tracking-widest">
            KODE GIGI TETAP (PERMANENT)
          </span>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
            {PERMANENT_CODES.map(c => {
              const details = getOptionDetails(c.code);
              return (
                <div key={c.code} className="flex gap-1.5 items-center">
                  <span className="text-sm">{details.emoji}</span>
                  <span className="w-3.5 font-black font-mono text-indigo-900 dark:text-indigo-400">{c.code}</span>
                  <span className="truncate">{c.label.substring(4)}</span>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="space-y-1.5">
          <span className="font-extrabold text-indigo-950 dark:text-indigo-200 block border-b border-indigo-950/10 dark:border-indigo-900/20 pb-1 uppercase text-[10px] tracking-widest">
            KODE GIGI SULUNG (DECIDUOUS)
          </span>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
            {DECIDUOUS_CODES.map(c => {
              const details = getOptionDetails(c.code);
              return (
                <div key={c.code} className="flex gap-1.5 items-center">
                  <span className="text-sm">{details.emoji}</span>
                  <span className="w-3.5 font-black font-mono text-emerald-800 dark:text-emerald-400">{c.code}</span>
                  <span className="truncate">{c.label.substring(4)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Playful Interactive Option Selector Pop-up Modal */}
      <AnimatePresence>
        {selectedTooth && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTooth(null)}
              className="absolute inset-0 bg-slate-900/50 dark:bg-slate-950/70 backdrop-blur-xs"
            />
            
            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "spring", stiffness: 420, damping: 25 }}
              className="relative bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col z-10"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/30">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl flex items-center justify-center shadow-inner">
                    <ToothSvg val={currentVal} num={selectedTooth.num} isDeciduous={selectedTooth.isDeciduous} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                      Pilih Status Gigi {selectedTooth.num}
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                      Klasifikasi: {selectedTooth.isDeciduous ? 'Gigi Sulung (Anak-anak)' : 'Gigi Tetap (Dewasa)'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => { playCuteSound('click'); setSelectedTooth(null); }}
                  className="p-2 bg-slate-100 hover:bg-rose-500 dark:bg-slate-800 text-slate-500 hover:text-white dark:text-slate-400 rounded-full transition-all cursor-pointer shadow-2xs"
                  title="Tutup"
                >
                  <span className="font-extrabold text-xs block px-1">✕</span>
                </button>
              </div>

              {/* Options Grid */}
              <div className="p-5 overflow-y-auto space-y-2 max-h-[55vh] scrollbar-thin">
                <p className="text-[10.5px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest pb-1 border-b border-slate-100 dark:border-slate-800 mb-2">
                  Daftar Kondisi Gigi WHO/FDI:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeCodes.map(opt => {
                    const d = getOptionDetails(opt.code);
                    const isSelected = currentVal === opt.code;
                    return (
                      <button
                        key={opt.code}
                        onClick={() => handleStatusChange(opt.code)}
                        className={`flex gap-3 p-3 text-left rounded-2xl border transition-all cursor-pointer items-start ${d.colorClass} ${
                          isSelected 
                            ? 'ring-2 ring-indigo-500 border-transparent shadow-md scale-[1.01]' 
                            : 'border-slate-100 dark:border-slate-800/80 shadow-2xs hover:scale-[1.01]'
                        }`}
                      >
                        <div className="text-2xl mt-0.5">{d.emoji}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black tracking-tight truncate">{d.title}</span>
                            <span className="text-[10px] font-mono font-black opacity-60 bg-white/80 dark:bg-slate-800 px-1.5 py-0.5 rounded-md border border-black/5 dark:border-white/5">{opt.code}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-normal mt-0.5">{d.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                <span className="flex items-center gap-1">
                  💡 <em>Klik salah satu kartu kondisi untuk memilih.</em>
                </span>
                <span className="font-mono text-[10px] font-bold">FDI Two-Digit Standard</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
