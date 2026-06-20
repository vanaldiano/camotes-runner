# Admin Image Management

## Phase 5B and 5C Scope

Phase 5B added URL-based image management to the admin dashboard. Phase 5C adds direct Supabase Storage uploads while keeping URL input as a fallback.

Admins can:

- View restaurants from Supabase.
- Preview each restaurant image.
- Edit and save `restaurants.image_url`.
- Upload restaurant image files to the `restaurant-images` bucket.
- View menu items grouped by restaurant.
- Preview each menu item image.
- Edit and save `menu_items.image_url`.
- Upload menu item image files to the `menu-images` bucket.

File upload requires the Storage buckets and policies from `database/storage_image_upload.sql`.

## Data Model

The feature uses existing nullable image URL columns:

- `public.restaurants.image_url`
- `public.menu_items.image_url`

The customer app reads these values and shows safe placeholders when a URL is missing or the image fails to load.

## Admin Workflow

1. Open the admin dashboard.
2. Find the Food Management section.
3. Choose a file to upload, or paste a public image URL into a restaurant or menu item field.
4. For uploads, the dashboard uploads to Supabase Storage and saves the returned public URL.
5. For pasted URLs, press Save.
6. The dashboard updates Supabase and refreshes the image preview.

Empty fields are saved as `null`, which makes the customer app show its fallback placeholder.

## Storage Uploads

See `docs/STORAGE_IMAGE_UPLOAD.md` for bucket setup, file path format, and production hardening notes.

## Safety Notes

- Keep image management isolated from booking and food-order status tools.
- Do not require images for restaurants or menu items.
- Prefer HTTPS URLs.
- Keep placeholders in both admin and customer apps.
