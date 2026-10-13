# Pixy Robot Pet

Opt-in dashboard help launcher. Source is vendored from `robot-heads` 0.3.0 with MIT attribution and a fixed commit; see `vendor/robot-heads/README.md` for local hardening changes.

## Activation

1. Apply `supabase/migrations/20261011000001_platform_robot_pet.sql` to the intended database using the project's normal migration workflow. It adds one disabled-by-default JSONB column and leaves RLS unchanged.
2. In `/platform/admin` → SaaS Engine → Marca Global → Mascota Pixy, select the internal organization (automatically suggested for slug `pixy-agency`).
3. Keep availability at **Piloto: solo Pixy**, choose appearance and save with **Activar mascota** enabled.
4. Reload open sessions. No background polling or Realtime connection is added for configuration propagation.

Only super admins can read the administration options or save configuration. The writer uses the server admin client after role validation, validates the selected organization and updates only `pet_config` and `updated_at` on singleton `id=1`.

## Scope and contracts

- Global off, unavailable/invalid configuration, no organization or renderer failure → simple direct help button. The legacy floating menu is removed.
- Animation off → static pose; it does not disable chat.
- Contextual → static idle by default, at most 2.5 seconds per gesture and 15 seconds for a waiting state. With cursor following enabled on devices with a fine pointer, a shared document listener wakes drawing only during movement plus 800 ms of settling. There is no hover or distance restriction. Visible animations are capped at 30 FPS.
- Continuous → explicit opt-in, with higher CPU cost. Hidden/offscreen instances and reduced-motion preferences pause drawing.
- Hibernation → enabled by default after five minutes without entering the robot with the mouse. Renewed by robot hover, launcher keyboard focus or touch; global cursor movement never renews it. One timeout and a visibility check, no ticking interval or visible counter. Super admin may disable it or set 1–30 minutes. Sleep pauses even continuous animation and tracking, while real help/error/operation states remain visible as static poses. Existing JSON configurations receive defaults without a migration.
- Help uses one live robot beside the composer (112 px desktop / 80 px mobile), without a header or per-message avatars. Status/error text remains available even with the robot disabled. Alert reactions → optional static avatars in system broadcasts and critical-broadcast priority. Does not instrument every Sonner notification.
- Pixy is matched by persisted organization ID; other tenants inherit primary/secondary from `BrandingProvider`, independently falling back for each missing or invalid HEX value.
- Provider resets by organization, not by appearance changes; saving pet settings must not remount the dashboard or discard unrelated form state.
- First module lifecycle: `BrandCenter` uses optional `usePetOperation` for working/success/error on save. One operation slot, stale completion protection, unmount cleanup, and bounded expiration keep feedback isolated from business logic. Critical broadcasts and active chat take priority. Reactions can be disabled independently.
- Chat reuses `AssistantModal`, `AIChatPanel` and `askHelpAssistant`. Rendering never initiates an AI request.
- UI placement is initially bottom right, with a transparent launcher without a tooltip and stacking below dialogs. Theme switching lives in a fixed-size sidebar button. The composer reserves room for its absolutely positioned robot so it cannot obstruct typing/sending. Further placement options are intentionally deferred.

Future module integrations should publish scoped lifecycle signals through a bounded coordinator; do not import the vendor renderer into business services or persist animation state in the database. Voice/search/progress states must correspond to real signals.

## Validation

Run `node node_modules/vitest/vitest.mjs run src/modules/core/pet --no-file-parallelism` for isolated tests with external services mocked. Typecheck and lint the application as usual. The renderer is excluded from style lint to preserve the upstream source; TypeScript and dedicated canvas/ticker tests cover its integration and hardening.

See `docs/2-architecture/modules/pixy-robot-pet-verification.md` for evidence and deployment limitations.
