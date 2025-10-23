import { configureStore } from '@reduxjs/toolkit';
import postsReducer from '../features/posts/postsSlice';
import errorReducer from '../errorHandler/errorSlice';
import preferencesReducer from '../features/preferences/preferencesSlice';

export const store = configureStore({
  reducer: {
    posts: postsReducer,
    errors: errorReducer,
    preferences: preferencesReducer
  }
});