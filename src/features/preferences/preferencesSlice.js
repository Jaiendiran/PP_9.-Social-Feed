import { createSlice } from '@reduxjs/toolkit';
import { cacheUtils, cacheKeys } from '../../utils/cacheUtils';

// Constants for validation
const VALID_THEMES = ['light', 'dark'];
const MIN_ITEMS_PER_PAGE = 5;
const MAX_ITEMS_PER_PAGE = 50;
const VALID_SORT_FIELDS = ['date', 'title'];
const VALID_SORT_ORDERS = ['asc', 'desc'];

const initialState = {
  filters: {
    search: '',
    sortBy: 'date',
    sortOrder: 'desc',
    option: 'created'
  },
  pagination: {
    currentPage: 1,
    itemsPerPage: 5
  },
  theme: 'light',
  ...cacheUtils.get(cacheKeys.USER_PREFERENCES)
};

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
    resetPreferences: () => {
      cacheUtils.clear(cacheKeys.USER_PREFERENCES);
      return initialState;
    }
  }
});

export const { setSearchFilter, setSortPreference, setPostSelection, setCurrentPage, setItemsPerPage, setTheme, resetPreferences } = preferencesSlice.actions;
// Selectors
export const selectFilters = state => state.preferences.filters;
export const selectPagination = state => state.preferences.pagination;
export const selectTheme = state => state.preferences.theme;
// Constants exports for components
export const preferencesConstants = { VALID_THEMES, MIN_ITEMS_PER_PAGE, MAX_ITEMS_PER_PAGE, VALID_SORT_FIELDS, VALID_SORT_ORDERS };

export default preferencesSlice.reducer;