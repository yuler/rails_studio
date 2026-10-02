import { Audio, interpolate, Sequence, staticFile } from 'remotion';

export type SfxName = 'click' | 'whoosh' | 'pop' | 'typing';

const LEVEL: Record<SfxName, number> = { click: 0.75, whoosh: 0.35, pop: 0.7, typing: 0.5 };

export const Sfx: React.FC<{ name: SfxName; at: number; frames?: number; volume?: number }> = ({ name, at, frames, volume = 1 }) => (
  <Sequence from={Math.round(at)} durationInFrames={frames ? Math.max(1, Math.round(frames)) : undefined} layout="none">
    <Audio src={staticFile(`audio/${name}.wav`)} volume={LEVEL[name] * volume} />
  </Sequence>
);

export const Music: React.FC<{ frames: number }> = ({ frames }) => (
  <Audio
    src={staticFile('audio/music.wav')}
    volume={(f) => interpolate(f, [0, 30, frames - 90, frames], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
  />
);
