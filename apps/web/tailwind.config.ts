import type { Config } from 'tailwindcss';
import preset from '@ellixr/ui/tailwind-preset';

const config: Config = {
  presets: [preset as Config],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: { extend: {} },
  plugins: [],
};

export default config;
