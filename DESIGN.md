---
name: Maritime Precision Intelligence
colors:
  surface: '#0d1515'
  surface-dim: '#0d1515'
  surface-bright: '#323b3b'
  surface-container-lowest: '#081010'
  surface-container-low: '#151d1d'
  surface-container: '#192121'
  surface-container-high: '#232b2c'
  surface-container-highest: '#2e3637'
  on-surface: '#dce4e4'
  on-surface-variant: '#b9caca'
  inverse-surface: '#dce4e4'
  inverse-on-surface: '#2a3232'
  outline: '#849495'
  outline-variant: '#3a494a'
  surface-tint: '#00dce5'
  primary: '#e9feff'
  on-primary: '#003739'
  primary-container: '#00f5ff'
  on-primary-container: '#006c71'
  inverse-primary: '#00696e'
  secondary: '#c6c6c7'
  on-secondary: '#2f3131'
  secondary-container: '#454747'
  on-secondary-container: '#b4b5b5'
  tertiary: '#fff9f0'
  on-tertiary: '#3a3000'
  tertiary-container: '#ffdb3f'
  on-tertiary-container: '#736000'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#63f7ff'
  primary-fixed-dim: '#00dce5'
  on-primary-fixed: '#002021'
  on-primary-fixed-variant: '#004f53'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c7'
  on-secondary-fixed: '#1a1c1c'
  on-secondary-fixed-variant: '#454747'
  tertiary-fixed: '#ffe16c'
  tertiary-fixed-dim: '#e7c427'
  on-tertiary-fixed: '#221b00'
  on-tertiary-fixed-variant: '#544600'
  background: '#0d1515'
  on-background: '#dce4e4'
  surface-variant: '#2e3637'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-padding: 40px
  gutter: 24px
  section-gap: 64px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

This design system is engineered for the high-stakes world of maritime logistics, where AI-driven precision meets industrial scale. The brand personality is **authoritative, cinematic, and hyper-efficient**. It evokes the feeling of a high-security command center—calm, dark, and focused.

The visual style is **Cinematic Minimalism**, a hybrid of Glassmorphism and Corporate Modernity. By utilizing an obsidian-based palette with razor-sharp 1px strokes, the UI recedes to let critical data and automation flows take center stage. Every element is intentional; whitespace is used not just for aesthetics, but to reduce cognitive load in complex enterprise environments. The emotional response should be one of absolute trust and technological superiority.

## Colors

The palette is rooted in **Obsidian Black (#000000)** to create infinite depth, providing a high-contrast canvas for data. 

- **Primary:** Electric Teal (#00F5FF) is used exclusively for "active" intelligence, key status indicators, and primary action highlights. It represents the AI pulse within the system.
- **Secondary:** Pure White (#FFFFFF) is reserved for high-priority typography and high-contrast CTA buttons to ensure maximum visibility against the dark backdrop.
- **Surface Tiers:** Muted Slates and Charcoals (#0A0A0A to #1E1E1E) define container levels without breaking the cinematic immersion.
- **Accents:** Semantic colors (Success/Warning/Error) must be desaturated to maintain the professional, understated aesthetic, appearing only when human intervention is required.

## Typography

The design system utilizes **Inter** for its systematic, utilitarian, and highly legible characteristics. The type hierarchy is built to handle dense logistics data while maintaining a premium editorial feel.

**Key Principles:**
- **Tracking:** Headlines use slightly negative letter spacing to feel "engineered" and tight. Labels use increased tracking for legibility at small sizes.
- **Weight:** Use Semi-Bold (600) for hierarchy and Regular (400) for long-form data. Avoid thin weights to ensure accessibility against the black background.
- **Scale:** Large display sizes are used for high-level KPIs, while labels are kept crisp and uppercase for secondary metadata.

## Layout & Spacing

The layout follows a **12-column fluid grid** for desktop, transitioning to a 4-column grid for mobile. However, the system prioritizes "Negative Space as Luxury." 

- **The 8px Rhythm:** All spacing must be a multiple of 8px to ensure mathematical harmony.
- **Margins:** Generous 40px outer margins provide "breathing room" for the UI, preventing the interface from feeling cluttered or industrial.
- **Density:** While the overall layout is airy, internal component spacing (like data tables) can use a "Compact" mode with 4px/8px increments to maximize information density where necessary.
- **Reflow:** On mobile, complex pipeline visualizations should collapse into vertical "nodes" with increased vertical padding (stack-lg) to maintain clarity.

## Elevation & Depth

Depth in this design system is achieved through **Tonal Layering and Material Properties** rather than traditional drop shadows.

- **The Z-Axis:** 
  - **Level 0 (Base):** Pure #000000.
  - **Level 1 (Panels):** #0A0A0A with a 1px solid #1E1E1E border.
  - **Level 2 (Modals/Overlays):** #121212 with a subtle 40px background blur (Glassmorphism) and a 1px solid #2C2C2E border.
- **Glow Effects:** Critical AI alerts or "active" states may use a soft, 15% opacity Electric Teal outer glow (blur: 20px) to simulate a light-emitting interface.
- **Borders:** Shadows are replaced by crisp, low-contrast charcoal outlines to define shape without adding visual "weight."

## Shapes

The shape language is **Refined and Balanced**. We use a `rounded-md` (0.5rem) base to soften the industrial nature of logistics while maintaining a professional enterprise feel.

- **Standard Elements:** Buttons, input fields, and cards use 8px (0.5rem) corners.
- **Large Containers:** Dashboard widgets or main layout panels use 16px (1rem) corners for a more distinct structural separation.
- **Status Pills:** Use the `rounded-full` (999px) utility for status indicators and tags to distinguish them from interactive buttons.

## Components

**Buttons**
- **Primary:** Solid White with Black text. No shadow. High-impact.
- **Secondary:** Transparent with 1px #2C2C2E border. Text is White.
- **Ghost:** Electric Teal text, no background. Used for secondary navigation within a flow.

**Input Fields**
- Background is #0A0A0A with a 1px #1E1E1E border. On focus, the border transitions to Electric Teal with a subtle 2px glow.

**Cards & Panels**
- All cards must use the Glassmorphism effect: semi-transparent charcoal background with a backdrop filter (blur: 20px). This maintains the "Cinematic" depth.

**Data Visualizations**
- Use Electric Teal for the primary data series. Background grid lines should be #121212 (extremely subtle). 

**Chips & Status**
- Small, uppercase text. For "AI Processing," use a pulsating Teal dot icon to signify life within the system.

**Maritime Pipeline Nodes**
- Unique to this system: Vertical or horizontal nodes connected by 1px Electric Teal lines. Nodes represent container status, utilizing icons and micro-labels.