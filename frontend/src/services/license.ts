import AsyncStorage from '@react-native-async-storage/async-storage';

const LICENSE_KEY = '@sos_inventario_license';
const DEFAULT_TRIAL_DAYS = 7;
const LICENSE_API_URL = 'https://sos-inventario-license-api.onrender.com';
const OFFLINE_GRACE_DAYS = 7;

export type LicenseData = {
  firstLaunchDate: string;
  trialDays: number;
  isPremium: boolean;
  premiumExpiresAt: string | null;
  activationCode: string | null;
  companyName: string | null;
  ownerName: string | null;
  deviceId: string | null;
  lastValidatedAt: string | null;
};

let storageAvailable = true;
let memoryLicense: LicenseData | null = null;

const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const diffInDays = (start: Date, end: Date) => {
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
};

const generateDeviceId = () => {
  return `DEVICE-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`.toUpperCase();
};

export const getDefaultLicense = (): LicenseData => ({
  firstLaunchDate: new Date().toISOString(),
  trialDays: DEFAULT_TRIAL_DAYS,
  isPremium: false,
  premiumExpiresAt: null,
  activationCode: null,
  companyName: null,
  ownerName: null,
  deviceId: null,
  lastValidatedAt: null,
});

const safeGetItem = async (key: string): Promise<string | null> => {
  if (!storageAvailable) {
    return memoryLicense ? JSON.stringify(memoryLicense) : null;
  }

  try {
    return await AsyncStorage.getItem(key);
  } catch (error) {
    console.warn('AsyncStorage indisponível no license.ts, usando memória:', error);
    storageAvailable = false;
    return memoryLicense ? JSON.stringify(memoryLicense) : null;
  }
};

const safeSetItem = async (key: string, value: string): Promise<void> => {
  if (!storageAvailable) {
    memoryLicense = JSON.parse(value);
    return;
  }

  try {
    await AsyncStorage.setItem(key, value);
  } catch (error) {
    console.warn('Erro ao salvar no AsyncStorage, usando memória:', error);
    storageAvailable = false;
    memoryLicense = JSON.parse(value);
  }
};

const safeRemoveItem = async (): Promise<void> => {
  if (!storageAvailable) {
    memoryLicense = null;
    return;
  }

  try {
    await AsyncStorage.removeItem(LICENSE_KEY);
  } catch (error) {
    console.warn('Erro ao remover licença:', error);
    storageAvailable = false;
    memoryLicense = null;
  }
};

export const initLicense = async (): Promise<LicenseData> => {
  const existing = await safeGetItem(LICENSE_KEY);

  if (existing) {
    const parsed = JSON.parse(existing) as LicenseData;

    if (!parsed.deviceId) {
      parsed.deviceId = generateDeviceId();
      await safeSetItem(LICENSE_KEY, JSON.stringify(parsed));
    }

    memoryLicense = parsed;
    return parsed;
  }

  const initial = getDefaultLicense();
  initial.deviceId = generateDeviceId();
  memoryLicense = initial;
  await safeSetItem(LICENSE_KEY, JSON.stringify(initial));
  return initial;
};

export const getLicense = async (): Promise<LicenseData> => {
  const data = await safeGetItem(LICENSE_KEY);

  if (!data) {
    return initLicense();
  }

  const parsed = JSON.parse(data) as LicenseData;
  memoryLicense = parsed;
  return parsed;
};

export const saveLicense = async (license: LicenseData): Promise<void> => {
  memoryLicense = license;
  await safeSetItem(LICENSE_KEY, JSON.stringify(license));
};

export const clearLicense = async (): Promise<void> => {
  memoryLicense = null;
  await safeRemoveItem();
};

export const getTrialInfo = async () => {
  const license = await getLicense();
  const firstLaunch = new Date(license.firstLaunchDate);
  const now = new Date();

  const usedDays = diffInDays(firstLaunch, now);
  const remainingDays = Math.max(0, license.trialDays - usedDays);
  const expired = remainingDays <= 0;
  const trialEndsAt = addDays(firstLaunch, license.trialDays).toISOString();

  return {
    usedDays,
    remainingDays,
    expired,
    trialEndsAt,
  };
};

export const activateLicenseOnline = async (
  code: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const current = await getLicense();

    const response = await fetch(`${LICENSE_API_URL}/license/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        activationCode: code.trim().toUpperCase(),
        deviceId: current.deviceId,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        message: data.message || 'Não foi possível ativar a licença.',
      };
    }

    const updated: LicenseData = {
      ...current,
      isPremium: true,
      premiumExpiresAt: data.license.expiresAt,
      activationCode: data.license.activationCode,
      companyName: data.license.companyName ?? null,
      ownerName: data.license.ownerName ?? null,
      lastValidatedAt: new Date().toISOString(),
    };

    await saveLicense(updated);

    return {
      success: true,
      message: data.message || 'Licença ativada com sucesso.',
    };
  } catch (error) {
    return {
      success: false,
      message: 'Falha na conexão com o servidor de licença.',
    };
  }
};

export const checkLicenseOnline = async (): Promise<{
  success: boolean;
  hasAccess: boolean;
  message: string;
}> => {
  try {
    const current = await getLicense();

    if (!current.activationCode) {
      return {
        success: false,
        hasAccess: false,
        message: 'Nenhuma licença ativada.',
      };
    }

    const response = await fetch(`${LICENSE_API_URL}/license/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        activationCode: current.activationCode,
        deviceId: current.deviceId,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success || !data.hasAccess) {
      return {
        success: false,
        hasAccess: false,
        message: data.message || 'Licença inválida.',
      };
    }

    const updated: LicenseData = {
      ...current,
      isPremium: true,
      premiumExpiresAt: data.license.expiresAt,
      activationCode: data.license.activationCode,
      companyName: data.license.companyName ?? null,
      ownerName: data.license.ownerName ?? null,
      lastValidatedAt: new Date().toISOString(),
    };

    await saveLicense(updated);

    return {
      success: true,
      hasAccess: true,
      message: data.message || 'Licença válida.',
    };
  } catch (error) {
    return {
      success: false,
      hasAccess: false,
      message: 'Falha ao validar licença online.',
    };
  }
};

export const isLicenseActive = async (): Promise<boolean> => {
  const license = await getLicense();
  const trial = await getTrialInfo();

  if (!trial.expired) {
    return true;
  }

  if (!license.isPremium || !license.premiumExpiresAt) {
    return false;
  }

  const premiumValid = new Date(license.premiumExpiresAt).getTime() > Date.now();

  if (!premiumValid) {
    return false;
  }

  if (!license.lastValidatedAt) {
    return true;
  }

  const lastValidation = new Date(license.lastValidatedAt);
  const now = new Date();
  const daysSinceValidation = diffInDays(lastValidation, now);

  return daysSinceValidation <= OFFLINE_GRACE_DAYS;
};

export const getLicenseStatus = async () => {
  const license = await getLicense();
  const trial = await getTrialInfo();

  const premiumActive =
    !!license.isPremium &&
    !!license.premiumExpiresAt &&
    new Date(license.premiumExpiresAt).getTime() > Date.now();

  return {
    trialRemainingDays: trial.remainingDays,
    trialExpired: trial.expired,
    premiumActive,
    premiumExpiresAt: license.premiumExpiresAt,
    activationCode: license.activationCode,
    companyName: license.companyName,
    ownerName: license.ownerName,
    deviceId: license.deviceId,
    lastValidatedAt: license.lastValidatedAt,
    hasAccess: !trial.expired || premiumActive,
  };
};

export const getDaysUntilExpiration = async (): Promise<number | null> => {
  const license = await getLicense();

  if (!license.premiumExpiresAt) return null;

  const now = new Date();
  const expiresAt = new Date(license.premiumExpiresAt);
  const diff = expiresAt.getTime() - now.getTime();

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export const isLicenseExpiringSoon = async (): Promise<boolean> => {
  const days = await getDaysUntilExpiration();

  if (days === null) return false;

  return days <= 7;
};

export const deactivatePremium = async (): Promise<void> => {
  const current = await getLicense();

  await saveLicense({
    ...current,
    isPremium: false,
    premiumExpiresAt: null,
    activationCode: null,
    companyName: null,
    ownerName: null,
    lastValidatedAt: null,
  });
};