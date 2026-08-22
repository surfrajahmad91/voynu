/*
 * Front-end convenience list only — the real security boundary
 * is the Supabase RLS policy on the bookings table. This list is
 * just used to decide what the UI shows.
 */
export const ADMIN_EMAILS = [
  "surfrajahmad@gmail.com",
];
