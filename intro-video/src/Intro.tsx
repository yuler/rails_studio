import { AbsoluteFill, Series } from 'remotion';
import { Background } from './components';
import { Hook, HOOK_FRAMES } from './scenes/Hook';
import { Install, INSTALL_FRAMES } from './scenes/Install';
import { Outro, OUTRO_FRAMES } from './scenes/Outro';
import { Product, PRODUCT_FRAMES } from './scenes/Product';
import { Music } from './sound';

export const INTRO_FRAMES = HOOK_FRAMES + INSTALL_FRAMES + PRODUCT_FRAMES + OUTRO_FRAMES;

export const Intro = () => (
  <AbsoluteFill>
    <Background />
    <Music frames={INTRO_FRAMES} />
    <Series>
      <Series.Sequence durationInFrames={HOOK_FRAMES}>
        <Hook />
      </Series.Sequence>
      <Series.Sequence durationInFrames={INSTALL_FRAMES}>
        <Install />
      </Series.Sequence>
      <Series.Sequence durationInFrames={PRODUCT_FRAMES}>
        <Product />
      </Series.Sequence>
      <Series.Sequence durationInFrames={OUTRO_FRAMES}>
        <Outro />
      </Series.Sequence>
    </Series>
  </AbsoluteFill>
);
