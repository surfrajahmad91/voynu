/*
 * IMPORTANT: this list is a UI-only convenience (used for
 * quick redirect decisions before a full profile-based check
 * loads). It is NOT the security boundary — real admin
 * authorization is enforced by the database via profiles.role
 * and the is_admin() SQL function (see Phase 1 migration).
 * Even if this array is wrong or stale, a non-admin cannot
 * gain admin access, because RLS checks the database, not this file.
 */
export const ADMIN_EMAILS = [
  "surfrajahmad@gmail.com",
];
