import { configureStore } from '@reduxjs/toolkit';
import postsReducer from '../features/posts/postsSlice';
import errorReducer from '../errorHandler/errorSlice';

export const store = configureStore({
  reducer: {
    posts: postsReducer,
    errors: errorReducer
  }
});
