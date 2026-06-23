# Customer Delivery Tracking UI

Phase 8I polishes the customer tracking experience before the next APK build.

## Product Decision

Ride bookings keep live rider map tracking because passengers need to see the rider approaching their pickup point.

Delivery orders use a simpler tracking card by default. Delivery services include:

- Restaurant food delivery
- Grocery and mini mart orders
- Medicine and pharmacy orders
- School supplies
- Errands and document delivery
- Tour or partner shop deliveries when fulfilled through partner orders

## Customer-Friendly Delivery Tracking

Delivery tracking now focuses on:

- A clear rider/delivery icon
- Current status in plain language
- ETA or waiting state
- Last updated time
- Friendly progress steps
- A short reassurance that updates happen automatically

The default delivery UI avoids showing latitude/longitude or a live embedded map. This keeps the screen easier to understand and avoids making exact rider location the main customer experience for delivery orders.

## Optional Map Actions

Delivery screens can still expose safe external Google Maps actions, such as:

- View Delivery Location
- Open Pickup Route
- Open Delivery Route

These are secondary actions only. A future phase can add a deliberate `View Map` flow if customers need more detail.

## Safety Notes

This phase does not change order creation, rider live location publishing, admin assignment, partner checkout, food checkout, or ride tracking. Ride tracking continues to use its live map behavior.

## Manual Test Checklist

- Customer app opens
- Ride booking tracking still shows live map
- Food order tracking shows friendly rider icon, ETA, last updated time, and timeline
- Partner order tracking shows friendly rider icon, ETA, last updated time, and timeline
- Partner order status changes still update
- Rider assigned state displays correctly
- Waiting for rider location displays nicely
- On the way shows ETA
- Completed state displays correctly
- Activity screen still works
- Rider app live location still publishes
- Admin partner orders still work
