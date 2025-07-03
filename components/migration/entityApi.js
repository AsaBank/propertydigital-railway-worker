// entityApi.js – Rate-limit-aware batch fetcher with LRU + IndexedDB persistence
// Works in browser environment (React app)

/****************************************
 * Minimal LRU cache implementation
 ****************************************/
class LRUCache {
  constructor(maxSize = 5000) {
    this.maxSize = maxSize;
    this.map = new Map();
  }

  _touch(key, value) {
    this.map.delete(key);
    this.map.set(key, value);
  }

  get(key) {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key);
    // re-insert to mark as recently used
    this._touch(key, value);
    return value;
  }

  set(key, value) {
    if (this.map.has(key)) {
      this.map.set(key, value);
    } else {
      this.map.set(key, value);
      if (this.map.size > this.maxSize) {
        // delete oldest (first entry)
        const oldestKey = this.map.keys().next().value;
        this.map.delete(oldestKey);
      }
    }
  }

  has(key) {
    return this.map.has(key);
  }

  entries() {
    return Array.from(this.map.entries());
  }
}

/****************************************
 * IndexedDB (idb-keyval like) wrapper
 ****************************************/
const DB_NAME = 'PropertyDigitalCache';
const STORE_NAME = 'entityCache';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function idbGet(db, key) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbSet(db, key, value) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/****************************************
 * Retry helper (exponential backoff)
 ****************************************/
async function fetchWithRetry(fn, retries = 3, minTimeout = 500, factor = 2) {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt += 1;
      if (attempt > retries) throw err;
      const wait = minTimeout * Math.pow(factor, attempt - 1);
      await new Promise((res) => setTimeout(res, wait));
    }
  }
}

/****************************************
 * Concurrency limiter (p-limit like)
 ****************************************/
function createLimiter(concurrency = 5) {
  const queue = [];
  let active = 0;

  const next = () => {
    if (active >= concurrency || queue.length === 0) return;
    active += 1;
    const { fn, resolve, reject } = queue.shift();
    Promise.resolve(fn())
      .then(resolve)
      .catch(reject)
      .finally(() => {
        active -= 1;
        next();
      });
  };

  return function limit(fn) {
    return new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      next();
    });
  };
}

/****************************************
 * EntityAPI – public interface
 ****************************************/
const inMemoryCache = new LRUCache(5000);
let dbPromise = null;
const concurrencyLimit = createLimiter(5);

async function initDB() {
  if (!dbPromise) dbPromise = openDB();
  const db = await dbPromise;

  // load all existing cache entries into LRU (shallow)
  const transaction = db.transaction(STORE_NAME, 'readonly');
  const store = transaction.objectStore(STORE_NAME);
  const request = store.openCursor();
  return new Promise((resolve) => {
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        inMemoryCache.set(cursor.key, cursor.value);
        cursor.continue();
      } else {
        resolve();
      }
    };
  });
}

// Initialize DB async (fire & forget)
if (typeof window !== 'undefined' && 'indexedDB' in window) {
  initDB().catch((err) => console.error('IndexedDB init error', err));
}

/**
 * Batch fetch entities from API with caching & retry.
 * @param {string} entityType – e.g., 'properties', 'tenants'
 * @param {string[]} ids – list of entity IDs
 * @returns {Promise<Object<string, any>>} – map id → entity object
 */
export async function getEntities(entityType, ids = []) {
  // Deduplicate
  const uniqueIds = Array.from(new Set(ids));
  const resultMap = {};

  // First, fill from cache
  const idsToFetch = [];
  uniqueIds.forEach((id) => {
    const cached = inMemoryCache.get(`${entityType}:${id}`);
    if (cached !== undefined) {
      resultMap[id] = cached;
    } else {
      idsToFetch.push(id);
    }
  });

  if (idsToFetch.length === 0) return resultMap;

  // Helper to cache fetched data
  const cacheSet = async (id, value) => {
    inMemoryCache.set(`${entityType}:${id}`, value);
    try {
      const db = await dbPromise;
      await idbSet(db, `${entityType}:${id}`, value);
    } catch (err) {
      console.warn('IndexedDB write failed', err);
    }
  };

  // batch fetch (100 ids per request)
  const BATCH_SIZE = 100;
  const batches = [];
  for (let i = 0; i < idsToFetch.length; i += BATCH_SIZE) {
    batches.push(idsToFetch.slice(i, i + BATCH_SIZE));
  }

  await Promise.all(
    batches.map((batch) =>
      concurrencyLimit(() =>
        fetchWithRetry(async () => {
          const qs = batch.join(',');
          const res = await fetch(`/api/${entityType}?ids=${encodeURIComponent(qs)}`);
          if (!res.ok) {
            const text = await res.text();
            throw new Error(`API ${entityType} ${res.status}: ${text}`);
          }
          const data = await res.json(); // assume { entities: { id: entity } }
          // Save to cache
          Object.entries(data.entities || {}).forEach(([id, obj]) => {
            cacheSet(id, obj);
            resultMap[id] = obj;
          });
          return data;
        })
      )
    )
  );

  return resultMap;
}

export function clearEntityCache() {
  inMemoryCache.map.clear();
  if (dbPromise) {
    dbPromise.then((db) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
    });
  }
}