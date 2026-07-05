---
name: Artisan Leather & Glass
colors:
  surface: '#f9f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f9f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f4'
  surface-container: '#eeeeef'
  surface-container-high: '#e8e8e9'
  surface-container-highest: '#e2e2e3'
  on-surface: '#1a1c1d'
  on-surface-variant: '#504442'
  inverse-surface: '#2f3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#827471'
  outline-variant: '#d4c3bf'
  surface-tint: '#755750'
  primary: '#361f1a'
  on-primary: '#ffffff'
  primary-container: '#4e342e'
  on-primary-container: '#c19c94'
  inverse-primary: '#e5beb5'
  secondary: '#5e5e5c'
  on-secondary: '#ffffff'
  secondary-container: '#e1dfdc'
  on-secondary-container: '#636360'
  tertiary: '#322200'
  on-tertiary: '#ffffff'
  tertiary-container: '#4e3700'
  on-tertiary-container: '#cb9e3f'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad2'
  primary-fixed-dim: '#e5beb5'
  on-primary-fixed: '#2b1611'
  on-primary-fixed-variant: '#5c403a'
  secondary-fixed: '#e4e2df'
  secondary-fixed-dim: '#c8c6c4'
  on-secondary-fixed: '#1b1c1a'
  on-secondary-fixed-variant: '#474745'
  tertiary-fixed: '#ffdea4'
  tertiary-fixed-dim: '#f0bf5c'
  on-tertiary-fixed: '#261900'
  on-tertiary-fixed-variant: '#5d4200'
  background: '#f9f9fa'
  on-background: '#1a1c1d'
  surface-variant: '#e2e2e3'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 34px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.02em
  numeral-xl:
    fontFamily: Geist
    fontSize: 36px
    fontWeight: '300'
    lineHeight: 44px
    letterSpacing: -0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-padding: 32px
  gutter: 24px
  card-gap: 20px
---

## Brand & Style
The design system embodies a premium, high-craft aesthetic tailored for "Mr. Boot." It merges the tactile heritage of leather craftsmanship with the ethereal, high-tech clarity of modern software giants like Apple and Linear. 

The visual direction is **Premium Glassmorphism**. The interface should feel like a series of meticulously polished glass panes floating over a warm, tactile workshop environment. It leverages soft frosted textures, multi-layered depth, and a "Modern-Minimal" layout to evoke a sense of precision, luxury, and white-glove service. The emotional response is one of reliability and understated elegance.

## Colors
This design system uses a palette rooted in "Chocolate Brown" and "Warm Cream" to reference high-quality leather and premium packaging. 

- **Primary (Chocolate Brown):** Reserved for high-impact brand moments, primary buttons, and deep-toned text.
- **Secondary (Warm Cream):** Used for large surface areas to provide warmth and contrast against the sterile white of standard SaaS tools.
- **Accent (Gold):** Used sparingly for "premium" indicators, star ratings, or luxury service tiers.
- **Glass & Surface:** The core of the UI. Backgrounds are nearly white (#FAFAFB), while interactive cards use a semi-transparent glass blend with a refined white border to simulate light catching the edge of a lens.

## Typography
The typography strategy prioritizes readability and modern precision. **Geist** is used for headings and labels to provide a technical, "Linear-style" sharpness, while **Inter** handles body copy for maximum legibility across all devices.

- **Numerals:** Use Geist for tracking numbers, dates, and prices. The light weight (300) at large sizes creates a sophisticated, editorial look.
- **Hierarchy:** High contrast between oversized headlines and small, spaced labels creates an expensive, airy feel.

## Layout & Spacing
The layout follows a **fluid grid** model inspired by Stripe. It uses generous margins and negative space to allow "glass" elements room to breathe. 

- **Desktop:** 12-column grid with 24px gutters. Content is often centered in a max-width container (1200px) to maintain focus.
- **Mobile:** 4-column grid with 16px margins. Cards should span the full width of the grid to maximize the frosted glass surface area.
- **Rhythm:** All spacing (margins, padding, gaps) must be multiples of 8px to maintain a strict geometric alignment.

## Elevation & Depth
Depth is created through **Glassmorphism** and soft ambient shadows rather than solid fills.

1.  **Level 0 (Base):** #FAFAFB background.
2.  **Level 1 (Surface):** Solid #FFFFFF with a 1px border at 5% opacity.
3.  **Level 2 (Glass Card):** 65% White with 20px Backdrop Blur. 1px solid white border at 22% opacity. Soft shadow: `0 8px 32px rgba(0,0,0,0.04)`.
4.  **Level 3 (Active/Hover):** Glass card with an intensified shadow: `0 12px 48px rgba(0,0,0,0.08)` and a subtle internal "reflection" (top-down 10% white gradient).

## Shapes
The shape language is "Apple-esque"—consistently rounded and organic. 

- **Primary Containers:** Use `rounded-xl` (1.5rem / 24px) to create a soft, inviting feel for glass cards and modal containers.
- **Interactive Elements:** Buttons and input fields use `rounded-lg` (1rem / 16px) to maintain a distinct but related geometry.
- **Chips & Tags:** Fully pill-shaped to contrast against the more structured card layouts.

## Components

### Glass Cards
The signature component. Use `backdrop-filter: blur(20px)` and a thin semi-transparent white border. Content inside should have ample padding (minimum 24px).

### Buttons
- **Primary:** Solid Chocolate Brown (#4E342E) with white text. 
- **Secondary:** Glass-style with a subtle white fill and dark text.
- **Motion:** On hover, primary buttons should slightly lift (Y-axis -2px) with a 250ms spring transition.

### Inputs & Search
Floating search bars are glass-based with high roundedness (32px). Input fields should have a soft 1px border that glows slightly (Gold #C89B3C) when focused.

### Timeline & Status
The service timeline (Laundry -> Repair -> Ready) uses thin vertical lines and semantic-colored dots. "Ready" status should utilize a subtle pulse animation in the `ready` green hex.

### Animated Chips
Status chips should have a low-opacity background of their semantic color (e.g., 10% Success Green) with high-contrast text. On hover, the opacity should increase slightly with a smooth transition.

### Premium Charts
Charts for service history or spend tracking should use a monochromatic Chocolate Brown palette with a soft Gold accent for data points. No harsh grid lines; use light grey dashed lines for the Y-axis only.