/**
 * colors.ts
 *
 * Every color token from the Timelytics DESIGN.md.
 * Import and use these everywhere — never hardcode hex values in components.
 *
 * Source: stitch_timelytics_mobile_application/timelytics/DESIGN.md
 */

export const Colors = {
  // Backgrounds & Surfaces
  background:               '#13131b',
  surface:                  '#13131b',
  surfaceDim:               '#13131b',
  surfaceBright:            '#393841',
  surfaceContainerLowest:   '#0d0d15',
  surfaceContainerLow:      '#1b1b23',
  surfaceContainer:         '#1f1f27',   // ← use for cards
  surfaceContainerHigh:     '#292932',   // ← use for elevated cards
  surfaceContainerHighest:  '#34343d',

  // Text
  onSurface:         '#e4e1ed',   // Primary text (near-white)
  onSurfaceVariant:  '#c7c4d7',   // Secondary / muted text
  inverseSurface:    '#e4e1ed',
  inverseOnSurface:  '#303038',

  // Borders & Outlines
  outline:         '#908fa0',   // Input borders, dividers
  outlineVariant:  '#464554',   // Subtle dividers

  // Primary (Electric Indigo)
  primary:                '#c0c1ff',   // Active states, CTAs
  onPrimary:              '#1000a9',
  primaryContainer:       '#8083ff',   // Button fills
  onPrimaryContainer:     '#0d0096',
  inversePrimary:         '#494bd6',
  surfaceTint:            '#c0c1ff',
  primaryFixed:           '#e1e0ff',
  primaryFixedDim:        '#c0c1ff',
  onPrimaryFixed:         '#07006c',
  onPrimaryFixedVariant:  '#2f2ebe',

  // Secondary
  secondary:              '#b9c8de',
  onSecondary:            '#233143',
  secondaryContainer:     '#39485a',
  onSecondaryContainer:   '#a7b6cc',
  secondaryFixed:         '#d4e4fa',
  secondaryFixedDim:      '#b9c8de',
  onSecondaryFixed:       '#0d1c2d',
  onSecondaryFixedVariant:'#39485a',

  // Tertiary (Warm amber — warnings, highlights)
  tertiary:               '#ffb783',
  onTertiary:             '#4f2500',
  tertiaryContainer:      '#d97721',
  onTertiaryContainer:    '#452000',
  tertiaryFixed:          '#ffdcc5',
  tertiaryFixedDim:       '#ffb783',
  onTertiaryFixed:        '#301400',
  onTertiaryFixedVariant: '#703700',

  // Error / Danger (over-budget, delete)
  error:            '#ffb4ab',
  onError:          '#690005',
  errorContainer:   '#93000a',
  onErrorContainer: '#ffdad6',

  // Semantic shorthands (easier to remember in code)
  textPrimary:   '#e4e1ed',   // = onSurface
  textSecondary: '#c7c4d7',   // = onSurfaceVariant
  accent:        '#c0c1ff',   // = primary
  danger:        '#ffb4ab',   // = error
  warning:       '#ffb783',   // = tertiary
} as const;

export type ColorKey = keyof typeof Colors;
