import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { openDB } from 'idb';


// IndexedDB configuration
const DB_NAME = 'PostDB';
const STORE_NAME = 'posts';

const getDB = async () => {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    }
  });
};
// Async thunk: fetch all posts (then filter/sort in Redux)
export const fetchPosts = createAsyncThunk('posts/fetchPosts', async (_, { dispatch }) => {
 try {
    const db = await getDB();
    return await db.getAll(STORE_NAME);
  } catch (err) {
    dispatch(setError('Failed to load posts.'));
    throw err;
  }
});
// Async thunk to save a post to IndexedDB
export const savePost = createAsyncThunk('posts/savePost', async (post) => {
  const db = await getDB();
  await db.put(STORE_NAME, post);
  return post;
});
// Async thunk to delete a post to IndexedDB
export const deletePosts = createAsyncThunk('posts/deletePosts', async (ids) => {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  ids.forEach(id => tx.store.delete(id));
  await tx.done;
  return ids;
});
// Post slice
const postsSlice = createSlice({
  name: 'posts',
  initialState: {
    items: [],
    filtered: [], // ← posts after search/sort/pagination
    filteredTotal: 0,
    loading: false,
    error: null,
    page: 1,
    search: "",
  // default sort changed to title per user's request
  sort: "title",
    itemsPerPage: 5,
  },
  reducers: {
    setPage: (state, action) => {
      state.page = action.payload;
      postsSlice.caseReducers.applyFilters(state);
    },
    setSearch: (state, action) => {
      state.search = action.payload;
      state.page = 1; // reset to first page on new search
      postsSlice.caseReducers.applyFilters(state);
    },
    setSort: (state, action) => {
      state.sort = action.payload;
      state.page = 1; // reset to first page when sort changes
      postsSlice.caseReducers.applyFilters(state);
    },
    setError: (state, action) => {
      state.error = action.payload;
    },

    // 🧮 Apply filters and pagination (pure function)
    applyFilters: (state) => {
      let filtered = [...state.items];

      // 🔍 Search (match title or content)
      if (state.search.trim()) {
        const q = state.search.toLowerCase();
        filtered = filtered.filter((p) =>
          (p.title || '').toLowerCase().includes(q) ||
          (p.content || '').toLowerCase().includes(q)
        );
      }

      // ↕️ Sort
      if (state.sort === "title") {
        filtered.sort((a, b) => {
          const ta = (a.title || '').toLowerCase();
          const tb = (b.title || '').toLowerCase();
          return ta.localeCompare(tb, undefined, { sensitivity: 'base' });
        });
      } else if (state.sort === "date") {
        filtered.sort((a, b) => {
          const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bt - at;
        });
      }

  // 📄 Pagination
  state.filteredTotal = filtered.length;
  const start = (state.page - 1) * state.itemsPerPage;
  const end = start + state.itemsPerPage;
  state.filtered = filtered.slice(start, end);
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchPosts.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchPosts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload || [];
        postsSlice.caseReducers.applyFilters(state); // apply filters after loading
      })
      .addCase(fetchPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(savePost.fulfilled, (state, action) => {
        const index = state.items.findIndex((p) => p.id === action.payload.id);
        if (index >= 0) state.items[index] = action.payload;
        else state.items.push(action.payload);
        postsSlice.caseReducers.applyFilters(state);
      })
      .addCase(deletePosts.fulfilled, (state, action) => {
        state.items = state.items.filter(
          (post) => !action.payload.includes(post.id)
        );
        postsSlice.caseReducers.applyFilters(state);
      });
  }
});

export const { setPage, setSearch, setSort, setError, applyFilters } = postsSlice.actions;

export default postsSlice.reducer;
