import AsyncStorage from '@react-native-async-storage/async-storage';

const LICENSE_KEY = '@sos_inventario_license';
const DEFAULT_TRIAL_DAYS = 7;

export type LicenseData = {
  firstLaunchDate: string;
  trialDays: number;
  isPremium: boolean;
  premiumExpiresAt: string | null;
  activationCode: string | null;
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

export const getDefaultLicense = (): LicenseData => ({
  firstLaunchDate: new Date().toISOString(),
  trialDays: DEFAULT_TRIAL_DAYS,
  isPremium: false,
  premiumExpiresAt: null,
  activationCode: null,
});

const safeGetItem = async (key: string): Promise<string | null> => {
  if (!storageAvailable) return memoryLicense ? JSON.stringify(memoryLicense) : null;

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

const safeRemoveItem = async (key: string): Promise<void> => {
  if (!storageAvailable) {
    memoryLicense = null;
    return;
  }

  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.warn('Erro ao remover licença do AsyncStorage:', error);
    storageAvailable = false;
    memoryLicense = null;
  }
};

export const initLicense = async (): Promise<LicenseData> => {
  const existing = await safeGetItem(LICENSE_KEY);

  if (existing) {
    const parsed = JSON.parse(existing);
    memoryLicense = parsed;
    return parsed;
  }

  const initial = getDefaultLicense();
  memoryLicense = initial;
  await safeSetItem(LICENSE_KEY, JSON.stringify(initial));
  return initial;
};

export const getLicense = async (): Promise<LicenseData> => {
  const data = await safeGetItem(LICENSE_KEY);

  if (!data) {
    return initLicense();
  }

  const parsed = JSON.parse(data);
  memoryLicense = parsed;
  return parsed;
};

export const saveLicense = async (license: LicenseData): Promise<void> => {
  memoryLicense = license;
  await safeSetItem(LICENSE_KEY, JSON.stringify(license));
};

export const clearLicense = async (): Promise<void> => {
  memoryLicense = null;
  await safeRemoveItem(LICENSE_KEY);
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

export const isLicenseActive = async (): Promise<boolean> => {
  const license = await getLicense();
  const trial = await getTrialInfo();

  if (!trial.expired) {
    return true;
  }

  if (!license.isPremium || !license.premiumExpiresAt) {
    return false;
  }

  return new Date(license.premiumExpiresAt).getTime() > Date.now();
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
    hasAccess: !trial.expired || premiumActive,
  };
};

export const activateLicense = async (
  code: string
): Promise<{ success: boolean; message: string }> => {
  const normalized = code.trim().toUpperCase();

  const validCodes: Record<string, number> = {
    SOS30: 30,
    SOS90: 90,
    SOS365: 365,
  };

  const days = validCodes[normalized];

  if (!days) {
    return {
      success: false,
      message: 'Código inválido.',
    };
  }

  const now = new Date();
  const expiresAt = addDays(now, days).toISOString();
  const current = await getLicense();

  const updated: LicenseData = {
    ...current,
    isPremium: true,
    premiumExpiresAt: expiresAt,
    activationCode: normalized,
  };

  await saveLicense(updated);

  return {
    success: true,
    message: `Licença ativada por ${days} dias.`,
  };
};

export const deactivatePremium = async (): Promise<void> => {
  const current = await getLicense();

  await saveLicense({
    ...current,
    isPremium: false,
    premiumExpiresAt: null,
    activationCode: null,
  });
};