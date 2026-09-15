export const isSuperAdmin = (user) => user?.role === 'admin';

export const isAdminPanelUser = (user) =>
  user?.role === 'admin' || user?.role === 'sub_admin';

export const hasPermission = (user, permission) => {
  if (isSuperAdmin(user)) return true;
  if (!permission || user?.role !== 'sub_admin') return false;
  return Array.isArray(user.permissions) && user.permissions.includes(permission);
};

export const hasAnyPermission = (user, permissions = []) =>
  isSuperAdmin(user) || permissions.some((permission) => hasPermission(user, permission));

export const canAccessMenuItem = (user, item) => {
  if (item.superAdminOnly) return isSuperAdmin(user);
  if (item.permission) return hasPermission(user, item.permission);
  if (item.anyPermissions) return hasAnyPermission(user, item.anyPermissions);
  return isSuperAdmin(user);
};

const LANDING_ROUTES = [
  ['dashboard.read', '/'],
  ['products.read', '/products'],
  ['orders.read', '/orders'],
  ['customers.read', '/users'],
  ['categories.read', '/categories'],
  ['collections.read', '/collections'],
  ['suppliers.read', '/suppliers'],
  ['inventory.read', '/inventory'],
  ['reviews.read', '/reviews'],
  ['promotions.read', '/promotions'],
  ['returns.read', '/returns'],
  ['newsletter.subscribers.read', '/newsletter/subscribers'],
  ['newsletter.broadcasts.read', '/newsletter/broadcasts'],
  ['settings.read', '/settings'],
];

export const getFirstPermittedPath = (user) => {
  if (isSuperAdmin(user)) return '/';
  return LANDING_ROUTES.find(([permission]) => hasPermission(user, permission))?.[1]
    || '/access-denied';
};
