// Constants for cache configuration
const CACHE_PREFIX = 'blog_';
const CACHE_EXPIRY = 20 * 60 * 1000;

// Cache structure in localStorage
const cacheStructure = {
  data: null,
  timestamp: null,
  version: '1.0'
};

export const cacheKeys = {
  POSTS: `${CACHE_PREFIX}posts`,
  USER_PREFERENCES: `${CACHE_PREFIX}preferences`,
  USER: `${CACHE_PREFIX}user`
};

export const cacheUtils = {
  // Set data in cache
  set: (key, data) => {
    const cacheData = {
      ...cacheStructure,
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(cacheData));
  },

  // Get data from cache
  get: (key, ignoreExpiry = false) => {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      const isExpired = Date.now() - timestamp > CACHE_EXPIRY;

      if (isExpired && !ignoreExpiry) {
        localStorage.removeItem(key);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  },

  // Check if key is expired without removing it
  isExpired: (key) => {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return true; // Treat missing as expired/invalid
      const { timestamp } = JSON.parse(cached);
      return Date.now() - timestamp > CACHE_EXPIRY;
    } catch {
      return true;
    }
  },

  // Get timestamp of when cache was last updated
  getTimestamp: (key) => {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;
      const { timestamp } = JSON.parse(cached);
      return timestamp || null;
    } catch (error) {
      return null;
    }
  },

  // Clear specific cache
  clear: (key) => {
    localStorage.removeItem(key);
  },

  // Clear all app-related cache
  clearAll: () => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }
};
