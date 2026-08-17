/**
 * typography.ts
 *
 * Font styles from the Timelytics DESIGN.md.
 * Two font families:
 *   - Sora  → display & headline text (large, geometric, premium feel)
 *   - Inter → body, labels, UI data text (readable, utility-first)
 *
 * To load these fonts, install:
 *   npx expo install @expo-google-fonts/sora @expo-google-fonts/inter expo-font
 * That will be done in Step 2 (screen setup). The font names here must match
 * the keys exported by those packages exactly.
 */

import { TextStyle } from 'react-native';

// Font family name constants — must match what expo-google-fonts loads
export const FontFamily = {
  sora:       'Sora_700Bold',      // Used for display-lg, display-md
  soraSemiBold: 'Sora_600SemiBold', // Used for headlines
  inter:      'Inter_400Regular',   // Used for body text
  interMedium:'Inter_500Medium',    // Used for labels
  interSemiBold:'Inter_600SemiBold',// Used for title-lg
} as const;

// TypeScript type so autocomplete works when you reference a style
type TypographyStyle = Pick<TextStyle, 'fontFamily' | 'fontSize' | 'fontWeight' | 'lineHeight' | 'letterSpacing'>;

export const Typography: Record<string, TypographyStyle> = {
  displayLg: {
    fontFamily:    FontFamily.sora,
    fontSize:      48,
    fontWeight:    '700',
    lineHeight:    56,
    letterSpacing: -0.02 * 48, // -0.02em converted to px
  },
  displayMd: {
    fontFamily:    FontFamily.sora,
    fontSize:      36,
    fontWeight:    '600',
    lineHeight:    44,
    letterSpacing: -0.02 * 36,
  },
  headlineLg: {
    fontFamily:  FontFamily.soraSemiBold,
    fontSize:    28,
    fontWeight:  '600',
    lineHeight:  36,
  },
  headlineLgMobile: {
    fontFamily:  FontFamily.soraSemiBold,
    fontSize:    24,
    fontWeight:  '600',
    lineHeight:  32,
  },
  titleLg: {
    fontFamily:  FontFamily.interSemiBold,
    fontSize:    20,
    fontWeight:  '600',
    lineHeight:  28,
  },
  bodyLg: {
    fontFamily:  FontFamily.inter,
    fontSize:    16,
    fontWeight:  '400',
    lineHeight:  24,
  },
  bodyMd: {
    fontFamily:  FontFamily.inter,
    fontSize:    14,
    fontWeight:  '400',
    lineHeight:  20,
  },
  labelMd: {
    fontFamily:    FontFamily.interMedium,
    fontSize:      12,
    fontWeight:    '500',
    lineHeight:    16,
    letterSpacing: 0.05 * 12, // 0.05em converted to px
  },
};
