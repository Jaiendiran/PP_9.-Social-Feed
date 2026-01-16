import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { cacheUtils, cacheKeys } from '../../utils/cacheUtils';
import preferencesService from './preferencesService';
import { logout } from '../auth/authSlice';

// Session storage key for session-scoped preferences
const SESSION_PREFS_KEY = `${cacheKeys.USER_PREFERENCES}_session`;

const readSessionPrefs = () => {
  try {
    const raw = sessionStorage.getItem(SESSION_PREFS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to read session preferences', e);
    return null;
  }
};
const sessionPrefs = readSessionPrefs();

const writeSessionPrefs = (sessionData) => {
  try {
    sessionStorage.setItem(SESSION_PREFS_KEY, JSON.stringify(sessionData));
  } catch (e) {
    console.warn('Failed to write session preferences', e);
  }
};

const clearSessionPrefs = () => {
  try {
    sessionStorage.removeItem(SESSION_PREFS_KEY);
  } catch (e) {
    console.warn('Failed to clear session preferences', e);
  }
};

// Constants for validation
const VALID_THEMES = ['light', 'dark'];
const MIN_ITEMS_PER_PAGE = 5;
const MAX_ITEMS_PER_PAGE = 50;
const VALID_SORT_FIELDS = ['date', 'title'];
const VALID_SORT_ORDERS = ['asc', 'desc'];

// Get cached persistent preferences (Firestore-backed)
const getCachedPersistentPreferences = () => {
  try {
    const cached = cacheUtils.get(cacheKeys.USER_PREFERENCES, true);
    return cached || null;
  } catch (e) {
    return null;
  }
};
const cachedPrefs = getCachedPersistentPreferences();

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

// Initialize with session (for session-scoped prefs) and persistent (for theme) values
const initialState = {
  filters: sessionPrefs?.filters ? { ...defaultFilters, ...sessionPrefs.filters } : defaultFilters,
  pagination: sessionPrefs?.pagination ? { ...defaultPagination, ...sessionPrefs.pagination } : defaultPagination,
  theme: (cachedPrefs?.theme && VALID_THEMES.includes(cachedPrefs.theme)) ? cachedPrefs.theme : 'light',
  isLoading: false,
  isError: false,
  isInitialized: false,
  isSortingPending: false,
};

// Thunks for fetching and saving preferences
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
      writeSessionPrefs({ filters: state.filters, pagination: state.pagination });
    },
    setSortPreference: (state, action) => {
      const { key, order } = action.payload;

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
      writeSessionPrefs({ filters: state.filters, pagination: state.pagination });
    },
    setPostSelection: (state, action) => {
      state.filters.option = action.payload;
      state.pagination.currentPage = 1;
      writeSessionPrefs({ filters: state.filters, pagination: state.pagination });
    },
    setCurrentPage: (state, action) => {
      const page = Math.max(1, Math.floor(Number(action.payload)));
      if (isNaN(page)) {
        console.warn('Invalid page number');
        return;
      }
      state.pagination.currentPage = page;
      writeSessionPrefs({ filters: state.filters, pagination: state.pagination });
    },
    setItemsPerPage: (state, action) => {
      const items = Math.floor(Number(action.payload));
      if (isNaN(items) || items < MIN_ITEMS_PER_PAGE || items > MAX_ITEMS_PER_PAGE) {
        console.warn(`Items per page must be between ${MIN_ITEMS_PER_PAGE} and ${MAX_ITEMS_PER_PAGE}`);
        return;
      }
      state.pagination.itemsPerPage = items;
      state.pagination.currentPage = 1;
      writeSessionPrefs({ filters: state.filters, pagination: state.pagination });
    },
    setTheme: (state, action) => {
      const theme = action.payload;
      if (!VALID_THEMES.includes(theme)) {
        console.warn(`Invalid theme: ${theme}`);
        return;
      }
      state.theme = theme;
      cacheUtils.set(cacheKeys.USER_PREFERENCES, { theme: state.theme });
    },
    setPendingSort: (state, action) => {
      state.isSortingPending = !!action.payload;
    },
    resetPreferences: (state) => {
      state.filters = { ...defaultFilters };
      state.pagination = { ...defaultPagination };
      state.theme = 'light';
      state.isLoading = false;
      state.isError = false;
      state.isInitialized = false;

      cacheUtils.clear(cacheKeys.USER_PREFERENCES);
      clearSessionPrefs();
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
          const localCacheTimestamp = cacheUtils.getTimestamp(cacheKeys.USER_PREFERENCES);
          const firestoreTimestamp = action.payload.updatedAt || 0;

          if (state.isInitialized && localCacheTimestamp && localCacheTimestamp >= firestoreTimestamp) {
            state.isInitialized = true;
            return;
          }
          if (action.payload.theme) state.theme = action.payload.theme;

          cacheUtils.set(cacheKeys.USER_PREFERENCES, { theme: state.theme });
        }
        
        state.isInitialized = true;
      })
      .addCase(fetchUserPreferences.rejected, (state) => {
        state.isLoading = false;
        state.isError = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.filters = { ...defaultFilters };
        state.pagination = { ...defaultPagination };
        state.theme = 'light';
        state.isLoading = false;
        state.isError = false;
        state.isInitialized = false;

        cacheUtils.clear(cacheKeys.USER_PREFERENCES);
        clearSessionPrefs();
      });
  }
});

export const { setSearchFilter, setSortPreference, setPostSelection, setCurrentPage, setItemsPerPage, setTheme, resetPreferences, setPendingSort } = preferencesSlice.actions;
// Selectors
export const selectFilters = state => state.preferences.filters;
export const selectPagination = state => state.preferences.pagination;
export const selectTheme = state => state.preferences.theme;
export const selectIsInitialized = state => state.preferences.isInitialized;
// Constants exports for components
export const preferencesConstants = { VALID_THEMES, MIN_ITEMS_PER_PAGE, MAX_ITEMS_PER_PAGE, VALID_SORT_FIELDS, VALID_SORT_ORDERS };

export default preferencesSlice.reducer;