import { createSlice, createAsyncThunk, createEntityAdapter, createSelector } from '@reduxjs/toolkit';
import { cacheUtils, cacheKeys } from '../../utils/cacheUtils';
import { db } from '../../firebase.config';
import { collection, getDocs, setDoc, deleteDoc, doc, getDoc, query, orderBy, limit, startAfter, where, documentId, getCountFromServer, startAt, endAt, writeBatch } from 'firebase/firestore';



// Async thunk to fetch posts from Firestore (Internal)
export const fetchInternalPosts = createAsyncThunk(
  'posts/fetchInternalPosts',
  async ({ limit: limitVal, sortBy, sortOrder, cursor, page, userId, mode, search }, { rejectWithValue }) => {
    try {
      const postsRef = collection(db, 'posts');
      let q = query(postsRef);

      if (search && search.trim().length > 0) {
        const searchTerm = search.trim();
        q = query(q, orderBy('title', 'asc'), startAt(searchTerm), endAt(searchTerm + '\uf8ff'));
      } else {
        if (userId) q = query(q, where('userId', '==', userId));

        const sortField = sortBy === 'title' ? 'title' : 'createdAt';

        q = query(q, checkBoxOrderBy(sortField, sortOrder));
      }
      if (cursor) q = query(q, startAfter(cursor)); // Apply pagination

      q = query(q, limit(limitVal));

      let querySnapshot;
      let posts = [];
      let lastVisible = null;

      try {
        querySnapshot = await getDocs(q);
      } catch (err) {
        const looksLikeIndexError = /index/i.test(err.message || '');

        if (looksLikeIndexError) {
          // Fallback or re-throw. The existing title fallback was specific.
          // We can keep the specific title fallback logic if we want, but simpler to just let it fail or handle generically?
          // The existing code had a specific fallback for title index errors.
          // Let's preserve the existing Title fallback block structure but logic needs to match variables.

          if (sortBy === 'title' && userId) {
            let fallbackQ = query(postsRef);

            if (userId) fallbackQ = query(fallbackQ, where('userId', '==', userId));
            fallbackQ = query(fallbackQ, orderBy('createdAt', sortOrder));
            if (cursor) fallbackQ = query(fallbackQ, startAfter(cursor));
            fallbackQ = query(fallbackQ, limit(limitVal));

            querySnapshot = await getDocs(fallbackQ);
            querySnapshot.forEach((doc) => {
              posts.push({ id: doc.id, ...doc.data() });
            });

            // Client-side sort for the page by title
            posts.sort((a, b) => {
              const A = (a.title || '').toString().toLowerCase();
              const B = (b.title || '').toString().toLowerCase();

              if (A < B) return sortOrder === 'asc' ? -1 : 1;
              if (A > B) return sortOrder === 'asc' ? 1 : -1;

              return 0;
            });

            if (querySnapshot && querySnapshot.docs && querySnapshot.docs.length > 0) {
              // The cursor for next page in fallback mode is tricky.
              // If we sort by title client side, we can't easily pagination next page via Firestore cursor unless we pull ALL.
              // But this fallback pulls 'limitVal' sorted by date.
              // This is an imperfect fallback (pagination might drift).
              // But let's leave it as is for now, just focused on the main path.
              const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
              lastVisible = lastDoc.data().createdAt;
            }

            return {
              posts,
              lastVisible, // Value for next page
              hasMore: posts.length === limitVal,
              page, // Pass page back for reducer to map cursor
              mode // Pass mode back to reducer
            };
          }
        }
        throw err;
      }

      // Normal successful path: build posts from querySnapshot
      if (querySnapshot && querySnapshot.docs) {
        querySnapshot.forEach((doc) => {
          posts.push({ id: doc.id, ...doc.data() });
        });

        if (querySnapshot.docs.length > 0) {
          const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
          // Correctly choose cursor value based on sortField
          if (sortBy === 'title') {
            lastVisible = lastDoc.data().title;
          } else {
            lastVisible = lastDoc.data().createdAt;
          }
        }
      }

      return {
        posts,
        lastVisible,
        hasMore: (querySnapshot && querySnapshot.docs && querySnapshot.docs.length === limitVal),
        page,
        mode
      };
    } catch (err) {
      return rejectWithValue('Failed to fetch internal posts: ' + err.message);
    }
  }
);

// Async thunk to fetch total count of posts from Firestore
export const fetchTotalCount = createAsyncThunk(
  'posts/fetchTotalCount',
  async ({ userId, mode, search }, { rejectWithValue }) => {
    try {
      const postsRef = collection(db, 'posts');
      let q = query(postsRef);

      if (search && search.trim().length > 0) {
        const searchTerm = search.trim();
        q = query(q, orderBy('title'), startAt(searchTerm), endAt(searchTerm + '\uf8ff'));
      } else {
        if (mode === 'created' && userId) {
          q = query(q, where('userId', '==', userId));
        }
      }

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
            authorName: data.authorName || 'Anonymous'
          };
        }
      } catch (externalErr) {
        console.warn('External fetch failed', externalErr);
      }

      throw new Error('Post not found');
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// Async thunk to fetch all internal post IDs matching filters (mode: 'all'|'created')
export const fetchAllInternalIds = createAsyncThunk(
  'posts/fetchAllInternalIds',
  async ({ userId, search, mode, sortBy, sortOrder }, { rejectWithValue }) => {
    try {
      const postsRef = collection(db, 'posts');
      let q = query(postsRef);

      if (search && search.trim().length > 0) {
        const searchTerm = search.trim();
        q = query(q, orderBy('title', 'asc'), startAt(searchTerm), endAt(searchTerm + '\uf8ff'));
      } else {
        if (mode === 'created' && userId) {
          q = query(q, where('userId', '==', userId));
        }

        const effectiveSort = (mode === 'created' && sortBy === 'title') ? 'date' : sortBy;
        const sortField = effectiveSort === 'title' ? 'title' : 'createdAt';

        q = query(q, orderBy(sortField, sortOrder));
      }

      let querySnapshot;
      let items = [];

      try {
        querySnapshot = await getDocs(q);
      } catch (err) {
        try {
          if (mode === 'created' && userId) {
            const fallbackQ = query(postsRef, where('userId', '==', userId));
            querySnapshot = await getDocs(fallbackQ);
          } else {
            throw err;
          }
        } catch (fallbackErr) {
          throw err;
        }
      }

      if (querySnapshot) {
        querySnapshot.forEach(docSnap => items.push({ id: docSnap.id, userId: docSnap.data().userId }));
      }

      return items;
    } catch (err) {
      return rejectWithValue('Failed to fetch internal IDs: ' + err.message);
    }
  }
);

// Async thunk to fetch all external post IDs (Admin only)
export const fetchAllExternalIds = createAsyncThunk(
  'posts/fetchAllExternalIds',
  async ({ limit = 50, search } = {}, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const user = state.auth?.user;

      if (!user || user.role !== 'Admin') {
        return rejectWithValue('Unauthorized');
      }

      const ids = [];
      let page = 1;

      while (true) {
        const params = new URLSearchParams({ page, limit });
        if (search) params.append('search', search);
        const res = await fetch(`https://693c01eab762a4f15c3f1d36.mockapi.io/blog/posts?${params}`);
        if (!res.ok) {
          if (res.status === 404) break;
          throw new Error('Failed to fetch external posts');
        }
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) break;
        data.forEach(p => ids.push(p.id));
        if (data.length < limit) break;
        page += 1;
        if (page > 1000) break;
      }

      return ids;
    } catch (err) {
      return rejectWithValue('Failed to fetch external IDs: ' + err.message);
    }
  }
);

// Async thunk to fetch total count for external posts (MockAPI)
export const fetchExternalTotal = createAsyncThunk(
  'posts/fetchExternalTotal',
  async ({ search } = {}, { rejectWithValue }) => {
    try {
      const baseUrl = 'https://693c01eab762a4f15c3f1d36.mockapi.io/blog/posts';
      const probeParams = new URLSearchParams({ page: 1, limit: 1 });

      if (search) probeParams.append('search', search);
      const probeRes = await fetch(`${baseUrl}?${probeParams}`);

      if (!probeRes.ok) {
        if (probeRes.status === 404) return { count: 0, mode: 'external' }
      } else {
        const totalHeader = probeRes.headers.get('X-Total-Count') || probeRes.headers.get('x-total-count');
        if (totalHeader) return { count: parseInt(totalHeader, 10), mode: 'external' };
      }

      const perPage = 50;
      let page = 1;
      let total = 0;
      const maxPages = 200;

      while (page <= maxPages) {
        const params = new URLSearchParams({ page, limit: perPage });
        if (search) params.append('search', search);
        const r = await fetch(`${baseUrl}?${params}`);
        if (!r.ok) break;
        const data = await r.json();
        if (!Array.isArray(data) || data.length === 0) break;
        total += data.length;
        if (data.length < perPage) break;
        page += 1;
      }
      return { count: total, mode: 'external' };
    } catch (err) {
      return rejectWithValue('Failed to fetch external total: ' + err.message);
    }
  }
);

// Helper utilities
const sleep = (ms) => new Promise(res => setTimeout(res, ms));
const chunkArray = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

// Thunk to delete posts in batches with progress reporting and partial reporting
export const deletePostsInBatches = createAsyncThunk(
  'posts/deletePostsInBatches',
  async ({ ids = [], isExternal = false, batchSizeInternal = 200, batchSizeExternal = 20, retries = 2 }, thunkAPI) => {
    // Enforce admin-only external deletes at thunk level
    if (isExternal) {
      try {
        const state = thunkAPI.getState();
        const user = state.auth?.user;

        if (!user || user.role !== 'Admin') {
          thunkAPI.dispatch(postsSlice.actions.finishDeleteProgress({ total: ids.length, processed: 0, successCount: 0, failed: ids.length, failedItems: ids }));
          return thunkAPI.rejectWithValue('Unauthorized');
        }
      } catch (e) { /* proceed and let later checks fail */ }
    }

    const total = ids.length;
    const successIds = [];
    const failed = [];

    thunkAPI.dispatch(postsSlice.actions.startDeleteProgress({ total }));
    // Deletion logic
    try {
      if (isExternal) {
        const chunks = chunkArray(ids, batchSizeExternal);

        for (let i = 0; i < chunks.length; i++) {
          if (thunkAPI.signal.aborted) break;
          const batch = chunks[i];

          for (let j = 0; j < batch.length; j++) {
            const id = batch[j];
            if (thunkAPI.signal.aborted) break;
            let attempt = 0;
            let deleted = false;

            while (attempt <= retries && !deleted) {
              try {
                const res = await fetch(`https://693c01eab762a4f15c3f1d36.mockapi.io/blog/posts/${encodeURIComponent(id)}`, { method: 'DELETE' });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                successIds.push(id);
                deleted = true;
              } catch (err) {
                attempt += 1;
                if (attempt > retries) {
                  failed.push({ id, error: err.message || String(err) });
                } else {
                  await sleep(200 * Math.pow(2, attempt));
                }
              }
            }

            thunkAPI.dispatch(postsSlice.actions.updateDeleteProgress({ processed: successIds.length + failed.length, successCount: successIds.length, failureCount: failed.length, failedItems: failed.map(f => f.id) }));

            await sleep(75); // small pause between requests
          }
        }
      } else {
        const chunks = chunkArray(ids, batchSizeInternal);

        for (let i = 0; i < chunks.length; i++) {
          if (thunkAPI.signal.aborted) break;
          const batchIds = chunks[i];
          let attempt = 0;
          let committed = false;

          while (attempt <= retries && !committed) {
            try {
              const batch = writeBatch(db);
              batchIds.forEach(id => batch.delete(doc(db, 'posts', String(id))));
              await batch.commit();
              successIds.push(...batchIds);
              committed = true;
            } catch (err) {
              attempt += 1;
              if (attempt > retries) {
                batchIds.forEach(id => failed.push({ id, error: err.message || String(err) }));
              } else {
                await sleep(200 * Math.pow(2, attempt));
              }
            }
          }

          thunkAPI.dispatch(postsSlice.actions.updateDeleteProgress({ processed: successIds.length + failed.length, successCount: successIds.length, failureCount: failed.length, failedItems: failed.map(f => f.id) }));
        }
      }

      // Update local state to reflect deleted items
      if (successIds.length > 0) {
        if (isExternal) {
          thunkAPI.dispatch(postsSlice.actions.removeExternalByIds(successIds));
        } else {
          thunkAPI.dispatch(postsSlice.actions.removeInternalByIds(successIds.map(String)));
        }
      }

      thunkAPI.dispatch(postsSlice.actions.finishDeleteProgress({ total, processed: successIds.length + failed.length, successCount: successIds.length, failed: failed.length, failedItems: failed.map(f => f.id) }));

      return { successIds, failed };
    } catch (err) {
      thunkAPI.dispatch(postsSlice.actions.finishDeleteProgress({ total, processed: successIds.length + failed.length, successCount: successIds.length, failed: failed.length, failedItems: failed.map(f => f.id) }));

      return thunkAPI.rejectWithValue(err.message || String(err));
    }
  }
);

// Helper to safely construct orderBy
const checkBoxOrderBy = (field, order) => orderBy(field, order);

// Async thunk to save a post to Firestore
export const savePost = createAsyncThunk(
  'posts/savePost',
  async (post, { rejectWithValue }) => {
    try {
      await setDoc(doc(db, 'posts', String(post.id)), post);

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

      cacheUtils.clear(cacheKeys.POSTS);

      return ids;
    } catch (err) {
      return rejectWithValue('Failed to delete posts: ' + err.message);
    }
  }
);

// Async thunk to fetch external posts from MockAPI
export const fetchExternalPosts = createAsyncThunk(
  'posts/fetchExternalPosts',
  async ({ page, limit, sortBy, sortOrder, search }, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams({
        page,
        limit,
        sortBy: sortBy === 'date' ? 'createdAt' : sortBy,
        order: sortOrder
      });

      if (search) {
        queryParams.append('title', search);
        queryParams.append('search', search);
      }

      const response = await fetch(`https://693c01eab762a4f15c3f1d36.mockapi.io/blog/posts?${queryParams}`);

      if (!response.ok) {
        if (response.status === 404) {
          return {
            posts: [],
            page
          };
        }
        throw new Error('Failed to fetch external posts');
      }

      const data = await response.json();

      return {
        posts: data.map(post => ({
          ...post,
          id: post.id,
          title: post.title,
          content: post.content || "No content available",
          isExternal: post.isExternal,
          userId: post.userId || 'external',
          createdAt: post.createdAt || new Date().toISOString(),
          authorName: post.authorName || 'Public User'
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
  async (post, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const user = state.auth?.user;

      if (!user || user.role !== 'Admin') {
        return rejectWithValue('Unauthorized');
      }

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
  async (post, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const user = state.auth?.user;

      if (!user || user.role !== 'Admin') {
        return rejectWithValue('Unauthorized');
      }

      const response = await fetch(`https://693c01eab762a4f15c3f1d36.mockapi.io/blog/posts/${post.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: post.title,
          content: post.content,
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
  async (ids, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const user = state.auth?.user;

      if (!user || user.role !== 'Admin') {
        return rejectWithValue('Unauthorized');
      }

      await Promise.all(ids.map(id => fetch(`https://693c01eab762a4f15c3f1d36.mockapi.io/blog/posts/${id}`, {
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
  internalPosts: [],
  internalStatus: 'idle',
  internalError: null,
  internalPosts: [],
  internalStatus: 'idle',
  internalError: null,

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
  allTotal: 0,
  externalTotal: 0,
  deleteProgress: {
    running: false,
    total: 0,
    processed: 0,
    success: 0,
    failed: 0,
    failedItems: []
  },
  selectedIds: []
});

const postsSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    // Delete progress reducers
    startDeleteProgress: (state, action) => {
      state.deleteProgress = { running: true, total: action.payload.total || 0, processed: 0, success: 0, failed: 0, failedItems: [] };
    },
    updateDeleteProgress: (state, action) => {
      const p = state.deleteProgress || {};
      p.processed = action.payload.processed ?? p.processed;
      p.success = action.payload.successCount ?? p.success;
      p.failed = action.payload.failureCount ?? p.failed;
      if (action.payload.failedItems) p.failedItems = p.failedItems.concat(action.payload.failedItems);
      state.deleteProgress = p;
    },
    finishDeleteProgress: (state, action) => {
      state.deleteProgress = { running: false, total: action.payload.total ?? 0, processed: action.payload.processed ?? 0, success: action.payload.successCount ?? 0, failed: action.payload.failed ?? 0, failedItems: action.payload.failedItems || [] };
    },
    // Selection reducers to persist selected IDs across re-renders
    setSelection: (state, action) => {
      state.selectedIds = Array.isArray(action.payload) ? action.payload.map(String) : [];
    },
    clearSelection: (state) => {
      state.selectedIds = [];
    },
    toggleSelectionId: (state, action) => {
      const id = String(action.payload);
      const idx = state.selectedIds.indexOf(id);
      if (idx === -1) state.selectedIds.push(id); else state.selectedIds.splice(idx, 1);
    },
    // Remove posts by IDs
    removeExternalByIds: (state, action) => {
      const ids = (action.payload || []).map(String);
      state.externalPosts = state.externalPosts.filter(p => !ids.includes(String(p.id)));
    },
    removeInternalByIds: (state, action) => {
      const ids = (action.payload || []).map(String);
      postsAdapter.removeMany(state, ids);
      state.internalPosts = state.internalPosts.filter(p => !ids.includes(String(p.id)));
    },
    clearExternalPosts: (state) => {
      state.externalPosts = [];
      state.externalStatus = 'idle';
    },
    resetPostsState: (state, action) => {
      const mode = action.payload; // 'created', 'all', or undefined for both

      if (mode === 'created' || !mode) state.createdPagination = { lastVisible: null, hasMore: false, cursors: {} };
      if (mode === 'all' || !mode) state.allPagination = { lastVisible: null, hasMore: false, cursors: {} };

      state.internalPosts = [];
      state.internalStatus = 'idle';
      state.internalError = null;
      postsAdapter.removeAll(state);

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

        const mode = action.payload.mode || 'all';
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
      .addCase(fetchExternalTotal.fulfilled, (state, action) => {
        const { count } = action.payload || {};
        state.externalTotal = count || 0;
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
        // Also remove from internalPosts array to keep in sync
        state.internalPosts = state.internalPosts.filter(p => !action.payload.includes(p.id));
      })
      // Fetch external posts cases
      .addCase(fetchExternalPosts.pending, (state) => {
        state.externalStatus = 'loading';
        state.externalError = null;
        state.externalPosts = [];
      })
      .addCase(fetchExternalPosts.fulfilled, (state, action) => {
        state.externalStatus = 'succeeded';
        state.externalPosts = action.payload.posts;
      })
      .addCase(fetchExternalPosts.rejected, (state, action) => {
        state.externalStatus = 'failed';
        state.externalError = action.payload;
      })
      // External CRUD cases
      .addCase(createExternalPost.fulfilled, (state, action) => {
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
        state.externalPosts = [];
        state.externalStatus = 'idle';
        state.externalError = null;
      });
  }
});

export const { startDeleteProgress, updateDeleteProgress, finishDeleteProgress, clearExternalPosts, resetPostsState, setSelection, clearSelection: clearSelectionAction, toggleSelectionId, removeExternalByIds, removeInternalByIds } = postsSlice.actions;

// Backwards-compatible export: some modules may import `clearSelection` directly
export const clearSelection = postsSlice.actions.clearSelection;
export const { selectAll: selectAllPosts, selectById: selectPostById, selectIds: selectPostIds } = postsAdapter.getSelectors(state => state.posts);

// Additional selectors for status, error, filters, and pagination
export const selectPostsStatus = state => state.posts.internalStatus;
export const selectPostsError = state => state.posts.internalError;
export const selectInternalPosts = state => state.posts.internalPosts;
export const selectCreatedPagination = state => state.posts.createdPagination;
export const selectAllPagination = state => state.posts.allPagination;
export const selectCreatedTotal = state => state.posts.createdTotal;
export const selectAllTotal = state => state.posts.allTotal;
export const selectExternalTotal = state => state.posts.externalTotal;
export const selectExternalPosts = state => state.posts.externalPosts;
export const selectExternalPostsStatus = state => state.posts.externalStatus;
export const selectExternalPostsError = state => state.posts.externalError;
export const selectIsExternalCached = state => state.posts.isExternalCached;
export const selectDeleteProgress = state => state.posts.deleteProgress;
export const selectSelectedIds = state => state.posts.selectedIds || [];

// Memoized selector for sorted and filtered posts
export const selectSortedAndFilteredPosts = createSelector(
  [(state) => state.posts.internalPosts, (state) => state.preferences.filters, (state) => state.auth.user, (state) => state.posts.externalPosts],
  (internalPosts, filters, user, externalPosts) => {

    if (filters.option === 'external') return externalPosts;

    return internalPosts || [];
  }
);

// Memoized selector for paginated posts
export const selectPaginatedPosts = createSelector(
  [selectSortedAndFilteredPosts, (state) => state.preferences.pagination, (state) => state.preferences.filters],
  (posts, pagination, filters) => {

    if (filters.option === 'all') {
      return posts.slice(0, pagination.itemsPerPage);
    }
    return posts;
  }
);

// Selector to find a post by ID from either local or external source
export const selectPostByIdCombined = (state, postId) => {
  let post = selectPostById(state, postId);
  if (post) return post;
  const externalPosts = state.posts.externalPosts;
  post = externalPosts.find(p => p && p.id == postId);
  return post;
};

export default postsSlice.reducer;
