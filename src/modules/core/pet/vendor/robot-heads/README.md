# Vendored robot-heads

Source: https://github.com/fayazara/robot-heads
Version: 0.3.0
Commit: 58ebf6439a8125a769f63b22ffd35bc18834b1b5
License: MIT, copyright 2026 Fayaz Ahmed. See LICENSE.
The same notice is distributed at `/licenses/robot-heads.txt` in Pixy's public assets.

Copied from the audited upstream source, not its playground. No npm install is required.
Keep the license with distributions and do not update automatically.

Pixy changes:
- `RobotHeadProps.onRenderError` reports failed canvas initialization/drawing.
- ticker isolates subscriber failures and continues healthy subscribers.
- global event listeners are removed when the last animation unsubscribes.
- visible animation is capped at 30 FPS while preserving elapsed simulation time.
- `pointerOnly` draws on document pointer movement plus an 800 ms settling window; continuous subscribers do not wake sleeping pointer-only heads.
- the original 700 px cursor cutoff is removed; the original simulation still clamps head rotation.
- texture cache is bounded to 32 entries to cap memory during previews/resizing.

React linting of this external renderer is handled separately from Pixy components.
Upstream geometry, lighting, faces and simulation remain unchanged.
