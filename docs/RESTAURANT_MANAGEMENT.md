# Restaurant Management

Phase 6A adds admin dashboard controls for managing restaurants and menu items without editing Supabase rows manually.

## Admin Restaurant Management

The admin dashboard Food Management section supports:

- Adding restaurants.
- Editing restaurant details.
- Enabling or disabling restaurants with the `is_active` flag.
- Deleting restaurants.
- Keeping the existing image URL input and Supabase Storage image upload workflow.

Restaurant fields managed by the dashboard:

- `name`
- `category`
- `address`
- `delivery_fee`
- `estimated_delivery_time`
- `image_url`
- `is_active`

Disabled restaurants remain in Supabase but are hidden from the customer food ordering experience because the customer app only loads active restaurants.

## Admin Menu Management

The Food Management section also supports:

- Adding menu items.
- Editing menu item details.
- Pausing or unpausing menu items with the `is_available` flag.
- Deleting menu items.
- Keeping the existing menu image URL input and Supabase Storage upload workflow.

Menu item fields managed by the dashboard:

- `restaurant_id`
- `category_id`
- `name`
- `description`
- `price`
- `image_url`
- `is_available`

Paused items remain in Supabase but are hidden from the customer menu because the customer app only displays available menu items.

## Menu Categories

Menu items still require a `category_id`. Phase 6A does not add category editing controls. When an admin creates a new restaurant, the dashboard creates a default `General` menu category so new menu items can be added immediately.

Existing restaurants should already have menu categories from `database/food_menu_schema.sql`. If a restaurant was created before Phase 6A and has no category, add one in Supabase once or recreate the restaurant from the admin dashboard.

## Database Requirements

Run the latest `database/food_menu_schema.sql` in Supabase before using these controls. The restaurant table must include:

- `category text`
- `delivery_fee numeric`
- `estimated_delivery_time text`
- `image_url text`
- `is_active boolean`

The menu item table must include:

- `category_id uuid`
- `description text`
- `price numeric`
- `image_url text`
- `is_available boolean`

## Customer App Behavior

The customer app automatically reflects admin changes through the existing restaurant service queries:

- Enabled restaurants appear in the restaurant list.
- Disabled restaurants are hidden.
- Available menu items appear in restaurant menus.
- Paused menu items are hidden.
- Updated image URLs continue to render with the safe placeholder fallback when an image is missing or invalid.

No customer screens were redesigned for this phase.

## Image Upload

Phase 6A preserves the Phase 5C image flow:

- Admins can paste an `image_url`.
- Admins can choose a file and upload it to Supabase Storage.
- Uploaded public URLs are saved back to `restaurants.image_url` or `menu_items.image_url`.

See `docs/STORAGE_IMAGE_UPLOAD.md` for bucket setup.

## Verification

After implementation, verify:

- `npx tsc --noEmit`
- `npm run lint`
- `npx expo export --platform web`
- `cd admin && npm run build`
