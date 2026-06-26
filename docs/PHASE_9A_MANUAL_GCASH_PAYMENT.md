# Phase 9A: Manual GCash Payment Confirmation

## Goal

Phase 9A adds a manual online payment check before non-ride orders are prepared. Customers pay Camotes Runner first, submit a GCash reference number, and an admin confirms or rejects the payment before the order moves forward.

This phase does not add PayMongo automation and does not add automatic partner payouts.

## Payment Flow

1. The customer places a food or partner shop order.
2. The checkout requires GCash/online payment and asks for the GCash reference number.
3. The order is saved with `payment_status = 'payment_submitted'`.
4. Admin reviews the order payment in the admin dashboard.
5. Admin confirms payment when the GCash payment is verified.
6. The order changes to `payment_status = 'paid'`.
7. The partner/shop can prepare the order after payment is confirmed.
8. Admin can assign a rider after payment is confirmed.
9. After completion, Camotes Runner settles with the partner manually outside the app.

## Why Non-Ride Orders Require Payment First

Food and partner shop orders create real preparation work for restaurants, shops, and runners. Requiring payment first reduces fake orders, abandoned carts, and unpaid partner preparation.

The app keeps the customer-facing flow simple: pay by GCash, enter the reference number, and wait for admin confirmation.

## Ride COD Exception

Ride bookings may still use Cash or GCash. Rides are direct services and can safely keep the current cash-on-delivery option while manual online payment is introduced for orders that require a partner to prepare goods.

Ride COD must not be removed in Phase 9A.

## Admin Payment Confirmation

Admins review payment details on Food Orders and Partner Orders:

- order type and order reference
- customer name and phone
- total amount
- payment method
- GCash reference number
- proof image/link fields when available
- payment status
- submitted time
- admin notes

Admin actions:

- Confirm Payment: sets `payment_status = 'paid'`, stores confirmation time, and records the confirming user when available.
- Reject Payment: sets `payment_status = 'rejected'` and keeps the order from moving forward.
- Add notes: records admin payment notes for follow-up.

## Partner Preparation Lock

Partner/shop orders should only appear as ready-to-prepare after payment is confirmed.

In Phase 9A, unpaid partner orders are labeled as Pending Payment in admin surfaces. Partner preview popups should only trigger for paid partner orders. If a partner order is still `pending_payment`, `payment_submitted`, or `rejected`, the shop should not treat it as ready to prepare.

## Rider Assignment Lock

Food and partner orders must not be assigned to riders until `payment_status = 'paid'`.

Ride bookings are not affected by this lock because rides may still be cash-on-delivery.

## Storage Setup

The migration creates a Supabase Storage bucket named:

`payment-proofs`

Screenshot upload is schema-ready through:

- `payment_proof_url`
- `payment_proof_path`
- `order_payments.proof_url`
- `order_payments.proof_path`

For Phase 9A, screenshot upload is optional. The customer app supports reference-number confirmation first because it is safer for emulator testing and does not require extra native file-picker work.

## Future PayMongo Automation

PayMongo should replace manual reference checking in a later phase. Expected future work:

- create PayMongo payment intents or checkout sessions
- receive webhook events
- automatically mark orders paid after verified settlement
- preserve manual override for admin support
- keep payment references and provider IDs in a ledger table

## Future Partner Payouts

Partner payout automation is not part of Phase 9A.

Future payout work should add a settlement ledger that tracks:

- partner gross order amount
- Camotes Runner commission/service fee
- delivery fee handling
- manual payout status
- payout date
- payout reference
- admin notes

Until then, admin pays partner shops/restaurants manually after order completion.
