# Phase 7E.5: Rider Job Filter + Auto Live Location MVP

Phase 7E.5 improves Rider Mode before APK builds by making assigned work easier
to scan and reducing the chance that a rider forgets to share live location.

## Rider Job Filters

Rider Mode now shows ride bookings and food deliveries in one assigned jobs list
with filter chips:

- All
- Active
- Ride
- Food
- Accepted
- On the Way / In Progress
- Completed

Empty states are filter-specific:

- Active: `No active jobs yet.`
- Food: `No food deliveries assigned.`
- Ride: `No ride bookings assigned.`

Logs:

- `RIDER_JOB_FILTER_CHANGED`

## Priority Sorting

Jobs are sorted by operational urgency first, then newest updated job first when
priority is equal.

Priority order:

1. Ride `in_progress`
2. Food `on_the_way`
3. Ride `runner_arriving`
4. Ride `accepted`
5. Food `picked_up`
6. Food `preparing`
7. Food `accepted`
8. Pending or assigned jobs
9. Completed or delivered
10. Cancelled

Logs:

- `RIDER_JOB_SORT_APPLIED`
- `RIDER_JOB_PRIORITY_RESULT`

## Auto Live Location

When an eligible active target appears, Rider Mode automatically requests
foreground location permission and starts live location sharing.

Ride statuses:

- `accepted`
- `runner_arriving`
- `in_progress`

Food statuses:

- `accepted`
- `preparing`
- `picked_up`
- `on_the_way`

If permission is denied, the rider sees:

`Live location is needed while delivering. You can enable it later from Share Live Location.`

Live location stops when no eligible ride or food delivery remains, such as when
the current ride is completed/cancelled or the current food order is
delivered/cancelled.

Logs:

- `RIDER_AUTO_LOCATION_ENABLE_REQUEST`
- `RIDER_AUTO_LOCATION_ENABLED`
- `RIDER_AUTO_LOCATION_PERMISSION_DENIED`
- `RIDER_AUTO_LOCATION_SKIPPED_MANUALLY_DISABLED`
- `RIDER_AUTO_LOCATION_STOPPED_JOB_DONE`

## Manual Override

The manual Share Live Location toggle remains visible and still works.

If the rider manually turns live location off during an active job, Rider Mode
does not automatically turn it back on for that same job. If a different active
job becomes the priority target, auto live location can request permission again.

## Food Delivery Back Home

Active food delivery cards now show a `Back Home` action for:

- `accepted`
- `preparing`
- `picked_up`
- `on_the_way`

This action returns the rider focus to the dashboard state, preserves the active
delivery, does not stop live location sharing, and does not change food order
status.

Logs:

- `RIDER_FOOD_TRACKING_BACK_HOME_CLICKED`
- `RIDER_FOOD_TRACKING_RETURN_HOME`
