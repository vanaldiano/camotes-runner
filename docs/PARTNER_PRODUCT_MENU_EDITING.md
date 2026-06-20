# Phase 8D: Partner Product/Menu Editing

Phase 8D adds a basic product catalog for marketplace partner shops inside the existing admin website. Admin and partner dashboard preview users can add and edit products for a selected `business_partners` row, while the customer app can browse active and available products on unlinked partner shop pages.

## Website-Based Partner Editing

The Partner Dashboard remains inside the `admin/` web project for now. Customer and rider experiences stay mobile-first, while admin and partner shop management remain web-first because product editing, shop profile maintenance, and order review are easier on a wider screen.

## How Products Connect

Partner products live in the new `partner_products` table and connect directly to `business_partners` through `partner_id`. Optional `category_id` and `subcategory_id` mirror the partner's marketplace category so products can be filtered and displayed under the correct category/sub-category context.

Customer visibility is conservative:

- `partner_products.is_active = true`
- `partner_products.is_available = true`
- linked `business_partners.is_active = true`
- linked `business_partners.status = 'active'`

If those checks pass, the product can appear on the partner detail page in the customer app.

## Difference From Restaurants/Menu Items

Existing food restaurants still use `restaurants`, `menu_categories`, `menu_items`, cart, checkout, food orders, and rider tracking. Phase 8D does not replace that flow.

`partner_products` are mainly for non-restaurant marketplace partners such as groceries, pharmacy, school supplies, tours, errands, and future partner-managed catalogs. If a `business_partners.restaurant_id` exists, the customer flow continues routing to the existing restaurant screen for menu/cart/checkout.

## Included In Phase 8D

- Safe `partner_products` table.
- Optional `partner_product_audit` table for simple change tracking.
- Admin website product/menu management section.
- Partner Dashboard Preview product list and add/edit foundation.
- Customer partner detail product list.
- Sample product seed rows for matching partner shops only.

## Remaining For Phase 8E

- Unified partner order creation for non-restaurant products.
- Generic partner cart/checkout flow.
- Partner order acceptance and fulfillment workflow.
- Production partner login and partner-only route separation.
- Stronger audit automation and operational reporting.
- Final policy hardening once production roles and partner onboarding are stable.
