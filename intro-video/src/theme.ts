import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { loadFont as loadMono } from '@remotion/google-fonts/JetBrainsMono';

export const { fontFamily: sans } = loadInter('normal', { weights: ['400', '600', '700', '800'], subsets: ['latin'] });
export const { fontFamily: mono } = loadMono('normal', { weights: ['400', '600'], subsets: ['latin'] });

export const FPS = 60;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const color = {
  bg: '#09090b',
  red: '#e11d48',
  text: '#fafafa',
  muted: '#a1a1aa',
  dim: '#52525b',
  border: 'rgba(255,255,255,0.08)'
};

export const sec = (s: number) => Math.round(s * FPS);
