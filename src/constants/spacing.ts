/**
 * spacing.ts
 *
 * 8px square grid from the Timelytics DESIGN.md.
 * All padding, margin, and gap values in the app must come from here.
 * Never use magic numbers in component StyleSheets.
 */

export const Spacing = {
  xs:     4,   // micro-adjustments only
  sm:     8,   // base unit
  md:     16,  // standard internal padding
  lg:     24,  // card internal padding, section separation
  xl:     32,
  xxl:    48,
  gutter: 16,  // between columns/cards
  marginMobile: 20,  // horizontal screen edge margin
} as const;

// Border radius values from the design
export const Radius = {
  sm:   4,
  base: 8,
  md:   12,
  lg:   16,   // standard components: inputs, buttons, small cards
  xl:   24,   // large cards, hero containers
  full: 9999, // pill/chip shape
} as const;
