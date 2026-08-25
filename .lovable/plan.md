# Secure Instagram verification-session correlation

## Scope
Change only the existing Instagram verification start function, Instagram webhook processing, and the existing external database schema needed for one-time codes. Keep the webhook URL, task/points systems, Meta permissions, and all unrelated features unchanged.

## Implementation
1. **Create one-time session codes**
   - Generate an `AZOX-...` code server-side with cryptographically secure randomness.
   - Store it with the pending 15-minute Instagram verification session and return it with instructions to follow `@azad__x_` and DM the exact code.
   - Retry generation only if the database reports the extremely unlikely unique-code collision.

2. **Correlate DMs by exact code**
   - Read only the Instagram-scoped sender ID and DM text from the existing webhook payload.
   - Normalize and extract one valid `AZOX-...` code from the message.
   - Remove the “newest pending session” lookup entirely.
   - Atomically claim the matching pending, unexpired code before any link or verification write so concurrent webhook deliveries cannot reuse it.

3. **Enforce identity and verification rules**
   - Check `instagram_links` by Instagram-scoped sender ID and fail the claimed session if it belongs to another Telegram numeric ID.
   - Call Meta server-side with `id,username,is_user_follow_business,is_business_follow_user` using the existing secret.
   - Treat only `is_user_follow_business === true` as success.
   - On success, upsert the link and verification record, then mark the session verified with completion time and Instagram identity fields.
   - On any matched-session failure, mark the session failed and completed; never create a link on failure and never touch points/tasks.

4. **Database migration**
   - Alter the existing `verification_sessions` table; do not create duplicate tables.
   - Add `verification_code`, add a uniqueness/index guarantee, and add the minimal atomic claim function/status support required to make one-time consumption race-safe.
   - Preserve existing rows and existing table access patterns.

5. **Validation**
   - Verify the app build and inspect the changed webhook/start-function paths.
   - Report the exact changed files, required SQL, matching/linking behavior, Meta TRUE/FALSE rule, and first real-test steps.

## Technical details
- Codes use a restricted uppercase alphabet and secure random bytes; they never encode Telegram IDs or other predictable data.
- The atomic database claim transitions one matching row out of `pending` before processing. A replay therefore finds no eligible session.
- The external database is separate from the project-managed database. If its migration cannot be applied through the available connection, the exact migration will be committed/provided for one-time execution there rather than being applied to the wrong database.
