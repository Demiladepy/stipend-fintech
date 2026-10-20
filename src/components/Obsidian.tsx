'use client';

import { motion, useMotionTemplate, useMotionValue } from 'motion/react';
import type React from 'react';
import type { ReactNode } from 'react';

/** Word-by-word blur reveal for headlines. */
export function TextReveal({
  text,
  className = '',
  wordClassName = '',
  delay = 0,
}: {
  text: string;
  className?: string;
  wordClassName?: string;
  delay?: number;
}) {
  return (
    <span className={className}>
      {text.split(' ').map((w, i) => (
        <motion.span
          key={i}
          className={`inline-block ${wordClassName}`}
          initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.55, delay: delay + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
        >
          {w}
        </motion.span>
      )).reduce<React.ReactNode[]>((acc, el, i) => (i ? [...acc, ' ', el] : [el]), [])}
    </span>
  );
}

/** Pill button whose accent fill sweeps in behind an arrow on hover. */
export function ArrowFillButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full border border-accent/40 bg-accent/10 py-2.5 pl-5 pr-2.5 text-sm font-semibold text-zinc-50 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span className="absolute inset-y-0 right-0 w-10 rounded-full bg-accent transition-all duration-500 ease-out group-hover:w-full" />
      <span className="relative z-10 transition-colors duration-300 group-hover:text-ink">{children}</span>
      <span className="relative z-10 grid h-7 w-7 place-items-center rounded-full text-ink transition-transform duration-300 group-hover:translate-x-0.5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      </span>
    </button>
  );
}

/** Glass card with a spotlight that follows the cursor. */
export function SpotlightCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const bg = useMotionTemplate`radial-gradient(320px circle at ${x}px ${y}px, rgba(52,211,153,0.13), transparent 70%)`;
  return (
    <div
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set(e.clientX - r.left);
        y.set(e.clientY - r.top);
      }}
      onMouseLeave={() => {
        x.set(-200);
        y.set(-200);
      }}
      className={`group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 backdrop-blur-sm transition-colors hover:border-accent/30 ${className}`}
    >
      <motion.div className="pointer-events-none absolute inset-0" style={{ background: bg }} />
      <div className="relative">{children}</div>
    </div>
  );
}

/** Rises into view once when scrolled to. */
export function Rise({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
