# Partner Distance Fee Rates

Phase 8E.5 adds category-based distance fees for generic partner shop orders. This keeps partner checkout simple while avoiding one flat fee for every shop type.

## Formula

Partner delivery fee is calculated as:

```text
delivery_fee = max(minimum_fee, base_fee + max(0, distance_km - base_km) * per_km_fee)
```

The final delivery fee is rounded to the nearest PHP 5.

## Default Profiles

The first default rate profiles are seeded by service category:

- Food / Restaurant: lower default because food delivery is usually lighter and faster.
- Grocery / Mini Mart: higher default because grocery orders can be heavier and take more handling.
- Medicine / Pharmacy: slightly higher than food because pickup can require extra care.
- School Supplies: similar to medicine, with a lower per-km rate for normal items.
- Errands / Personal Shopping: higher default and a small service fee because the rider may need to queue or handle non-product tasks.
- Heavy / Bulky: higher rate when a matching category or subcategory exists.
- Tours: marked as manual quote so pricing can be confirmed by admin or partner.

Ride fares remain on the existing ride booking logic. Tours, special trips, and van-style bookings can stay manual until a dedicated quoting flow is added.

## Fallback Behavior

If shop or delivery coordinates are missing, checkout falls back to the existing partner delivery fee label or the default profile fee. This keeps checkout unblocked when a partner shop does not yet have coordinates.

If a rate profile is marked as manual quote, checkout clearly tells the customer that the delivery fee will be confirmed by admin or the partner. The order can still be placed with a zero or fallback delivery fee depending on the active profile.

## Future Partner Overrides

The new `partner_delivery_rate_profiles` table supports partner-specific, subcategory, and category rate profiles. Priority is:

1. Partner-specific profile
2. Subcategory profile
3. Category profile
4. Local/default fallback

Admin editing can be expanded later so staff can tune each partner's base fee, per-km fee, manual quote setting, and service fee without changing app code.
