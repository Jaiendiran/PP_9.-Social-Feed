import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchPosts, deletePosts, selectPaginatedPosts, selectPostsStatus, selectPostsError, selectAllPosts } from './postsSlice';
import { setSearchFilter, setSortPreference, setCurrentPage, setItemsPerPage, selectFilters, selectPagination } from '../preferences/preferencesSlice';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { SelectAllButton, ClearSelectionButton, DeleteSelectedButton, NewPostButton, SortControls, SearchBar, PaginationControls, HomeBtn } from './PostsControls';
import { FaPlusCircle, FaTrash } from 'react-icons/fa';
import LoadingSpinner from '../../components/LoadingSpinner';
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
  const allPosts = useSelector(selectAllPosts);
  const paginatedPosts = useSelector(selectPaginatedPosts);
  const filters = useSelector(selectFilters);
  const pagination = useSelector(selectPagination);

  const allSelected = selectedIds.length === allPosts.length && allPosts.length > 0;
  const isEmpty = allPosts.length === 0;

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
    const loadPosts = async () => {
      dispatch(fetchPosts());
    };
    loadPosts();
    
    // Cleanup function
    return () => {
      dispatch(setSearchFilter(''));
      dispatch(setCurrentPage(1));
    };
  }, [dispatch]);

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
  const handleSearch = (query) => {
    dispatch(setSearchFilter(query));
    dispatch(setCurrentPage(1));
    setSearchParams({ page: '1' });
  };

  const handleSort = (key, order) => {
    dispatch(setSortPreference({ key, order }));
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
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id] );
  };

  if (status === 'loading') {
    return <LoadingSpinner />;
  }

  if (status === 'failed') {
    return <div className={styles.error}>Error: {error}</div>;
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
        <HomeBtn />
        <NewPostButton />
        <SelectAllButton allSelected={allSelected} onToggle={toggleSelectAll} disabled={isEmpty} />
        <ClearSelectionButton disabled={allSelected || selectedIds.length === 0} onClear={clearSelection} />
        {(selectedIds.length > 0 || isEmpty) && ( <DeleteSelectedButton onDelete={handleBatchDeleteClick} /> )}
        <div className={styles.searchBarWrapper}>
          <SearchBar onSearch={handleSearch} initialValue={filters.search} />
        </div>
      </div>
      
      <SortControls sortBy={filters.sortBy} sortOrder={filters.sortOrder} onSort={handleSort} />

      <div className={styles.postsContainer}>
        <div className={styles.postsGrid}>
          {paginatedPosts.length === 0 && <p>No posts found.</p>}

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
          totalPages={Math.ceil(allPosts.length / pagination.itemsPerPage)} 
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
