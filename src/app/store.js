import { configureStore, combineReducers } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import postsReducer from '../features/posts/postsSlice';
import preferencesReducer from '../features/preferences/preferencesSlice';

const appReducer = combineReducers({
  auth: authReducer,
  posts: postsReducer,
  preferences: preferencesReducer
});

const rootReducer = (state, action) => {
  if (action.type === 'auth/logout/fulfilled') {
    state = undefined;
  }
  return appReducer(state, action);
};

export const store = configureStore({
  reducer: rootReducer
});