import { configureStore } from '@reduxjs/toolkit';
import postsReducer from '../features/posts/postsSlice';
import preferencesReducer from '../features/preferences/preferencesSlice';

export const store = configureStore({
  reducer: {
    posts: postsReducer,
    preferences: preferencesReducer
  }
});