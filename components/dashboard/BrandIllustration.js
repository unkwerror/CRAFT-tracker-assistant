'use client';

import { motion } from 'framer-motion';
import { Alignment, Fit, Layout, useRive } from '@rive-app/react-canvas';

export default function BrandIllustration({ className = '', state = 'idle' }) {
  const src = process.env.NEXT_PUBLIC_RIVE_BRAND_SRC || '';
  const stateMachine = process.env.NEXT_PUBLIC_RIVE_BRAND_SM || '';
  if (src) {
    return (
      <div className={`rounded-2xl border border-white/[0.08] bg-craft-surface2/70 overflow-hidden ${className}`}>
        <RiveBrandInner src={src} stateMachine={stateMachine} />
      </div>
    );
  }

  const stateColor =
    state === 'success' ? '#42C774' :
    state === 'error' ? '#FF7B72' :
    state === 'loading' ? '#6DD8E0' :
    '#5BA4F5';

  return (
    <div className={`rounded-2xl border border-white/[0.08] bg-craft-surface2/70 overflow-hidden ${className}`}>
      <motion.svg
        viewBox="0 0 320 160"
        className="w-full h-full"
        initial={{ opacity: 0.3 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <defs>
          <radialGradient id="brandGlow" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor={stateColor} stopOpacity="0.35" />
            <stop offset="100%" stopColor={stateColor} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="320" height="160" fill="url(#brandGlow)" />

        <motion.g
          animate={{ rotate: [0, 2, -2, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          style={{ originX: '50%', originY: '50%' }}
        >
          <motion.path
            d="M45 122 L95 58 L135 110 L182 44 L242 122"
            fill="none"
            stroke={stateColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            animate={{ pathLength: [0.2, 1, 0.8] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.circle
            cx="95"
            cy="58"
            r="6"
            fill={stateColor}
            animate={{ r: [5, 7.5, 5], opacity: [0.65, 1, 0.65] }}
            transition={{ duration: 2.2, repeat: Infinity }}
          />
          <motion.circle
            cx="182"
            cy="44"
            r="7"
            fill={stateColor}
            animate={{ r: [6, 9, 6], opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 2.6, repeat: Infinity, delay: 0.4 }}
          />
        </motion.g>

        <text x="18" y="26" fontSize="12" fill="rgba(255,255,255,0.38)" fontFamily="Golos Text, sans-serif">
          CRAFT SYSTEM
        </text>
      </motion.svg>
    </div>
  );
}

function RiveBrandInner({ src, stateMachine }) {
  const { RiveComponent } = useRive({
    src,
    autoplay: true,
    stateMachines: stateMachine || undefined,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
  });
  return <RiveComponent />;
}
