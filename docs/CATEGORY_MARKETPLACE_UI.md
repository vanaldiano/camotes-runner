# Category Marketplace UI

Phase 8A adds a marketplace-style browsing layer to Camotes Runner. Customers can start from a main service category, narrow by sub-category, and open partner shops without removing the existing ride and food flows.

## Customer Flow

The customer path is:

1. Home shows the main service categories.
2. Tapping Ride opens the existing ride booking flow.
3. Tapping another category opens the category marketplace page.
4. The category page shows sub-categories, search, quick filters, and partner shop cards.
5. Tapping a linked food partner opens the existing restaurant menu.
6. Tapping an unlinked partner opens a simple detail page with "Products/menu coming soon."

The bottom navigation remains unchanged. Existing pages such as Restaurants, restaurant menu, cart, checkout, ride tracking, food tracking, rider mode, and profile stay available through their current routes.

## Main Categories

Main categories are stored in `service_categories`. They are intentionally broad so the app can grow from transportation into errands and local commerce:

- Restaurants / Food
- Groceries
- Medicine / Pharmacy
- School Supplies
- Tours
- Errands
- Ride

The Home screen uses these categories as the primary marketplace entry points. If Supabase is unavailable or the table is empty, the app falls back to local sample categories so customers still see a usable interface.

## Sub-categories

Sub-categories are stored in `service_subcategories` and belong to one main category. The category page shows them as a horizontal selector. Choosing a sub-category filters the partner shop list and logs `SUBCATEGORY_SELECTED`.

If a category has no sub-categories, the UI shows:

`Sub-categories coming soon.`

## Partner Shop Directory

Partner shops are stored in `business_partners`. Each shop can belong to a category and sub-category, can show basic marketplace card information, and can optionally link to an existing restaurant record.

Partner shop cards show:

- shop image or placeholder
- shop name
- category/sub-category label
- rating
- estimated time
- distance placeholder
- delivery fee placeholder
- open/closed badge

If no shops are available for the selected category or sub-category, the UI shows:

`No partner shops available yet.`

If partner loading fails, the UI shows:

`Unable to load partners right now. Please try again.`

## Restaurant Compatibility

`business_partners.restaurant_id` is nullable. It is used only when a partner can be safely linked to an existing restaurant, such as `M Cafe`.

When `restaurant_id` is present, tapping the partner opens the existing restaurant menu route. This preserves the current restaurant menu, cart, checkout, food delivery fee, and food tracking behavior.

When `restaurant_id` is null, tapping the partner opens the Phase 8A placeholder detail page. That page shows the shop name, description, category details, and "Products/menu coming soon."

## Admin Foundation

Phase 8A adds a minimal admin foundation to the existing admin website:

- view service categories
- view sub-categories
- view partner shops
- add/edit basic partner shop details
- assign category and sub-category
- optionally link a partner shop to an existing restaurant

This is not a full partner dashboard. It prepares the data model and admin workflow for a future partner-facing website with role separation.

## Reference Video

The reference video is used only as broad UI/UX inspiration for marketplace patterns such as a search/location bar, promotional banner, category cards, horizontal sub-category selector, filter chips, partner cards, and friendly empty states.

Camotes Runner does not copy Foodpanda branding, logos, icons, colors, wording, exact layout, or assets. The UI keeps Camotes Runner green/yellow branding with a local island feel.
