import { useEffect, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchPosts, deletePosts, fetchExternalPosts, selectPaginatedPosts, selectPostsStatus, selectPostsError, selectExternalPostsStatus, selectExternalPostsError, selectAllPosts } from './postsSlice';
import { setSearchFilter, setSortPreference, setCurrentPage, setItemsPerPage, selectFilters, selectPagination, setPostSelection } from '../preferences/preferencesSlice';
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

  const allPosts = useSelector(selectAllPosts);
  const externalPosts = useSelector(state => state.posts.externalPosts);
  const paginatedPosts = useSelector(selectPaginatedPosts);

  const allSelected = selectedIds.length === allPosts.length && allPosts.length > 0;
  const isEmpty = allPosts.length === 0;

  // Calculate counts for pagination
  const createdPostsCount = allPosts.filter(p => !p.isExternal).length;

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

  useEffect(() => {
    // Fetch local posts if option is 'all' or 'created' (default)
    if (filters.option !== 'external') {
      dispatch(fetchPosts());
    }
  }, [dispatch, filters.option]);

  useEffect(() => {
    // Fetch external posts if option is 'all' or 'external'
    if (filters.option === 'external' || filters.option === 'all') {
      const { currentPage, itemsPerPage } = pagination;
      const start = (currentPage - 1) * itemsPerPage;
      const limit = itemsPerPage;

      // Check if we have data for this range
      const hasData = externalPosts.slice(start, start + limit).filter(p => p).length === limit;

      if (!hasData && externalStatus !== 'loading') {
        dispatch(fetchExternalPosts({ start, limit }));
      }
    }
  }, [dispatch, filters.option, pagination.currentPage, pagination.itemsPerPage, externalPosts, externalStatus]);

  useEffect(() => {
    const toast = location?.state?.toast;
    if (toast?.message) {
      setToastMsg(toast.message);
      setToastType(toast.type || 'info');
      setToastOpen(true);

      window.history.replaceState({}, document.title);
    }
  }, [location.pathname]);

  // Filter and sort handlers
  const handleSearch = useCallback((query) => {
    if (query !== filters.search) {
      dispatch(setSearchFilter(query));
      dispatch(setCurrentPage(1));
      setSearchParams({ page: '1' });
    }
  }, [dispatch, setSearchParams, filters.search]);

  const handleSort = (key, order) => {
    dispatch(setSortPreference({ key, order }));
  };

  const handlePostSelection = (option) => {
    dispatch(setPostSelection(option));
    setSearchParams({ page: '1' });
  };

  const handlePageChange = (page) => {
    dispatch(setCurrentPage(page));
    setSearchParams({ page: page.toString() });
  };

  // Control handlers
  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : allPosts.map(post => post.id));
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const handleBatchDeleteClick = () => {
    if (!selectedIds || selectedIds.length === 0) return;
    setToDelete([...selectedIds]);
    setIsBatchDelete(true);
    setConfirmOpen(true);
  };

  const toggleSelect = id => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const isFirstLoad = currentStatus === 'loading' && allPosts.length === 0;

  if (isFirstLoad) {
    return <SkeletonLoader count={pagination.itemsPerPage} />;
  }

  if (currentStatus === 'failed') {
    return <div className={styles.error}>Error: {currentError}</div>;
  }

  if (isEmpty) {
    return (
      <div className={styles.emptyState} onClick={() => navigate('/add')}>
        <FaPlusCircle className={styles.addIcon} />
        <span className={styles.buttonName}>Create New Post</span>
      </div>
    );
  }

  const handleConfirmDelete = async () => {
    try {
      const ids = Array.isArray(toDelete) ? toDelete : [toDelete];
      await dispatch(deletePosts(ids)).unwrap();

      const remainingCount = allPosts.length - ids.length;
      const itemsPerPage = pagination.itemsPerPage;
      const maxValidPage = Math.ceil(remainingCount / itemsPerPage);

      if (pageParam > maxValidPage && maxValidPage > 0) {
        dispatch(setCurrentPage(maxValidPage));
        setSearchParams({ page: maxValidPage.toString() });
      }

      setToastMsg('Deleted successfully');
      setToastType('success');
      if (isBatchDelete) setSelectedIds([]);
    } catch (err) {
      setToastMsg(err?.message || 'Delete failed');
      setToastType('error');
    } finally {
      setToastOpen(true);
      setConfirmOpen(false);
      setToDelete(null);
      setIsBatchDelete(false);
    }
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
            <SelectAllButton allSelected={allSelected} onToggle={toggleSelectAll} disabled={isEmpty} />
            <ClearSelectionButton disabled={allSelected || selectedIds.length === 0} onClear={clearSelection} />
            {(selectedIds.length > 0 || isEmpty) && (<DeleteSelectedButton onDelete={handleBatchDeleteClick} />)}
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
          {paginatedPosts.length === 0 && filters.option === 'external' && externalStatus === 'loading' && (
            <SkeletonLoader count={pagination.itemsPerPage} />
          )}

          {paginatedPosts.length === 0 && !(filters.option === 'external' && externalStatus === 'loading') && <p>No posts found.</p>}

          {paginatedPosts.map(post => (
            <div key={post.id} className={styles.postCard} onClick={() => navigate(`/posts/${post.id}?page=${pageParam}`)} >
              <input
                type="checkbox"
                checked={selectedIds.includes(post.id)}
                onClick={e => e.stopPropagation()}
                onChange={() => toggleSelect(post.id)}
              />
              <div className={styles.postContent}>
                <h3>{post.title}</h3>
                <p className={styles.postMsg}>{post.content}</p>
                <p className={styles.postDate}>{FormatDate(post.createdAt)}</p>
              </div>
              <FaTrash
                className={styles.deleteIcon}
                onClick={(e) => {
                  e.stopPropagation();
                  setToDelete(post.id);
                  setIsBatchDelete(false);
                  setConfirmOpen(true);
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {paginatedPosts.length > 0 && (
        <PaginationControls
          currentPage={pageParam}
          totalPages={
            filters.option === 'external'
              ? Math.ceil(100 / pagination.itemsPerPage)
              : filters.option === 'all'
                ? Math.ceil((createdPostsCount + 100) / pagination.itemsPerPage)
                : Math.ceil(createdPostsCount / pagination.itemsPerPage)
          }
          onPageChange={handlePageChange}
          setSearchParams={setSearchParams}
          itemsPerPage={pagination.itemsPerPage}
          onItemsPerPageChange={(value) => dispatch(setItemsPerPage(value))}
        />
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Delete post(s)?"
        message={isBatchDelete ? `Delete ${toDelete.length} selected posts? This cannot be undone.` : `Delete this post? This cannot be undone.`}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
      />

      <Toast open={toastOpen} message={toastMsg} type={toastType} onClose={() => setToastOpen(false)} />
    </div>
  );
}

export default PostsList;
