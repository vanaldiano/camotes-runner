# Booking Tracking Status Behavior

## Terminal Statuses

Customer booking tracking treats these statuses as final:

- `completed`
- `cancelled`

When realtime or polling receives either status, the tracking screen shows the final state and stops opening a new tracking subscription or polling interval.

## Customer Actions

- Active bookings show `Keep Tracking` and `Back to Home`.
- `Keep Tracking` leaves the customer on the current tracking screen.
- `Back to Home` navigates home without clearing the active booking, so Activity can still show it with a Track button.
- `completed` shows `Book Again` and `Back to Home`.
- `Book Again` clears the current tracking context and opens the booking form.
- `cancelled` shows `Back to Home`.

Active booking statuses are:

- `pending`
- `accepted`
- `runner_arriving`
- `in_progress`

## Realtime Notes

Realtime remains active while a booking is in an active status. When an admin changes a booking to `cancelled` or `completed`, the current realtime callback applies that final status, React re-renders the tracking screen, and the previous realtime subscription and polling interval are cleaned up.

This prevents cancelled bookings from continuing to look like active tracking sessions.
