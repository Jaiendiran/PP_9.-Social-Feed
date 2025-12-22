import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchInternalPosts, deletePosts, deleteExternalPosts, fetchExternalPosts, selectPaginatedPosts, selectPostsStatus, selectPostsError, selectExternalPostsStatus, selectExternalPostsError, selectInternalPosts, selectCreatedPagination, selectAllPagination, resetPostsState, fetchTotalCount, selectCreatedTotal, selectAllTotal, fetchAllInternalIds, fetchAllExternalIds } from './postsSlice';
import { setSearchFilter, setSortPreference, setCurrentPage, setItemsPerPage, selectFilters, selectPagination, setPostSelection, setPendingSort } from '../preferences/preferencesSlice';
import { selectUser } from '../auth/authSlice';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { SelectAllButton, ClearSelectionButton, DeleteSelectedButton, NewPostButton, SortControls, SearchBar, PaginationControls, HomeBtn, Dropdown } from './PostsControls';
import { FaPlusCircle, FaTrash } from 'react-icons/fa';
import SkeletonLoader from '../../components/SkeletonLoader';
import { FormatDate } from '../../utils/formatDate';
import ConfirmDialog from '../../components/ConfirmDialog';
import Toast from '../../components/Toast';
import styles from './PostsList.module.css';

function PostsList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  // Store selection as a Set of IDs for efficiency and to meet requirements
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [externalAllCount, setExternalAllCount] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams({ page: '1' });
  const pageParam = parseInt(searchParams.get('page')) || 1;

  const status = useSelector(selectPostsStatus);
  const error = useSelector(selectPostsError);
  const externalStatus = useSelector(selectExternalPostsStatus);
  const externalError = useSelector(selectExternalPostsError);
  const filters = useSelector(selectFilters);
  const pagination = useSelector(selectPagination);

  const currentStatus = filters.option === 'external' ? externalStatus : status;
  const currentError = filters.option === 'external' ? externalError : error;
  const createdPagination = useSelector(selectCreatedPagination);
  const allPagination = useSelector(selectAllPagination);
  const createdTotal = useSelector(selectCreatedTotal);
  const allTotal = useSelector(selectAllTotal);

  // Dynamic pagination selection based on mode
  const internalPagination = filters.option === 'all' ? allPagination : createdPagination;

  const allPosts = useSelector(selectInternalPosts); // Used for ID checks and internal counts (current page only)
  // externalPosts selector removed as data is accessed via paginatedPosts
  const paginatedPosts = useSelector(selectPaginatedPosts);

  const user = useSelector(selectUser);

  // Memoize computed values to prevent recalculation on every render
  // For external mode, use paginatedPosts as the source (external posts are fetched page-wise)
  const authorizedPosts = useMemo(() => {
    const source = filters.option === 'external' ? paginatedPosts : allPosts;
    return source.filter(post => user && (user.role === 'Admin' || post.userId === user.uid));
  }, [allPosts, paginatedPosts, user, filters.option]);

  const allSelected = useMemo(() => {
    if (!selectedIds || selectedIds.size === 0) return false;
    if (filters.option === 'external') {
      return externalAllCount ? selectedIds.size === externalAllCount : false;
    }
    // created/all use totals from slice
    const total = filters.option === 'created' ? createdTotal : allTotal;
    return total ? selectedIds.size === total : false;
  }, [selectedIds, filters.option, createdTotal, allTotal, externalAllCount]);

  const isEmpty = paginatedPosts.length === 0;

  // Calculate counts for pagination
  const createdPostsCount = useMemo(() =>
    allPosts.filter(p => !p.isExternal && user && p.userId === user.uid).length,
    [allPosts, user]
  );

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [isBatchDelete, setIsBatchDelete] = useState(false);
  const location = useLocation();
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('info');


  useEffect(() => {
    dispatch(setCurrentPage(pageParam));
  }, [pageParam, dispatch]);

  // Removed obsolete effect that fetched all posts on option change
  // New effect handles all cases above



  // Centralized fetch helper so we can refresh only the current page after deletes
  const fetchCurrentPage = useCallback(() => {
    const { currentPage, itemsPerPage } = pagination;
    const { sortBy, sortOrder, search } = filters;
    const internalCursor = internalPagination?.cursors?.[currentPage]; // Get cursor for this page if available

    if (filters.option === 'created') {
      const effectiveSort = sortBy === 'title' ? 'date' : sortBy;
      dispatch(fetchInternalPosts({
        limit: itemsPerPage,
        sortBy: effectiveSort,
        sortOrder,
        cursor: internalCursor,
        page: currentPage,
        userId: user?.uid,
        mode: 'created',
        search
      }));
    } else if (filters.option === 'external') {
      dispatch(fetchExternalPosts({
        page: currentPage,
        limit: itemsPerPage,
        sortBy,
        sortOrder,
        search
      }));
    } else {
      // 'all' or default
      dispatch(fetchInternalPosts({
        limit: itemsPerPage,
        sortBy,
        sortOrder,
        cursor: internalCursor,
        page: currentPage,
        mode: 'all',
        search
      }));
    }

    if (filters.option === 'created' || filters.option === 'all') {
      dispatch(fetchTotalCount({ userId: user?.uid, mode: filters.option, search }));
    }
  }, [dispatch, filters.option, filters.sortBy, filters.sortOrder, filters.search, pagination.currentPage, pagination.itemsPerPage, user?.uid, internalPagination]);

  useEffect(() => {
    fetchCurrentPage();
  }, [fetchCurrentPage]);

  useEffect(() => {
    const toast = location?.state?.toast;
    if (toast?.message) {
      setToastMsg(toast.message);
      setToastType(toast.type || 'info');
      setToastOpen(true);

      window.history.replaceState({}, document.title);
    }
  }, [location.pathname]);

  // Memoized handlers to prevent unnecessary re-renders
  const handleSearch = useCallback((query) => {
    if (query !== filters.search) {
      dispatch(setSearchFilter(query));
      dispatch(setCurrentPage(1));
      setSearchParams({ page: '1' });
    }
  }, [dispatch, setSearchParams, filters.search]);

  const handleSort = useCallback((key, order) => {
    // Mark sorting as pending while server-driven preferences and data sync
    dispatch(setPendingSort(true));
    dispatch(setSortPreference({ key, order }));
    // Reset to first page when sort changes
    dispatch(setCurrentPage(1));
    setSearchParams({ page: '1' });
  }, [dispatch, setSearchParams]);

  const isSortingPending = useSelector(state => state.preferences.isSortingPending);

  // Clear pending flag when the relevant posts fetch completes
  useEffect(() => {
    if (!isSortingPending) return;
    const relevantStatus = filters.option === 'external' ? externalStatus : status;
    if (relevantStatus === 'succeeded') {
      dispatch(setPendingSort(false));
    }
  }, [isSortingPending, status, externalStatus, filters.option, dispatch]);

  const handlePostSelection = useCallback((option) => {
    // Determine which mode to reset based on the *previous* mode (current at the time of click)
    // Actually, safer to just reset ALL internal pagination states or just the one we are leaving.
    // Resetting ALL is safest to guarantee no leaks. 
    // And "Created" mode needs to be cleared if we switch to "All", and vice versa.
    // So dispatch a global reset for safety.
    dispatch(resetPostsState());

    dispatch(setPostSelection(option));
    setSearchParams({ page: '1' });
    // Clear any existing selection when switching modes to avoid stale selections
    setSelectedIds(new Set());
    setExternalAllCount(null);
  }, [dispatch, setSearchParams]);

  const handlePageChange = useCallback((page) => {
    dispatch(setCurrentPage(page));
    setSearchParams({ page: page.toString() });
  }, [dispatch, setSearchParams]);

  const toggleSelectAll = useCallback(async () => {
    // If currently all-selected, clear selection
    if (allSelected) {
      setSelectedIds(new Set());
      setExternalAllCount(null);
      return;
    }

    try {
      if (filters.option === 'external') {
        // Fetch all external IDs from server
        const ids = await dispatch(fetchAllExternalIds({ limit: 50, search: filters.search })).unwrap();
        // ids is array of IDs (strings/numbers)
        const authorized = ids.filter(id => {
          // For external posts, only Admins or public posts; external posts are public, but we still respect Admin role if needed
          return user && (user.role === 'Admin' || true);
        });
        setExternalAllCount(authorized.length);
        setSelectedIds(new Set(authorized));
      } else {
        // Internal (created/all): fetch all internal ids with owner info
        const items = await dispatch(fetchAllInternalIds({ userId: filters.option === 'created' ? user?.uid : undefined, search: filters.search, mode: filters.option, sortBy: filters.sortBy, sortOrder: filters.sortOrder })).unwrap();
        // items is array of {id, userId}
        const authorized = items.filter(it => user && (user.role === 'Admin' || it.userId === user.uid)).map(it => it.id);
        setSelectedIds(new Set(authorized));
      }
    } catch (err) {
      // fallback: no-op, show toast
      setToastMsg(err.message || 'Failed to select all');
      setToastType('error');
      setToastOpen(true);
    }
  }, [allSelected, dispatch, filters.option, filters.search, filters.sortBy, filters.sortOrder, user]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setExternalAllCount(null);
  }, []);

  const handleBatchDeleteClick = useCallback(() => {
    if (!selectedIds || selectedIds.size === 0) return;
    setToDelete(Array.from(selectedIds));
    setIsBatchDelete(true);
    setConfirmOpen(true);
  }, [selectedIds]);

  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleItemsPerPageChange = useCallback((value) => {
    dispatch(setItemsPerPage(value));
  }, [dispatch]);

  // const handleOpenDeleteConfirm = useCallback((postId) => {
  //   setToDelete(postId);
  //   setIsBatchDelete(false);
  //   setConfirmOpen(true);
  // }, []);

  const handleCloseConfirm = useCallback(() => {
    setConfirmOpen(false);
  }, []);

  const handleCloseToast = useCallback(() => {
    setToastOpen(false);
  }, []);

  const handlePostClick = useCallback((postId) => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      return;
    }
    navigate(`/posts/${postId}?page=${pageParam}`);
  }, [navigate, pageParam]);

  const isFirstLoad = (currentStatus === 'loading' || currentStatus === 'idle') && paginatedPosts.length === 0;

  if (currentStatus === 'failed') {
    return <div className={styles.error}>Error: {currentError}</div>;
  }

  // (Empty state check removed)

  const handleConfirmDelete = async () => {
    try {
      const idsToDelete = isBatchDelete ? toDelete : [toDelete];

      if (filters.option === 'external') {
        await dispatch(deleteExternalPosts(idsToDelete)).unwrap();
      } else {
        await dispatch(deletePosts(idsToDelete)).unwrap();
      }

      setToastMsg('Post(s) deleted successfully');
      setToastType('success');
      setToastOpen(true);

      if (isBatchDelete) {
        setSelectedIds(new Set());
        setToDelete(null);
      }
      // Refresh the current page only to reflect deletions without resetting preferences
      try {
        fetchCurrentPage();
      } catch (e) {
        // ignore - fetchCurrentPage is sync wrapper that dispatches thunks
      }
    } catch (err) {
      setToastMsg(err.message || 'Delete failed');
      setToastType('error');
      setToastOpen(true);
    } finally {
      setConfirmOpen(false);
    }
  };

  return (
    <div className={styles.postsList}>


      <div className={styles.actions}>
        <div className={styles.rowOneWrapper}>
          <div className={styles.rowOneLeft}>
            <HomeBtn />
            <h2>All Posts</h2>
          </div>
          <div className={styles.searchBarWrapper}>
            <SearchBar onSearch={handleSearch} initialValue={filters.search} />
          </div>
        </div>
        <div className={styles.rowTwoWrapper}>
            <div className={styles.leftControls}>
            <SelectAllButton allSelected={allSelected} onToggle={toggleSelectAll} disabled={isFirstLoad || isEmpty} />
            <NewPostButton />
            <ClearSelectionButton disabled={allSelected || selectedIds.size === 0} onClear={clearSelection} />
            {selectedIds.size > 0 && (<DeleteSelectedButton onDelete={handleBatchDeleteClick} />)}
            <SortControls sortBy={filters.sortBy} sortOrder={filters.sortOrder} onSort={handleSort} />
          </div>
          <Dropdown selectedOption={filters.option} onChange={handlePostSelection} />
        </div>
      </div>

      <div className={styles.postsContainer}>
        <div className={styles.postsGrid}>
          {isFirstLoad && (
            <SkeletonLoader count={pagination.itemsPerPage} />
          )}

          {!isFirstLoad && paginatedPosts.length === 0 && filters.option === 'external' && externalStatus === 'loading' && (
            <SkeletonLoader count={pagination.itemsPerPage} />
          )}

          {!isFirstLoad && paginatedPosts.length === 0 && !(filters.option === 'external' && externalStatus === 'loading') && (
            <div className={styles.emptyState} onClick={() => navigate('/add')}>
              <FaPlusCircle className={styles.addIcon} />
              <span className={styles.buttonName}>Create New Post</span>
            </div>
          )}

          {!isFirstLoad && paginatedPosts.map(post => {
            const canEditOrDelete = user && (user.role === 'Admin' || post.userId === user.uid);
            return (
              <div key={post.id} className={styles.postCard} onClick={() => handlePostClick(post.id)} >
                <input
                  type="checkbox"
                  checked={selectedIds.has(post.id)}
                  onClick={e => e.stopPropagation()}
                  onChange={() => toggleSelect(post.id)}
                  disabled={!canEditOrDelete}
                  style={{ opacity: canEditOrDelete ? 1 : 0.5, cursor: canEditOrDelete ? 'pointer' : 'not-allowed' }}
                />
                <div className={styles.postContent}>
                  <h3>{post.title}</h3>
                  <p className={styles.postMsg}>{post.content}</p>
                  <div className={styles.postMeta}>
                    <p className={styles.postDate}>{FormatDate(post.createdAt)}</p>
                    <p className={styles.postAuthor}>
                      <strong>Author: </strong>
                      {post.isExternal ? 'Public' : (post.authorName || 'Unknown User')}
                    </p>
                    </div>
                </div>
                {canEditOrDelete && (
                  <FaTrash
                    className={styles.deleteIcon}
                    onClick={(e) => {
                      e.stopPropagation();
                      setToDelete(post.id);
                      setIsBatchDelete(false);
                      setConfirmOpen(true);
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {paginatedPosts.length > 0 && (
        <PaginationControls
          currentPage={pageParam}
          totalPages={
            filters.option === 'external'
              ? Math.ceil(100 / pagination.itemsPerPage) // MockAPI has 100 posts
              : filters.option === 'created'
                ? Math.ceil(createdTotal / pagination.itemsPerPage) || 1
                : Math.ceil(allTotal / pagination.itemsPerPage) || 1
          }
          onPageChange={handlePageChange}
          setSearchParams={setSearchParams}
          itemsPerPage={pagination.itemsPerPage}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Delete post(s)?"
        message={isBatchDelete ? `Delete ${toDelete?.length} selected posts? This cannot be undone.` : `Delete this post? This cannot be undone.`}
        onCancel={handleCloseConfirm}
        onConfirm={handleConfirmDelete}
      />

      <Toast open={toastOpen} message={toastMsg} type={toastType} onClose={handleCloseToast} />
    </div>
  );
}

export default React.memo(PostsList);
