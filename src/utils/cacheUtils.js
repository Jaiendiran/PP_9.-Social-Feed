// Constants for cache configuration
const CACHE_PREFIX = 'blog_';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes in milliseconds

// Cache structure in localStorage
const cacheStructure = {
  data: null,
  timestamp: null,
  version: '1.0'
};

export const cacheKeys = {
  POSTS: `${CACHE_PREFIX}posts`,
  USER_PREFERENCES: `${CACHE_PREFIX}preferences`
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
  get: (key) => {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      const isExpired = Date.now() - timestamp > CACHE_EXPIRY;

      if (isExpired) {
        localStorage.removeItem(key);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Cache read error:', error);
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