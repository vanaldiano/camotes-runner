# Restaurant and Menu Images Roadmap

## Phase 5A: Image Display

Phase 5A enables the customer food flow to display images that already exist in the database.

- `restaurants.image_url` stores an optional restaurant image URL.
- `menu_items.image_url` stores an optional food item image URL.
- Restaurant list cards show the restaurant image when the URL is present.
- Menu item rows show the food image when the URL is present.
- Missing or broken image URLs fall back to a safe in-app placeholder.

Phase 5C adds admin uploads through Supabase Storage while keeping URL input as a fallback.

## Current Database Support

The food menu schema includes nullable image URL columns:

- `public.restaurants.image_url text`
- `public.menu_items.image_url text`

The schema also includes `alter table ... add column if not exists` statements so existing MVP databases can adopt these columns without rebuilding the food tables.

## Storage Upload Support

1. Run `database/storage_image_upload.sql`.
2. Use the admin Food Management section to choose image files.
3. Uploaded restaurant files go to `restaurant-images`.
4. Uploaded menu item files go to `menu-images`.
5. The admin dashboard saves the returned public URL into `image_url`.
6. Consider image moderation, cleanup, and compression before Play Store release.

## Safety Notes

- Keep `image_url` nullable so restaurants and menu items can exist without images.
- Use HTTPS image URLs where possible.
- Keep placeholders in the app even after upload support exists.
- Do not block cart, checkout, rider delivery, or realtime flows if an image fails to load.
