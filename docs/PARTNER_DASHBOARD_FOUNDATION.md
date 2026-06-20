# Partner Dashboard Foundation

Phase 8B prepares Camotes Runner for partner shop management while keeping the customer and rider products mobile-first.

## Why Partner Dashboard Is Web-Based

Customers and riders need fast mobile flows for browsing, booking, tracking, accepting jobs, and completing trips. Admin and partner shop management are operational workflows, so they fit better as websites with forms, tables, previews, and longer editing sessions.

For Phase 8B, the Partner Dashboard foundation lives inside the existing `admin/` web project. This keeps deployment simple while the role model is still being hardened.

## Partner Dashboard vs Admin

The Admin dashboard manages the whole marketplace:

- bookings and ride operations
- food orders
- riders
- marketplace categories
- all partner shops
- partner user assignment foundation

The Partner Dashboard is scoped to one shop:

- view and edit the shop profile
- update contact information
- update business hours
- see open/closed status
- prepare for product/menu management

Partner users should only manage business partners linked to them through `partner_users`. Full role separation is prepared in the database policy layer and can be tightened as authentication matures.

## Phase 8B Includes

- `partner_users` table for linking Supabase auth users to business partners.
- Optional owner/contact/business-hour/status fields on `business_partners`.
- MVP RLS policies for public customer reads, admin management, and partner-owned reads/updates.
- Admin UI foundation for partner profile management and partner user assignment.
- Admin-accessible Partner Dashboard Preview / My Shop section.

## Phase 8D Remaining Work

Phase 8D should add the full partner product/menu workflow:

- true partner login routing and role-gated dashboard access
- product/menu categories per partner
- item CRUD, pricing, availability, and images
- partner order management
- audit logs and stricter permissions
- production-grade RLS hardening after final auth role decisions

Until then, Phase 8B provides safe structure and previewable UI without changing customer checkout, ride booking, rider app, or existing admin operations.
