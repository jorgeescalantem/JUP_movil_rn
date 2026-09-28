// ─────────────────────────────────────────────────────────────
// Tokens estáticos (no cambian con el tema)
// ─────────────────────────────────────────────────────────────

export const spacing = {
  xs: 6,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const typography = {
  title:    { fontSize: 20, fontWeight: '800' as const, letterSpacing: -0.3 },
  subtitle: { fontSize: 15, fontWeight: '600' as const },
  body:     { fontSize: 14, fontWeight: '500' as const },
  label:    { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.3 },
  caption:  { fontSize: 10, fontWeight: '500' as const },
} as const;