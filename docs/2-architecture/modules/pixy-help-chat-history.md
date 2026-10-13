# Private help chat history

Implemented on `pixyrobotpet` in the isolated checkout `tmp/pet-workspace`.

## Behavior

- The help modal restores the most recently created conversation when opened. Closing or reloading no longer clears persisted messages. Existing conversations from before this migration cannot be recovered.
- A subtle glass history control at the top left lists 20 conversations per page, with first-question titles and dates. New conversation starts an empty draft; its database row is created only on submission.
- The left rail navigates user questions and previews their answer on hover or keyboard focus. Native scrollbar styling is hidden only within this chat; wheel, touch and keyboard scrolling remain available. Incoming answers follow the bottom only while the reader is already there. A jump-to-bottom button appears otherwise.
- Each thread holds at most 200 messages. The SQL trigger serializes inserts and prevents overflow. The interface directs users to create a new thread at the limit; nothing is automatically deleted.
- The model still receives only four recent messages. Restoring or selecting history never calls the model. Conversation titles do not require AI.
- Server actions store the question and successful response, independent of the mounted UI. Failed requests remain unanswered questions, rather than persisted technical error messages. A missing history backend permits a new transient help conversation with an explicit warning. An existing thread that cannot be verified fails closed.
- No automatic retention/deletion policy or real-time synchronization between simultaneously open tabs is implemented. History is durable; another tab sees new messages after reopening or selecting the conversation again.

## Privacy and authorization

`help_chat_threads` and `help_chat_messages` have RLS enabled, with authenticated SELECT/INSERT only. Ownership cannot be updated through the authenticated API. Every thread requires its owner to equal `auth.uid()` and current tenant access. Direct membership excludes blocked members; authorized parent owner/admin access and platform super-admin access match tenant switching. Platform roles never bypass the private-owner condition.

Actions independently validate session, current tenant and thread ownership using the normal authenticated Supabase client. No service-role history reads/writes, browser storage, or credentials in public settings. Server-loaded context replaces browser-provided history for persisted threads. Input, titles and stored message sizes are bounded.

## Local validation

- Migration `20261011000003_help_chat_history.sql` applied and registered only in `supabase_db_agency-manager` (local API 55321 / database 55322), inside a transaction. Remote migrations remain pending.
- 73 tests passed across ten files, including history restoration, continuation, unavailable storage, stale loads after unmount, reading without forced scrolling, existing pet lifecycle and AI governance.
- `scripts/tests/help-history-local.sql` passed on the local database. It checks user privacy (including super-admin), cross-tenant writes, forged ownership, anonymous privileges, blocked memberships, immutable ownership and the 200-message bound. Test fixtures are rolled back. Its fixture user IDs are specific to this local copy.
- Scoped ESLint and `git diff --check` passed. Next production build completed successfully.
- Browser verification remains manual with the user on `http://127.0.0.1:3005/dashboard`. Check new question → answer → close/reopen → refresh, new conversation/history selection, markers, reading older messages while a response arrives, light/dark theme and mobile layout. Cartera on port 3000 remains in its own checkout.
