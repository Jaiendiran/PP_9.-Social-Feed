import { createSlice, createAsyncThunk, createEntityAdapter, createSelector } from '@reduxjs/toolkit';
import { cacheUtils, cacheKeys } from '../../utils/cacheUtils';
import { db } from '../../firebase.config';
import { collection, getDocs, setDoc, deleteDoc, doc, getDoc, query, orderBy, limit, startAfter, where, documentId, getCountFromServer } from 'firebase/firestore';



// Async thunk to fetch posts from Firestore
// Async thunk to fetch posts from Firestore (Internal)
export const fetchInternalPosts = createAsyncThunk(
  'posts/fetchInternalPosts',
  async ({ limit: limitVal, sortBy, sortOrder, cursor, page, userId, mode }, { rejectWithValue }) => {
    try {
      const postsRef = collection(db, 'posts');
      let q = query(postsRef);

      // Apply User Filter (Server-Side) if provided (for 'created' mode)
      if (userId) {
        q = query(q, where('userId', '==', userId));
      }

      // Note: Firestore requires an index for some sorts.
      // Default natural order is by ID, but we usually want createdAt.
      // Since IDs are timestamp-based (Date.now()), sorting by documentId() is equivalent to createdAt 
      // AND allows us to avoid composite index requirements with 'where' clauses (Created mode).
      // However, for 'All' mode (no userId), we don't have a where clause, so sorting by documentId alone is fine?
      // Wait, 'All' mode failed with "The query requires an index". 
      // This implies 'All' mode (collection scan + sort) failed? 
      // Default collection scan + sort usually works if it's the only constraint.
      // But maybe 'createdAt' is better for 'All' mode?
      // Let's fallback to 'createdAt' if useIdSort is true BUT no userId is present?
      // Actually, if userId IS present, used documentId. If NOT present, use createdAt (standard single field index).

      const useIdSort = sortBy === 'date' && !!userId; // Only use ID sort when dodging composite index
      const sortField = sortBy === 'title' ? 'title' : (useIdSort ? documentId() : 'createdAt');

      q = query(q, checkBoxOrderBy(sortField, sortOrder));

      // Apply pagination
      if (cursor) {
        // Firestore startAfter requires the exact value types.
        // If the cursor is an object (from state), use it.
        // Assuming cursor is the value (string/number).
        q = query(q, startAfter(cursor));
      }

      q = query(q, limit(limitVal));

      const querySnapshot = await getDocs(q);
      const posts = [];
      let lastVisible = null;

      querySnapshot.forEach((doc) => {
        posts.push({ id: doc.id, ...doc.data() });
        // Capture the value used for sorting to use as next cursor
        const valContext = useIdSort ? doc.id : doc.data()[sortBy === 'date' ? 'createdAt' : sortBy];
        lastVisible = valContext;
      });

      return {
        posts,
        lastVisible, // Value for next page
        hasMore: posts.length === limitVal,
        lastVisible, // Value for next page
        hasMore: posts.length === limitVal,
        page, // Pass page back for reducer to map cursor
        mode // Pass mode back to reducer
      };
    } catch (err) {
      return rejectWithValue('Failed to fetch internal posts: ' + err.message);
    }
  }
);

// Async thunk to fetch total count of posts from Firestore
export const fetchTotalCount = createAsyncThunk(
  'posts/fetchTotalCount',
  async ({ userId, mode }, { rejectWithValue }) => {
    try {
      const postsRef = collection(db, 'posts');
      let q = query(postsRef);

      if (mode === 'created' && userId) {
        q = query(q, where('userId', '==', userId));
      }
      // 'all' mode just counts naturally (filtered by nothing)

      const snapshot = await getCountFromServer(q);
      return { count: snapshot.data().count, mode };
    } catch (err) {
      return rejectWithValue('Failed to fetch total count: ' + err.message);
    }
  }
);

// Async thunk to fetch a single post by ID (Internal -> External fallback)
export const fetchPostById = createAsyncThunk(
  'posts/fetchPostById',
  async (postId, { rejectWithValue }) => {
    try {
      // 1. Try Firestore First
      const docRef = doc(db, 'posts', String(postId));
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data(), isExternal: false };
      }

      // 2. Try External API
      try {
        const response = await fetch(`https://693c01eab762a4f15c3f1d36.mockapi.io/blog/posts/${postId}`);
        if (response.ok) {
          const data = await response.json();
          return {
            ...data,
            id: data.id,
            title: data.title,
            content: data.content || "No content available",
            isExternal: true,
            userId: data.userId || 'external',
            createdAt: data.createdAt || new Date().toISOString(),
            authorName: data.authorName || 'Public User'
          };
        }
      } catch (externalErr) {
        // Ignore external fetch error if it was just 404, but strict error if network failed? 
        // We'll throw generic "not found" if both fail.
        console.warn('External fetch failed', externalErr);
      }

      throw new Error('Post not found');
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// Helper to safely construct orderBy (prevents linting/runtime issues if any)
const checkBoxOrderBy = (field, order) => orderBy(field, order);
// Async thunk to save a post to Firestore
export const savePost = createAsyncThunk(
  'posts/savePost',
  async (post, { rejectWithValue }) => {
    try {
      // Use setDoc to preserve the ID generated by the app
      await setDoc(doc(db, 'posts', String(post.id)), post);

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
// Async thunk to delete a post from Firestore
export const deletePosts = createAsyncThunk(
  'posts/deletePosts',
  async (ids, { rejectWithValue }) => {
    try {
      await Promise.all(ids.map(id => deleteDoc(doc(db, 'posts', String(id)))));

      // Clear posts cache when we update data
      cacheUtils.clear(cacheKeys.POSTS);

      return ids;
    } catch (err) {
      return rejectWithValue('Failed to delete posts: ' + err.message);
    }
  }
);
// Async thunk to fetch external posts
// Async thunk to fetch external posts from MockAPI
export const fetchExternalPosts = createAsyncThunk(
  'posts/fetchExternalPosts',
  async ({ page, limit, sortBy, sortOrder }, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams({
        page,
        limit,
        sortBy: sortBy === 'date' ? 'createdAt' : sortBy, // Map 'date' to 'createdAt' for API
        order: sortOrder
      });

      const response = await fetch(`https://693c01eab762a4f15c3f1d36.mockapi.io/blog/posts?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch external posts');
      }
      const data = await response.json();

      // MockAPI returns array directly for this endpoint
      return {
        posts: data.map(post => ({
          ...post,
          id: post.id, // Ensure string/number consistency if needed
          title: post.title,
          content: post.content || "No content available", // Fallback for content
          isExternal: post.isExternal,
          userId: post.userId || 'external',
          // Use real createdAt or fallback. MockAPI usually has createdAt.
          createdAt: post.createdAt || new Date().toISOString(),
          authorName: post.authorName || 'Public User' // MockAPI might have this
        })),
        page
      };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// Async thunk to create an external post
export const createExternalPost = createAsyncThunk(
  'posts/createExternalPost',
  async (post, { rejectWithValue }) => {
    try {
      const response = await fetch('https://693c01eab762a4f15c3f1d36.mockapi.io/blog/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: post.title,
          content: post.content,
          userId: post.userId,
          authorName: post.authorName,
          // MockAPI generates ID and createdAt
        }),
      });

      if (!response.ok) throw new Error('Failed to create external post');
      const data = await response.json();
      return { ...data, isExternal: true };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// Async thunk to update an external post
export const updateExternalPost = createAsyncThunk(
  'posts/updateExternalPost',
  async (post, { rejectWithValue }) => {
    try {
      const response = await fetch(`https://693c01eab762a4f15c3f1d36.mockapi.io/blog/posts/${post.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: post.title,
          content: post.content,
          // Update other fields if needed
        }),
      });

      if (!response.ok) throw new Error('Failed to update external post');
      const data = await response.json();
      return { ...data, isExternal: true };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// Async thunk to delete external posts
export const deleteExternalPosts = createAsyncThunk(
  'posts/deleteExternalPosts',
  async (ids, { rejectWithValue }) => {
    try {
      await Promise.all(ids.map(id =>
        fetch(`https://693c01eab762a4f15c3f1d36.mockapi.io/blog/posts/${id}`, {
          method: 'DELETE',
        }).then(res => {
          if (!res.ok) throw new Error(`Failed to delete post ${id}`);
          return res.json();
        })
      ));
      return ids;
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
  internalPosts: [], // Keep explicit list for internal
  internalStatus: 'idle',
  internalError: null,
  internalPosts: [], // Keep explicit list for internal
  internalStatus: 'idle',
  internalError: null,
  // Separate pagination state for each mode
  createdPagination: {
    lastVisible: null,
    hasMore: false,
    cursors: {}
  },
  allPagination: {
    lastVisible: null,
    hasMore: false,
    cursors: {}
  },
  createdTotal: 0,
  allTotal: 0
});

// Helper to manage cursors for pages (1 -> null, 2 -> cursor1, etc)
// For simplicity, we'll just track the 'next' cursor. 
// True random access (Page 1 -> Page 5) in Firestore requires reading 1-4.
// We will enforce sequential navigation or reset.
// Post slice
const postsSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    clearExternalPosts: (state) => {
      state.externalPosts = [];
      state.externalStatus = 'idle';
    },
    resetPostsState: (state, action) => {
      const mode = action.payload; // 'created', 'all', or undefined for both
      if (mode === 'created' || !mode) {
        state.createdPagination = { lastVisible: null, hasMore: false, cursors: {} };
      }
      if (mode === 'all' || !mode) {
        state.allPagination = { lastVisible: null, hasMore: false, cursors: {} };
      }
      // Also clear posts list to avoid stale data flash
      state.internalPosts = [];
      state.internalStatus = 'idle';
      state.internalError = null;
      postsAdapter.removeAll(state);

      // Clear external posts as well if global reset or specifically requested (though mode arg usually 'created'/'all')
      if (!mode) {
        state.externalPosts = [];
        state.externalStatus = 'idle';
        state.externalError = null;
      }
    }
  },
  extraReducers: builder => {
    builder
      // Fetch Internal posts cases
      .addCase(fetchInternalPosts.pending, (state) => {
        state.internalStatus = 'loading';
        state.internalError = null;
      })
      .addCase(fetchInternalPosts.fulfilled, (state, action) => {
        state.internalStatus = 'succeeded';
        state.internalPosts = action.payload.posts;

        const mode = action.payload.mode || 'all'; // Default to all if missing? Or should strictly require?
        // Ideally should match the requested mode. user passed it in.

        const targetPagination = mode === 'created' ? state.createdPagination : state.allPagination;

        targetPagination.lastVisible = action.payload.lastVisible;
        targetPagination.hasMore = action.payload.hasMore;

        // Save/Update cursor for the NEXT page
        if (action.payload.page && action.payload.lastVisible) {
          targetPagination.cursors[action.payload.page + 1] = action.payload.lastVisible;
        }

        // Always replace adaptation to ensure state matches current page view exactly
        postsAdapter.setAll(state, action.payload.posts);
      })
      .addCase(fetchInternalPosts.rejected, (state, action) => {
        state.internalStatus = 'failed';
        state.internalError = action.payload;
      })
      .addCase(fetchTotalCount.fulfilled, (state, action) => {
        const { count, mode } = action.payload;
        if (mode === 'created') {
          state.createdTotal = count;
        } else if (mode === 'all') {
          state.allTotal = count;
        }
      })
      .addCase(fetchPostById.pending, (state) => {
        state.internalStatus = 'loading';
        state.internalError = null;
      })
      .addCase(fetchPostById.fulfilled, (state, action) => {
        state.internalStatus = 'succeeded';
        const post = action.payload;
        if (post.isExternal) {
          // Add to external posts if not present
          const exists = state.externalPosts.some(p => p.id == post.id);
          if (!exists) {
            state.externalPosts.push(post);
          } else {
            // Update existing
            const index = state.externalPosts.findIndex(p => p.id == post.id);
            state.externalPosts[index] = post;
          }
        } else {
          // Add to internal adapter
          postsAdapter.upsertOne(state, post);
        }
      })
      .addCase(fetchPostById.rejected, (state, action) => {
        state.internalStatus = 'failed';
        state.internalError = action.payload;
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
        // Optional: clear posts on loading to show skeleton
        state.externalPosts = [];
      })
      .addCase(fetchExternalPosts.fulfilled, (state, action) => {
        state.externalStatus = 'succeeded';
        state.externalPosts = action.payload.posts; // REPLACE, do not append
        // No need to map indices as we are replacing the view
      })
      .addCase(fetchExternalPosts.rejected, (state, action) => {
        state.externalStatus = 'failed';
        state.externalError = action.payload;
      })
      // External CRUD cases
      .addCase(createExternalPost.fulfilled, (state, action) => {
        // Optimistically add to top of list if supported, or just let replace strategy handle it on next fetch.
        // For now, let's prepend to show immediate feedback.
        state.externalPosts.unshift(action.payload);
      })
      .addCase(updateExternalPost.fulfilled, (state, action) => {
        const index = state.externalPosts.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.externalPosts[index] = { ...state.externalPosts[index], ...action.payload };
        }
      })
      .addCase(deleteExternalPosts.fulfilled, (state, action) => {
        state.externalPosts = state.externalPosts.filter(p => !action.payload.includes(p.id));
      })
      .addCase('auth/logout/fulfilled', (state) => {
        // Clear external posts on logout
        state.externalPosts = [];
        state.externalStatus = 'idle';
        state.externalError = null;
      });
  }
});

export const { clearExternalPosts, resetPostsState } = postsSlice.actions;
export const { selectAll: selectAllPosts, selectById: selectPostById, selectIds: selectPostIds } = postsAdapter.getSelectors(state => state.posts);

// Additional selectors for status, error, filters, and pagination
// Additional selectors
export const selectPostsStatus = state => state.posts.internalStatus;
export const selectPostsError = state => state.posts.internalError;
export const selectInternalPosts = state => state.posts.internalPosts;
export const selectCreatedPagination = state => state.posts.createdPagination;
export const selectAllPagination = state => state.posts.allPagination;
export const selectCreatedTotal = state => state.posts.createdTotal;
export const selectAllTotal = state => state.posts.allTotal;
export const selectExternalPosts = state => state.posts.externalPosts;
export const selectExternalPostsStatus = state => state.posts.externalStatus;
export const selectExternalPostsError = state => state.posts.externalError;
export const selectIsExternalCached = state => state.posts.isExternalCached;

// Memoized selector for sorted and filtered posts
export const selectSortedAndFilteredPosts = createSelector(
  [selectAllPosts, (state) => state.preferences.filters, (state) => state.auth.user, (state) => state.posts.externalPosts],
  (posts, filters, user, externalPosts) => {
    let filteredPosts = posts;

    if (filters.option === 'created') {
      // Show only posts authored by the authenticated user
      if (user) {
        filteredPosts = filteredPosts.filter(post => post.userId === user.uid);
      } else {
        filteredPosts = [];
      }
    } else if (filters.option === 'external') {
      // Show external posts, but prefer local version if edited
      filteredPosts = externalPosts
        .filter(p => p) // Filter out empty slots
    } else if (filters.option === 'all') {
      // Community View: Show ALL internal posts
      // Do NOT include external posts per new requirements
      filteredPosts = posts || [];
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
  [selectSortedAndFilteredPosts, (state) => state.preferences.pagination, (state) => state.preferences.filters],
  (posts, pagination, filters) => {
    // Return posts directly as they are now server-paginated (except for ALL mode merge)
    // For 'created' and 'external', the API returns only the requested page.
    if (filters.option === 'all') {
      // For ALL mode, we merged two limited lists.
      // We essentially have up to (Limit * 2) items.
      // We should slice to the requested limit to be safe, although mostly we just show what we got.
      // Or if we want strict behavior, we sort and take top N.
      // selectSortedAndFilteredPosts already sorts.
      return posts.slice(0, pagination.itemsPerPage);
    }
    return posts;
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
