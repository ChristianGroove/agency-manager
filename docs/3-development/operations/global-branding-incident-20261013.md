# Global branding incident — 13 October 2026

Production: `https://app.pixy.com.co`, Supabase **Pixy control**, `amwlwmkejdjskukdfwut`.

Read-only checks confirmed that `platform_settings.id=1` still references the configured logos. Both main PNG logos and the SVG favicon return HTTP 400 with `Object not found` / `NoSuchKey`. Their entries are also absent from `storage.objects`. The portal PNG exists and returns HTTP 200. This is not a missing platform settings row or a private bucket.

Production policies allow public reads but writes only for the service role. `updatePlatformSettings` incorrectly used the session client, explaining failed saves. The local correction requires `requireSuperAdmin()` before calling `supabaseAdmin`, handles explicitly cleared logo fields and invalidates the root layout and admin page.

`ImageUpload` previously invoked `deleteBrandingAsset` immediately on removal, before saving. That server action accepted any public Storage URL and deleted it with service privileges without checking authentication, ownership or saved references. An organization editing inherited branding could therefore physically delete the global assets. This is a confirmed defect and a mechanism consistent with the incident.

Supabase Storage logs show ten successful `DELETE /object/branding` requests from Node between 14:35:31 and 14:48:25 Colombia time on 13 October. The first event reports `storage.object.delete_many` and `role: service_role` (UTC `2026-10-13T19:35:31.243000`). The inspected event does not identify an authenticated end user or the deleted filenames. These logs corroborate backend deletion activity but do not establish the actor or map each missing asset to a specific request.

The local correction removes physical deletion from the draft image control and removes the unguarded deletion action. Uploaded files are retained; future garbage collection must check ownership and references after successful saves. Global uploads now explicitly require superadmin access independently of the selected organization.

Eight mocked regression tests pass for privileged save authorization, service client usage, explicit clears, cache invalidation, error redaction, global upload authorization and non-destructive image removal. These tests do not modify production. Source-only TypeScript compilation passed using a temporary config under `tmp`. The standard `tsc --noEmit` check fails on five stale generated `.next` references to the absent Cartera page, outside this change. `git diff --check` passed.

Recovery is prepared in `scripts/migrations/recover-global-branding-20261013.sql`. The user chose **only leave recovery prepared**, so it has not been executed. It replaces only the three broken global URLs with the existing production assets at `/branding/logo%20dark.svg`, `/branding/logo%20light.svg`, and `/pixy-isotipo.png`, each verified to return HTTP 200. It preserves portal and tenant branding and aborts if any diagnosed URL has changed. This restores Pixy's bundled artwork; it does not recover the original deleted PNG bytes. No production change or deployment has been performed as part of this diagnosis. The SQL artifact is local and ignored by the repository's existing `*.sql` rule.

## Follow-up: tenant inheritance after the user's redeploy

The user redeployed the initial fix in Coolify, uploaded replacement global logos and confirmed successful saving. Read-only production queries then identified stored copies of the old Pixy URLs in both **Karla Tanco** (`karla-tanco`, tier `whitelabel`) and **Retail Demo** (`retail-demo`, tier `basic`). These copies shadowed global settings. Karla has a branding entitlement but its three copied Pixy assets were not independent custom artwork. Seven other organizations share the healthy platform portal URL; they were not modified.

The follow-up code enforces the logo/color tier permissions already used by the ADN interface. Basic tenants resolve their assets from the current global settings. Organization saves store NULL for inherited logo/color values, preserving actual allowed tenant overrides. The sidebar now accepts refreshed server branding and cancels stale responses when changing organizations; its indefinitely retained module cache was removed.

The user explicitly authorized the separate repair in `scripts/migrations/reconcile-inherited-branding-20261013.sql`. It executed successfully in production: both target rows now have NULL for `main_logo_url`, `main_logo_light_url`, and `isotipo_url`, restoring live inheritance. Their portal logos were preserved. Identity guards and exact old-URL comparisons preserve a custom logo saved after diagnosis. This repair did not execute the original global recovery SQL or change platform settings, branding plans, other tenants or Storage objects.

Validation: 21 Vitest tests pass for global saves, inherited branding, entitlement checks, premium overrides, sidebar refresh and organization switching; four isolated PGlite tests pass for the actual operational repair, including custom-logo preservation, idempotence, unrepaired-global rejection and tenant identity mismatch. Source-only TypeScript compilation passed. Application deployment and visual checks remain manual, per the user's instruction.
