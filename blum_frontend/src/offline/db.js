const DB_NAME = "blum-offline-v1";
const DB_VERSION = 1;

const STORES = {
  meta: "meta",
  clients: "clients",
  products: "products",
  pendingOrders: "pendingOrders",
};

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORES.meta)) {
        db.createObjectStore(STORES.meta);
      }
      if (!db.objectStoreNames.contains(STORES.clients)) {
        db.createObjectStore(STORES.clients, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.products)) {
        const store = db.createObjectStore(STORES.products, { keyPath: "id" });
        store.createIndex("brandId", "brandId", { unique: false });
        store.createIndex("productcode", "productcode", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.pendingOrders)) {
        db.createObjectStore(STORES.pendingOrders, { keyPath: "id" });
      }
    };
  });
}

function txStore(storeName, mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const result = fn(store, tx);
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      }),
  );
}

export async function setMeta(key, value) {
  await txStore(STORES.meta, "readwrite", (store) => {
    store.put(value, key);
  });
}

export async function getMeta(key) {
  return txStore(STORES.meta, "readonly", (store) => store.get(key));
}

export async function replaceClients(clients) {
  await openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.clients, "readwrite");
        const store = tx.objectStore(STORES.clients);
        store.clear();
        for (const client of clients) {
          const id = client.id ?? client.Id;
          if (id == null) continue;
          store.put({ ...client, id: Number(id) || id });
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
  );
}

export async function getAllClients() {
  return txStore(STORES.clients, "readonly", (store) => {
    const request = store.getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  });
}

export async function replaceProducts(products) {
  await openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.products, "readwrite");
        const store = tx.objectStore(STORES.products);
        store.clear();
        for (const product of products) {
          if (product?.id == null) continue;
          const brandId = product.brandId ?? product.brand_id ?? null;
          store.put({
            ...product,
            id: product.id,
            brandId: brandId != null ? Number(brandId) || brandId : null,
            productcode: product.productcode ?? product.productCode ?? "",
          });
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
  );
}

export async function getAllProducts() {
  return txStore(STORES.products, "readonly", (store) => {
    const request = store.getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  });
}

export async function addPendingOrder(entry) {
  await txStore(STORES.pendingOrders, "readwrite", (store) => {
    store.put(entry);
  });
}

export async function getAllPendingOrders() {
  const rows = await txStore(STORES.pendingOrders, "readonly", (store) => {
    const request = store.getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  });
  return rows.sort(
    (a, b) => new Date(b.queuedAt).getTime() - new Date(a.queuedAt).getTime(),
  );
}

export async function deletePendingOrder(id) {
  await txStore(STORES.pendingOrders, "readwrite", (store) => {
    store.delete(id);
  });
}

export async function countPendingOrders() {
  return txStore(STORES.pendingOrders, "readonly", (store) => {
    const request = store.count();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || 0);
      request.onerror = () => reject(request.error);
    });
  });
}
