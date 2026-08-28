# VOYNU Phase 1 — Step 1 Inspection

Baseline verified before implementation:
- Backup branch: `28aug2026backup`
- Baseline commit: `6a237d8f159af7243e779cb37f94744e627ef7db`

Step 1 goal: make vehicle categories database-driven throughout the customer/admin experience, without hardcoded category definitions.

Current repository inspection found:
- `app/lib/fareRules.js` contains a hardcoded `VOYNU_FARE_CONFIG.vehicleTypes` list.
- `app/cab-selection/page.js` calculates and displays rides from that hardcoded list.
- `app/admin/page.js` currently uses a hardcoded vehicle category default (`hatchback`) when creating vehicles.

Current Supabase database already contains a `vehicle_categories` table and a `vehicles.vehicle_category_id` column, so implementation should build on that existing schema rather than recreate it.

This inspection document is temporary and records the starting point for Step 1.
