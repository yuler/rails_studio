import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Words, fadeOut } from '../components';
import { Sfx } from '../sound';
import { color, mono, sec } from '../theme';

export const INSTALL_FRAMES = sec(4);

type Token = [string, string?];
const LINES: Token[][] = [
  [['# Gemfile', color.dim]],
  [['gem ', '#f472b6'], ['"rails_studio"', '#86efac']],
  [['']],
  [['# config/routes.rb', color.dim]],
  [['mount ', '#f472b6'], ['RailsStudio::Engine', '#93c5fd'], [' => ', color.muted], ['"/rails_studio"', '#86efac']]
];
const CHARS_PER_FRAME = 1.6;
const TYPE_START = 14;
const TYPE_FRAMES = LINES.flat().reduce((n, [text]) => n + text.length, 0) / CHARS_PER_FRAME;

export const Install = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18 } });
  let budget = Math.max(0, (frame - TYPE_START) * CHARS_PER_FRAME);

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 64, opacity: fadeOut(frame, INSTALL_FRAMES) }}>
      <Sfx name="whoosh" at={0} />
      <Sfx name="typing" at={TYPE_START} frames={TYPE_FRAMES} />
      <Words text="One line. Zero config." size={80} delay={4} accent={['Zero']} />
      <div
        style={{
          width: 1040, padding: '36px 44px 44px', borderRadius: 24, background: 'rgba(24,24,27,0.85)',
          border: `1px solid ${color.border}`, boxShadow: '0 40px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(225,29,72,0.15)',
          transform: `perspective(1600px) rotateX(${(1 - enter) * 30}deg) translateY(${(1 - enter) * 80}px)`, opacity: enter
        }}
      >
        <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
          {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
            <div key={c} style={{ width: 14, height: 14, borderRadius: 7, background: c }} />
          ))}
        </div>
        <div style={{ fontFamily: mono, fontSize: 34, lineHeight: 1.6, color: color.text, whiteSpace: 'pre' }}>
          {LINES.map((line, i) => (
            <div key={i} style={{ minHeight: '1.6em' }}>
              {line.map(([text, c], j) => {
                const shown = text.slice(0, Math.floor(budget));
                budget = Math.max(0, budget - text.length);
                return (
                  <span key={j} style={{ color: c }}>
                    {shown}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
