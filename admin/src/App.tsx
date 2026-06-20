import { useCallback, useEffect, useMemo, useState } from 'react';

import { hasSupabaseConfig } from './lib/supabase';
import {
  getAdminAuthState,
  signInAdmin,
  signOutAdmin,
  subscribeToAdminAuthChanges,
  type AdminAuthState,
} from './services/auth';
import { subscribeToAdminBookings, subscribeToAdminFoodOrders } from './services/realtime';
import {
  assignRiderToBooking,
  assignRiderToFoodOrder,
  bookingStatuses,
  createMenuItem,
  createRestaurant,
  deleteMenuItem,
  deleteRestaurant,
  foodOrderStatuses,
  getAllBookings,
  getAllFoodOrders,
  getFoodOrderItems,
  getMenuCategories,
  getMenuItems,
  getRestaurants,
  getRiders,
  updateBookingStatus,
  updateFoodOrderStatus,
  updateMenuItem,
  updateMenuItemAvailability,
  updateMenuItemImageUrl,
  updateRestaurant,
  updateRestaurantImageUrl,
  updateRestaurantOpenStatus,
  uploadMenuItemImageFile,
  uploadRestaurantImageFile,
  type AdminBooking,
  type AdminFoodOrder,
  type AdminFoodOrderItem,
  type AdminMenuCategory,
  type AdminMenuItem,
  type AdminRestaurant,
  type AdminRider,
  type MenuItemInput,
  type RestaurantInput,
} from './services/bookings';

import type { BookingStatus, FoodOrderStatus } from '../../src/types/database';

const statusLabels: Record<BookingStatus, string> = {
  accepted: 'Accepted',
  cancelled: 'Cancelled',
  completed: 'Completed',
  in_progress: 'In Progress',
  pending: 'Pending',
  runner_arriving: 'Runner Arriving',
};

const foodStatusLabels: Record<FoodOrderStatus, string> = {
  accepted: 'Accepted',
  cancelled: 'Cancelled',
  delivered: 'Delivered',
  on_the_way: 'On the Way',
  pending: 'Pending',
  picked_up: 'Picked Up',
  preparing: 'Preparing',
};

type StatusFilter = 'all' | BookingStatus;
type LoadOptions = {
  showLoading?: boolean;
};
type RestaurantFormState = {
  address: string;
  category: string;
  deliveryFee: string;
  estimatedDeliveryTime: string;
  imageUrl: string;
  isOpen: boolean;
  latitude: string;
  longitude: string;
  name: string;
};
type MenuItemFormState = {
  available: boolean;
  categoryId: string;
  description: string;
  imageUrl: string;
  name: string;
  price: string;
  restaurantId: string;
};

const emptyRestaurantForm: RestaurantFormState = {
  address: '',
  category: 'Food',
  deliveryFee: '50',
  estimatedDeliveryTime: '35-45 min',
  imageUrl: '',
  isOpen: true,
  latitude: '',
  longitude: '',
  name: '',
};

const emptyMenuItemForm: MenuItemFormState = {
  available: true,
  categoryId: '',
  description: '',
  imageUrl: '',
  name: '',
  price: '',
  restaurantId: '',
};

export function App() {
  const [adminAuthState, setAdminAuthState] = useState<AdminAuthState>({
    isAdmin: false,
    profile: null,
    session: null,
    user: null,
  });
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [foodOrders, setFoodOrders] = useState<AdminFoodOrder[]>([]);
  const [foodOrderItems, setFoodOrderItems] = useState<AdminFoodOrderItem[]>([]);
  const [restaurants, setRestaurants] = useState<AdminRestaurant[]>([]);
  const [menuCategories, setMenuCategories] = useState<AdminMenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<AdminMenuItem[]>([]);
  const [riders, setRiders] = useState<AdminRider[]>([]);
  const [restaurantForm, setRestaurantForm] = useState<RestaurantFormState>(emptyRestaurantForm);
  const [menuItemForm, setMenuItemForm] = useState<MenuItemFormState>(emptyMenuItemForm);
  const [editingRestaurantId, setEditingRestaurantId] = useState('');
  const [editingMenuItemId, setEditingMenuItemId] = useState('');
  const [restaurantImageInputs, setRestaurantImageInputs] = useState<Record<string, string>>({});
  const [menuItemImageInputs, setMenuItemImageInputs] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isFoodLoading, setIsFoodLoading] = useState(true);
  const [isFoodManagementLoading, setIsFoodManagementLoading] = useState(true);
  const [updatingBookingId, setUpdatingBookingId] = useState('');
  const [updatingFoodOrderId, setUpdatingFoodOrderId] = useState('');
  const [savingRestaurantId, setSavingRestaurantId] = useState('');
  const [savingMenuItemId, setSavingMenuItemId] = useState('');
  const [savingRestaurantImageId, setSavingRestaurantImageId] = useState('');
  const [savingMenuItemImageId, setSavingMenuItemImageId] = useState('');
  const [uploadingRestaurantImageId, setUploadingRestaurantImageId] = useState('');
  const [uploadingMenuItemImageId, setUploadingMenuItemImageId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [foodErrorMessage, setFoodErrorMessage] = useState('');
  const [foodManagementMessage, setFoodManagementMessage] = useState('');
  const [foodManagementErrorMessage, setFoodManagementErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isAdminAuthLoading, setIsAdminAuthLoading] = useState(true);
  const [isAdminAuthSubmitting, setIsAdminAuthSubmitting] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminAuthMessage, setAdminAuthMessage] = useState('');

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setAdminAuthMessage('Supabase is not configured. Admin login is unavailable.');
      setIsAdminAuthLoading(false);
      return undefined;
    }

    void getAdminAuthState()
      .then(setAdminAuthState)
      .catch((error) => {
        setAdminAuthMessage(getErrorMessage(error));
      })
      .finally(() => {
        setIsAdminAuthLoading(false);
      });

    return subscribeToAdminAuthChanges(setAdminAuthState);
  }, []);

  async function handleAdminLogin() {
    setIsAdminAuthSubmitting(true);
    setAdminAuthMessage('');

    try {
      const nextAuthState = await signInAdmin(adminEmail, adminPassword);
      setAdminAuthState(nextAuthState);
      setAdminPassword('');
      setAdminAuthMessage(
        nextAuthState.isAdmin
          ? 'Signed in as admin.'
          : 'This account is signed in, but it does not have the admin role.'
      );
    } catch (error) {
      setAdminAuthMessage(getErrorMessage(error));
    } finally {
      setIsAdminAuthSubmitting(false);
    }
  }

  async function handleAdminSignOut() {
    setIsAdminAuthSubmitting(true);
    setAdminAuthMessage('');

    try {
      await signOutAdmin();
      setAdminAuthState({ isAdmin: false, profile: null, session: null, user: null });
      setAdminAuthMessage('Signed out.');
    } catch (error) {
      setAdminAuthMessage(getErrorMessage(error));
    } finally {
      setIsAdminAuthSubmitting(false);
    }
  }

  const loadBookings = useCallback(async ({ showLoading = true }: LoadOptions = {}) => {
    if (showLoading) {
      setIsLoading(true);
    }

    try {
      const rows = await getAllBookings();
      setBookings(rows);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, []);

  const loadRiders = useCallback(async () => {
    try {
      const rows = await getRiders();
      setRiders(rows);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }, []);

  const loadFoodOrders = useCallback(async ({ showLoading = true }: LoadOptions = {}) => {
    if (showLoading) {
      setIsFoodLoading(true);
    }
    setFoodErrorMessage('');

    try {
      const orderRows = await getAllFoodOrders();
      const [itemRows, restaurantRows] = await Promise.all([
        getFoodOrderItems(orderRows.map((order) => order.id)),
        getRestaurants(),
      ]);

      setFoodOrders(orderRows);
      setFoodOrderItems(itemRows);
      setRestaurants(restaurantRows);
    } catch (error) {
      setFoodErrorMessage(`Unable to load food orders. ${getErrorMessage(error)}`);
    } finally {
      if (showLoading) {
        setIsFoodLoading(false);
      }
    }
  }, []);

  const loadFoodManagement = useCallback(async ({ showLoading = true }: LoadOptions = {}) => {
    if (showLoading) {
      setIsFoodManagementLoading(true);
    }
    setFoodManagementErrorMessage('');

    try {
      const [restaurantRows, categoryRows, menuItemRows] = await Promise.all([
        getRestaurants(),
        getMenuCategories(),
        getMenuItems(),
      ]);
      setRestaurants(restaurantRows);
      setMenuCategories(categoryRows);
      setMenuItems(menuItemRows);
      setRestaurantImageInputs(getImageInputMap(restaurantRows));
      setMenuItemImageInputs(getImageInputMap(menuItemRows));
    } catch (error) {
      setFoodManagementErrorMessage(`Unable to load food management data. ${getErrorMessage(error)}`);
    } finally {
      if (showLoading) {
        setIsFoodManagementLoading(false);
      }
    }
  }, []);

  const refreshDashboard = useCallback(async () => {
    setIsLoading(true);
    setIsFoodLoading(true);
    setIsFoodManagementLoading(true);
    setErrorMessage('');
    setFoodErrorMessage('');
    setFoodManagementErrorMessage('');

    try {
      const [bookingRows, riderRows] = await Promise.all([getAllBookings(), getRiders()]);
      setBookings(bookingRows);
      setRiders(riderRows);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }

    try {
      const orderRows = await getAllFoodOrders();
      const [itemRows, restaurantRows] = await Promise.all([
        getFoodOrderItems(orderRows.map((order) => order.id)),
        getRestaurants(),
      ]);

      setFoodOrders(orderRows);
      setFoodOrderItems(itemRows);
      setRestaurants(restaurantRows);
    } catch (error) {
      setFoodErrorMessage(`Unable to load food orders. ${getErrorMessage(error)}`);
    } finally {
      setIsFoodLoading(false);
    }

    try {
      const [restaurantRows, categoryRows, menuItemRows] = await Promise.all([
        getRestaurants(),
        getMenuCategories(),
        getMenuItems(),
      ]);
      setRestaurants(restaurantRows);
      setMenuCategories(categoryRows);
      setMenuItems(menuItemRows);
      setRestaurantImageInputs(getImageInputMap(restaurantRows));
      setMenuItemImageInputs(getImageInputMap(menuItemRows));
    } catch (error) {
      setFoodManagementErrorMessage(`Unable to load food management data. ${getErrorMessage(error)}`);
    } finally {
      setIsFoodManagementLoading(false);
    }
  }, []);

  async function handleStatusChange(bookingId: string, status: BookingStatus) {
    setUpdatingBookingId(bookingId);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await updateBookingStatus(bookingId, status);
      setSuccessMessage(`Booking status updated to ${statusLabels[status]}.`);
      await loadBookings();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setUpdatingBookingId('');
    }
  }

  async function handleRiderAssignment(bookingId: string, riderId: string) {
    setUpdatingBookingId(bookingId);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await assignRiderToBooking(bookingId, riderId || null);
      const riderName = getRiderName(riderId || null, riders);
      setSuccessMessage(
        riderId ? `Assigned ${riderName} to booking.` : 'Rider assignment cleared.'
      );
      await loadBookings();
      await loadRiders();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setUpdatingBookingId('');
    }
  }

  async function handleFoodStatusChange(foodOrderId: string, status: FoodOrderStatus) {
    const previousFoodOrders = foodOrders;
    const now = new Date().toISOString();

    setUpdatingFoodOrderId(foodOrderId);
    setFoodErrorMessage('');
    setSuccessMessage('');
    setFoodOrders((currentFoodOrders) =>
      currentFoodOrders.map((foodOrder) =>
        foodOrder.id === foodOrderId ? { ...foodOrder, status, updated_at: now } : foodOrder
      )
    );

    try {
      const updatedFoodOrder = await updateFoodOrderStatus(foodOrderId, status);
      setFoodOrders((currentFoodOrders) =>
        currentFoodOrders.map((foodOrder) =>
          foodOrder.id === foodOrderId ? updatedFoodOrder : foodOrder
        )
      );
      setSuccessMessage(`Food order status updated to ${foodStatusLabels[status]}.`);
    } catch (error) {
      console.error('Failed to update food order status', {
        error,
        foodOrderId,
        status,
      });
      setFoodOrders(previousFoodOrders);
      setFoodErrorMessage(`Unable to update food order status. ${getErrorMessage(error)}`);
    } finally {
      setUpdatingFoodOrderId('');
    }
  }

  async function handleFoodRiderAssignment(foodOrderId: string, riderId: string) {
    setUpdatingFoodOrderId(foodOrderId);
    setFoodErrorMessage('');
    setSuccessMessage('');

    try {
      await assignRiderToFoodOrder(foodOrderId, riderId || null);
      const riderName = getRiderName(riderId || null, riders);
      setSuccessMessage(
        riderId ? `Assigned ${riderName} to food order.` : 'Food order rider assignment cleared.'
      );
      await loadFoodOrders();
      await loadRiders();
    } catch (error) {
      setFoodErrorMessage(`Unable to assign rider to food order. ${getErrorMessage(error)}`);
    } finally {
      setUpdatingFoodOrderId('');
    }
  }

  async function handleRestaurantImageSave(restaurantId: string) {
    setSavingRestaurantImageId(restaurantId);
    setFoodManagementMessage('');
    setFoodManagementErrorMessage('');

    try {
      await updateRestaurantImageUrl(
        restaurantId,
        normalizeOptionalUrl(restaurantImageInputs[restaurantId])
      );
      setFoodManagementMessage('Restaurant image URL saved.');
      await loadFoodManagement({ showLoading: false });
    } catch (error) {
      setFoodManagementErrorMessage(`Unable to save restaurant image. ${getErrorMessage(error)}`);
    } finally {
      setSavingRestaurantImageId('');
    }
  }

  async function handleRestaurantSave() {
    setSavingRestaurantId(editingRestaurantId || 'new');
    setFoodManagementMessage('');
    setFoodManagementErrorMessage('');

    try {
      const input = getRestaurantInput(restaurantForm);

      if (editingRestaurantId) {
        await updateRestaurant(editingRestaurantId, input);
        setFoodManagementMessage('Restaurant updated.');
      } else {
        await createRestaurant(input);
        setFoodManagementMessage('Restaurant added.');
      }

      setRestaurantForm(emptyRestaurantForm);
      setEditingRestaurantId('');
      await loadFoodManagement({ showLoading: false });
    } catch (error) {
      setFoodManagementErrorMessage(`Unable to save restaurant. ${getErrorMessage(error)}`);
    } finally {
      setSavingRestaurantId('');
    }
  }

  async function handleRestaurantToggle(restaurant: AdminRestaurant) {
    setSavingRestaurantId(restaurant.id);
    setFoodManagementMessage('');
    setFoodManagementErrorMessage('');

    try {
      await updateRestaurantOpenStatus(restaurant.id, !restaurant.is_active);
      setFoodManagementMessage(
        restaurant.is_active ? 'Restaurant disabled.' : 'Restaurant enabled.'
      );
      await loadFoodManagement({ showLoading: false });
    } catch (error) {
      setFoodManagementErrorMessage(`Unable to update restaurant. ${getErrorMessage(error)}`);
    } finally {
      setSavingRestaurantId('');
    }
  }

  async function handleRestaurantDelete(restaurant: AdminRestaurant) {
    if (!window.confirm(`Delete ${restaurant.name}? This also removes its menu categories and items.`)) {
      return;
    }

    setSavingRestaurantId(restaurant.id);
    setFoodManagementMessage('');
    setFoodManagementErrorMessage('');

    try {
      await deleteRestaurant(restaurant.id);
      setFoodManagementMessage('Restaurant deleted.');
      if (editingRestaurantId === restaurant.id) {
        setRestaurantForm(emptyRestaurantForm);
        setEditingRestaurantId('');
      }
      await loadFoodManagement({ showLoading: false });
    } catch (error) {
      setFoodManagementErrorMessage(`Unable to delete restaurant. ${getErrorMessage(error)}`);
    } finally {
      setSavingRestaurantId('');
    }
  }

  async function handleRestaurantImageUpload(restaurantId: string, file: File) {
    setUploadingRestaurantImageId(restaurantId);
    setFoodManagementMessage('');
    setFoodManagementErrorMessage('');

    try {
      const publicUrl = await uploadRestaurantImageFile(restaurantId, file);
      await updateRestaurantImageUrl(restaurantId, publicUrl);
      setFoodManagementMessage('Restaurant image uploaded and saved.');
      await loadFoodManagement({ showLoading: false });
    } catch (error) {
      setFoodManagementErrorMessage(`Unable to upload restaurant image. ${getErrorMessage(error)}`);
    } finally {
      setUploadingRestaurantImageId('');
    }
  }

  async function handleMenuItemImageSave(menuItemId: string) {
    setSavingMenuItemImageId(menuItemId);
    setFoodManagementMessage('');
    setFoodManagementErrorMessage('');

    try {
      await updateMenuItemImageUrl(
        menuItemId,
        normalizeOptionalUrl(menuItemImageInputs[menuItemId])
      );
      setFoodManagementMessage('Menu item image URL saved.');
      await loadFoodManagement({ showLoading: false });
    } catch (error) {
      setFoodManagementErrorMessage(`Unable to save menu item image. ${getErrorMessage(error)}`);
    } finally {
      setSavingMenuItemImageId('');
    }
  }

  async function handleMenuItemSave() {
    setSavingMenuItemId(editingMenuItemId || 'new');
    setFoodManagementMessage('');
    setFoodManagementErrorMessage('');

    try {
      const input = getMenuItemInput(menuItemForm);

      if (editingMenuItemId) {
        await updateMenuItem(editingMenuItemId, input);
        setFoodManagementMessage('Menu item updated.');
      } else {
        await createMenuItem(input);
        setFoodManagementMessage('Menu item added.');
      }

      setMenuItemForm(emptyMenuItemForm);
      setEditingMenuItemId('');
      await loadFoodManagement({ showLoading: false });
    } catch (error) {
      setFoodManagementErrorMessage(`Unable to save menu item. ${getErrorMessage(error)}`);
    } finally {
      setSavingMenuItemId('');
    }
  }

  async function handleMenuItemToggle(item: AdminMenuItem) {
    setSavingMenuItemId(item.id);
    setFoodManagementMessage('');
    setFoodManagementErrorMessage('');

    try {
      await updateMenuItemAvailability(item.id, !item.is_available);
      setFoodManagementMessage(item.is_available ? 'Menu item paused.' : 'Menu item unpaused.');
      await loadFoodManagement({ showLoading: false });
    } catch (error) {
      setFoodManagementErrorMessage(`Unable to update menu item. ${getErrorMessage(error)}`);
    } finally {
      setSavingMenuItemId('');
    }
  }

  async function handleMenuItemDelete(item: AdminMenuItem) {
    if (!window.confirm(`Delete ${item.name}?`)) {
      return;
    }

    setSavingMenuItemId(item.id);
    setFoodManagementMessage('');
    setFoodManagementErrorMessage('');

    try {
      await deleteMenuItem(item.id);
      setFoodManagementMessage('Menu item deleted.');
      if (editingMenuItemId === item.id) {
        setMenuItemForm(emptyMenuItemForm);
        setEditingMenuItemId('');
      }
      await loadFoodManagement({ showLoading: false });
    } catch (error) {
      setFoodManagementErrorMessage(`Unable to delete menu item. ${getErrorMessage(error)}`);
    } finally {
      setSavingMenuItemId('');
    }
  }

  async function handleMenuItemImageUpload(menuItemId: string, file: File) {
    setUploadingMenuItemImageId(menuItemId);
    setFoodManagementMessage('');
    setFoodManagementErrorMessage('');

    try {
      const publicUrl = await uploadMenuItemImageFile(menuItemId, file);
      await updateMenuItemImageUrl(menuItemId, publicUrl);
      setFoodManagementMessage('Menu item image uploaded and saved.');
      await loadFoodManagement({ showLoading: false });
    } catch (error) {
      setFoodManagementErrorMessage(`Unable to upload menu item image. ${getErrorMessage(error)}`);
    } finally {
      setUploadingMenuItemImageId('');
    }
  }

  useEffect(() => {
    if (!adminAuthState.isAdmin) {
      return;
    }

    refreshDashboard();
  }, [adminAuthState.isAdmin, refreshDashboard]);

  useEffect(() => {
    if (!hasSupabaseConfig || !adminAuthState.isAdmin) {
      return;
    }

    function refreshBookingsFromRealtime() {
      void loadBookings({ showLoading: false });
      void loadRiders();
    }

    function refreshFoodOrdersFromRealtime() {
      void loadFoodOrders({ showLoading: false });
    }

    const unsubscribeBookings = subscribeToAdminBookings(refreshBookingsFromRealtime, () => {
      setErrorMessage(
        'Realtime booking updates are temporarily unavailable. The dashboard will keep polling.'
      );
    });
    const unsubscribeFoodOrders = subscribeToAdminFoodOrders(refreshFoodOrdersFromRealtime, () => {
      setFoodErrorMessage(
        'Realtime food order updates are temporarily unavailable. The dashboard will keep polling.'
      );
    });
    const bookingsPolling = setInterval(refreshBookingsFromRealtime, 5000);
    const foodOrdersPolling = setInterval(refreshFoodOrdersFromRealtime, 5000);

    return () => {
      unsubscribeBookings();
      unsubscribeFoodOrders();
      clearInterval(bookingsPolling);
      clearInterval(foodOrdersPolling);
    };
  }, [adminAuthState.isAdmin, loadBookings, loadFoodOrders, loadRiders]);

  const filteredBookings = useMemo(() => {
    if (filter === 'all') {
      return bookings;
    }

    return bookings.filter((booking) => booking.status === filter);
  }, [bookings, filter]);

  const completedIncome = useMemo(
    () =>
      bookings
        .filter((booking) => booking.status === 'completed')
        .reduce(
          (total, booking) =>
            total + Number(booking.final_fare ?? booking.fare_estimate ?? booking.estimated_fare ?? 0),
          0
        ),
    [bookings]
  );

  const deliveredFoodIncome = useMemo(
    () =>
      foodOrders
        .filter((order) => order.status === 'delivered')
        .reduce((total, order) => total + Number(order.total_amount ?? 0), 0),
    [foodOrders]
  );
  const menuFormCategories = menuCategories.filter(
    (category) => category.restaurant_id === menuItemForm.restaurantId
  );
  const isRestaurantSaving = savingRestaurantId === (editingRestaurantId || 'new');
  const isMenuItemSaving = savingMenuItemId === (editingMenuItemId || 'new');

  if (isAdminAuthLoading) {
    return (
      <AdminLoginShell
        adminAuthMessage="Checking admin session..."
        adminEmail={adminEmail}
        adminPassword={adminPassword}
        isSubmitting
        onAdminEmailChange={setAdminEmail}
        onAdminPasswordChange={setAdminPassword}
        onLogin={handleAdminLogin}
      />
    );
  }

  if (!adminAuthState.isAdmin) {
    return (
      <AdminLoginShell
        adminAuthMessage={adminAuthMessage}
        adminEmail={adminEmail}
        adminPassword={adminPassword}
        isSignedIn={Boolean(adminAuthState.user)}
        isSubmitting={isAdminAuthSubmitting}
        onAdminEmailChange={setAdminEmail}
        onAdminPasswordChange={setAdminPassword}
        onLogin={handleAdminLogin}
        onSignOut={handleAdminSignOut}
      />
    );
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Camotes Runner Admin</p>
          <h1>Operations Dashboard</h1>
          <p className="hero-copy">
            Monitor bookings, update statuses, and track completed income for the island service.
          </p>
        </div>

        <button className="refresh-button" type="button" onClick={refreshDashboard}>
          Refresh
        </button>
      </section>

      <section className="admin-session-bar">
        <span>
          Signed in as {adminAuthState.profile?.full_name ?? adminAuthState.user?.email ?? 'Admin'}
        </span>
        <button type="button" onClick={handleAdminSignOut}>
          Sign Out
        </button>
      </section>

      <section className="stats-grid">
        <StatCard label="Total Bookings" value={String(bookings.length)} />
        <StatCard label="Completed Income" value={formatCurrency(completedIncome)} />
        <StatCard label="Total Food Orders" value={String(foodOrders.length)} />
        <StatCard label="Food Income" value={formatCurrency(deliveredFoodIncome)} />
        <StatCard label="Supabase" value={hasSupabaseConfig ? 'Connected' : 'Missing Env'} />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Bookings</p>
            <h2>All customer requests</h2>
          </div>

          <label className="filter-control">
            <span>Status</span>
            <select value={filter} onChange={(event) => setFilter(event.target.value as StatusFilter)}>
              <option value="all">All statuses</option>
              {bookingStatuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {errorMessage ? <p className="error-message">{errorMessage}</p> : null}
        {successMessage ? <p className="success-message">{successMessage}</p> : null}

        {isLoading ? (
          <p className="empty-state">Loading bookings...</p>
        ) : filteredBookings.length === 0 ? (
          <p className="empty-state">No bookings found for this filter.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Pickup</th>
                  <th>Destination</th>
                  <th>Distance</th>
                  <th>Fare</th>
                  <th>Payment</th>
                  <th>Rider</th>
                  <th>Rider Location</th>
                  <th>Route ETA</th>
                  <th>Assign Rider</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => (
                  <tr key={booking.id}>
                    <td>{booking.service_type}</td>
                    <td>
                      <AddressWithCoordinates
                        coordinates={formatCoordinates(booking.pickup_lat, booking.pickup_lng)}
                        label={booking.pickup_location}
                      />
                    </td>
                    <td>
                      <AddressWithCoordinates
                        coordinates={formatCoordinates(
                          booking.destination_lat,
                          booking.destination_lng
                        )}
                        label={booking.destination}
                      />
                    </td>
                    <td>{formatOptionalDistance(booking.distance_km)}</td>
                    <td>
                      {formatCurrency(
                        Number(booking.final_fare ?? booking.fare_estimate ?? booking.estimated_fare ?? 0)
                      )}
                    </td>
                    <td>{booking.payment_method}</td>
                    <td>{getRiderName(booking.assigned_rider_id, riders)}</td>
                    <td>{formatOptionalDate(booking.latest_rider_location_updated_at)}</td>
                    <td>{booking.latest_rider_location_eta ?? 'No ETA'}</td>
                    <td>
                      <select
                        className="rider-select"
                        disabled={updatingBookingId === booking.id}
                        value={booking.assigned_rider_id ?? ''}
                        onChange={(event) => handleRiderAssignment(booking.id, event.target.value)}>
                        <option value="">Unassigned</option>
                        {riders.map((rider) => (
                          <option key={rider.id} value={rider.id}>
                            {rider.full_name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className="status-select"
                        disabled={updatingBookingId === booking.id}
                        value={booking.status}
                        onChange={(event) =>
                          handleStatusChange(booking.id, event.target.value as BookingStatus)
                        }>
                        {bookingStatuses.map((status) => (
                          <option key={status} value={status}>
                            {statusLabels[status]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{formatDate(booking.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Food Orders</p>
            <h2>Restaurant deliveries</h2>
          </div>
        </div>

        {foodErrorMessage ? <p className="error-message">{foodErrorMessage}</p> : null}

        {isFoodLoading ? (
          <p className="empty-state">Loading food orders...</p>
        ) : foodOrders.length === 0 ? (
          <p className="empty-state">No food orders found yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Restaurant</th>
                  <th>Items</th>
                  <th>Delivery Address</th>
                  <th>Subtotal</th>
                  <th>Distance</th>
                  <th>Delivery Fee</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Rider</th>
                  <th>Rider Location</th>
                  <th>Assign Rider</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {foodOrders.map((foodOrder) => (
                  <tr key={foodOrder.id}>
                    <td>{foodOrder.customer_name || 'Customer'}</td>
                    <td>{foodOrder.customer_phone || 'No phone'}</td>
                    <td>{getRestaurantName(foodOrder.restaurant_id, restaurants)}</td>
                    <td>{getFoodOrderItemCount(foodOrder.id, foodOrderItems)}</td>
                    <td>
                      <AddressWithCoordinates
                        coordinates={formatCoordinates(foodOrder.delivery_lat, foodOrder.delivery_lng)}
                        label={foodOrder.delivery_location}
                      />
                    </td>
                    <td>{formatCurrency(Number(foodOrder.order_subtotal ?? foodOrder.subtotal ?? 0))}</td>
                    <td>{formatOptionalDistance(foodOrder.delivery_distance_km)}</td>
                    <td>{formatCurrency(Number(foodOrder.delivery_fee ?? 0))}</td>
                    <td>{formatCurrency(Number(foodOrder.order_total ?? foodOrder.total_amount ?? 0))}</td>
                    <td>{foodOrder.payment_method}</td>
                    <td>{getRiderName(foodOrder.assigned_rider_id, riders)}</td>
                    <td>{formatOptionalDate(foodOrder.latest_rider_location_updated_at)}</td>
                    <td>
                      <select
                        className="rider-select"
                        disabled={updatingFoodOrderId === foodOrder.id}
                        value={foodOrder.assigned_rider_id ?? ''}
                        onChange={(event) =>
                          handleFoodRiderAssignment(foodOrder.id, event.target.value)
                        }>
                        <option value="">Unassigned</option>
                        {riders.map((rider) => (
                          <option key={rider.id} value={rider.id}>
                            {rider.full_name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className="food-status-select"
                        disabled={updatingFoodOrderId === foodOrder.id}
                        value={foodOrder.status}
                        onChange={(event) =>
                          handleFoodStatusChange(foodOrder.id, event.target.value as FoodOrderStatus)
                        }>
                        {foodOrderStatuses.includes(foodOrder.status) ? null : (
                          <option value={foodOrder.status}>{foodStatusLabels[foodOrder.status]}</option>
                        )}
                        {foodOrderStatuses.map((status) => (
                          <option key={status} value={status}>
                            {foodStatusLabels[status]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{formatDate(foodOrder.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Food Management</p>
            <h2>Restaurants and menus</h2>
          </div>
        </div>

        {foodManagementErrorMessage ? (
          <p className="error-message">{foodManagementErrorMessage}</p>
        ) : null}
        {foodManagementMessage ? <p className="success-message">{foodManagementMessage}</p> : null}

        {isFoodManagementLoading ? (
          <p className="empty-state">Loading food management...</p>
        ) : (
          <div className="food-management">
            <div className="food-management-section">
              <div className="section-title-row">
                <h3>{editingRestaurantId ? 'Edit restaurant' : 'Add restaurant'}</h3>
                {editingRestaurantId ? (
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => {
                      setEditingRestaurantId('');
                      setRestaurantForm(emptyRestaurantForm);
                    }}>
                    Cancel edit
                  </button>
                ) : null}
              </div>

              <form
                className="management-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleRestaurantSave();
                }}>
                <div className="form-grid">
                  <label className="form-field">
                    <span>Name</span>
                    <input
                      required
                      type="text"
                      value={restaurantForm.name}
                      onChange={(event) =>
                        setRestaurantForm((current) => ({ ...current, name: event.target.value }))
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Category</span>
                    <input
                      required
                      type="text"
                      value={restaurantForm.category}
                      onChange={(event) =>
                        setRestaurantForm((current) => ({
                          ...current,
                          category: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Address</span>
                    <input
                      required
                      type="text"
                      value={restaurantForm.address}
                      onChange={(event) =>
                        setRestaurantForm((current) => ({
                          ...current,
                          address: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Latitude</span>
                    <input
                      placeholder="10.6460"
                      step="0.000001"
                      type="number"
                      value={restaurantForm.latitude}
                      onChange={(event) =>
                        setRestaurantForm((current) => ({
                          ...current,
                          latitude: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Longitude</span>
                    <input
                      placeholder="124.3510"
                      step="0.000001"
                      type="number"
                      value={restaurantForm.longitude}
                      onChange={(event) =>
                        setRestaurantForm((current) => ({
                          ...current,
                          longitude: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Delivery fee</span>
                    <input
                      min="0"
                      required
                      step="1"
                      type="number"
                      value={restaurantForm.deliveryFee}
                      onChange={(event) =>
                        setRestaurantForm((current) => ({
                          ...current,
                          deliveryFee: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Estimated delivery time</span>
                    <input
                      required
                      type="text"
                      value={restaurantForm.estimatedDeliveryTime}
                      onChange={(event) =>
                        setRestaurantForm((current) => ({
                          ...current,
                          estimatedDeliveryTime: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Image URL</span>
                    <input
                      placeholder="https://example.com/image.jpg"
                      type="url"
                      value={restaurantForm.imageUrl}
                      onChange={(event) =>
                        setRestaurantForm((current) => ({
                          ...current,
                          imageUrl: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
                <label className="checkbox-field">
                  <input
                    checked={restaurantForm.isOpen}
                    type="checkbox"
                    onChange={(event) =>
                      setRestaurantForm((current) => ({
                        ...current,
                        isOpen: event.target.checked,
                      }))
                    }
                  />
                  <span>Restaurant is open</span>
                </label>
                <button
                  className="primary-action-button"
                  disabled={isRestaurantSaving}
                  type="submit">
                  {isRestaurantSaving
                    ? 'Saving...'
                    : editingRestaurantId
                      ? 'Update restaurant'
                      : 'Add restaurant'}
                </button>
              </form>

              {restaurants.length === 0 ? (
                <p className="empty-state">No restaurants found yet.</p>
              ) : (
                <div className="entity-list">
                  {restaurants.map((restaurant) => (
                    <article className="entity-card" key={restaurant.id}>
                      <div className="entity-card-header">
                        <div>
                          <h4>{restaurant.name}</h4>
                          <p className="entity-meta">
                            {restaurant.category} · {restaurant.address} ·{' '}
                            {formatCurrency(Number(restaurant.delivery_fee ?? 0))} delivery ·{' '}
                            {restaurant.estimated_delivery_time}
                          </p>
                          <span className={restaurant.is_active ? 'status-pill active' : 'status-pill'}>
                            {restaurant.is_active ? 'Open' : 'Disabled'}
                          </span>
                        </div>
                        <div className="action-row">
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={() => {
                              setEditingRestaurantId(restaurant.id);
                              setRestaurantForm(getRestaurantForm(restaurant));
                            }}>
                            Edit
                          </button>
                          <button
                            className="secondary-button"
                            disabled={savingRestaurantId === restaurant.id}
                            type="button"
                            onClick={() => handleRestaurantToggle(restaurant)}>
                            {restaurant.is_active ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            className="danger-button"
                            disabled={savingRestaurantId === restaurant.id}
                            type="button"
                            onClick={() => handleRestaurantDelete(restaurant)}>
                            Delete
                          </button>
                        </div>
                      </div>
                      <ImageEditorRow
                        imageUrl={restaurant.image_url}
                        inputValue={restaurantImageInputs[restaurant.id] ?? ''}
                        isSaving={savingRestaurantImageId === restaurant.id}
                        isUploading={uploadingRestaurantImageId === restaurant.id}
                        label={`${restaurant.name} image`}
                        onInputChange={(value) =>
                          setRestaurantImageInputs((current) => ({
                            ...current,
                            [restaurant.id]: value,
                          }))
                        }
                        onSave={() => handleRestaurantImageSave(restaurant.id)}
                        onUpload={(file) => handleRestaurantImageUpload(restaurant.id, file)}
                      />
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="food-management-section">
              <div className="section-title-row">
                <h3>{editingMenuItemId ? 'Edit menu item' : 'Add menu item'}</h3>
                {editingMenuItemId ? (
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => {
                      setEditingMenuItemId('');
                      setMenuItemForm(emptyMenuItemForm);
                    }}>
                    Cancel edit
                  </button>
                ) : null}
              </div>

              <form
                className="management-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleMenuItemSave();
                }}>
                <div className="form-grid">
                  <label className="form-field">
                    <span>Restaurant</span>
                    <select
                      required
                      value={menuItemForm.restaurantId}
                      onChange={(event) => {
                        const restaurantId = event.target.value;
                        const firstCategory = menuCategories.find(
                          (category) => category.restaurant_id === restaurantId
                        );
                        setMenuItemForm((current) => ({
                          ...current,
                          categoryId: firstCategory?.id ?? '',
                          restaurantId,
                        }));
                      }}>
                      <option value="">Choose restaurant</option>
                      {restaurants.map((restaurant) => (
                        <option key={restaurant.id} value={restaurant.id}>
                          {restaurant.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-field">
                    <span>Category ID</span>
                    <select
                      required
                      value={menuItemForm.categoryId}
                      onChange={(event) =>
                        setMenuItemForm((current) => ({
                          ...current,
                          categoryId: event.target.value,
                        }))
                      }>
                      <option value="">Choose category</option>
                      {menuFormCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-field">
                    <span>Name</span>
                    <input
                      required
                      type="text"
                      value={menuItemForm.name}
                      onChange={(event) =>
                        setMenuItemForm((current) => ({ ...current, name: event.target.value }))
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Description</span>
                    <input
                      type="text"
                      value={menuItemForm.description}
                      onChange={(event) =>
                        setMenuItemForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Price</span>
                    <input
                      min="0"
                      required
                      step="1"
                      type="number"
                      value={menuItemForm.price}
                      onChange={(event) =>
                        setMenuItemForm((current) => ({ ...current, price: event.target.value }))
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Image URL</span>
                    <input
                      placeholder="https://example.com/image.jpg"
                      type="url"
                      value={menuItemForm.imageUrl}
                      onChange={(event) =>
                        setMenuItemForm((current) => ({
                          ...current,
                          imageUrl: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
                <label className="checkbox-field">
                  <input
                    checked={menuItemForm.available}
                    type="checkbox"
                    onChange={(event) =>
                      setMenuItemForm((current) => ({
                        ...current,
                        available: event.target.checked,
                      }))
                    }
                  />
                  <span>Menu item is available</span>
                </label>
                <button className="primary-action-button" disabled={isMenuItemSaving} type="submit">
                  {isMenuItemSaving
                    ? 'Saving...'
                    : editingMenuItemId
                      ? 'Update menu item'
                      : 'Add menu item'}
                </button>
              </form>

              {restaurants.map((restaurant) => {
                const restaurantMenuItems = menuItems.filter(
                  (item) => item.restaurant_id === restaurant.id
                );

                return (
                  <div className="restaurant-menu-group" key={restaurant.id}>
                    <h4>{restaurant.name}</h4>
                    {restaurantMenuItems.length === 0 ? (
                      <p className="empty-state">No menu items yet.</p>
                    ) : (
                      <div className="entity-list">
                        {restaurantMenuItems.map((item) => (
                          <article className="entity-card" key={item.id}>
                            <div className="entity-card-header">
                              <div>
                                <h4>{item.name}</h4>
                                <p className="entity-meta">
                                  {getMenuCategoryName(item.category_id, menuCategories)} ·{' '}
                                  {formatCurrency(Number(item.price ?? 0))}
                                  {item.description ? ` · ${item.description}` : ''}
                                </p>
                                <span
                                  className={item.is_available ? 'status-pill active' : 'status-pill'}>
                                  {item.is_available ? 'Available' : 'Paused'}
                                </span>
                              </div>
                              <div className="action-row">
                                <button
                                  className="secondary-button"
                                  type="button"
                                  onClick={() => {
                                    setEditingMenuItemId(item.id);
                                    setMenuItemForm(getMenuItemForm(item));
                                  }}>
                                  Edit
                                </button>
                                <button
                                  className="secondary-button"
                                  disabled={savingMenuItemId === item.id}
                                  type="button"
                                  onClick={() => handleMenuItemToggle(item)}>
                                  {item.is_available ? 'Pause' : 'Unpause'}
                                </button>
                                <button
                                  className="danger-button"
                                  disabled={savingMenuItemId === item.id}
                                  type="button"
                                  onClick={() => handleMenuItemDelete(item)}>
                                  Delete
                                </button>
                              </div>
                            </div>
                            <ImageEditorRow
                              imageUrl={item.image_url}
                              inputValue={menuItemImageInputs[item.id] ?? ''}
                              isSaving={savingMenuItemImageId === item.id}
                              isUploading={uploadingMenuItemImageId === item.id}
                              label={`${item.name} image`}
                              onInputChange={(value) =>
                                setMenuItemImageInputs((current) => ({
                                  ...current,
                                  [item.id]: value,
                                }))
                              }
                              onSave={() => handleMenuItemImageSave(item.id)}
                              onUpload={(file) => handleMenuItemImageUpload(item.id, file)}
                            />
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

type AdminLoginShellProps = {
  adminAuthMessage: string;
  adminEmail: string;
  adminPassword: string;
  isSignedIn?: boolean;
  isSubmitting: boolean;
  onAdminEmailChange: (value: string) => void;
  onAdminPasswordChange: (value: string) => void;
  onLogin: () => void;
  onSignOut?: () => void;
};

function AdminLoginShell({
  adminAuthMessage,
  adminEmail,
  adminPassword,
  isSignedIn = false,
  isSubmitting,
  onAdminEmailChange,
  onAdminPasswordChange,
  onLogin,
  onSignOut,
}: AdminLoginShellProps) {
  return (
    <main className="admin-login-shell">
      <section className="admin-login-card">
        <p className="eyebrow">Camotes Runner Admin</p>
        <h1>Admin Login</h1>
        <p className="admin-login-copy">
          Sign in with an admin account to manage bookings, riders, restaurants, and menu items.
        </p>

        <form
          className="admin-login-form"
          onSubmit={(event) => {
            event.preventDefault();
            onLogin();
          }}>
          <label>
            <span>Email</span>
            <input
              autoComplete="email"
              disabled={isSubmitting || isSignedIn}
              type="email"
              value={adminEmail}
              onChange={(event) => onAdminEmailChange(event.target.value)}
            />
          </label>
          <label>
            <span>Password</span>
            <input
              autoComplete="current-password"
              disabled={isSubmitting || isSignedIn}
              type="password"
              value={adminPassword}
              onChange={(event) => onAdminPasswordChange(event.target.value)}
            />
          </label>

          {isSignedIn ? (
            <button
              className="danger-button"
              disabled={isSubmitting}
              type="button"
              onClick={onSignOut}>
              {isSubmitting ? 'Signing out...' : 'Sign Out'}
            </button>
          ) : (
            <button className="primary-action-button" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          )}
        </form>

        {adminAuthMessage ? <p className="admin-login-message">{adminAuthMessage}</p> : null}
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="stat-card">
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

function AddressWithCoordinates({
  coordinates,
  label,
}: {
  coordinates: string | null;
  label: string;
}) {
  return (
    <div className="address-cell">
      <span>{label}</span>
      {coordinates ? <small>{coordinates}</small> : null}
    </div>
  );
}

type ImageEditorRowProps = {
  imageUrl: string | null;
  inputValue: string;
  isSaving: boolean;
  isUploading: boolean;
  label: string;
  onInputChange: (value: string) => void;
  onSave: () => void;
  onUpload: (file: File) => void;
};

function ImageEditorRow({
  imageUrl,
  inputValue,
  isSaving,
  isUploading,
  label,
  onInputChange,
  onSave,
  onUpload,
}: ImageEditorRowProps) {
  const isBusy = isSaving || isUploading;

  return (
    <article className="image-editor-row">
      <ImagePreview key={imageUrl ?? 'placeholder'} imageUrl={imageUrl} label={label} />
      <div className="image-editor-copy">
        <strong>{label}</strong>
        <input
          aria-label={`${label} image URL`}
          placeholder="https://example.com/image.jpg"
          type="url"
          value={inputValue}
          onChange={(event) => onInputChange(event.target.value)}
        />
        <label className="upload-control">
          <span>{isUploading ? 'Uploading...' : 'Choose File'}</span>
          <input
            accept="image/*"
            disabled={isBusy}
            type="file"
            onChange={(event) => {
              const selectedFile = event.target.files?.[0];
              event.target.value = '';

              if (selectedFile) {
                onUpload(selectedFile);
              }
            }}
          />
        </label>
      </div>
      <button
        className="save-image-button"
        disabled={isBusy}
        type="button"
        onClick={onSave}>
        {isSaving ? 'Saving...' : 'Save'}
      </button>
    </article>
  );
}

function ImagePreview({ imageUrl, label }: { imageUrl: string | null; label: string }) {
  const [hasImageError, setHasImageError] = useState(false);
  const safeImageUrl = normalizeOptionalUrl(imageUrl);

  if (!safeImageUrl || hasImageError) {
    return <div className="image-preview placeholder" aria-label={`${label} image placeholder`}>Image</div>;
  }

  return (
    <img
      alt={label}
      className="image-preview"
      src={safeImageUrl}
      onError={() => setHasImageError(true)}
    />
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-PH', {
    currency: 'PHP',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatOptionalDate(value: string | null | undefined) {
  return value ? formatDate(value) : 'No live location';
}

function formatOptionalDistance(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'No distance';
  }

  return `${value.toFixed(1)} km`;
}

function formatCoordinates(latitude: number | null, longitude: number | null) {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return null;
  }

  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

function getRiderName(riderId: string | null, riders: AdminRider[]) {
  if (!riderId) {
    return 'Unassigned';
  }

  return riders.find((rider) => rider.id === riderId)?.full_name ?? 'Assigned rider';
}

function getRestaurantName(restaurantId: string, restaurants: AdminRestaurant[]) {
  return (
    restaurants.find((restaurant) => restaurant.id === restaurantId)?.name ?? 'Unknown restaurant'
  );
}

function getFoodOrderItemCount(foodOrderId: string, foodOrderItems: AdminFoodOrderItem[]) {
  return foodOrderItems
    .filter((item) => item.food_order_id === foodOrderId)
    .reduce((total, item) => total + item.quantity, 0);
}

function getRestaurantForm(restaurant: AdminRestaurant): RestaurantFormState {
  return {
    address: restaurant.address,
    category: restaurant.category,
    deliveryFee: String(restaurant.delivery_fee),
    estimatedDeliveryTime: restaurant.estimated_delivery_time,
    imageUrl: restaurant.image_url ?? '',
    isOpen: restaurant.is_active,
    latitude: restaurant.latitude === null ? '' : String(restaurant.latitude),
    longitude: restaurant.longitude === null ? '' : String(restaurant.longitude),
    name: restaurant.name,
  };
}

function getMenuItemForm(item: AdminMenuItem): MenuItemFormState {
  return {
    available: item.is_available,
    categoryId: item.category_id,
    description: item.description ?? '',
    imageUrl: item.image_url ?? '',
    name: item.name,
    price: String(item.price),
    restaurantId: item.restaurant_id,
  };
}

function getRestaurantInput(form: RestaurantFormState): RestaurantInput {
  return {
    address: requireText(form.address, 'Restaurant address'),
    category: requireText(form.category, 'Restaurant category'),
    delivery_fee: requireNonNegativeNumber(form.deliveryFee, 'Delivery fee'),
    estimated_delivery_time: requireText(
      form.estimatedDeliveryTime,
      'Estimated delivery time'
    ),
    image_url: normalizeOptionalUrl(form.imageUrl),
    is_active: form.isOpen,
    latitude: normalizeOptionalNumber(form.latitude, 'Latitude'),
    longitude: normalizeOptionalNumber(form.longitude, 'Longitude'),
    name: requireText(form.name, 'Restaurant name'),
  };
}

function getMenuItemInput(form: MenuItemFormState): MenuItemInput {
  return {
    category_id: requireText(form.categoryId, 'Menu category'),
    description: normalizeOptionalText(form.description),
    image_url: normalizeOptionalUrl(form.imageUrl),
    is_available: form.available,
    name: requireText(form.name, 'Menu item name'),
    price: requireNonNegativeNumber(form.price, 'Menu item price'),
    restaurant_id: requireText(form.restaurantId, 'Restaurant'),
  };
}

function getMenuCategoryName(categoryId: string, categories: AdminMenuCategory[]) {
  return categories.find((category) => category.id === categoryId)?.name ?? 'Uncategorized';
}

function getImageInputMap<T extends { id: string; image_url: string | null }>(rows: T[]) {
  return rows.reduce<Record<string, string>>((inputs, row) => {
    inputs[row.id] = row.image_url ?? '';
    return inputs;
  }, {});
}

function normalizeOptionalUrl(value: string | null | undefined) {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : null;
}

function normalizeOptionalText(value: string | null | undefined) {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : null;
}

function normalizeOptionalNumber(value: string, fieldName: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const numericValue = Number(trimmedValue);

  if (!Number.isFinite(numericValue)) {
    throw new Error(`${fieldName} must be a valid number.`);
  }

  return numericValue;
}

function requireText(value: string, fieldName: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    throw new Error(`${fieldName} is required.`);
  }

  return trimmedValue;
}

function requireNonNegativeNumber(value: string, fieldName: string) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    throw new Error(`${fieldName} must be 0 or higher.`);
  }

  return numericValue;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error && 'message' in error) {
    return String(error.message);
  }

  return 'Unable to load admin dashboard data.';
}
