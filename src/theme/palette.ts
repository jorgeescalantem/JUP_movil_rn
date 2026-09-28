// ─────────────────────────────────────────────────────────────
// SCA Soluciones — Paletas light / dark
// ─────────────────────────────────────────────────────────────

export type ColorScheme = 'light' | 'dark';

export type ThemeColors = {
  // Base
  background: string;
  backgroundAlt: string;
  surface: string;
  surfaceSoft: string;
  surfaceAlt: string;
  border: string;
  borderStrong: string;

  // Texto
  text: string;
  textStrong: string;
  textMuted: string;
  muted: string;

  // Marca
  navy: string;
  navyDeep: string;
  blue: string;
  blueSoft: string;
  sky: string;

  // Estados
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  infoSoft: string;

  // Especiales
  white: string;
  neutralSoft: string;
  overlay: string;
  shadow: string;
};

export const lightColors: ThemeColors = {
  // Base
  background: '#F8FAFC',
  backgroundAlt: '#EDEEEF',
  surface: '#FFFFFF',
  surfaceSoft: '#F8FAFC',
  surfaceAlt: '#F1F5F9',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',

  // Texto
  text: '#334155',
  textStrong: '#1B2A4A',
  textMuted: '#64748B',
  muted: '#8B96AC',

  // Marca
  navy: '#1B2A4A',
  navyDeep: '#131E36',
  blue: '#0FA0F3',
  blueSoft: '#E6F4FD',
  sky: '#7FB3D5',

  // Estados
  success: '#10B981',
  successSoft: '#E7F8F1',
  warning: '#B07800',
  warningSoft: '#FFF8DC',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  info: '#0FA0F3',
  infoSoft: '#E6F4FD',

  // Especiales
  white: '#FFFFFF',
  neutralSoft: '#EEF1F6',
  overlay: 'rgba(19, 30, 54, 0.55)',
  shadow: '#1B2A4A',
};

export const darkColors: ThemeColors = {
  // Base
  background: '#0F1720',
  backgroundAlt: '#131C26',
  surface: '#161F2B',
  surfaceSoft: '#1C2733',
  surfaceAlt: '#232F3D',
  border: '#293544',
  borderStrong: '#3A4A5C',

  // Texto
  text: '#CBD5E1',
  textStrong: '#F1F5F9',
  textMuted: '#94A3B8',
  muted: '#7A8A9E',

  // Marca
  navy: '#F1F5F9',
  navyDeep: '#0F1720',
  blue: '#38BDF8',
  blueSoft: '#123044',
  sky: '#7FB3D5',

  // Estados
  success: '#34D399',
  successSoft: '#0F2F22',
  warning: '#FBBF24',
  warningSoft: '#3A2F0D',
  danger: '#F87171',
  dangerSoft: '#3B1A1A',
  info: '#38BDF8',
  infoSoft: '#123044',

  // Especiales
  white: '#FFFFFF',
  neutralSoft: '#232B35',
  overlay: 'rgba(0, 0, 0, 0.7)',
  shadow: '#000000',
};

export const palettes: Record<ColorScheme, ThemeColors> = {
  light: lightColors,
  dark: darkColors,
};