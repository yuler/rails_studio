import { AbsoluteFill, Easing, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import captured from '../../public/capture/manifest.json';
import { Words } from '../components';
import { Sfx } from '../sound';
import { color, sec } from '../theme';

type Clip = 'tables' | 'filter' | 'edit' | 'fk' | 'sql' | 'console' | 'palette';
type CaptureEvent = { type: 'click' | 'type'; t: number; end?: number };
const manifest = captured as Record<Clip, { seconds: number; events: CaptureEvent[] }>;

type Camera = { scale: number; x: number; y: number };

type Shot = {
  clip: Clip;
  seconds: number;
  headline: string;
  accent?: string[];
  trim?: number;
  camera: Camera;
  pan?: { at: number; camera: Camera };
};

const SHOTS: Shot[] = [
  { clip: 'tables', seconds: 5, headline: 'Every table. Instantly.', trim: 0.6, camera: { scale: 1, x: 0, y: 0 } },
  { clip: 'filter', seconds: 5, headline: 'Filter. Sort. Find.', camera: { scale: 1.3, x: 300, y: 40 } },
  { clip: 'edit', seconds: 6.5, headline: 'Stage edits. Commit atomically.', accent: ['atomically'], camera: { scale: 1.25, x: 120, y: 40 }, pan: { at: 3.6, camera: { scale: 1.25, x: 0, y: -460 } } },
  { clip: 'fk', seconds: 3.5, headline: 'Follow every association.', camera: { scale: 1.2, x: -280, y: 40 } },
  { clip: 'sql', seconds: 4, headline: 'Raw SQL when you need it.', accent: ['SQL'], camera: { scale: 1.15, x: 0, y: 40 } },
  { clip: 'console', seconds: 4, headline: 'A Rails console. In your browser.', accent: ['Rails'], camera: { scale: 1.2, x: 60, y: -340 } },
  { clip: 'palette', seconds: 3.5, headline: 'Keyboard-first. Dark or light.', camera: { scale: 1.05, x: 0, y: 0 } }
];

const CROSSFADE = 14;
const starts = SHOTS.reduce<number[]>((acc, s, i) => [...acc, i === 0 ? 0 : acc[i - 1] + sec(SHOTS[i - 1].seconds)], []);
export const PRODUCT_FRAMES = starts[starts.length - 1] + sec(SHOTS[SHOTS.length - 1].seconds);

const WINDOW_W = 1520;
const SCREEN_H = Math.round((WINDOW_W * 900) / 1440);
const BAR_H = 44;
const WINDOW_TOP = 220;

const lerp = (a: Camera, b: Camera, t: number): Camera => ({
  scale: a.scale + (b.scale - a.scale) * t,
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t
});

const KEYFRAMES = SHOTS.flatMap((shot, i) => [
  { frame: starts[i], camera: shot.camera },
  ...(shot.pan ? [{ frame: starts[i] + sec(shot.pan.at), camera: shot.pan.camera }] : [])
]);

function cameraAt(frame: number): Camera {
  let cam = KEYFRAMES[0].camera;
  for (const key of KEYFRAMES.slice(1)) {
    const t = interpolate(frame, [key.frame - 20, key.frame + 40], [0, 1], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.65, 0, 0.35, 1)
    });
    cam = lerp(cam, key.camera, t);
  }
  return cam;
}

const clipRate = (shot: Shot) => Math.max(1, (manifest[shot.clip].seconds - (shot.trim ?? 0)) / shot.seconds);

const SOUNDS = SHOTS.flatMap((shot, i) => {
  const rate = clipRate(shot);
  const toFrame = (t: number) => starts[i] + sec((t - (shot.trim ?? 0)) / rate);
  const inShot = (f: number) => f >= starts[i] && f < starts[i] + sec(shot.seconds);
  return [
    ...(i > 0 ? [{ name: 'whoosh' as const, at: starts[i] - 16, volume: 0.6 }] : []),
    ...manifest[shot.clip].events
      .map((e) => ({
        name: e.type === 'click' ? ('click' as const) : ('typing' as const),
        at: toFrame(e.t),
        frames: e.end !== undefined ? sec((e.end - e.t) / rate) : undefined
      }))
      .filter((s) => inShot(s.at))
  ];
});

const Clip: React.FC<{ shot: Shot }> = ({ shot }) => {
  const frame = useCurrentFrame();
  const rate = clipRate(shot);
  const opacity = interpolate(frame, [0, CROSSFADE], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ opacity }}>
      <OffthreadVideo
        src={staticFile(`capture/${shot.clip}.webm`)}
        trimBefore={sec(shot.trim ?? 0)}
        playbackRate={rate}
        muted
        style={{ width: WINDOW_W, height: SCREEN_H }}
      />
    </AbsoluteFill>
  );
};

export const Product = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 22, stiffness: 90 } });
  const exit = interpolate(frame, [PRODUCT_FRAMES - 18, PRODUCT_FRAMES], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const cam = cameraAt(frame);

  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      <Sfx name="whoosh" at={0} />
      {SOUNDS.map((s, i) => (
        <Sfx key={i} {...s} />
      ))}
      <AbsoluteFill style={{ perspective: 2400 }}>
        <div
          style={{
            position: 'absolute', left: (1920 - WINDOW_W) / 2, top: WINDOW_TOP, width: WINDOW_W, height: SCREEN_H + BAR_H,
            transformOrigin: '50% 0%',
            transform: [
              `translateY(${(1 - enter) * 500 + exit * 60}px)`,
              `rotateX(${(1 - enter) * 28}deg)`,
              `translate(${cam.x}px, ${cam.y}px)`,
              `scale(${cam.scale * (1 - exit * 0.06)})`
            ].join(' '),
            borderRadius: 18, overflow: 'hidden', background: '#0b0b0d',
            border: `1px solid ${color.border}`,
            boxShadow: '0 50px 140px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04), 0 -20px 120px rgba(225,29,72,0.18)'
          }}
        >
          <div style={{ height: BAR_H, display: 'flex', alignItems: 'center', gap: 9, padding: '0 18px', background: '#18181b', borderBottom: `1px solid ${color.border}` }}>
            {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
              <div key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c }} />
            ))}
            <div style={{ margin: '0 auto', padding: '5px 80px', borderRadius: 8, background: '#09090b', color: color.muted, fontSize: 15, fontFamily: 'monospace' }}>
              localhost:3000/rails_studio
            </div>
          </div>
          <div style={{ position: 'relative', width: WINDOW_W, height: SCREEN_H }}>
            {SHOTS.map((shot, i) => (
              <Sequence key={shot.clip} from={starts[i]} durationInFrames={sec(shot.seconds) + (i < SHOTS.length - 1 ? CROSSFADE : 0)} layout="none">
                <Clip shot={shot} />
              </Sequence>
            ))}
          </div>
        </div>
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          height: 240, background: `linear-gradient(${color.bg} 45%, rgba(9,9,11,0))`,
          opacity: interpolate(cam.y, [-340, 0], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
        }}
      />
      {SHOTS.map((shot, i) => (
        <Sequence key={shot.clip} from={starts[i]} durationInFrames={sec(shot.seconds)} layout="none">
          <AbsoluteFill style={{ alignItems: 'center', paddingTop: 72 }}>
            <HeadlineSwap text={shot.headline} accent={shot.accent} length={sec(shot.seconds)} />
          </AbsoluteFill>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

const HeadlineSwap: React.FC<{ text: string; accent?: string[]; length: number }> = ({ text, accent, length }) => {
  const frame = useCurrentFrame();
  const out = interpolate(frame, [length - 12, length], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ opacity: 1 - out, filter: `blur(${out * 8}px)`, transform: `translateY(${-out * 20}px)` }}>
      <Words text={text} size={64} stagger={3} accent={accent} />
    </div>
  );
};
