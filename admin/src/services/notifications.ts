import { supabase } from '../lib/supabase';

import type {
  BookingStatus,
  FoodOrderStatus,
  Json,
  NotificationRecipientType,
} from '../../../src/types/database';

type NotificationContent = {
  body: string;
  data?: Record<string, string>;
  recipientId: string | null;
  recipientType: NotificationRecipientType;
  title: string;
  token: string | null;
};

const expoPushTokenPattern = /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/;

const bookingStatusNotifications: Partial<Record<BookingStatus, { body: string; title: string }>> = {
  accepted: {
    body: 'A rider accepted your booking.',
    title: 'Ride accepted',
  },
  cancelled: {
    body: 'Your ride booking was cancelled.',
    title: 'Ride cancelled',
  },
  completed: {
    body: 'Your ride is complete. Thanks for using Camotes Runner.',
    title: 'Ride completed',
  },
  runner_arriving: {
    body: 'Your rider is heading to your pickup location.',
    title: 'Runner arriving',
  },
};

const foodStatusNotifications: Partial<Record<FoodOrderStatus, { body: string; title: string }>> = {
  cancelled: {
    body: 'Your food order was cancelled.',
    title: 'Food order cancelled',
  },
  delivered: {
    body: 'Your food order has been delivered.',
    title: 'Food delivered',
  },
  on_the_way: {
    body: 'Your rider is on the way with your food.',
    title: 'Food on the way',
  },
  picked_up: {
    body: 'Your rider picked up your food order.',
    title: 'Food picked up',
  },
  preparing: {
    body: 'The restaurant is preparing your food.',
    title: 'Food preparing',
  },
};

export async function notifyCustomerForBookingStatus(
  bookingId: string,
  customerId: string | null,
  status: BookingStatus
) {
  const content = bookingStatusNotifications[status];

  if (!content) {
    return;
  }

  const token = customerId ? await getProfilePushToken(customerId) : null;
  await sendAndLogNotification({
    body: content.body,
    data: { bookingId, status, type: 'ride_status' },
    recipientId: customerId,
    recipientType: 'customer',
    title: content.title,
    token,
  });
}

export async function notifyCustomerForFoodStatus(
  foodOrderId: string,
  customerId: string | null,
  status: FoodOrderStatus
) {
  const content = foodStatusNotifications[status];

  if (!content) {
    return;
  }

  const token = customerId ? await getProfilePushToken(customerId) : null;
  await sendAndLogNotification({
    body: content.body,
    data: { foodOrderId, status, type: 'food_status' },
    recipientId: customerId,
    recipientType: 'customer',
    title: content.title,
    token,
  });
}

export async function notifyRiderForBookingAssignment(bookingId: string, riderId: string | null) {
  if (!riderId) {
    return;
  }

  const token = await getRiderPushToken(riderId);
  await sendAndLogNotification({
    body: 'A ride or errand booking has been assigned to you.',
    data: { bookingId, type: 'ride_assigned' },
    recipientId: riderId,
    recipientType: 'rider',
    title: 'New ride assigned',
    token,
  });
}

export async function notifyRiderForFoodAssignment(foodOrderId: string, riderId: string | null) {
  if (!riderId) {
    return;
  }

  const token = await getRiderPushToken(riderId);
  await sendAndLogNotification({
    body: 'A food delivery has been assigned to you.',
    data: { foodOrderId, type: 'food_assigned' },
    recipientId: riderId,
    recipientType: 'rider',
    title: 'New food delivery',
    token,
  });
}

async function getProfilePushToken(profileId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('push_token')
    .eq('id', profileId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.push_token ?? null;
}

async function getRiderPushToken(riderId: string) {
  const { data, error } = await supabase
    .from('riders')
    .select('push_token')
    .eq('id', riderId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.push_token ?? null;
}

async function sendAndLogNotification(content: NotificationContent) {
  if (!content.token) {
    await logNotification(content, 'skipped', 'No push token available.');
    return;
  }

  if (!isValidExpoPushToken(content.token)) {
    const errorMessage = 'Invalid Expo push token format.';
    console.error('Admin push notification skipped because token format is invalid', {
      recipientId: content.recipientId,
      recipientType: content.recipientType,
      tokenPreview: previewPushToken(content.token),
    });
    await logNotification(content, 'failed', errorMessage);
    return;
  }

  try {
    await sendExpoPushNotification({
      body: content.body,
      data: content.data,
      title: content.title,
      to: content.token,
    });
    await logNotification(content, 'sent');
  } catch (error) {
    await logNotification(content, 'failed', getErrorMessage(error));
    throw error;
  }
}

async function sendExpoPushNotification({
  body,
  data = {},
  title,
  to,
}: {
  body: string;
  data?: Record<string, string>;
  title: string;
  to: string;
}) {
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    body: JSON.stringify({
      body,
      data,
      sound: 'default',
      title,
      to,
    }),
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });
  const responseText = await response.text();
  const responseBody = parseExpoResponse(responseText);
  const responseLog = {
    body: responseBody,
    status: response.status,
    tokenFormatValid: isValidExpoPushToken(to),
    tokenPreview: previewPushToken(to),
  };

  if (!response.ok) {
    console.error('Admin Expo push send failed', responseLog);
    throw new Error(`Expo push service returned ${response.status}: ${responseText}`);
  }

  console.log('Admin Expo push send response', responseLog);
}

async function logNotification(
  content: NotificationContent,
  status: 'sent' | 'failed' | 'skipped',
  errorMessage?: string
) {
  const { error } = await supabase.from('notification_logs').insert({
    body: content.body,
    data: (content.data ?? {}) as Json,
    error_message: errorMessage ?? null,
    push_token: content.token,
    recipient_id: content.recipientId,
    recipient_type: content.recipientType,
    status,
    title: content.title,
  });

  if (error) {
    throw error;
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error && 'message' in error) {
    return String(error.message);
  }

  return 'Unable to send notification.';
}

function isValidExpoPushToken(pushToken: string | null | undefined) {
  return typeof pushToken === 'string' && expoPushTokenPattern.test(pushToken);
}

function parseExpoResponse(responseText: string) {
  try {
    return JSON.parse(responseText) as unknown;
  } catch {
    return responseText;
  }
}

function previewPushToken(pushToken: string) {
  if (pushToken.length <= 18) {
    return pushToken;
  }

  return `${pushToken.slice(0, 14)}...${pushToken.slice(-4)}`;
}
