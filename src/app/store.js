import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import postsReducer from '../features/posts/postsSlice';
import preferencesReducer from '../features/preferences/preferencesSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    posts: postsReducer,
    preferences: preferencesReducer
  }
});