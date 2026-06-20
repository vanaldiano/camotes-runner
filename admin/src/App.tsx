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
  createBusinessPartner,
  createMenuItem,
  createPartnerProduct,
  createRestaurant,
  deactivatePartnerProduct,
  deleteMenuItem,
  deleteRestaurant,
  foodOrderStatuses,
  getAllBookings,
  getAllFoodOrders,
  getBusinessPartnerById,
  getBusinessPartners,
  getFoodOrderItems,
  getMenuCategories,
  getMenuItems,
  getPartnerNotificationsByPartner,
  getPartnerOrderNotifications,
  getPartnerProducts,
  getPartnerUsers,
  getRestaurants,
  getRiders,
  getServiceCategories,
  getServiceSubcategories,
  getUnreadPartnerNotificationCount,
  assignPartnerUserFoundation,
  markPartnerNotificationRead,
  togglePartnerProductAvailability,
  updateBusinessPartner,
  updateBookingStatus,
  updateFoodOrderStatus,
  updateMenuItem,
  updatePartnerProduct,
  updateMenuItemAvailability,
  updateMenuItemImageUrl,
  updateRestaurant,
  updateRestaurantImageUrl,
  updateRestaurantOpenStatus,
  uploadMenuItemImageFile,
  uploadRestaurantImageFile,
  type AdminBooking,
  type AdminBusinessPartner,
  type AdminFoodOrder,
  type AdminFoodOrderItem,
  type AdminMenuCategory,
  type AdminMenuItem,
  type AdminPartnerOrderNotification,
  type AdminPartnerProduct,
  type AdminPartnerUser,
  type AdminRestaurant,
  type AdminRider,
  type AdminServiceCategory,
  type AdminServiceSubcategory,
  type BusinessPartnerInput,
  type MenuItemInput,
  type PartnerUserInput,
  type PartnerProductInput,
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
type PartnerFormState = {
  address: string;
  businessHours: string;
  categoryId: string;
  deliveryFeeLabel: string;
  description: string;
  estimatedTime: string;
  imageUrl: string;
  isActive: boolean;
  isOpen: boolean;
  latitude: string;
  longitude: string;
  name: string;
  ownerEmail: string;
  ownerName: string;
  ownerPhone: string;
  partnerNotes: string;
  phone: string;
  rating: string;
  restaurantId: string;
  status: string;
  subcategoryId: string;
};
type PartnerUserFormState = {
  email: string;
  fullName: string;
  isActive: boolean;
  partnerId: string;
  phone: string;
  role: string;
  userId: string;
};
type PartnerProductFormState = {
  categoryId: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
  isAvailable: boolean;
  name: string;
  partnerId: string;
  price: string;
  sku: string;
  sortOrder: string;
  subcategoryId: string;
  unitLabel: string;
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

const emptyPartnerForm: PartnerFormState = {
  address: '',
  businessHours: '',
  categoryId: '',
  deliveryFeeLabel: '',
  description: '',
  estimatedTime: '',
  imageUrl: '',
  isActive: true,
  isOpen: true,
  latitude: '',
  longitude: '',
  name: '',
  ownerEmail: '',
  ownerName: '',
  ownerPhone: '',
  partnerNotes: '',
  phone: '',
  rating: '',
  restaurantId: '',
  status: 'active',
  subcategoryId: '',
};

const emptyPartnerUserForm: PartnerUserFormState = {
  email: '',
  fullName: '',
  isActive: true,
  partnerId: '',
  phone: '',
  role: 'owner',
  userId: '',
};

const emptyPartnerProductForm: PartnerProductFormState = {
  categoryId: '',
  description: '',
  imageUrl: '',
  isActive: true,
  isAvailable: true,
  name: '',
  partnerId: '',
  price: '',
  sku: '',
  sortOrder: '0',
  subcategoryId: '',
  unitLabel: '',
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
  const [serviceCategories, setServiceCategories] = useState<AdminServiceCategory[]>([]);
  const [serviceSubcategories, setServiceSubcategories] = useState<AdminServiceSubcategory[]>([]);
  const [businessPartners, setBusinessPartners] = useState<AdminBusinessPartner[]>([]);
  const [partnerUsers, setPartnerUsers] = useState<AdminPartnerUser[]>([]);
  const [partnerOrderNotifications, setPartnerOrderNotifications] = useState<
    AdminPartnerOrderNotification[]
  >([]);
  const [partnerProducts, setPartnerProducts] = useState<AdminPartnerProduct[]>([]);
  const [previewPartnerNotifications, setPreviewPartnerNotifications] = useState<
    AdminPartnerOrderNotification[]
  >([]);
  const [previewPartnerProducts, setPreviewPartnerProducts] = useState<AdminPartnerProduct[]>([]);
  const [unreadPartnerNotificationCount, setUnreadPartnerNotificationCount] = useState(0);
  const [riders, setRiders] = useState<AdminRider[]>([]);
  const [restaurantForm, setRestaurantForm] = useState<RestaurantFormState>(emptyRestaurantForm);
  const [menuItemForm, setMenuItemForm] = useState<MenuItemFormState>(emptyMenuItemForm);
  const [partnerForm, setPartnerForm] = useState<PartnerFormState>(emptyPartnerForm);
  const [partnerUserForm, setPartnerUserForm] = useState<PartnerUserFormState>(emptyPartnerUserForm);
  const [partnerProductForm, setPartnerProductForm] =
    useState<PartnerProductFormState>(emptyPartnerProductForm);
  const [selectedProductPartnerId, setSelectedProductPartnerId] = useState('');
  const [previewPartnerId, setPreviewPartnerId] = useState('');
  const [editingRestaurantId, setEditingRestaurantId] = useState('');
  const [editingMenuItemId, setEditingMenuItemId] = useState('');
  const [editingPartnerId, setEditingPartnerId] = useState('');
  const [editingPartnerProductId, setEditingPartnerProductId] = useState('');
  const [restaurantImageInputs, setRestaurantImageInputs] = useState<Record<string, string>>({});
  const [menuItemImageInputs, setMenuItemImageInputs] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isFoodLoading, setIsFoodLoading] = useState(true);
  const [isFoodManagementLoading, setIsFoodManagementLoading] = useState(true);
  const [isMarketplaceLoading, setIsMarketplaceLoading] = useState(true);
  const [updatingBookingId, setUpdatingBookingId] = useState('');
  const [updatingFoodOrderId, setUpdatingFoodOrderId] = useState('');
  const [savingRestaurantId, setSavingRestaurantId] = useState('');
  const [savingMenuItemId, setSavingMenuItemId] = useState('');
  const [savingPartnerId, setSavingPartnerId] = useState('');
  const [savingPartnerUserId, setSavingPartnerUserId] = useState('');
  const [savingPartnerProductId, setSavingPartnerProductId] = useState('');
  const [markingPartnerNotificationId, setMarkingPartnerNotificationId] = useState('');
  const [savingRestaurantImageId, setSavingRestaurantImageId] = useState('');
  const [savingMenuItemImageId, setSavingMenuItemImageId] = useState('');
  const [uploadingRestaurantImageId, setUploadingRestaurantImageId] = useState('');
  const [uploadingMenuItemImageId, setUploadingMenuItemImageId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [foodErrorMessage, setFoodErrorMessage] = useState('');
  const [foodManagementMessage, setFoodManagementMessage] = useState('');
  const [foodManagementErrorMessage, setFoodManagementErrorMessage] = useState('');
  const [marketplaceMessage, setMarketplaceMessage] = useState('');
  const [marketplaceErrorMessage, setMarketplaceErrorMessage] = useState('');
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

  const loadMarketplace = useCallback(async ({ showLoading = true }: LoadOptions = {}) => {
    if (showLoading) {
      setIsMarketplaceLoading(true);
    }
    setMarketplaceErrorMessage('');

    try {
      const [
        categoryRows,
        subcategoryRows,
        partnerRows,
        partnerUserRows,
        notificationRows,
        unreadNotificationCount,
      ] = await Promise.all([
        getServiceCategories(),
        getServiceSubcategories(),
        getBusinessPartners(),
        getPartnerUsers(),
        getPartnerOrderNotifications(),
        getUnreadPartnerNotificationCount(),
      ]);
      setServiceCategories(categoryRows);
      setServiceSubcategories(subcategoryRows);
      setBusinessPartners(partnerRows);
      setPartnerUsers(partnerUserRows);
      setPartnerOrderNotifications(notificationRows);
      setUnreadPartnerNotificationCount(unreadNotificationCount);
      setPreviewPartnerId((currentPreviewPartnerId) => currentPreviewPartnerId || partnerRows[0]?.id || '');
      setSelectedProductPartnerId((currentPartnerId) => currentPartnerId || partnerRows[0]?.id || '');
    } catch (error) {
      setMarketplaceErrorMessage(`Unable to load marketplace data. ${getErrorMessage(error)}`);
    } finally {
      if (showLoading) {
        setIsMarketplaceLoading(false);
      }
    }
  }, []);

  const loadPreviewPartnerNotifications = useCallback(async (partnerId: string) => {
    try {
      const rows = await getPartnerNotificationsByPartner(partnerId);
      setPreviewPartnerNotifications(rows);
    } catch (error) {
      setMarketplaceErrorMessage(`Unable to load partner notifications. ${getErrorMessage(error)}`);
    }
  }, []);

  const loadPartnerProducts = useCallback(async (partnerId: string) => {
    try {
      const rows = await getPartnerProducts(partnerId);
      setPartnerProducts(rows);
    } catch (error) {
      setMarketplaceErrorMessage(`Unable to load partner products. ${getErrorMessage(error)}`);
    }
  }, []);

  const loadPreviewPartnerProducts = useCallback(async (partnerId: string) => {
    try {
      const rows = await getPartnerProducts(partnerId);
      setPreviewPartnerProducts(rows);
    } catch (error) {
      setMarketplaceErrorMessage(`Unable to load partner preview products. ${getErrorMessage(error)}`);
    }
  }, []);

  const refreshDashboard = useCallback(async () => {
    setIsLoading(true);
    setIsFoodLoading(true);
    setIsFoodManagementLoading(true);
    setIsMarketplaceLoading(true);
    setErrorMessage('');
    setFoodErrorMessage('');
    setFoodManagementErrorMessage('');
    setMarketplaceErrorMessage('');

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

    try {
      const [
        marketCategoryRows,
        marketSubcategoryRows,
        partnerRows,
        partnerUserRows,
        notificationRows,
        unreadNotificationCount,
      ] = await Promise.all([
        getServiceCategories(),
        getServiceSubcategories(),
        getBusinessPartners(),
        getPartnerUsers(),
        getPartnerOrderNotifications(),
        getUnreadPartnerNotificationCount(),
      ]);
      setServiceCategories(marketCategoryRows);
      setServiceSubcategories(marketSubcategoryRows);
      setBusinessPartners(partnerRows);
      setPartnerUsers(partnerUserRows);
      setPartnerOrderNotifications(notificationRows);
      setUnreadPartnerNotificationCount(unreadNotificationCount);
      setPreviewPartnerId((currentPreviewPartnerId) => currentPreviewPartnerId || partnerRows[0]?.id || '');
      setSelectedProductPartnerId((currentPartnerId) => currentPartnerId || partnerRows[0]?.id || '');
    } catch (error) {
      setMarketplaceErrorMessage(`Unable to load marketplace data. ${getErrorMessage(error)}`);
    } finally {
      setIsMarketplaceLoading(false);
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

  async function handlePartnerSave() {
    setSavingPartnerId(editingPartnerId || 'new');
    setMarketplaceMessage('');
    setMarketplaceErrorMessage('');

    try {
      const input = getPartnerInput(partnerForm);

      if (editingPartnerId) {
        await updateBusinessPartner(editingPartnerId, input);
        setMarketplaceMessage('Partner shop updated.');
      } else {
        await createBusinessPartner(input);
        setMarketplaceMessage('Partner shop added.');
      }

      setPartnerForm(emptyPartnerForm);
      setEditingPartnerId('');
      await loadMarketplace({ showLoading: false });
    } catch (error) {
      setMarketplaceErrorMessage(`Unable to save partner shop. ${getErrorMessage(error)}`);
    } finally {
      setSavingPartnerId('');
    }
  }

  async function handlePartnerUserSave() {
    setSavingPartnerUserId(partnerUserForm.partnerId || 'new');
    setMarketplaceMessage('');
    setMarketplaceErrorMessage('');

    try {
      const input = getPartnerUserInput(partnerUserForm);
      await assignPartnerUserFoundation(input);
      setMarketplaceMessage('Partner user assignment saved.');
      setPartnerUserForm(emptyPartnerUserForm);
      await loadMarketplace({ showLoading: false });
    } catch (error) {
      setMarketplaceErrorMessage(`Unable to save partner user assignment. ${getErrorMessage(error)}`);
    } finally {
      setSavingPartnerUserId('');
    }
  }

  async function handlePartnerProductSave() {
    setSavingPartnerProductId(editingPartnerProductId || 'new');
    setMarketplaceMessage('');
    setMarketplaceErrorMessage('');

    try {
      const input = getPartnerProductInput(partnerProductForm);

      if (editingPartnerProductId) {
        await updatePartnerProduct(editingPartnerProductId, input);
        setMarketplaceMessage('Partner product updated.');
      } else {
        await createPartnerProduct(input);
        setMarketplaceMessage('Partner product added.');
      }

      setEditingPartnerProductId('');
      setPartnerProductForm(getEmptyPartnerProductFormForPartner(input.partner_id, businessPartners));
      await loadPartnerProducts(input.partner_id);

      if (previewPartnerId === input.partner_id) {
        await loadPreviewPartnerProducts(input.partner_id);
      }
    } catch (error) {
      setMarketplaceErrorMessage(`Unable to save partner product. ${getErrorMessage(error)}`);
    } finally {
      setSavingPartnerProductId('');
    }
  }

  async function handlePartnerProductAvailability(productId: string, isAvailable: boolean) {
    setSavingPartnerProductId(productId);
    setMarketplaceMessage('');
    setMarketplaceErrorMessage('');

    try {
      await togglePartnerProductAvailability(productId, isAvailable);
      setMarketplaceMessage(isAvailable ? 'Partner product marked available.' : 'Partner product marked unavailable.');

      if (selectedProductPartnerId) {
        await loadPartnerProducts(selectedProductPartnerId);
      }

      if (previewPartnerId) {
        await loadPreviewPartnerProducts(previewPartnerId);
      }
    } catch (error) {
      setMarketplaceErrorMessage(`Unable to update partner product availability. ${getErrorMessage(error)}`);
    } finally {
      setSavingPartnerProductId('');
    }
  }

  async function handlePartnerProductDeactivate(productId: string) {
    setSavingPartnerProductId(productId);
    setMarketplaceMessage('');
    setMarketplaceErrorMessage('');

    try {
      await deactivatePartnerProduct(productId);
      setMarketplaceMessage('Partner product deactivated.');

      if (selectedProductPartnerId) {
        await loadPartnerProducts(selectedProductPartnerId);
      }

      if (previewPartnerId) {
        await loadPreviewPartnerProducts(previewPartnerId);
      }
    } catch (error) {
      setMarketplaceErrorMessage(`Unable to deactivate partner product. ${getErrorMessage(error)}`);
    } finally {
      setSavingPartnerProductId('');
    }
  }

  async function handleMarkPartnerNotificationRead(notificationId: string) {
    setMarkingPartnerNotificationId(notificationId);
    setMarketplaceMessage('');
    setMarketplaceErrorMessage('');

    try {
      await markPartnerNotificationRead(notificationId);
      setMarketplaceMessage('Partner notification marked as read.');
      await loadMarketplace({ showLoading: false });

      if (previewPartnerId) {
        await loadPreviewPartnerNotifications(previewPartnerId);
      }
    } catch (error) {
      setMarketplaceErrorMessage(`Unable to mark partner notification as read. ${getErrorMessage(error)}`);
    } finally {
      setMarkingPartnerNotificationId('');
    }
  }

  async function handlePreviewPartnerChange(partnerId: string) {
    setPreviewPartnerId(partnerId);

    if (!partnerId) {
      setPreviewPartnerNotifications([]);
      return;
    }

    try {
      await getBusinessPartnerById(partnerId);
      await loadPreviewPartnerNotifications(partnerId);
      await loadPreviewPartnerProducts(partnerId);
    } catch (error) {
      setMarketplaceErrorMessage(`Unable to load partner preview. ${getErrorMessage(error)}`);
    }
  }

  useEffect(() => {
    if (!adminAuthState.isAdmin || !previewPartnerId) {
      setPreviewPartnerNotifications([]);
      setPreviewPartnerProducts([]);
      return;
    }

    void loadPreviewPartnerNotifications(previewPartnerId);
    void loadPreviewPartnerProducts(previewPartnerId);
  }, [
    adminAuthState.isAdmin,
    loadPreviewPartnerNotifications,
    loadPreviewPartnerProducts,
    previewPartnerId,
  ]);

  useEffect(() => {
    if (!adminAuthState.isAdmin || !selectedProductPartnerId) {
      setPartnerProducts([]);
      return;
    }

    void loadPartnerProducts(selectedProductPartnerId);
  }, [adminAuthState.isAdmin, loadPartnerProducts, selectedProductPartnerId]);

  useEffect(() => {
    if (!selectedProductPartnerId || editingPartnerProductId) {
      return;
    }

    if (partnerProductForm.partnerId === selectedProductPartnerId) {
      return;
    }

    setPartnerProductForm(
      getEmptyPartnerProductFormForPartner(selectedProductPartnerId, businessPartners)
    );
  }, [
    businessPartners,
    editingPartnerProductId,
    partnerProductForm.partnerId,
    selectedProductPartnerId,
  ]);

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
      void loadMarketplace({ showLoading: false });
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
  }, [adminAuthState.isAdmin, loadBookings, loadFoodOrders, loadMarketplace, loadRiders]);

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
  const partnerFormSubcategories = serviceSubcategories.filter(
    (subcategory) => subcategory.category_id === partnerForm.categoryId
  );
  const partnerProductFormSubcategories = serviceSubcategories.filter(
    (subcategory) => subcategory.category_id === partnerProductForm.categoryId
  );
  const previewPartner = businessPartners.find((partner) => partner.id === previewPartnerId) ?? null;
  const previewPartnerUsers = partnerUsers.filter((user) => user.partner_id === previewPartnerId);
  const previewUnreadNotificationCount = previewPartnerNotifications.filter(
    (notification) => notification.status === 'unread'
  ).length;
  const isRestaurantSaving = savingRestaurantId === (editingRestaurantId || 'new');
  const isMenuItemSaving = savingMenuItemId === (editingMenuItemId || 'new');
  const isPartnerSaving = savingPartnerId === (editingPartnerId || 'new');
  const isPartnerUserSaving = savingPartnerUserId === (partnerUserForm.partnerId || 'new');
  const isPartnerProductSaving = savingPartnerProductId === (editingPartnerProductId || 'new');

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
            <p className="eyebrow">Marketplace</p>
            <h2>Categories and partner shops</h2>
          </div>
        </div>

        {marketplaceErrorMessage ? <p className="error-message">{marketplaceErrorMessage}</p> : null}
        {marketplaceMessage ? <p className="success-message">{marketplaceMessage}</p> : null}

        {isMarketplaceLoading ? (
          <p className="empty-state">Loading marketplace data...</p>
        ) : (
          <div className="food-management">
            <div className="section-nav-row" aria-label="Marketplace admin sections">
              <span>Admin Marketplace</span>
              <span>Partners</span>
              <span>Partner Dashboard Preview / My Shop</span>
            </div>
            <div className="food-management-section">
              <div className="section-title-row">
                <h3>Service categories</h3>
                <span className="count-pill">{serviceCategories.length} categories</span>
              </div>
              {serviceCategories.length === 0 ? (
                <p className="empty-state">No service categories found. Run the Phase 8A SQL migration.</p>
              ) : (
                <div className="entity-list compact-entity-grid">
                  {serviceCategories.map((category) => (
                    <article className="entity-card" key={category.id}>
                      <div className="entity-card-header">
                        <div>
                          <h4>{category.name}</h4>
                          <p className="entity-meta">
                            {category.slug} - Sort {category.sort_order}
                          </p>
                          <span className={category.is_active ? 'status-pill active' : 'status-pill'}>
                            {category.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="food-management-section">
              <div className="section-title-row">
                <h3>Sub-categories</h3>
                <span className="count-pill">{serviceSubcategories.length} sub-categories</span>
              </div>
              {serviceSubcategories.length === 0 ? (
                <p className="empty-state">No sub-categories found.</p>
              ) : (
                <div className="entity-list compact-entity-grid">
                  {serviceSubcategories.map((subcategory) => (
                    <article className="entity-card" key={subcategory.id}>
                      <div className="entity-card-header">
                        <div>
                          <h4>{subcategory.name}</h4>
                          <p className="entity-meta">
                            {getServiceCategoryName(subcategory.category_id, serviceCategories)} -{' '}
                            {subcategory.slug}
                          </p>
                          <span className={subcategory.is_active ? 'status-pill active' : 'status-pill'}>
                            {subcategory.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="food-management-section">
              <div className="section-title-row">
                <h3>{editingPartnerId ? 'Edit partner shop' : 'Add partner shop'}</h3>
                {editingPartnerId ? (
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => {
                      setEditingPartnerId('');
                      setPartnerForm(emptyPartnerForm);
                    }}>
                    Cancel edit
                  </button>
                ) : null}
              </div>

              <form
                className="management-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handlePartnerSave();
                }}>
                <div className="form-grid">
                  <label className="form-field">
                    <span>Name</span>
                    <input
                      required
                      type="text"
                      value={partnerForm.name}
                      onChange={(event) =>
                        setPartnerForm((current) => ({ ...current, name: event.target.value }))
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Category</span>
                    <select
                      required
                      value={partnerForm.categoryId}
                      onChange={(event) => {
                        const nextCategoryId = event.target.value;
                        setPartnerForm((current) => ({
                          ...current,
                          categoryId: nextCategoryId,
                          subcategoryId: '',
                        }));
                      }}>
                      <option value="">Choose category</option>
                      {serviceCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-field">
                    <span>Sub-category</span>
                    <select
                      value={partnerForm.subcategoryId}
                      onChange={(event) =>
                        setPartnerForm((current) => ({
                          ...current,
                          subcategoryId: event.target.value,
                        }))
                      }>
                      <option value="">Choose sub-category</option>
                      {partnerFormSubcategories.map((subcategory) => (
                        <option key={subcategory.id} value={subcategory.id}>
                          {subcategory.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-field">
                    <span>Linked restaurant</span>
                    <select
                      value={partnerForm.restaurantId}
                      onChange={(event) =>
                        setPartnerForm((current) => ({
                          ...current,
                          restaurantId: event.target.value,
                        }))
                      }>
                      <option value="">No restaurant link</option>
                      {restaurants.map((restaurant) => (
                        <option key={restaurant.id} value={restaurant.id}>
                          {restaurant.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-field">
                    <span>Description</span>
                    <input
                      type="text"
                      value={partnerForm.description}
                      onChange={(event) =>
                        setPartnerForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Address</span>
                    <input
                      type="text"
                      value={partnerForm.address}
                      onChange={(event) =>
                        setPartnerForm((current) => ({
                          ...current,
                          address: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Phone</span>
                    <input
                      type="tel"
                      value={partnerForm.phone}
                      onChange={(event) =>
                        setPartnerForm((current) => ({ ...current, phone: event.target.value }))
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Owner name</span>
                    <input
                      type="text"
                      value={partnerForm.ownerName}
                      onChange={(event) =>
                        setPartnerForm((current) => ({ ...current, ownerName: event.target.value }))
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Owner email</span>
                    <input
                      type="email"
                      value={partnerForm.ownerEmail}
                      onChange={(event) =>
                        setPartnerForm((current) => ({ ...current, ownerEmail: event.target.value }))
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Owner phone</span>
                    <input
                      type="tel"
                      value={partnerForm.ownerPhone}
                      onChange={(event) =>
                        setPartnerForm((current) => ({ ...current, ownerPhone: event.target.value }))
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Rating</span>
                    <input
                      max="5"
                      min="0"
                      step="0.1"
                      type="number"
                      value={partnerForm.rating}
                      onChange={(event) =>
                        setPartnerForm((current) => ({ ...current, rating: event.target.value }))
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Estimated time</span>
                    <input
                      placeholder="35-45 min"
                      type="text"
                      value={partnerForm.estimatedTime}
                      onChange={(event) =>
                        setPartnerForm((current) => ({
                          ...current,
                          estimatedTime: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Delivery fee label</span>
                    <input
                      placeholder="PHP 50 delivery"
                      type="text"
                      value={partnerForm.deliveryFeeLabel}
                      onChange={(event) =>
                        setPartnerForm((current) => ({
                          ...current,
                          deliveryFeeLabel: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Latitude</span>
                    <input
                      step="0.000001"
                      type="number"
                      value={partnerForm.latitude}
                      onChange={(event) =>
                        setPartnerForm((current) => ({
                          ...current,
                          latitude: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Longitude</span>
                    <input
                      step="0.000001"
                      type="number"
                      value={partnerForm.longitude}
                      onChange={(event) =>
                        setPartnerForm((current) => ({
                          ...current,
                          longitude: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Business hours</span>
                    <input
                      placeholder="8:00 AM - 8:00 PM"
                      type="text"
                      value={partnerForm.businessHours}
                      onChange={(event) =>
                        setPartnerForm((current) => ({
                          ...current,
                          businessHours: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Status</span>
                    <select
                      value={partnerForm.status}
                      onChange={(event) =>
                        setPartnerForm((current) => ({
                          ...current,
                          status: event.target.value,
                        }))
                      }>
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="paused">Paused</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </label>
                  <label className="form-field">
                    <span>Image URL</span>
                    <input
                      placeholder="https://example.com/image.jpg"
                      type="url"
                      value={partnerForm.imageUrl}
                      onChange={(event) =>
                        setPartnerForm((current) => ({
                          ...current,
                          imageUrl: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="form-field wide-field">
                    <span>Partner notes</span>
                    <textarea
                      value={partnerForm.partnerNotes}
                      onChange={(event) =>
                        setPartnerForm((current) => ({
                          ...current,
                          partnerNotes: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
                <label className="checkbox-field">
                  <input
                    checked={partnerForm.isOpen}
                    type="checkbox"
                    onChange={(event) =>
                      setPartnerForm((current) => ({
                        ...current,
                        isOpen: event.target.checked,
                      }))
                    }
                  />
                  <span>Partner shop is open</span>
                </label>
                <label className="checkbox-field">
                  <input
                    checked={partnerForm.isActive}
                    type="checkbox"
                    onChange={(event) =>
                      setPartnerForm((current) => ({
                        ...current,
                        isActive: event.target.checked,
                      }))
                    }
                  />
                  <span>Partner shop is active</span>
                </label>
                <button className="primary-action-button" disabled={isPartnerSaving} type="submit">
                  {isPartnerSaving
                    ? 'Saving...'
                    : editingPartnerId
                      ? 'Update partner shop'
                      : 'Add partner shop'}
                </button>
              </form>

              {businessPartners.length === 0 ? (
                <p className="empty-state">No partner shops found yet.</p>
              ) : (
                <div className="entity-list">
                  {businessPartners.map((partner) => (
                    <article className="entity-card" key={partner.id}>
                      <div className="entity-card-header">
                        <div>
                          <h4>{partner.name}</h4>
                          <p className="entity-meta">
                            {getServiceCategoryName(partner.category_id, serviceCategories)} -{' '}
                            {getServiceSubcategoryName(partner.subcategory_id, serviceSubcategories)} -{' '}
                            {partner.estimated_time || 'No time set'} -{' '}
                            {partner.delivery_fee_label || 'No delivery fee label'}
                          </p>
                          <p className="entity-meta">
                            Owner: {partner.owner_name || 'No owner'} - Status: {partner.status}
                          </p>
                          <p className="entity-meta">
                            Restaurant link: {getRestaurantName(partner.restaurant_id, restaurants)}
                          </p>
                          <span className={partner.is_active && partner.is_open ? 'status-pill active' : 'status-pill'}>
                            {partner.is_active ? (partner.is_open ? 'Open' : 'Closed') : 'Inactive'}
                          </span>
                        </div>
                        <div className="action-row">
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={() => {
                              setEditingPartnerId(partner.id);
                              setPartnerForm(getPartnerForm(partner));
                            }}>
                            Edit
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="food-management-section">
              <div className="section-title-row">
                <h3>Partner user assignment foundation</h3>
                <span className="count-pill">{partnerUsers.length} users</span>
              </div>

              <form
                className="management-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handlePartnerUserSave();
                }}>
                <div className="form-grid">
                  <label className="form-field">
                    <span>Partner shop</span>
                    <select
                      required
                      value={partnerUserForm.partnerId}
                      onChange={(event) =>
                        setPartnerUserForm((current) => ({
                          ...current,
                          partnerId: event.target.value,
                        }))
                      }>
                      <option value="">Choose partner</option>
                      {businessPartners.map((partner) => (
                        <option key={partner.id} value={partner.id}>
                          {partner.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-field">
                    <span>Auth user ID</span>
                    <input
                      placeholder="Optional Supabase auth user UUID"
                      type="text"
                      value={partnerUserForm.userId}
                      onChange={(event) =>
                        setPartnerUserForm((current) => ({ ...current, userId: event.target.value }))
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Role</span>
                    <select
                      value={partnerUserForm.role}
                      onChange={(event) =>
                        setPartnerUserForm((current) => ({ ...current, role: event.target.value }))
                      }>
                      <option value="owner">Owner</option>
                      <option value="manager">Manager</option>
                      <option value="staff">Staff</option>
                    </select>
                  </label>
                  <label className="form-field">
                    <span>Full name</span>
                    <input
                      type="text"
                      value={partnerUserForm.fullName}
                      onChange={(event) =>
                        setPartnerUserForm((current) => ({ ...current, fullName: event.target.value }))
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Email</span>
                    <input
                      type="email"
                      value={partnerUserForm.email}
                      onChange={(event) =>
                        setPartnerUserForm((current) => ({ ...current, email: event.target.value }))
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Phone</span>
                    <input
                      type="tel"
                      value={partnerUserForm.phone}
                      onChange={(event) =>
                        setPartnerUserForm((current) => ({ ...current, phone: event.target.value }))
                      }
                    />
                  </label>
                </div>
                <label className="checkbox-field">
                  <input
                    checked={partnerUserForm.isActive}
                    type="checkbox"
                    onChange={(event) =>
                      setPartnerUserForm((current) => ({
                        ...current,
                        isActive: event.target.checked,
                      }))
                    }
                  />
                  <span>Partner user is active</span>
                </label>
                <button className="primary-action-button" disabled={isPartnerUserSaving} type="submit">
                  {isPartnerUserSaving ? 'Saving...' : 'Save partner user'}
                </button>
              </form>

              {partnerUsers.length === 0 ? (
                <p className="empty-state">No partner users assigned yet.</p>
              ) : (
                <div className="entity-list compact-entity-grid">
                  {partnerUsers.map((partnerUser) => (
                    <article className="entity-card" key={partnerUser.id}>
                      <div>
                        <h4>{partnerUser.full_name || partnerUser.email || 'Partner user'}</h4>
                        <p className="entity-meta">
                          {getPartnerName(partnerUser.partner_id, businessPartners)} - {partnerUser.role}
                        </p>
                        <span className={partnerUser.is_active ? 'status-pill active' : 'status-pill'}>
                          {partnerUser.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="food-management-section">
              <div className="section-title-row">
                <h3>Product/Menu Management</h3>
                <label className="filter-control compact-filter">
                  <span>Manage partner</span>
                  <select
                    value={selectedProductPartnerId}
                    onChange={(event) => {
                      const nextPartnerId = event.target.value;
                      setSelectedProductPartnerId(nextPartnerId);
                      setEditingPartnerProductId('');
                      setPartnerProductForm(
                        getEmptyPartnerProductFormForPartner(nextPartnerId, businessPartners)
                      );
                    }}>
                    <option value="">Choose partner</option>
                    {businessPartners.map((partner) => (
                      <option key={partner.id} value={partner.id}>
                        {partner.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <form
                className="management-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handlePartnerProductSave();
                }}>
                <div className="form-grid">
                  <label className="form-field">
                    <span>Partner shop</span>
                    <select
                      required
                      value={partnerProductForm.partnerId}
                      onChange={(event) => {
                        const nextPartnerId = event.target.value;
                        setSelectedProductPartnerId(nextPartnerId);
                        setEditingPartnerProductId('');
                        setPartnerProductForm(
                          getEmptyPartnerProductFormForPartner(nextPartnerId, businessPartners)
                        );
                      }}>
                      <option value="">Choose partner</option>
                      {businessPartners.map((partner) => (
                        <option key={partner.id} value={partner.id}>
                          {partner.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-field">
                    <span>Name</span>
                    <input
                      required
                      type="text"
                      value={partnerProductForm.name}
                      onChange={(event) =>
                        setPartnerProductForm((current) => ({ ...current, name: event.target.value }))
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Price</span>
                    <input
                      min="0"
                      step="0.01"
                      type="number"
                      value={partnerProductForm.price}
                      onChange={(event) =>
                        setPartnerProductForm((current) => ({ ...current, price: event.target.value }))
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Category</span>
                    <select
                      value={partnerProductForm.categoryId}
                      onChange={(event) =>
                        setPartnerProductForm((current) => ({
                          ...current,
                          categoryId: event.target.value,
                          subcategoryId: '',
                        }))
                      }>
                      <option value="">Use partner category</option>
                      {serviceCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-field">
                    <span>Sub-category</span>
                    <select
                      value={partnerProductForm.subcategoryId}
                      onChange={(event) =>
                        setPartnerProductForm((current) => ({
                          ...current,
                          subcategoryId: event.target.value,
                        }))
                      }>
                      <option value="">Use partner sub-category</option>
                      {partnerProductFormSubcategories.map((subcategory) => (
                        <option key={subcategory.id} value={subcategory.id}>
                          {subcategory.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-field">
                    <span>SKU</span>
                    <input
                      type="text"
                      value={partnerProductForm.sku}
                      onChange={(event) =>
                        setPartnerProductForm((current) => ({ ...current, sku: event.target.value }))
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Unit label</span>
                    <input
                      placeholder="piece, bottle, pack"
                      type="text"
                      value={partnerProductForm.unitLabel}
                      onChange={(event) =>
                        setPartnerProductForm((current) => ({
                          ...current,
                          unitLabel: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Sort order</span>
                    <input
                      type="number"
                      value={partnerProductForm.sortOrder}
                      onChange={(event) =>
                        setPartnerProductForm((current) => ({
                          ...current,
                          sortOrder: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Image URL</span>
                    <input
                      placeholder="https://example.com/product.jpg"
                      type="url"
                      value={partnerProductForm.imageUrl}
                      onChange={(event) =>
                        setPartnerProductForm((current) => ({
                          ...current,
                          imageUrl: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="form-field wide-field">
                    <span>Description</span>
                    <textarea
                      value={partnerProductForm.description}
                      onChange={(event) =>
                        setPartnerProductForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
                <label className="checkbox-field">
                  <input
                    checked={partnerProductForm.isAvailable}
                    type="checkbox"
                    onChange={(event) =>
                      setPartnerProductForm((current) => ({
                        ...current,
                        isAvailable: event.target.checked,
                      }))
                    }
                  />
                  <span>Product is available</span>
                </label>
                <label className="checkbox-field">
                  <input
                    checked={partnerProductForm.isActive}
                    type="checkbox"
                    onChange={(event) =>
                      setPartnerProductForm((current) => ({
                        ...current,
                        isActive: event.target.checked,
                      }))
                    }
                  />
                  <span>Product is active</span>
                </label>
                <div className="action-row form-action-row">
                  {editingPartnerProductId ? (
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => {
                        setEditingPartnerProductId('');
                        setPartnerProductForm(
                          getEmptyPartnerProductFormForPartner(selectedProductPartnerId, businessPartners)
                        );
                      }}>
                      Cancel edit
                    </button>
                  ) : null}
                  <button className="primary-action-button" disabled={isPartnerProductSaving} type="submit">
                    {isPartnerProductSaving
                      ? 'Saving...'
                      : editingPartnerProductId
                        ? 'Update product'
                        : 'Add product'}
                  </button>
                </div>
              </form>

              {!selectedProductPartnerId ? (
                <p className="empty-state">Choose a partner shop to manage products.</p>
              ) : partnerProducts.length === 0 ? (
                <p className="empty-state">No products found for this partner yet.</p>
              ) : (
                <div className="entity-list compact-entity-grid">
                  {partnerProducts.map((product) => (
                    <article className="entity-card" key={product.id}>
                      <div className="entity-card-header">
                        <div>
                          <h4>{product.name}</h4>
                          <p className="entity-meta">
                            {formatCurrency(Number(product.price))} - {product.unit_label || 'Item'} - Sort{' '}
                            {product.sort_order}
                          </p>
                          <p className="entity-meta">
                            {product.description || 'No description'}{' '}
                            {product.sku ? `- SKU ${product.sku}` : ''}
                          </p>
                          <div className="status-row">
                            <span className={product.is_active ? 'status-pill active' : 'status-pill'}>
                              {product.is_active ? 'Active' : 'Inactive'}
                            </span>
                            <span className={product.is_available ? 'status-pill active' : 'status-pill'}>
                              {product.is_available ? 'Available' : 'Unavailable'}
                            </span>
                          </div>
                        </div>
                        <div className="action-row">
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={() => {
                              setEditingPartnerProductId(product.id);
                              setSelectedProductPartnerId(product.partner_id);
                              setPartnerProductForm(getPartnerProductForm(product));
                            }}>
                            Edit
                          </button>
                          <button
                            className="secondary-button"
                            disabled={savingPartnerProductId === product.id}
                            type="button"
                            onClick={() =>
                              void handlePartnerProductAvailability(product.id, !product.is_available)
                            }>
                            {product.is_available ? 'Mark unavailable' : 'Mark available'}
                          </button>
                          <button
                            className="secondary-button"
                            disabled={!product.is_active || savingPartnerProductId === product.id}
                            type="button"
                            onClick={() => void handlePartnerProductDeactivate(product.id)}>
                            Deactivate
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="food-management-section">
              <div className="section-title-row">
                <h3>Partner Orders / Notifications</h3>
                <span className="count-pill">{unreadPartnerNotificationCount} unread</span>
              </div>

              {partnerOrderNotifications.length === 0 ? (
                <p className="empty-state">No partner order notifications yet.</p>
              ) : (
                <div className="entity-list">
                  {partnerOrderNotifications.map((notification) => (
                    <article className="entity-card notification-card" key={notification.id}>
                      <div className="entity-card-header">
                        <div>
                          <div className="notification-title-row">
                            <h4>{notification.title}</h4>
                            <span
                              className={
                                notification.status === 'unread' ? 'status-pill active' : 'status-pill'
                              }>
                              {notification.status}
                            </span>
                          </div>
                          <p className="entity-meta">
                            {getPartnerName(notification.partner_id, businessPartners)} - Food order:{' '}
                            {notification.food_order_id
                              ? notification.food_order_id.slice(0, 8)
                              : 'No order reference'}
                          </p>
                          <p className="notification-message">{notification.message}</p>
                          <p className="entity-meta">
                            {formatDate(notification.created_at)}
                            {notification.read_at ? ` - Read ${formatDate(notification.read_at)}` : ''}
                          </p>
                        </div>
                        <div className="action-row">
                          <button
                            className="secondary-button"
                            disabled={
                              notification.status === 'read' ||
                              markingPartnerNotificationId === notification.id
                            }
                            type="button"
                            onClick={() => void handleMarkPartnerNotificationRead(notification.id)}>
                            {markingPartnerNotificationId === notification.id ? 'Saving...' : 'Mark read'}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="food-management-section">
              <div className="section-title-row">
                <h3>Partner Dashboard Preview / My Shop</h3>
                <label className="filter-control compact-filter">
                  <span>Preview partner</span>
                  <select
                    value={previewPartnerId}
                    onChange={(event) => void handlePreviewPartnerChange(event.target.value)}>
                    <option value="">Choose partner</option>
                    {businessPartners.map((partner) => (
                      <option key={partner.id} value={partner.id}>
                        {partner.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {previewPartner ? (
                <article className="partner-preview-card">
                  <div className="partner-preview-header">
                    <div>
                      <p className="eyebrow">My Shop</p>
                      <h3>{previewPartner.name}</h3>
                      <p className="entity-meta">
                        {getServiceCategoryName(previewPartner.category_id, serviceCategories)} -{' '}
                        {getServiceSubcategoryName(previewPartner.subcategory_id, serviceSubcategories)}
                      </p>
                    </div>
                    <span className={previewPartner.is_open ? 'status-pill active' : 'status-pill'}>
                      {previewPartner.is_open ? 'Open' : 'Closed'}
                    </span>
                  </div>
                  <div className="partner-notification-summary">
                    <div>
                      <p className="eyebrow">New orders</p>
                      <strong>{previewUnreadNotificationCount} unread notifications</strong>
                    </div>
                    <span className="count-pill">{previewPartnerNotifications.length} latest</span>
                  </div>
                  <div className="partner-preview-grid">
                    <PreviewField label="Description" value={previewPartner.description} />
                    <PreviewField label="Address" value={previewPartner.address} />
                    <PreviewField label="Phone" value={previewPartner.phone} />
                    <PreviewField label="Business hours" value={previewPartner.business_hours} />
                    <PreviewField label="Owner" value={previewPartner.owner_name} />
                    <PreviewField label="Owner email" value={previewPartner.owner_email} />
                    <PreviewField label="Active status" value={previewPartner.is_active ? 'Active' : 'Inactive'} />
                    <PreviewField label="Marketplace status" value={previewPartner.status} />
                  </div>
                  <div className="preview-products-section">
                    <div className="section-title-row">
                      <div>
                        <h3>Products / Menu</h3>
                        <p className="entity-meta">
                          These products appear in the customer app when active and available.
                        </p>
                      </div>
                      <span className="count-pill">{previewPartnerProducts.length} products</span>
                    </div>
                    {previewPartnerProducts.length === 0 ? (
                      <p className="empty-state">No products added for this partner yet.</p>
                    ) : (
                      <div className="entity-list compact-entity-grid">
                        {previewPartnerProducts.map((product) => (
                          <article className="preview-product-card" key={product.id}>
                            <div>
                              <h4>{product.name}</h4>
                              <p className="entity-meta">
                                {formatCurrency(Number(product.price))} - {product.unit_label || 'Item'}
                              </p>
                              <p className="entity-meta">{product.description || 'No description'}</p>
                              <div className="status-row">
                                <span className={product.is_active ? 'status-pill active' : 'status-pill'}>
                                  {product.is_active ? 'Active' : 'Inactive'}
                                </span>
                                <span
                                  className={product.is_available ? 'status-pill active' : 'status-pill'}>
                                  {product.is_available ? 'Available' : 'Unavailable'}
                                </span>
                              </div>
                            </div>
                            <button
                              className="secondary-button"
                              type="button"
                              onClick={() => {
                                setSelectedProductPartnerId(product.partner_id);
                                setEditingPartnerProductId(product.id);
                                setPartnerProductForm(getPartnerProductForm(product));
                              }}>
                              Edit
                            </button>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="preview-notification-list">
                    {previewPartnerNotifications.length === 0 ? (
                      <p className="empty-state">No new partner orders yet.</p>
                    ) : (
                      previewPartnerNotifications.slice(0, 5).map((notification) => (
                        <article className="preview-notification-card" key={notification.id}>
                          <div>
                            <div className="notification-title-row">
                              <h4>{notification.title}</h4>
                              <span
                                className={
                                  notification.status === 'unread' ? 'status-pill active' : 'status-pill'
                                }>
                                {notification.status}
                              </span>
                            </div>
                            <p className="notification-message">{notification.message}</p>
                            <p className="entity-meta">
                              Food order:{' '}
                              {notification.food_order_id
                                ? notification.food_order_id.slice(0, 8)
                                : 'No order reference'}{' '}
                              - {formatDate(notification.created_at)}
                            </p>
                          </div>
                          <button
                            className="secondary-button"
                            disabled={
                              notification.status === 'read' ||
                              markingPartnerNotificationId === notification.id
                            }
                            type="button"
                            onClick={() => void handleMarkPartnerNotificationRead(notification.id)}>
                            {markingPartnerNotificationId === notification.id ? 'Saving...' : 'Mark read'}
                          </button>
                        </article>
                      ))
                    )}
                  </div>
                  <p className="empty-state">Product/menu management coming in Phase 8D.</p>
                  <p className="empty-state">Order management coming in Phase 8D/8E.</p>
                  <p className="entity-meta">
                    Preview users: {previewPartnerUsers.length || 'No linked partner users yet.'}
                  </p>
                </article>
              ) : (
                <p className="empty-state">Choose a partner shop to preview the partner dashboard.</p>
              )}
            </div>
          </div>
        )}
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

function PreviewField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="preview-field">
      <span>{label}</span>
      <strong>{value || 'Not set'}</strong>
    </div>
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

function getRestaurantName(restaurantId: string | null, restaurants: AdminRestaurant[]) {
  if (!restaurantId) {
    return 'Unlinked';
  }

  return (
    restaurants.find((restaurant) => restaurant.id === restaurantId)?.name ?? 'Unknown restaurant'
  );
}

function getPartnerName(partnerId: string, partners: AdminBusinessPartner[]) {
  return partners.find((partner) => partner.id === partnerId)?.name ?? 'Unknown partner';
}

function getServiceCategoryName(
  categoryId: string | null,
  categories: AdminServiceCategory[]
) {
  if (!categoryId) {
    return 'No category';
  }

  return categories.find((category) => category.id === categoryId)?.name ?? 'Unknown category';
}

function getServiceSubcategoryName(
  subcategoryId: string | null,
  subcategories: AdminServiceSubcategory[]
) {
  if (!subcategoryId) {
    return 'No sub-category';
  }

  return (
    subcategories.find((subcategory) => subcategory.id === subcategoryId)?.name ??
    'Unknown sub-category'
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

function getPartnerForm(partner: AdminBusinessPartner): PartnerFormState {
  return {
    address: partner.address ?? '',
    businessHours: partner.business_hours ?? '',
    categoryId: partner.category_id ?? '',
    deliveryFeeLabel: partner.delivery_fee_label ?? '',
    description: partner.description ?? '',
    estimatedTime: partner.estimated_time ?? '',
    imageUrl: partner.image_url ?? '',
    isActive: partner.is_active,
    isOpen: partner.is_open,
    latitude: partner.latitude === null ? '' : String(partner.latitude),
    longitude: partner.longitude === null ? '' : String(partner.longitude),
    name: partner.name,
    ownerEmail: partner.owner_email ?? '',
    ownerName: partner.owner_name ?? '',
    ownerPhone: partner.owner_phone ?? '',
    partnerNotes: partner.partner_notes ?? '',
    phone: partner.phone ?? '',
    rating: partner.rating === null ? '' : String(partner.rating),
    restaurantId: partner.restaurant_id ?? '',
    status: partner.status,
    subcategoryId: partner.subcategory_id ?? '',
  };
}

function getEmptyPartnerProductFormForPartner(
  partnerId: string,
  partners: AdminBusinessPartner[]
): PartnerProductFormState {
  const partner = partners.find((item) => item.id === partnerId);

  return {
    ...emptyPartnerProductForm,
    categoryId: partner?.category_id ?? '',
    partnerId,
    subcategoryId: partner?.subcategory_id ?? '',
  };
}

function getPartnerProductForm(product: AdminPartnerProduct): PartnerProductFormState {
  return {
    categoryId: product.category_id ?? '',
    description: product.description ?? '',
    imageUrl: product.image_url ?? '',
    isActive: product.is_active,
    isAvailable: product.is_available,
    name: product.name,
    partnerId: product.partner_id,
    price: String(product.price),
    sku: product.sku ?? '',
    sortOrder: String(product.sort_order),
    subcategoryId: product.subcategory_id ?? '',
    unitLabel: product.unit_label ?? '',
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

function getPartnerInput(form: PartnerFormState): BusinessPartnerInput {
  return {
    address: normalizeOptionalText(form.address),
    business_hours: normalizeOptionalText(form.businessHours),
    category_id: requireText(form.categoryId, 'Marketplace category'),
    delivery_fee_label: normalizeOptionalText(form.deliveryFeeLabel),
    description: normalizeOptionalText(form.description),
    estimated_time: normalizeOptionalText(form.estimatedTime),
    image_url: normalizeOptionalUrl(form.imageUrl),
    is_active: form.isActive,
    is_open: form.isOpen,
    latitude: normalizeOptionalNumber(form.latitude, 'Latitude'),
    longitude: normalizeOptionalNumber(form.longitude, 'Longitude'),
    name: requireText(form.name, 'Partner shop name'),
    owner_email: normalizeOptionalText(form.ownerEmail),
    owner_name: normalizeOptionalText(form.ownerName),
    owner_phone: normalizeOptionalText(form.ownerPhone),
    partner_notes: normalizeOptionalText(form.partnerNotes),
    phone: normalizeOptionalText(form.phone),
    rating: normalizeOptionalNumber(form.rating, 'Rating'),
    restaurant_id: normalizeOptionalText(form.restaurantId),
    status: requireText(form.status, 'Partner status'),
    subcategory_id: normalizeOptionalText(form.subcategoryId),
  };
}

function getPartnerProductInput(form: PartnerProductFormState): PartnerProductInput {
  return {
    category_id: normalizeOptionalText(form.categoryId),
    description: normalizeOptionalText(form.description),
    image_url: normalizeOptionalUrl(form.imageUrl),
    is_active: form.isActive,
    is_available: form.isAvailable,
    name: requireText(form.name, 'Product name'),
    partner_id: requireText(form.partnerId, 'Partner shop'),
    price: requireNonNegativeNumber(form.price || '0', 'Product price'),
    sku: normalizeOptionalText(form.sku),
    sort_order: requireInteger(form.sortOrder || '0', 'Sort order'),
    subcategory_id: normalizeOptionalText(form.subcategoryId),
    unit_label: normalizeOptionalText(form.unitLabel),
  };
}

function getPartnerUserInput(form: PartnerUserFormState): PartnerUserInput {
  return {
    email: normalizeOptionalText(form.email),
    full_name: normalizeOptionalText(form.fullName),
    is_active: form.isActive,
    partner_id: requireText(form.partnerId, 'Partner shop'),
    phone: normalizeOptionalText(form.phone),
    role: requireText(form.role, 'Partner role'),
    user_id: normalizeOptionalText(form.userId),
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

function requireInteger(value: string, fieldName: string) {
  const numericValue = Number(value);

  if (!Number.isInteger(numericValue)) {
    throw new Error(`${fieldName} must be a whole number.`);
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
