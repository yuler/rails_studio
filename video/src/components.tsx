import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { color, sans } from './theme';

export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 240) * 80;
  return (
    <AbsoluteFill style={{ background: color.bg, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute', width: 1600, height: 1600, left: 160 + drift, top: -900,
          background: 'radial-gradient(closest-side, rgba(225,29,72,0.28), rgba(225,29,72,0) 70%)'
        }}
      />
      <div
        style={{
          position: 'absolute', width: 1400, height: 1400, right: -500 - drift, bottom: -900,
          background: 'radial-gradient(closest-side, rgba(99,102,241,0.14), rgba(99,102,241,0) 70%)'
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse at 50% 30%, black 20%, transparent 75%)'
        }}
      />
    </AbsoluteFill>
  );
};

type WordsProps = {
  text: string;
  delay?: number;
  stagger?: number;
  size?: number;
  weight?: number;
  accent?: string[];
  style?: React.CSSProperties;
};

export const Words: React.FC<WordsProps> = ({ text, delay = 0, stagger = 4, size = 72, weight = 700, accent = [], style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ fontFamily: sans, fontSize: size, fontWeight: weight, letterSpacing: '-0.035em', color: color.text, lineHeight: 1.1, ...style }}>
      {text.split(' ').map((word, i) => {
        const p = spring({ frame: frame - delay - i * stagger, fps, config: { damping: 18, stiffness: 140 } });
        const highlighted = accent.includes(word.replace(/[.,]/g, ''));
        return (
          <span
            key={i}
            style={{
              display: 'inline-block', marginRight: '0.24em', opacity: p,
              transform: `translateY(${(1 - p) * 0.5}em)`, filter: `blur(${(1 - p) * 10}px)`,
              color: highlighted ? color.red : undefined
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

export const fadeOut = (frame: number, duration: number, length = 12) =>
  interpolate(frame, [duration - length, duration], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
