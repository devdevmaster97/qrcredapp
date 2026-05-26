---
name: Luminous Flux
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#3d494d'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#6d797e'
  outline-variant: '#bcc9ce'
  surface-tint: '#00677d'
  primary: '#00677d'
  on-primary: '#ffffff'
  primary-container: '#00b4d8'
  on-primary-container: '#00414f'
  inverse-primary: '#4cd6fb'
  secondary: '#006875'
  on-secondary: '#ffffff'
  secondary-container: '#9cecfb'
  on-secondary-container: '#016d7a'
  tertiary: '#ba1340'
  on-tertiary: '#ffffff'
  tertiary-container: '#ff7c8c'
  on-tertiary-container: '#7b0025'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b3ebff'
  primary-fixed-dim: '#4cd6fb'
  on-primary-fixed: '#001f27'
  on-primary-fixed-variant: '#004e5f'
  secondary-fixed: '#9feffe'
  secondary-fixed-dim: '#83d3e1'
  on-secondary-fixed: '#001f24'
  on-secondary-fixed-variant: '#004f59'
  tertiary-fixed: '#ffdadb'
  tertiary-fixed-dim: '#ffb2b8'
  on-tertiary-fixed: '#40000f'
  on-tertiary-fixed-variant: '#91002d'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  margin-mobile: 20px
  gutter-mobile: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
  touch-target: 48px
---

## Brand & Style

The design system is centered on **Clarity, Vitality, and Fluidity**. It targets a modern, mobile-first audience that values efficiency and aesthetic breathing room. The visual direction is **Corporate / Modern** with a lean toward **Minimalism**, characterized by high-quality whitespace and a crisp, intentional UI.

The emotional response should be one of "effortless control"—users should feel that the interface is proactive and easy to navigate. By utilizing a "Soft-Clean" aesthetic, we avoid the sterile nature of traditional enterprise apps, replacing it with a fresh, approachable atmosphere that prioritizes high-contrast legibility and generous touch targets.

## Colors

The palette is anchored by a vibrant **Teal-Blue primary** that drives action and signifies progress. The **Secondary soft blue** is used for background washes, secondary buttons, and tonal layering. A **Tertiary pink** is reserved for high-importance alerts or "spark" moments in the UX.

The neutral palette is biased toward cool whites and soft grays to maintain a "crisp" feeling. 
- **Surface**: Use pure white (#FFFFFF) for the primary content containers.
- **Background**: Use the Neutral hex (#F8F9FA) for the main application canvas to create subtle depth.
- **Text**: Use a deep navy-gray (#212529) for primary text to ensure maximum accessibility against the light backgrounds.

## Typography

This design system utilizes a dual-font strategy. **Plus Jakarta Sans** provides a friendly, geometric personality for headlines, creating a welcoming entry point. **Inter** is used for body and functional labels due to its exceptional legibility and systematic performance at small sizes.

Hierarchy is enforced through weight variation rather than excessive size shifts. Headlines should use "Tight" letter spacing to feel modern and impactful, while body text remains "Normal" to ensure effortless reading on mobile screens.

## Layout & Spacing

The system follows an **8px grid** rhythm. On mobile, the layout utilizes a **fluid grid** with 20px side margins and 16px gutters.

- **Touch Safety**: All interactive elements must maintain a minimum height/width of 48px to satisfy accessibility standards for thumb-driven navigation.
- **Vertical Rhythm**: Content blocks are separated by 24px (stack-lg), while internal element groupings (like a label and its input) are separated by 8px (stack-sm).
- **Safe Areas**: Ensure all bottom-fixed navigation components account for device-specific home indicators with extra padding-bottom.

## Elevation & Depth

Hierarchy is established via **Tonal Layers** and **Ambient Shadows**. 

- **Level 0 (Base)**: The background hex (#F8F9FA).
- **Level 1 (Cards)**: Pure white surfaces with a very soft, diffused shadow (12px blur, 4% opacity, Primary color tint).
- **Level 2 (Floating/Modals)**: Increased shadow spread (24px blur, 8% opacity) to suggest immediate interaction priority.

Avoid heavy borders; instead, use 1px strokes in a very light neutral shade (#E9ECEF) to define boundaries only where tonal contrast is insufficient.

## Shapes

The design system employs a **Rounded** shape language to reinforce the "friendly yet professional" brand personality. 

- **Primary Buttons/Inputs**: 8px (0.5rem) corner radius.
- **Large Cards/Containers**: 16px (1rem) corner radius.
- **Full-Width Sheet/Modals**: 24px (1.5rem) on top corners only.

This consistent rounding creates a cohesive visual flow that mirrors the geometric curves of the Plus Jakarta Sans typeface.

## Components

### Buttons
- **Primary**: Solid primary color, white text, 52px height for mobile prominence.
- **Secondary**: Light blue background (secondary color at 20% opacity) with primary color text.
- **Tertiary/Ghost**: No background, primary color text, bold weight.

### Input Fields
- **Default State**: 1px light gray border, 8px radius, white fill.
- **Active State**: 2px primary color border with a soft outer glow (primary color at 10% opacity).
- **Labels**: Always visible, 14px Inter SemiBold, positioned 8px above the input.

### Cards
- White background, 16px padding, 16px corner radius. Use the Level 1 shadow for depth.

### Chips & Tags
- 32px height, pill-shaped (rounded-xl), using secondary color fills with dark navy text.

### Navigation Bar
- Bottom-fixed, 72px minimum height, background-blur (90% opacity white), with active states highlighted by a primary color dot indicator below the icon.