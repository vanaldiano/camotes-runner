export type CustomerService = {
  title: string;
  description: string;
  accentColor: string;
  icon: {
    ios: string;
    android: string;
    web: string;
  };
};

export const customerServices: CustomerService[] = [
  {
    title: 'Ride',
    description: 'Transportation around Camotes',
    accentColor: '#1E8E3E',
    icon: { ios: 'motorcycle', android: 'two_wheeler', web: 'two_wheeler' },
  },
  {
    title: 'Groceries',
    description: 'Store pickup and delivery',
    accentColor: '#8BC34A',
    icon: { ios: 'basket', android: 'shopping_basket', web: 'shopping_basket' },
  },
  {
    title: 'Medicine',
    description: 'Fast medicine assistance',
    accentColor: '#0B6B22',
    icon: { ios: 'cross.case', android: 'medical_services', web: 'medical_services' },
  },
  {
    title: 'Documents',
    description: 'Pickup and drop-off',
    accentColor: '#E7A900',
    icon: { ios: 'doc.text', android: 'description', web: 'description' },
  },
  {
    title: 'Tours',
    description: 'Explore Camotes Island',
    accentColor: '#2E7D32',
    icon: { ios: 'beach.umbrella', android: 'beach_access', web: 'beach_access' },
  },
  {
    title: 'Errands',
    description: 'Personal assistance',
    accentColor: '#6FBA2C',
    icon: { ios: 'shippingbox', android: 'package_2', web: 'package_2' },
  },
];

export const promotions = [
  {
    title: '20% Off First Ride',
    description: 'Start exploring Camotes with a local runner.',
  },
  {
    title: 'Free Delivery Fridays',
    description: 'Save on groceries, medicine, and documents.',
  },
  {
    title: 'Island Tour Packages',
    description: 'Plan transport for beach stops and day trips.',
  },
];

export const quickActions = [
  {
    title: 'Book Again',
    icon: { ios: 'arrow.clockwise', android: 'history', web: 'history' },
  },
  {
    title: 'Track Runner',
    icon: { ios: 'location.fill', android: 'near_me', web: 'near_me' },
  },
  {
    title: 'Saved Places',
    icon: { ios: 'mappin.and.ellipse', android: 'place', web: 'place' },
  },
  {
    title: 'Support',
    icon: { ios: 'headphones', android: 'support_agent', web: 'support_agent' },
  },
];

export const activityItems = [
  {
    service: 'Ride',
    date: 'Today, 8:20 AM',
    fare: 'PHP 120',
    status: 'Pending',
    color: '#FFC928',
  },
  {
    service: 'Groceries',
    date: 'Today, 10:15 AM',
    fare: 'PHP 90',
    status: 'Accepted',
    color: '#8BC34A',
  },
  {
    service: 'Medicine',
    date: 'Yesterday, 3:40 PM',
    fare: 'PHP 75',
    status: 'Runner Arriving',
    color: '#1E8E3E',
  },
  {
    service: 'Documents',
    date: 'May 30, 2026',
    fare: 'PHP 65',
    status: 'In Progress',
    color: '#0B6B22',
  },
  {
    service: 'Tours',
    date: 'May 28, 2026',
    fare: 'PHP 650',
    status: 'Completed',
    color: '#12321F',
  },
  {
    service: 'Errands',
    date: 'May 26, 2026',
    fare: 'PHP 50',
    status: 'Cancelled',
    color: '#D93F35',
  },
];
