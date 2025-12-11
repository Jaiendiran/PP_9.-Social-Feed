import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { cacheUtils, cacheKeys } from '../../utils/cacheUtils';
import preferencesService from './preferencesService';
import { logout } from '../auth/authSlice';

// Constants for validation
const VALID_THEMES = ['light', 'dark'];
const MIN_ITEMS_PER_PAGE = 5;
const MAX_ITEMS_PER_PAGE = 50;
const VALID_SORT_FIELDS = ['date', 'title'];
const VALID_SORT_ORDERS = ['asc', 'desc'];

// Get cached preferences for initial state (prevents flash on page refresh)
const getCachedPreferences = () => {
  try {
    const cached = cacheUtils.get(cacheKeys.USER_PREFERENCES);
    return cached || null;
  } catch (e) {
    return null;
  }
};

const cachedPrefs = getCachedPreferences();

// Default values
const defaultFilters = {
  search: '',
  sortBy: 'date',
  sortOrder: 'desc',
  option: 'created'
};

const defaultPagination = {
  currentPage: 1,
  itemsPerPage: 5
};

// Initialize with cached values if available, otherwise use defaults
const initialState = {
  filters: cachedPrefs?.filters
    ? { ...defaultFilters, ...cachedPrefs.filters }
    : defaultFilters,
  pagination: cachedPrefs?.pagination
    ? { ...defaultPagination, ...cachedPrefs.pagination }
    : defaultPagination,
  theme: (cachedPrefs?.theme && VALID_THEMES.includes(cachedPrefs.theme))
    ? cachedPrefs.theme
    : 'light',
  isLoading: false,
  isError: false,
  isInitialized: false, // Tracks if Firestore preferences have been loaded
};

// Async thunks
export const fetchUserPreferences = createAsyncThunk(
  'preferences/fetch',
  async (uid, thunkAPI) => {
    try {
      if (!uid) return null;
      return await preferencesService.getUserPreferences(uid);
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

export const saveUserPreferences = createAsyncThunk(
  'preferences/save',
  async ({ uid, preferences }, thunkAPI) => {
    try {
      await preferencesService.saveUserPreferences(uid, preferences);
      return preferences;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

const preferencesSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    setSearchFilter: (state, action) => {
      state.filters.search = action.payload;
      cacheUtils.set(cacheKeys.USER_PREFERENCES, state);
    },
    setSortPreference: (state, action) => {
      const { key, order } = action.payload;
      // Validate sort parameters
      if (!VALID_SORT_FIELDS.includes(key)) {
        console.warn(`Invalid sort field: ${key}`);
        return;
      }
      if (!VALID_SORT_ORDERS.includes(order)) {
        console.warn(`Invalid sort order: ${order}`);
        return;
      }
      state.filters.sortBy = key;
      state.filters.sortOrder = order;
      cacheUtils.set(cacheKeys.USER_PREFERENCES, state);
    },
    setPostSelection: (state, action) => {
      const option = action.payload;
      state.filters.option = option;
      // Reset to first page when changing filter
      state.pagination.currentPage = 1;
      cacheUtils.set(cacheKeys.USER_PREFERENCES, state);
    },
    setCurrentPage: (state, action) => {
      const page = Math.max(1, Math.floor(Number(action.payload)));
      if (isNaN(page)) {
        console.warn('Invalid page number');
        return;
      }
      state.pagination.currentPage = page;
      cacheUtils.set(cacheKeys.USER_PREFERENCES, state);
    },
    setItemsPerPage: (state, action) => {
      const items = Math.floor(Number(action.payload));
      if (isNaN(items) || items < MIN_ITEMS_PER_PAGE || items > MAX_ITEMS_PER_PAGE) {
        console.warn(`Items per page must be between ${MIN_ITEMS_PER_PAGE} and ${MAX_ITEMS_PER_PAGE}`);
        return;
      }
      state.pagination.itemsPerPage = items;
      state.pagination.currentPage = 1;
      cacheUtils.set(cacheKeys.USER_PREFERENCES, state);
    },
    setTheme: (state, action) => {
      const theme = action.payload;
      if (!VALID_THEMES.includes(theme)) {
        console.warn(`Invalid theme: ${theme}`);
        return;
      }
      state.theme = theme;
      cacheUtils.set(cacheKeys.USER_PREFERENCES, state);
    },
    resetPreferences: (state) => {
      // Reset to hardcoded defaults, not cached values
      state.filters = { ...defaultFilters };
      state.pagination = { ...defaultPagination };
      state.theme = 'light';
      state.isLoading = false;
      state.isError = false;
      state.isInitialized = false; // Reset initialization state
      // Clear the preferences cache
      cacheUtils.clear(cacheKeys.USER_PREFERENCES);
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserPreferences.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchUserPreferences.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          // Compare timestamps: only apply Firestore data if it's newer than local cache
          const localCacheTimestamp = cacheUtils.getTimestamp(cacheKeys.USER_PREFERENCES);
          const firestoreTimestamp = action.payload.updatedAt || 0;

          // If local cache is newer or same age, skip Firestore overwrite
          // EXCEPTION: Always trust Firestore on initial load (!state.isInitialized) to prevent phantom defaults from blocking sync
          if (state.isInitialized && localCacheTimestamp && localCacheTimestamp >= firestoreTimestamp) {
            return;
          }

          // Firestore data is newer, apply it
          if (action.payload.theme) state.theme = action.payload.theme;
          if (action.payload.filters) state.filters = { ...state.filters, ...action.payload.filters };
          if (action.payload.pagination) state.pagination = { ...state.pagination, ...action.payload.pagination };

          // Update local cache with Firestore data
          cacheUtils.set(cacheKeys.USER_PREFERENCES, {
            theme: state.theme,
            filters: state.filters,
            pagination: state.pagination
          });
        }
        // Mark as initialized regardless of whether Firestore had data
        state.isInitialized = true;
      })
      .addCase(fetchUserPreferences.rejected, (state) => {
        state.isLoading = false;
        state.isError = true;
      })
      .addCase(logout.fulfilled, (state) => {
        // Reset to hardcoded defaults on logout
        state.filters = { ...defaultFilters };
        state.pagination = { ...defaultPagination };
        state.theme = 'light';
        state.isLoading = false;
        state.isError = false;
        state.isInitialized = false; // Reset initialization state
        // Verify cache is cleared
        cacheUtils.clear(cacheKeys.USER_PREFERENCES);
      });
  }
});

export const { setSearchFilter, setSortPreference, setPostSelection, setCurrentPage, setItemsPerPage, setTheme, resetPreferences } = preferencesSlice.actions;
// Selectors
export const selectFilters = state => state.preferences.filters;
export const selectPagination = state => state.preferences.pagination;
export const selectTheme = state => state.preferences.theme;
export const selectIsInitialized = state => state.preferences.isInitialized;
// Constants exports for components
export const preferencesConstants = { VALID_THEMES, MIN_ITEMS_PER_PAGE, MAX_ITEMS_PER_PAGE, VALID_SORT_FIELDS, VALID_SORT_ORDERS };

export default preferencesSlice.reducer;