# Project UI & Styling Rules

## Glassmorphism Standard
All primary container cards, banners, and sidebars should use the custom glassmorphism aesthetic rather than solid fills.
- Use the `.glass-card` utility class for any standard card or widget. It automatically applies the semi-transparent background, blur, shadow, and a custom 3px vertical gradient border.
- For non-card elements (like sidebars) that need the gradient border but custom positioning/backgrounds, apply the `.glass-panel` class along with `relative` or `fixed` positioning, and custom `bg-white/10 dark:bg-white/5 backdrop-blur-md` tailwind classes.

## General Aesthetics
- Avoid plain gray or solid white backgrounds for panels. Use the predefined glass utilities.
- The global dashboard background should be `bg-gray-100` for light mode and `dark:bg-[#0a0a0a]` for dark mode to provide adequate contrast for the glassmorphism.
