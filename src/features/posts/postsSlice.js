import { createSlice, createAsyncThunk, createEntityAdapter, createSelector } from '@reduxjs/toolkit';
import { openDB } from 'idb';
import { cacheUtils, cacheKeys } from '../../utils/cacheUtils';

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
// Async thunk to load posts from IndexedDB
// export const fetchPosts = createAsyncThunk(
//   'posts/fetchPosts',
//   async (_, { rejectWithValue }) => {
//     try {
//       const db = await getDB();
//       return await db.getAll(STORE_NAME);
//     } catch (err) {
//       return rejectWithValue('Failed to fetch posts: ' + err.message);
//     }
//   }
// );
export const fetchPosts = createAsyncThunk(
  'posts/fetchPosts',
  async (_, { rejectWithValue }) => {
    try {
      // Check cache first
      const cachedPosts = cacheUtils.get(cacheKeys.POSTS);
      if (cachedPosts) {
        return cachedPosts;
      }

      // If no cache, fetch from IndexedDB
      const db = await getDB();
      const posts = await db.getAll(STORE_NAME);
      
      // Update cache
      cacheUtils.set(cacheKeys.POSTS, posts);
      
      return posts;
    } catch (err) {
      return rejectWithValue('Failed to fetch posts: ' + err.message);
    }
  }
);
// Async thunk to save a post to IndexedDB
// export const savePost = createAsyncThunk(
//   'posts/savePost',
//   async (post, { rejectWithValue }) => {
//     try {
//       const db = await getDB();
//       await db.put(STORE_NAME, post);
//       return post;
//     } catch (err) {
//       return rejectWithValue('Failed to save post: ' + err.message);
//     }
//   }
// );
export const savePost = createAsyncThunk(
  'posts/savePost',
  async (post, { rejectWithValue }) => {
    try {
      const db = await getDB();
      await db.put(STORE_NAME, post);
      
      // Clear posts cache when we update data
      cacheUtils.clear(cacheKeys.POSTS);
      
      return post;
    } catch (err) {
      return rejectWithValue('Failed to save post: ' + err.message);
    }
  }
);
// Async thunk to delete a post to IndexedDB
// export const deletePosts = createAsyncThunk(
//   'posts/deletePosts',
//   async (ids, { rejectWithValue }) => {
//     try {
//       const db = await getDB();
//       const tx = db.transaction(STORE_NAME, 'readwrite');
//       await Promise.all(ids.map(id => tx.store.delete(id)));
//       await tx.done;
//       return ids;
//     } catch (err) {
//       return rejectWithValue('Failed to delete posts: ' + err.message);
//     }
//   }
// );
export const deletePosts = createAsyncThunk(
  'posts/deletePosts',
  async (ids, { rejectWithValue }) => {
    try {
      const db = await getDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      await Promise.all(ids.map(id => tx.store.delete(id)));
      await tx.done;
      
      // Clear posts cache when we delete data
      cacheUtils.clear(cacheKeys.POSTS);
      
      return ids;
    } catch (err) {
      return rejectWithValue('Failed to delete posts: ' + err.message);
    }
  }
);

const postsAdapter = createEntityAdapter({
  sortComparer: (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
});

const initialState = postsAdapter.getInitialState({
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
  filters: {
    search: '',
    sortBy: 'date',
    sortOrder: 'desc'
  },
  pagination: {
    currentPage: 1,
    itemsPerPage: 5
  }
});
// Post slice
const postsSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    setSearchFilter: (state, action) => {
      state.filters.search = action.payload;
    },
    setSortBy: (state, action) => {
      const { key, order } = action.payload;
      state.filters.sortBy = key;
      state.filters.sortOrder = order;
    },
    setCurrentPage: (state, action) => {
      state.pagination.currentPage = action.payload;
    }
  },
  extraReducers: builder => {
    builder
      // Fetch posts cases
      .addCase(fetchPosts.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchPosts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        postsAdapter.setAll(state, action.payload);
      })
      .addCase(fetchPosts.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Save post cases
      .addCase(savePost.fulfilled, (state, action) => {
        postsAdapter.upsertOne(state, action.payload);
      })
      // Delete posts cases
      .addCase(deletePosts.fulfilled, (state, action) => {
        postsAdapter.removeMany(state, action.payload);
      });
    }
});

// Get the pre-built selectors
export const {
  selectAll: selectAllPosts,
  selectById: selectPostById,
  selectIds: selectPostIds
} = postsAdapter.getSelectors(state => state.posts);

// Additional selectors for status, error, filters, and pagination
export const selectPostsStatus = state => state.posts.status;
export const selectPostsError = state => state.posts.error;
export const selectPostsFilters = state => state.posts.filters;
export const selectPostsPagination = state => state.posts.pagination;

// Memoized selector for filtered posts
export const selectFilteredPosts = createSelector(
  [selectAllPosts, selectPostsFilters],
  (posts, filters) => {
    if (!filters.search) return posts;
    
    const searchLower = filters.search.toLowerCase();
    return posts.filter(post => 
      post.title.toLowerCase().includes(searchLower) ||
      post.content.toLowerCase().includes(searchLower)
    );
  }
);

// Memoized selector for sorted and filtered posts
export const selectSortedAndFilteredPosts = createSelector(
  [selectFilteredPosts, selectPostsFilters],
  (posts, filters) => {
    const sortedPosts = [...posts];
    
    sortedPosts.sort((a, b) => {
      if (filters.sortBy === 'title') {
        return filters.sortOrder === 'asc'
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title);
      }
      // Default date sorting
      return filters.sortOrder === 'asc'
        ? new Date(a.createdAt) - new Date(b.createdAt)
        : new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    return sortedPosts;
  }
);

// Memoized selector for paginated posts
export const selectPaginatedPosts = createSelector(
  [selectSortedAndFilteredPosts, selectPostsPagination],
  (posts, pagination) => {
    const { currentPage, itemsPerPage } = pagination;
    const start = (currentPage - 1) * itemsPerPage;
    return posts.slice(start, start + itemsPerPage);
  }
);

export const { setSearchFilter, setSortBy, setCurrentPage } = postsSlice.actions;
export default postsSlice.reducer;
