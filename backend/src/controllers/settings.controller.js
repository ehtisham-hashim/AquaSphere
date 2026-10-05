import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getTenantPrefix } from '../utils/tenant.js';
import { sendSuccess } from '../utils/response.js';

export const DEFAULT_OPERATIONAL_CONFIG = {
  aquasphere: {
    orderThresholds: {
      Home: 10,
      Office: 30,
      Corporate: 100,
      Shop: 50,
      Restaurant: 100,
      Commercial: 200,
      Distributor: 1000
    },
    enableLowStockWarning: true,
    enableQuantityAlert: true,
    enforceOnlyOn19L: true
  },
  wadaana: {
    orderThresholds: {
      Home: 5000,
      Office: 10000,
      Corporate: 20000,
      Commercial: 20000,
      Distributor: 50000
    },
    enableLowStockWarning: true,
    enableQuantityAlert: false,
    enforceOnlyOn19L: false
  }
};

export async function getTenantOperationalDefaults(prefix) {
  const tenantKey = prefix.includes('wadaana') ? 'wadaana' : 'aquasphere';
  const defaults = DEFAULT_OPERATIONAL_CONFIG[tenantKey];

  try {
    const setting = await prisma[`${prefix}TenantSetting`].findUnique({
      where: { key: 'OPERATIONAL_DEFAULTS' }
    });
    if (setting?.value && typeof setting.value === 'object') {
      return {
        ...defaults,
        ...setting.value,
        orderThresholds: {
          ...defaults.orderThresholds,
          ...(setting.value.orderThresholds || {})
        }
      };
    }
  } catch (err) {
    console.error('Failed to load operational settings from DB, using fallback defaults:', err);
  }

  return defaults;
}

export const getOperationalDefaults = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const settings = await getTenantOperationalDefaults(prefix);
  return sendSuccess(res, settings);
});

export const updateOperationalDefaults = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { orderThresholds, enableLowStockWarning, enableQuantityAlert, enforceOnlyOn19L } = req.body;

  const current = await getTenantOperationalDefaults(prefix);
  const updatedValue = {
    ...current,
    ...(enableLowStockWarning !== undefined ? { enableLowStockWarning: Boolean(enableLowStockWarning) } : {}),
    ...(enableQuantityAlert !== undefined ? { enableQuantityAlert: Boolean(enableQuantityAlert) } : {}),
    ...(enforceOnlyOn19L !== undefined ? { enforceOnlyOn19L: Boolean(enforceOnlyOn19L) } : {}),
    orderThresholds: {
      ...current.orderThresholds,
      ...(orderThresholds && typeof orderThresholds === 'object' ? orderThresholds : {})
    }
  };

  const saved = await prisma[`${prefix}TenantSetting`].upsert({
    where: { key: 'OPERATIONAL_DEFAULTS' },
    update: { value: updatedValue },
    create: { key: 'OPERATIONAL_DEFAULTS', value: updatedValue }
  });

  return sendSuccess(res, saved.value);
});
