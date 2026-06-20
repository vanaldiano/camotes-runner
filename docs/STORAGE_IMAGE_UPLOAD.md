# Supabase Storage Image Upload

## Phase 5C Scope

Phase 5C lets the admin dashboard upload restaurant and menu item images directly to Supabase Storage.

Admins can still paste an `image_url` manually. File upload is an added path, not a replacement.

## Buckets

Run `database/storage_image_upload.sql` in the Supabase SQL Editor to create:

- `restaurant-images`
- `menu-images`

Both buckets are public for the MVP so the customer app can render images using public URLs.

The SQL also creates MVP Storage policies for `anon` and `authenticated` users to read and upload images. Before production, replace these permissive policies with admin-only rules.

## Upload Flow

1. Admin chooses a file in the Food Management section.
2. The dashboard validates that the file is an image.
3. The file uploads to the correct Supabase Storage bucket.
4. The dashboard reads the public URL from Storage.
5. The public URL is saved to:
   - `restaurants.image_url`
   - `menu_items.image_url`
6. The admin preview refreshes.
7. The customer restaurant list and menu screens display the new image automatically.

## File Paths

Files use safe names:

- Restaurants: `restaurant-id/restaurant-id-timestamp.ext`
- Menu items: `menu-item-id/menu-item-id-timestamp.ext`

The timestamp prevents accidental overwrites while keeping images grouped by record id.

## Current Limits

- Maximum file size is 5 MB in the setup SQL.
- Allowed MIME types are JPEG, PNG, WebP, and GIF.
- Old uploaded files are not deleted when an image is replaced.
- Image moderation and compression are not implemented yet.

## Production Notes

- Move image uploads behind authenticated admin accounts.
- Consider private buckets with signed URLs if public images are not desired.
- Add image compression before upload.
- Add cleanup for unused images.
- Add dimensions guidance for consistent customer UI.
