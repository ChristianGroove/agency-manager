# Global branding incident — 13 October 2026

Production: `https://app.pixy.com.co`, Supabase **Pixy control**, `amwlwmkejdjskukdfwut`.

Read-only checks confirmed that `platform_settings.id=1` still references the configured logos. Both main PNG logos and the SVG favicon return HTTP 400 with `Object not found` / `NoSuchKey`. Their entries are also absent from `storage.objects`. The portal PNG exists and returns HTTP 200. This is not a missing platform settings row or a private bucket.

Production policies allow public reads but writes only for the service role. `updatePlatformSettings` incorrectly used the session client, explaining failed saves. The local correction requires `requireSuperAdmin()` before calling `supabaseAdmin`, handles explicitly cleared logo fields and invalidates the root layout and admin page.

`ImageUpload` previously invoked `deleteBrandingAsset` immediately on removal, before saving. That server action accepted any public Storage URL and deleted it with service privileges without checking authentication, ownership or saved references. An organization editing inherited branding could therefore physically delete the global assets. This is a confirmed defect and a mechanism consistent with the incident.

Supabase Storage logs show ten successful `DELETE /object/branding` requests from Node between 14:35:31 and 14:48:25 Colombia time on 13 October. The first event reports `storage.object.delete_many` and `role: service_role` (UTC `2026-10-13T19:35:31.243000`). The inspected event does not identify an authenticated end user or the deleted filenames. These logs corroborate backend deletion activity but do not establish the actor or map each missing asset to a specific request.

The local correction removes physical deletion from the draft image control and removes the unguarded deletion action. Uploaded files are retained; future garbage collection must check ownership and references after successful saves. Global uploads now explicitly require superadmin access independently of the selected organization.

Eight mocked regression tests pass for privileged save authorization, service client usage, explicit clears, cache invalidation, error redaction, global upload authorization and non-destructive image removal. These tests do not modify production. Source-only TypeScript compilation passed using a temporary config under `tmp`. The standard `tsc --noEmit` check fails on five stale generated `.next` references to the absent Cartera page, outside this change. `git diff --check` passed.

Recovery is prepared in `scripts/migrations/recover-global-branding-20261013.sql`. The user chose **only leave recovery prepared**, so it has not been executed. It replaces only the three broken global URLs with the existing production assets at `/branding/logo%20dark.svg`, `/branding/logo%20light.svg`, and `/pixy-isotipo.png`, each verified to return HTTP 200. It preserves portal and tenant branding and aborts if any diagnosed URL has changed. This restores Pixy's bundled artwork; it does not recover the original deleted PNG bytes. No production change or deployment has been performed as part of this diagnosis. The SQL artifact is local and ignored by the repository's existing `*.sql` rule.
