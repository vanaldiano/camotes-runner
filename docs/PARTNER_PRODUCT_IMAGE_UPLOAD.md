# Partner Product Image Upload

Phase 8H.1 improves Partner Dashboard Preview product management inside the existing admin web project. The preview still uses admin-controlled access, but the Products/Menu section now behaves closer to the future partner dashboard.

## Partner Preview Product Flow

In Partner Preview, an admin can select a partner shop and open Products/Menu. From there the preview supports:

- Adding a product for the selected partner
- Editing product name, description, price, category, sub-category, SKU, unit label, availability, and active state
- Uploading a product image
- Pasting an image URL as a fallback
- Previewing the selected image before saving
- Toggling availability
- Deactivating a product instead of deleting it

Saved active and available products continue to appear in the customer partner shop screen and can be added to the generic partner cart.

## Image Upload Behavior

The admin web app uploads product images to Supabase Storage bucket:

```text
partner-products
```

The current upload helper stores files under a partner-scoped folder:

```text
partner-products/{partner_id}/{partner_id}-{timestamp}.jpg
```

After upload, the returned public URL is saved in `partner_products.image_url`. The image URL input remains available for cases where Storage policies are not configured yet or an externally hosted image is preferred.

## Database and Storage Setup

Run:

```text
database/partner_product_image_upload.sql
```

The migration is idempotent and:

- Adds `partner_products.image_path` if missing
- Creates or updates the public `partner-products` bucket
- Allows public read of product images
- Allows authenticated upload/update for the current admin-controlled preview

## Security Notes

Real partner login is not enabled yet. The storage policies are intentionally conservative compared with earlier MVP image upload policies because uploads require an authenticated user. When partner login is finalized, harden the policies so partner users can upload only inside their own partner folder and admins can manage all folders.

## Future Work

Later phases can store `image_path` alongside `image_url`, support image replacement cleanup, add drag-and-drop uploads, and move this UI behind true partner authentication.
