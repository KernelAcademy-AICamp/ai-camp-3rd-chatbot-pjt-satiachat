---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, artifacts, posters, or applications (examples include websites, landing pages, dashboards, React components, HTML/CSS layouts, or when styling/beautifying any web UI). Generates creative, polished code and UI design that avoids generic AI aesthetics.
---

# Frontend Design Skill

Create distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics.

## Design Thinking

Before coding, commit to a BOLD aesthetic direction:
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian
- **Differentiation**: What makes this UNFORGETTABLE?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision.

## Frontend Aesthetics Guidelines

### Typography
- Choose fonts that are beautiful, unique, and interesting
- **AVOID**: Arial, Inter, Roboto, system fonts
- Pair a distinctive display font with a refined body font

### Color & Theme
- Commit to a cohesive aesthetic
- Use CSS variables for consistency
- Dominant colors with sharp accents outperform timid, evenly-distributed palettes

### Motion
- Use animations for effects and micro-interactions
- Focus on high-impact moments: staggered reveals on page load
- Use scroll-triggering and hover states that surprise

### Spatial Composition
- Unexpected layouts
- Asymmetry
- Overlap
- Diagonal flow
- Grid-breaking elements
- Generous negative space OR controlled density

### Backgrounds & Visual Details
- Create atmosphere and depth
- Apply: gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, decorative borders, custom cursors, grain overlays

## NEVER Use

- Overused fonts (Inter, Roboto, Arial, system fonts)
- Cliched color schemes (purple gradients on white)
- Predictable layouts and component patterns
- Cookie-cutter design lacking context-specific character

## Implementation

Match implementation complexity to the aesthetic vision:
- **Maximalist designs**: Elaborate code with extensive animations
- **Minimalist designs**: Restraint, precision, careful attention to spacing and typography

## Example CSS Variables

```css
:root {
  /* Warm Luxury Theme */
  --color-primary: #5D1D2E;
  --color-secondary: #951233;
  --color-accent: #997929;
  --color-background: #0A0A0A;
  --color-surface: #1A1A1A;
  --color-text: #F4F1DE;

  --font-display: 'Playfair Display', serif;
  --font-body: 'Source Sans Pro', sans-serif;

  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 2rem;
  --spacing-xl: 4rem;
}
```

Remember: Claude is capable of extraordinary creative work. Don't hold back!
