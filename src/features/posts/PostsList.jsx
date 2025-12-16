import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchInternalPosts, deletePosts, deleteExternalPosts, fetchExternalPosts, selectPaginatedPosts, selectPostsStatus, selectPostsError, selectExternalPostsStatus, selectExternalPostsError, selectInternalPosts, selectCreatedPagination, selectAllPagination, clearExternalPosts, resetPostsState, fetchTotalCount, selectCreatedTotal, selectAllTotal } from './postsSlice';
import { setSearchFilter, setSortPreference, setCurrentPage, setItemsPerPage, selectFilters, selectPagination, setPostSelection } from '../preferences/preferencesSlice';
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
  const [selectedIds, setSelectedIds] = useState([]);
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
  const authorizedPosts = useMemo(() =>
    allPosts.filter(post => user && (user.role === 'Admin' || post.userId === user.uid)),
    [allPosts, user]
  );

  const allSelected = useMemo(() =>
    selectedIds.length > 0 &&
    selectedIds.every(id => authorizedPosts.some(p => p.id === id)) &&
    selectedIds.length === authorizedPosts.length,
    [selectedIds, authorizedPosts]
  );

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



  useEffect(() => {
    // Mode-Aware Fetching Strategy
    const { currentPage, itemsPerPage } = pagination;
    const { sortBy, sortOrder } = filters;
    const internalCursor = internalPagination.cursors[currentPage]; // Get cursor for this page if available

    if (filters.option === 'created') {
      // Force 'date' sort for server fetch to use documentId(), avoiding "userId + title" index requirement.
      // Client-side selector will still apply the Title sort to the returned page.
      const effectiveSort = sortBy === 'title' ? 'date' : sortBy;
      dispatch(fetchInternalPosts({
        limit: itemsPerPage,
        sortBy: effectiveSort,
        sortOrder,
        cursor: internalCursor,
        page: currentPage,
        userId: user?.uid,
        mode: 'created'
      }));
    } else if (filters.option === 'external') {
      dispatch(fetchExternalPosts({
        page: currentPage,
        limit: itemsPerPage,
        sortBy,
        sortOrder
      }));
    } else if (filters.option === 'all') {
      // Only fetch internal posts (Community View)
      dispatch(fetchInternalPosts({
        limit: itemsPerPage,
        sortBy,
        sortOrder,
        cursor: internalCursor,
        page: currentPage,
        mode: 'all'
      }));
    }

    // Always fetch total count for the current mode (if internal) to ensure accurate pagination
    if (filters.option === 'created' || filters.option === 'all') {
      dispatch(fetchTotalCount({ userId: user?.uid, mode: filters.option }));
    }
  }, [dispatch, filters.option, filters.sortBy, filters.sortOrder, pagination.currentPage, pagination.itemsPerPage, user?.uid]); // Intentionally omitting internalPagination to avoid loops

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
    dispatch(setSortPreference({ key, order }));
  }, [dispatch]);

  const handlePostSelection = useCallback((option) => {
    // Determine which mode to reset based on the *previous* mode (current at the time of click)
    // Actually, safer to just reset ALL internal pagination states or just the one we are leaving.
    // Resetting ALL is safest to guarantee no leaks. 
    // And "Created" mode needs to be cleared if we switch to "All", and vice versa.
    // So dispatch a global reset for safety.
    dispatch(resetPostsState());

    dispatch(setPostSelection(option));
    setSearchParams({ page: '1' });
  }, [dispatch, setSearchParams]);

  const handlePageChange = useCallback((page) => {
    dispatch(setCurrentPage(page));
    setSearchParams({ page: page.toString() });
  }, [dispatch, setSearchParams]);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => prev.length === authorizedPosts.length ? [] : authorizedPosts.map(post => post.id));
  }, [authorizedPosts]);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const handleBatchDeleteClick = useCallback(() => {
    if (!selectedIds || selectedIds.length === 0) return;
    setToDelete([...selectedIds]);
    setIsBatchDelete(true);
    setConfirmOpen(true);
  }, [selectedIds]);

  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }, []);

  const handleItemsPerPageChange = useCallback((value) => {
    dispatch(setItemsPerPage(value));
  }, [dispatch]);

  const handleOpenDeleteConfirm = useCallback((postId) => {
    setToDelete(postId);
    setIsBatchDelete(false);
    setConfirmOpen(true);
  }, []);

  const handleCloseConfirm = useCallback(() => {
    setConfirmOpen(false);
  }, []);

  const handleCloseToast = useCallback(() => {
    setToastOpen(false);
  }, []);

  const isFirstLoad = (currentStatus === 'loading' || currentStatus === 'idle') && paginatedPosts.length === 0;

  if (currentStatus === 'failed') {
    return <div className={styles.error}>Error: {currentError}</div>;
  }

  // (Empty state check removed)

  const handleConfirmDelete = async () => {
    // ...
  };

  return (
    <div className={styles.postsList}>
      <div className={styles.header}>
        <h2>All Posts</h2>
      </div>

      <div className={styles.actions}>
        <div className={styles.rowOneWrapper}>
          <div className={styles.rowOneLeft}>
            <HomeBtn />
            <NewPostButton />
            <SelectAllButton allSelected={allSelected} onToggle={toggleSelectAll} disabled={isFirstLoad || isEmpty} />
            <ClearSelectionButton disabled={allSelected || selectedIds.length === 0} onClear={clearSelection} />
            {(selectedIds.length > 0 || (isEmpty && !isFirstLoad)) && (<DeleteSelectedButton onDelete={handleBatchDeleteClick} />)}
          </div>
          <div className={styles.searchBarWrapper}>
            <SearchBar onSearch={handleSearch} initialValue={filters.search} />
          </div>
        </div>
        <div className={styles.rowTwoWrapper}>
          <SortControls sortBy={filters.sortBy} sortOrder={filters.sortOrder} onSort={handleSort} />
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
              <div key={post.id} className={styles.postCard} onClick={() => navigate(`/posts/${post.id}?page=${pageParam}`)} >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(post.id)}
                  onClick={e => e.stopPropagation()}
                  onChange={() => toggleSelect(post.id)}
                  disabled={!canEditOrDelete}
                  style={{ opacity: canEditOrDelete ? 1 : 0.5, cursor: canEditOrDelete ? 'pointer' : 'not-allowed' }}
                />
                <div className={styles.postContent}>
                  <h3>{post.title}</h3>
                  <p className={styles.postMsg}>{post.content}</p>
                  <p className={styles.postAuthor}>
                    <strong>Author: </strong>
                    {post.isExternal ? 'Public' : (post.authorName || 'Unknown User')}
                  </p>
                  <p className={styles.postDate}>{FormatDate(post.createdAt)}</p>
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
