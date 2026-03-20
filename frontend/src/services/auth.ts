import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  name: string;
  password: string;
}

const USER_STORAGE_KEY = '@sos_user';
const SESSION_STORAGE_KEY = '@sos_session';

let storageAvailable = true;

// fallback em memória
let memoryUser: User | null = null;
let memorySession = false;

const checkStorage = async () => {
  if (!storageAvailable) return false;

  try {
    await AsyncStorage.getItem('__auth_test__');
    return true;
  } catch (error) {
    console.warn('AsyncStorage indisponível no auth, usando memória:', error);
    storageAvailable = false;
    return false;
  }
};

export const registerUser = async (user: User): Promise<void> => {
  const canUseStorage = await checkStorage();

  if (canUseStorage) {
    try {
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      memoryUser = user;
      return;
    } catch (error) {
      console.warn('Falha ao salvar usuário no AsyncStorage, usando memória:', error);
      storageAvailable = false;
    }
  }

  memoryUser = user;
};

export const getRegisteredUser = async (): Promise<User | null> => {
  const canUseStorage = await checkStorage();

  if (canUseStorage) {
    try {
      const data = await AsyncStorage.getItem(USER_STORAGE_KEY);
      if (!data) return memoryUser;
      const parsed = JSON.parse(data) as User;
      memoryUser = parsed;
      return parsed;
    } catch (error) {
      console.warn('Falha ao ler usuário no AsyncStorage, usando memória:', error);
      storageAvailable = false;
    }
  }

  return memoryUser;
};

export const loginUser = async (name: string, password: string): Promise<boolean> => {
  const user = await getRegisteredUser();

  if (!user) return false;

  const valid = user.name === name && user.password === password;

  if (!valid) return false;

  const canUseStorage = await checkStorage();

  if (canUseStorage) {
    try {
      await AsyncStorage.setItem(SESSION_STORAGE_KEY, 'true');
      memorySession = true;
      return true;
    } catch (error) {
      console.warn('Falha ao salvar sessão no AsyncStorage, usando memória:', error);
      storageAvailable = false;
    }
  }

  memorySession = true;
  return true;
};

export const logoutUser = async (): Promise<void> => {
  const canUseStorage = await checkStorage();

  if (canUseStorage) {
    try {
      await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (error) {
      console.warn('Falha ao remover sessão no AsyncStorage:', error);
      storageAvailable = false;
    }
  }

  memorySession = false;
};

export const isUserLoggedIn = async (): Promise<boolean> => {
  const canUseStorage = await checkStorage();

  if (canUseStorage) {
    try {
      const session = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
      if (session === 'true') {
        memorySession = true;
        return true;
      }
      return memorySession;
    } catch (error) {
      console.warn('Falha ao ler sessão no AsyncStorage, usando memória:', error);
      storageAvailable = false;
    }
  }

  return memorySession;
};

export const hasRegisteredUser = async (): Promise<boolean> => {
  const user = await getRegisteredUser();
  return !!user;
};