import AsyncStorage from '@react-native-async-storage/async-storage';

// Product types
export interface Product {
  id: number;
  name: string;
  barcode: string | null;
  quantity: number;
  min_quantity: number;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface Movement {
  id: number;
  product_id: number;
  type: 'entrada' | 'saida';
  quantity: number;
  created_at: string;
  product_name?: string;
}

interface DbState {
  products: Product[];
  movements: Movement[];
  nextProductId: number;
  nextMovementId: number;
}

const STORAGE_KEY = '@sos_inventario_db';

const getEmptyState = (): DbState => ({
  products: [],
  movements: [],
  nextProductId: 1,
  nextMovementId: 1,
});

// In-memory state
let dbState: DbState = getEmptyState();
let initialized = false;
let storageAvailable = true;

// Load data from AsyncStorage
const loadFromStorage = async (): Promise<DbState> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);

    if (!data) {
      return getEmptyState();
    }

    const parsed = JSON.parse(data);

    return {
      products: Array.isArray(parsed?.products) ? parsed.products : [],
      movements: Array.isArray(parsed?.movements) ? parsed.movements : [],
      nextProductId:
        typeof parsed?.nextProductId === 'number' ? parsed.nextProductId : 1,
      nextMovementId:
        typeof parsed?.nextMovementId === 'number' ? parsed.nextMovementId : 1,
    };
  } catch (error) {
    console.error('Error loading from storage:', error);
    storageAvailable = false;
    return getEmptyState();
  }
};

// Save to AsyncStorage
const saveToStorage = async (): Promise<void> => {
  if (!storageAvailable) return;

  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dbState));
  } catch (error) {
    console.error('Error saving to storage:', error);
    storageAvailable = false;
  }
};

export const initDatabase = async (): Promise<void> => {
  if (initialized) return;

  // testa se o módulo nativo está acessível
  try {
    await AsyncStorage.getItem('__storage_test__');
    storageAvailable = true;
  } catch (error) {
    console.warn('AsyncStorage unavailable, using in-memory database:', error);
    storageAvailable = false;
  }

  dbState = storageAvailable ? await loadFromStorage() : getEmptyState();
  initialized = true;

  console.log(
    'Database initialized with',
    dbState.products.length,
    'products'
  );
};

// Product CRUD operations
export const createProduct = async (
  product: Omit<Product, 'id' | 'created_at' | 'updated_at'>
): Promise<number> => {
  if (product.barcode) {
    const existing = dbState.products.find((p) => p.barcode === product.barcode);
    if (existing) {
      throw new Error('UNIQUE constraint failed: products.barcode');
    }
  }

  const now = new Date().toISOString();

  const newProduct: Product = {
    ...product,
    id: dbState.nextProductId++,
    created_at: now,
    updated_at: now,
  };

  dbState.products.push(newProduct);
  await saveToStorage();

  return newProduct.id;
};

export const updateProduct = async (
  id: number,
  product: Partial<Omit<Product, 'id' | 'created_at'>>
): Promise<void> => {
  const index = dbState.products.findIndex((p) => p.id === id);
  if (index === -1) return;

  if (product.barcode) {
    const existing = dbState.products.find(
      (p) => p.barcode === product.barcode && p.id !== id
    );
    if (existing) {
      throw new Error('UNIQUE constraint failed: products.barcode');
    }
  }

  dbState.products[index] = {
    ...dbState.products[index],
    ...product,
    updated_at: new Date().toISOString(),
  };

  await saveToStorage();
};

export const deleteProduct = async (id: number): Promise<void> => {
  dbState.products = dbState.products.filter((p) => p.id !== id);
  dbState.movements = dbState.movements.filter((m) => m.product_id !== id);
  await saveToStorage();
};

export const getProductById = async (id: number): Promise<Product | null> => {
  return dbState.products.find((p) => p.id === id) || null;
};

export const getProductByBarcode = async (
  barcode: string
): Promise<Product | null> => {
  return dbState.products.find((p) => p.barcode === barcode) || null;
};

export const getAllProducts = async (): Promise<Product[]> => {
  return [...dbState.products].sort((a, b) => a.name.localeCompare(b.name));
};

export const getLowStockProducts = async (): Promise<Product[]> => {
  return dbState.products
    .filter((p) => p.quantity <= p.min_quantity)
    .sort((a, b) => a.quantity - b.quantity);
};

export const getProductCount = async (): Promise<number> => {
  return dbState.products.length;
};

export const getLowStockCount = async (): Promise<number> => {
  return dbState.products.filter((p) => p.quantity <= p.min_quantity).length;
};

// Movement operations
export const createMovement = async (
  productId: number,
  type: 'entrada' | 'saida',
  quantity: number
): Promise<void> => {
  const product = dbState.products.find((p) => p.id === productId);
  if (!product) return;

  const movement: Movement = {
    id: dbState.nextMovementId++,
    product_id: productId,
    type,
    quantity,
    created_at: new Date().toISOString(),
  };

  dbState.movements.push(movement);

  const quantityChange = type === 'entrada' ? quantity : -quantity;
  product.quantity = Math.max(0, product.quantity + quantityChange);
  product.updated_at = new Date().toISOString();

  await saveToStorage();
};

export const getRecentMovements = async (
  limit: number = 10
): Promise<Movement[]> => {
  const movements = [...dbState.movements]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, limit);

  return movements.map((m) => {
    const product = dbState.products.find((p) => p.id === m.product_id);

    return {
      ...m,
      product_name: product?.name || 'Produto removido',
    };
  });
};

export const searchProducts = async (query: string): Promise<Product[]> => {
  const lowerQuery = query.toLowerCase();

  return dbState.products
    .filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) ||
        (p.barcode && p.barcode.includes(query))
    )
    .sort((a, b) => a.name.localeCompare(b.name));
};