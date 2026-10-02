import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import logo from '../../../assets/logo-dark.svg';
import { Words, fadeOut } from '../components';
import { Sfx } from '../sound';
import { sec } from '../theme';

export const HOOK_FRAMES = sec(5.5);

export const Hook = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reveal = sec(2.4);
  const dim = interpolate(frame, [reveal - 10, reveal + 10], [1, 0.28], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const lift = spring({ frame: frame - reveal, fps, config: { damping: 20 } });
  const pop = spring({ frame: frame - reveal - 4, fps, config: { damping: 12, stiffness: 160 } });

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: fadeOut(frame, HOOK_FRAMES) }}>
      <Sfx name="whoosh" at={reveal - 18} />
      <Sfx name="pop" at={reveal + 4} />
      <div style={{ textAlign: 'center', transform: `translateY(${-lift * 70}px)`, opacity: dim }}>
        <Words text="Prisma has Studio." size={84} delay={6} />
        <Words text="Drizzle has Studio." size={84} delay={sec(1)} />
      </div>
      <div
        style={{
          position: 'absolute', top: 600, display: 'flex', alignItems: 'center', gap: 32,
          opacity: Math.min(1, pop), transform: `translateY(${(1 - lift) * 40}px)`
        }}
      >
        <Img
          src={logo}
          style={{
            width: 120, height: 120, borderRadius: 24, transform: `scale(${pop}) rotate(${(1 - pop) * -20}deg)`,
            boxShadow: `0 20px 60px rgba(225,29,72,${0.45 * pop})`
          }}
        />
        <Words text="Now Rails does too." size={104} weight={800} delay={reveal + 6} accent={['Rails']} />
      </div>
    </AbsoluteFill>
  );
};
