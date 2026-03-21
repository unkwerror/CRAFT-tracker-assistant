'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * InfoPopover — lightweight "?" tooltip without external deps.
 *
 * Usage:
 *   <InfoPopover content="Объяснение метрики..." />
 *   <InfoPopover content={<>Rich <b>HTML</b> content</>} />
 *
 * Props:
 *   content  — string or ReactNode shown in the popover
 *   label    — accessible label for the trigger button (default "Подробнее")
 *   icon     — '?' (default) or 'i'
 *   side     — 'auto' (default) | 'top' | 'bottom'
 */
export default function InfoPopover({ content, label = 'Подробнее', icon = '?', side = 'auto' }) {
  const [visible, setVisible] = useState(false);
  const [placement, setPlacement] = useState('top');
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);

  const computePlacement = useCallback(() => {
    if (side !== 'auto') { setPlacement(side); return; }
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    setPlacement(spaceBelow < 140 ? 'top' : 'bottom');
  }, [side]);

  const toggle = () => {
    computePlacement();
    setVisible(v => !v);
  };

  // Close on outside click or Escape
  useEffect(() => {
    if (!visible) return;
    const onKey = (e) => { if (e.key === 'Escape') setVisible(false); };
    const onOutside = (e) => {
      if (triggerRef.current?.contains(e.target)) return;
      if (popoverRef.current?.contains(e.target)) return;
      setVisible(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onOutside);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onOutside);
    };
  }, [visible]);

  return (
    <span className="relative inline-flex items-center">
      <button
        ref={triggerRef}
        onClick={toggle}
        aria-label={label}
        aria-expanded={visible}
        className={`w-4 h-4 rounded-full border text-[9px] font-bold flex items-center justify-center transition-colors shrink-0 leading-none ${
          visible
            ? 'border-craft-accent/60 bg-craft-accent/15 text-craft-accent'
            : 'border-white/20 text-white/30 hover:border-craft-accent/40 hover:text-craft-accent/70'
        }`}
      >
        {icon}
      </button>

      {visible && (
        <span
          ref={popoverRef}
          role="tooltip"
          className={`absolute z-50 left-1/2 -translate-x-1/2 w-max max-w-xs
            glass-modal border border-craft-border rounded-xl px-3 py-2.5 shadow-xl
            text-xs text-white/70 leading-relaxed
            ${placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}`}
          style={{ minWidth: '160px' }}
        >
          {/* Arrow */}
          <span
            className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-craft-surface border-craft-border ${
              placement === 'top'
                ? 'bottom-[-5px] border-r border-b'
                : 'top-[-5px] border-l border-t'
            }`}
          />
          <span className="relative block">
            {typeof content === 'string'
              ? content.split('\n').map((line, i) => (
                  <span key={i} className="block">{line}</span>
                ))
              : content}
          </span>
        </span>
      )}
    </span>
  );
}
