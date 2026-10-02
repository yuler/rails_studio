import { AbsoluteFill, Img, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import logo from '../../../assets/logo-dark.svg';
import { Words } from '../components';
import { Sfx } from '../sound';
import { color, mono, sans, sec } from '../theme';

export const OUTRO_FRAMES = sec(4);

export const Outro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 12, stiffness: 150 } });
  const pill = spring({ frame: frame - 24, fps, config: { damping: 18 } });
  const url = spring({ frame: frame - 36, fps, config: { damping: 18 } });

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 40 }}>
      <Sfx name="pop" at={2} />
      <Img
        src={logo}
        style={{
          width: 160, height: 160, borderRadius: 32, transform: `scale(${pop})`,
          boxShadow: `0 30px 90px rgba(225,29,72,${0.5 * pop})`
        }}
      />
      <Words text="Rails Studio" size={110} weight={800} delay={8} accent={['Studio']} />
      <div
        style={{
          fontFamily: mono, fontSize: 34, color: color.text, padding: '18px 32px', borderRadius: 16,
          background: 'rgba(24,24,27,0.9)', border: `1px solid ${color.border}`,
          opacity: pill, transform: `translateY(${(1 - pill) * 30}px)`
        }}
      >
        <span style={{ color: '#f472b6' }}>gem </span>
        <span style={{ color: '#86efac' }}>"rails_studio"</span>
      </div>
      <div style={{ fontFamily: sans, fontSize: 28, color: color.muted, opacity: url, letterSpacing: '-0.01em' }}>
        github.com/yuler/rails_studio
      </div>
    </AbsoluteFill>
  );
};
