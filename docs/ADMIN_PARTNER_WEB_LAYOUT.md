# Admin and Partner Web Dashboard Layout

Phase 8G separates the admin and partner dashboard experience visually while keeping both inside the existing `admin/` web project.

## Why Separate The Layout

The Phase 8 dashboard now includes ride bookings, food orders, partner orders, marketplace setup, partner shops, products, notifications, rate profile foundations, and partner preview tools. A single long admin page was becoming harder to scan.

The new layout uses a sidebar, top bar, and workspace switch so Admin and Partner Preview feel like different areas of the same operations website.

## Why Keep One Web Project

Admin and Partner Dashboard remain in `admin/` for now because partner login, full product permissions, payments, commissions, and settlement reporting are still evolving. Keeping one deployment avoids extra hosting and authentication complexity while the workflow is still being validated.

A separate Partner Dashboard deployment can come later when:

- partner auth roles are final
- partner-only RLS policies are fully hardened
- product/menu management is stable
- order acceptance and earnings flows are production-ready

## Admin Responsibilities

Admin workspace remains responsible for:

- ride booking operations
- food order monitoring
- partner order monitoring
- rider assignment
- marketplace categories and subcategories
- partner shop setup
- partner product/menu support
- partner notifications
- rate profile readiness
- system/settings checks

## Partner Responsibilities

Partner Preview workspace simulates what a partner will eventually see:

- My Shop
- My Orders
- Products / Menu
- Notifications
- Business Profile
- Reports / Earnings placeholder
- Settings placeholder

For Phase 8G, an admin still selects the partner to preview. Real partner login separation is intentionally left for a later phase.

## Phase 9 Preparation

This layout prepares for payment integration by giving payment, commission, settlement, and partner earnings features a clear place to live. Phase 9 can add payment controls without crowding ride, food, marketplace, and partner operations into one continuous page.
