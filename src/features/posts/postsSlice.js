import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { openDB } from 'idb';

const DB_NAME = 'PostDB';
const STORE_NAME = 'posts';

const getDB = async () => {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    }
  });
};

// Async thunk to load posts from IndexedDB
export const fetchPosts = createAsyncThunk('posts/fetchPosts', async () => {
  const db = await getDB();
  const posts = await db.getAll(STORE_NAME);
  return posts;
});

// Async thunk to save a post to IndexedDB
export const savePost = createAsyncThunk('posts/savePost', async (post) => {
  const db = await getDB();
  await db.put(STORE_NAME, post);
  return post;
});

export const deletePosts = createAsyncThunk('posts/deletePosts', async (ids) => {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  ids.forEach(id => tx.store.delete(id));
  await tx.done;
  return ids;
});

const postsSlice = createSlice({
  name: 'posts',
  initialState: [],
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchPosts.fulfilled, (_, action) => action.payload)
      .addCase(savePost.fulfilled, (state, action) => {
        const index = state.findIndex(p => p.id === action.payload.id);
        if (index >= 0) state[index] = action.payload;
        else state.push(action.payload);
      })
      .addCase(deletePosts.fulfilled, (state, action) => {
        return state.filter(post => !action.payload.includes(post.id));
      });
  }
});

export default postsSlice.reducer;
