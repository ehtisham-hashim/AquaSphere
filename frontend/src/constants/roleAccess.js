/**
 * Role Access Control Matrix for Sidebar Pages
 * 
 * Provides explicit "On / Off" boolean switches for every sidebar page route
 * based on user roles defined in `backend/prisma/schema.prisma`:
 * - OWNER
 * - ADMIN
 * - PRODUCTION_MANAGER
 * - ACCOUNTANT
 * - MARKETING_MANAGER
 * 
 * Simply flip a route's boolean value to `true` (enabled) or `false` (disabled)
 * to control page visibility in the Sidebar for any role.
 */

export const ROLES = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  PRODUCTION_MANAGER: 'PRODUCTION_MANAGER',
  ACCOUNTANT: 'ACCOUNTANT',
  MARKETING_MANAGER: 'MARKETING_MANAGER',
};

export const SIDEBAR_ROUTES = {
  DASHBOARD: '/',
  ORDERS: '/orders',
  CUSTOMERS: '/customers',
  PRODUCTION: '/production',
  RAW_MATERIALS: '/raw-materials',
  BOTTLE_LEDGER: '/bottle-ledger',
  PURCHASES: '/purchases',
  VENDORS: '/vendors',
  EXPENSES: '/expenses',
  COUNTER_SALES: '/counter-sales',
  USERS: '/users',
  DAILY_CLOSE: '/daily-close',
  INVENTORY: '/inventory',
};

/**
 * Access Matrix per Role per Tenant
 * Key: Tenant ('aquasphere' | 'wadaana') -> Role -> Route Path -> Boolean (true = visible, false = hidden)
 */
export const ROLE_ACCESS = {
  aquasphere: {
    [ROLES.OWNER]: {
      [SIDEBAR_ROUTES.DASHBOARD]: true,
      [SIDEBAR_ROUTES.ORDERS]: true,
      [SIDEBAR_ROUTES.CUSTOMERS]: true,
      [SIDEBAR_ROUTES.PRODUCTION]: true,
      [SIDEBAR_ROUTES.RAW_MATERIALS]: true,
      [SIDEBAR_ROUTES.BOTTLE_LEDGER]: false,
      [SIDEBAR_ROUTES.PURCHASES]: true,
      [SIDEBAR_ROUTES.VENDORS]: true,
      [SIDEBAR_ROUTES.EXPENSES]: true,
      [SIDEBAR_ROUTES.COUNTER_SALES]: true,
      [SIDEBAR_ROUTES.USERS]: true,
      [SIDEBAR_ROUTES.DAILY_CLOSE]: true,
    },
    [ROLES.ADMIN]: {
      [SIDEBAR_ROUTES.DASHBOARD]: true,
      [SIDEBAR_ROUTES.ORDERS]: true,
      [SIDEBAR_ROUTES.CUSTOMERS]: true,
      [SIDEBAR_ROUTES.PRODUCTION]: true,
      [SIDEBAR_ROUTES.RAW_MATERIALS]: true,
      [SIDEBAR_ROUTES.BOTTLE_LEDGER]: true,
      [SIDEBAR_ROUTES.PURCHASES]: true,
      [SIDEBAR_ROUTES.VENDORS]: true,
      [SIDEBAR_ROUTES.EXPENSES]: true,
      [SIDEBAR_ROUTES.COUNTER_SALES]: true,
      [SIDEBAR_ROUTES.USERS]: true,
      [SIDEBAR_ROUTES.DAILY_CLOSE]: true,
    },
    [ROLES.PRODUCTION_MANAGER]: {
      [SIDEBAR_ROUTES.DASHBOARD]: true,
      [SIDEBAR_ROUTES.ORDERS]: false,
      [SIDEBAR_ROUTES.CUSTOMERS]: false,
      [SIDEBAR_ROUTES.PRODUCTION]: true,
      [SIDEBAR_ROUTES.RAW_MATERIALS]: true,
      [SIDEBAR_ROUTES.BOTTLE_LEDGER]: true,
      [SIDEBAR_ROUTES.PURCHASES]: true,
      [SIDEBAR_ROUTES.VENDORS]: false,
      [SIDEBAR_ROUTES.EXPENSES]: false,
      [SIDEBAR_ROUTES.COUNTER_SALES]: false,
      [SIDEBAR_ROUTES.USERS]: false,
      [SIDEBAR_ROUTES.DAILY_CLOSE]: true,
    },
    [ROLES.ACCOUNTANT]: {
      [SIDEBAR_ROUTES.DASHBOARD]: true,
      [SIDEBAR_ROUTES.ORDERS]: true,
      [SIDEBAR_ROUTES.CUSTOMERS]: true,
      [SIDEBAR_ROUTES.PRODUCTION]: false,
      [SIDEBAR_ROUTES.RAW_MATERIALS]: true,
      [SIDEBAR_ROUTES.BOTTLE_LEDGER]: false,
      [SIDEBAR_ROUTES.PURCHASES]: true,
      [SIDEBAR_ROUTES.VENDORS]: true,
      [SIDEBAR_ROUTES.EXPENSES]: true,
      [SIDEBAR_ROUTES.COUNTER_SALES]: true,
      [SIDEBAR_ROUTES.USERS]: false,
      [SIDEBAR_ROUTES.DAILY_CLOSE]: true,
    },
    [ROLES.MARKETING_MANAGER]: {
      [SIDEBAR_ROUTES.DASHBOARD]: true,
      [SIDEBAR_ROUTES.ORDERS]: true,
      [SIDEBAR_ROUTES.CUSTOMERS]: true,
      [SIDEBAR_ROUTES.PRODUCTION]: true,
      [SIDEBAR_ROUTES.RAW_MATERIALS]: true,
      [SIDEBAR_ROUTES.BOTTLE_LEDGER]: true,
      [SIDEBAR_ROUTES.PURCHASES]: true,
      [SIDEBAR_ROUTES.VENDORS]: true,
      [SIDEBAR_ROUTES.EXPENSES]: true,
      [SIDEBAR_ROUTES.COUNTER_SALES]: true,
      [SIDEBAR_ROUTES.USERS]: false,
      [SIDEBAR_ROUTES.DAILY_CLOSE]: true,
    },
  },
  wadaana: {
    [ROLES.OWNER]: {
      [SIDEBAR_ROUTES.DASHBOARD]: true,
      [SIDEBAR_ROUTES.ORDERS]: true,
      [SIDEBAR_ROUTES.CUSTOMERS]: true,
      [SIDEBAR_ROUTES.PRODUCTION]: true,
      [SIDEBAR_ROUTES.INVENTORY]: true,
      [SIDEBAR_ROUTES.RAW_MATERIALS]: true,
      [SIDEBAR_ROUTES.BOTTLE_LEDGER]: false,
      [SIDEBAR_ROUTES.PURCHASES]: true,
      [SIDEBAR_ROUTES.VENDORS]: true,
      [SIDEBAR_ROUTES.EXPENSES]: true,
      [SIDEBAR_ROUTES.COUNTER_SALES]: false,
      [SIDEBAR_ROUTES.USERS]: true,
      [SIDEBAR_ROUTES.DAILY_CLOSE]: true,
    },
    [ROLES.ADMIN]: {
      [SIDEBAR_ROUTES.DASHBOARD]: true,
      [SIDEBAR_ROUTES.ORDERS]: true,
      [SIDEBAR_ROUTES.CUSTOMERS]: true,
      [SIDEBAR_ROUTES.PRODUCTION]: true,
      [SIDEBAR_ROUTES.INVENTORY]: true,
      [SIDEBAR_ROUTES.RAW_MATERIALS]: true,
      [SIDEBAR_ROUTES.BOTTLE_LEDGER]: false,
      [SIDEBAR_ROUTES.PURCHASES]: true,
      [SIDEBAR_ROUTES.VENDORS]: true,
      [SIDEBAR_ROUTES.EXPENSES]: true,
      [SIDEBAR_ROUTES.COUNTER_SALES]: false,
      [SIDEBAR_ROUTES.USERS]: true,
      [SIDEBAR_ROUTES.DAILY_CLOSE]: true,
    },
    [ROLES.PRODUCTION_MANAGER]: {
      [SIDEBAR_ROUTES.DASHBOARD]: true,
      [SIDEBAR_ROUTES.ORDERS]: true,
      [SIDEBAR_ROUTES.CUSTOMERS]: true,
      [SIDEBAR_ROUTES.PRODUCTION]: true,
      [SIDEBAR_ROUTES.INVENTORY]: true,
      [SIDEBAR_ROUTES.RAW_MATERIALS]: true,
      [SIDEBAR_ROUTES.BOTTLE_LEDGER]: false,
      [SIDEBAR_ROUTES.PURCHASES]: true,
      [SIDEBAR_ROUTES.VENDORS]: true,
      [SIDEBAR_ROUTES.EXPENSES]: true,
      [SIDEBAR_ROUTES.COUNTER_SALES]: false,
      [SIDEBAR_ROUTES.USERS]: false,
      [SIDEBAR_ROUTES.DAILY_CLOSE]: true,
    },
    [ROLES.ACCOUNTANT]: {
      [SIDEBAR_ROUTES.DASHBOARD]: true,
      [SIDEBAR_ROUTES.ORDERS]: true,
      [SIDEBAR_ROUTES.CUSTOMERS]: true,
      [SIDEBAR_ROUTES.PRODUCTION]: false,
      [SIDEBAR_ROUTES.INVENTORY]: true,
      [SIDEBAR_ROUTES.RAW_MATERIALS]: true,
      [SIDEBAR_ROUTES.BOTTLE_LEDGER]: false,
      [SIDEBAR_ROUTES.PURCHASES]: true,
      [SIDEBAR_ROUTES.VENDORS]: true,
      [SIDEBAR_ROUTES.EXPENSES]: true,
      [SIDEBAR_ROUTES.COUNTER_SALES]: false,
      [SIDEBAR_ROUTES.USERS]: false,
      [SIDEBAR_ROUTES.DAILY_CLOSE]: true,
    },
    [ROLES.MARKETING_MANAGER]: {
      [SIDEBAR_ROUTES.DASHBOARD]: true,
      [SIDEBAR_ROUTES.ORDERS]: true,
      [SIDEBAR_ROUTES.CUSTOMERS]: true,
      [SIDEBAR_ROUTES.PRODUCTION]: true,
      [SIDEBAR_ROUTES.INVENTORY]: true,
      [SIDEBAR_ROUTES.RAW_MATERIALS]: true,
      [SIDEBAR_ROUTES.BOTTLE_LEDGER]: false,
      [SIDEBAR_ROUTES.PURCHASES]: true,
      [SIDEBAR_ROUTES.VENDORS]: true,
      [SIDEBAR_ROUTES.EXPENSES]: true,
      [SIDEBAR_ROUTES.COUNTER_SALES]: false,
      [SIDEBAR_ROUTES.USERS]: false,
      [SIDEBAR_ROUTES.DAILY_CLOSE]: true,
    },
  },
};

/**
 * Checks whether a given role is allowed to see a sidebar page route.
 * 
 * @param {string} role - User role (OWNER, ADMIN, PRODUCTION_MANAGER, ACCOUNTANT, MARKETING_MANAGER)
 * @param {string} path - Sidebar navigation route path (e.g. '/orders')
 * @param {string} [tenant='aquasphere'] - Current company tenant ('aquasphere' | 'wadaana')
 * @returns {boolean} true if page is enabled, false if disabled
 */
export const isPageAllowedForRole = (role, path, tenant = 'aquasphere') => {
  const tenantKey = String(tenant).toLowerCase() === 'wadaana' ? 'wadaana' : 'aquasphere';
  const tenantAccess = ROLE_ACCESS[tenantKey] || ROLE_ACCESS.aquasphere;
  const roleRules = tenantAccess[role] || ROLE_ACCESS.aquasphere[ROLES.OWNER];

  if (roleRules && typeof roleRules[path] === 'boolean') {
    return roleRules[path];
  }

  // Default to true if not specified
  return true;
};
