import { createSlice } from '@reduxjs/toolkit';
import { cacheUtils, cacheKeys } from '../../utils/cacheUtils';

const initialState = {
  sortBy: 'date',
  sortOrder: 'desc',
  itemsPerPage: 5,
  theme: 'light',
  ...cacheUtils.get(cacheKeys.USER_PREFERENCES)
};

const preferencesSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    updatePreferences: (state, action) => {
      Object.assign(state, action.payload);
      cacheUtils.set(cacheKeys.USER_PREFERENCES, state);
    },
    resetPreferences: () => {
      cacheUtils.clear(cacheKeys.USER_PREFERENCES);
      return initialState;
    }
  }
});

export const { updatePreferences, resetPreferences } = preferencesSlice.actions;
export default preferencesSlice.reducer;