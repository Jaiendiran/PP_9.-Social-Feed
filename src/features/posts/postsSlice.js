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
// Async thunk to fetch posts from IndexedDB
export const fetchPosts = createAsyncThunk(
  'posts/fetchPosts',
  async (_, { rejectWithValue }) => {
    try {
      // Check cache first
      try {
        const cachedPosts = cacheUtils.get(cacheKeys.POSTS);
        if (cachedPosts) {
          return cachedPosts;
        }
      } catch (cacheError) {
        console.warn('Cache read failed, falling back to DB:', cacheError);
      }
      // If no cache or cache error, fetch from IndexedDB
      const db = await getDB();
      const posts = await db.getAll(STORE_NAME);
      // Update cache
      try {
        cacheUtils.set(cacheKeys.POSTS, posts);
      } catch (cacheError) {
        console.warn('Cache write failed:', cacheError);
      }

      return posts;
    } catch (err) {
      return rejectWithValue('Failed to fetch posts: ' + err.message);
    }
  }
);
// Async thunk to save a post to IndexedDB
export const savePost = createAsyncThunk(
  'posts/savePost',
  async (post, { rejectWithValue }) => {
    try {
      const db = await getDB();
      await db.put(STORE_NAME, post);
      // Clear cache
      try {
        cacheUtils.clear(cacheKeys.POSTS);
      } catch (cacheError) {
        console.warn('Cache clear failed:', cacheError);
      }

      return post;
    } catch (err) {
      return rejectWithValue('Failed to save post: ' + err.message);
    }
  }
);
// Async thunk to delete a post to IndexedDB
export const deletePosts = createAsyncThunk(
  'posts/deletePosts',
  async (ids, { rejectWithValue }) => {
    try {
      const db = await getDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      await Promise.all(ids.map(id => tx.store.delete(id)));
      await tx.done;
      // Clear posts cache when we update data
      cacheUtils.clear(cacheKeys.POSTS);

      return ids;
    } catch (err) {
      return rejectWithValue('Failed to delete posts: ' + err.message);
    }
  }
);
// Async thunk to fetch external posts
export const fetchExternalPosts = createAsyncThunk(
  'posts/fetchExternalPosts',
  async ({ start, limit }, { rejectWithValue }) => {
    try {
      const response = await fetch(`https://jsonplaceholder.typicode.com/posts?_start=${start}&_limit=${limit}`);
      if (!response.ok) {
        throw new Error('Failed to fetch external posts');
      }
      const data = await response.json();
      return {
        posts: data.map(post => ({
          ...post,
          content: post.body,
          isExternal: true,
          createdAt: new Date(1672531200000 - post.id * 3600000).toISOString(),
        })),
        start
      };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const postsAdapter = createEntityAdapter({
  sortComparer: (a, b) => new Date(b.createdAt) - new Date(a.createdAt) // Newest first
});

const initialState = postsAdapter.getInitialState({
  status: 'idle',
  error: null,
  externalPosts: [],
  externalStatus: 'idle',
  externalError: null,
  isExternalCached: false
});
// Post slice
const postsSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {},
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
      })
      // Fetch external posts cases
      .addCase(fetchExternalPosts.pending, (state) => {
        state.externalStatus = 'loading';
        state.externalError = null;
      })
      .addCase(fetchExternalPosts.fulfilled, (state, action) => {
        state.externalStatus = 'succeeded';
        const { posts, start } = action.payload;
        if (state.externalPosts.length < 100) {
          // Initialize with empty slots if needed, or just assign to index
          // Array assignment at index > length automatically fills with empty/undefined
        }
        posts.forEach((post, index) => {
          state.externalPosts[start + index] = post;
        });
        // We don't set isExternalCached globally true anymore, as it depends on the range
      })
      .addCase(fetchExternalPosts.rejected, (state, action) => {
        state.externalStatus = 'failed';
        state.externalError = action.payload;
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
export const selectExternalPostsStatus = state => state.posts.externalStatus;
export const selectExternalPostsError = state => state.posts.externalError;
export const selectIsExternalCached = state => state.posts.isExternalCached;

// Memoized selector for sorted and filtered posts
export const selectSortedAndFilteredPosts = createSelector(
  [selectAllPosts, (state) => state.preferences.filters, (state) => state.posts.externalPosts],
  (posts, filters, externalPosts) => {
    let filteredPosts = posts;

    if (filters.option === 'created') {
      // Only show posts that are explicitly NOT external
      filteredPosts = filteredPosts.filter(post => !post.isExternal);
    } else if (filters.option === 'external') {
      // Show external posts, but prefer local version if edited
      filteredPosts = externalPosts
        .filter(p => p) // Filter out empty slots
        .map(extPost => {
          const localVersion = posts.find(p => p.id == extPost.id);
          return localVersion || extPost;
        });
    } else if (filters.option === 'all') {
      // Combine local and external
      // 1. Get all local posts
      const localPosts = posts;
      // 2. Get external posts that are NOT in local posts (to avoid duplicates)
      const uniqueExternalPosts = externalPosts
        .filter(p => p) // Filter out empty slots
        .filter(extPost => !localPosts.some(local => local.id == extPost.id));
      // 3. Combine
      filteredPosts = [...localPosts, ...uniqueExternalPosts];
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredPosts = filteredPosts.filter(post =>
        post.title.toLowerCase().includes(searchLower) ||
        post.content.toLowerCase().includes(searchLower)
      );
    }

    return [...filteredPosts].sort((a, b) => {
      if (filters.sortBy === 'title') {
        return filters.sortOrder === 'asc'
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title);
      }
      return filters.sortOrder === 'asc'
        ? new Date(a.createdAt) - new Date(b.createdAt)
        : new Date(b.createdAt) - new Date(a.createdAt);
    });
  }
);

// Memoized selector for paginated posts
export const selectPaginatedPosts = createSelector(
  [selectSortedAndFilteredPosts, (state) => state.preferences.pagination],
  (posts, pagination) => {
    const { currentPage, itemsPerPage } = pagination;
    const start = (currentPage - 1) * itemsPerPage;
    return posts.slice(start, start + itemsPerPage);
  }
);

// Selector to find a post by ID from either local or external source
export const selectPostByIdCombined = (state, postId) => {
  // Check local first
  let post = selectPostById(state, postId);
  if (post) return post;
  // Check external
  const externalPosts = state.posts.externalPosts;
  // Since externalPosts is sparse and we might not have the index map easily without ID,
  // we just search the array. Sparse slots are undefined.
  post = externalPosts.find(p => p && p.id == postId); // Loose equality for ID if string/number mismatch
  return post;
};

export default postsSlice.reducer;
