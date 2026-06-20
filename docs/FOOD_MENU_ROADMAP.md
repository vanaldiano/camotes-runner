# Food Menu Module Roadmap

Phase 2 prepares Camotes Runner for restaurant discovery and food ordering without changing the current customer booking UI yet.

## Restaurant Onboarding Flow

1. Admin creates a restaurant profile with name, description, address, phone number, opening hours, and active status.
2. Admin adds menu categories such as Burger, Rice Meal, and Drinks.
3. Admin adds menu items under each category with price, description, availability, and optional image URL.
4. Admin reviews the restaurant listing before making it visible to customers.
5. Later, restaurant owners can receive their own login and manage their own menu.

## Customer Restaurant List

- Show active restaurants only.
- Display restaurant name, short description, location, open/closed status, and estimated preparation time.
- Keep the screen simple and mobile-first, similar to the existing service selection flow.
- Later filters can include open now, popular, nearby, and cuisine type.

## Restaurant Menu Screen

- Show restaurant details at the top.
- Show menu categories as simple sections or tabs.
- Show available menu items with name, description, price, and add button.
- Keep unavailable items visible but disabled, or hide them for MVP simplicity.

## Menu Categories

- Categories belong to one restaurant.
- Categories have a display order so restaurants can control menu layout.
- MVP categories for sample data:
  - Burger
  - Rice meal
  - Drinks

## Menu Items

- Menu items belong to one category and one restaurant.
- Required fields: restaurant, category, name, price, availability.
- Optional fields: description, image URL, preparation notes, display order.
- Items should support easy availability toggles from admin.

## Cart

- Cart is local app state for MVP.
- Cart contains selected menu items, quantity, item price snapshot, and customer notes.
- Cart should support quantity edits and item removal.
- Cart should only allow items from one restaurant per order for MVP.

## Checkout

- Customer enters delivery location, contact phone, payment method, and notes.
- App calculates subtotal, delivery fee, and estimated total.
- On submit, create a food order and food order items in Supabase.
- After checkout, customer moves to food order tracking.

## Food Order Status Flow

MVP food order statuses:

1. `pending` - customer submitted the order.
2. `accepted` - restaurant or admin accepted the order.
3. `preparing` - restaurant is preparing the food.
4. `picked_up` - runner picked up the order.
5. `on_the_way` - runner is on the way to the customer.
6. `delivered` - customer received the order.
7. `cancelled` - order was cancelled.

## Admin Restaurant/Menu Management

- List restaurants.
- Create and edit restaurant details.
- Toggle restaurant active status.
- List categories and menu items per restaurant.
- Create, edit, and disable menu categories.
- Create, edit, and disable menu items.
- View food orders and update order status.
- Assign a runner to food delivery later, reusing the rider assignment pattern.

## Runner Pickup/Delivery Flow

- Runner receives assigned food order details.
- Runner sees restaurant pickup address and customer delivery address.
- Runner status updates:
  - Heading to restaurant
  - Picked up
  - Heading to customer
  - Delivered
- MVP can reuse the existing rider table and assignment model.

## MVP Scope

- Database tables for restaurants, categories, items, food orders, and order items.
- Sample restaurant and menu data for M Cafe.
- MVP RLS policies for anon/authenticated testing.
- TypeScript database types for future app and admin integration.
- No customer UI connection yet.
- No full cart or checkout implementation yet.

## Later Features

- Restaurant owner dashboard.
- Menu item images and promotions.
- Restaurant opening hours and temporary closures.
- Multiple restaurant carts.
- Vouchers and free delivery promos.
- Customer favorites.
- Food order ratings.
- Reorder past meals.
- Push notifications.
- Runner live location for food delivery.
- Restaurant payout reporting.
