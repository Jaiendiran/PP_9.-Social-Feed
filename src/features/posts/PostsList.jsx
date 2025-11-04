import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchPosts, deletePosts, selectPaginatedPosts, selectPostsStatus, selectPostsError, selectPostsFilters, setSearchFilter, setSortBy, setCurrentPage, selectAllPosts, selectPostsPagination } from './postsSlice';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SelectAllButton, ClearSelectionButton, DeleteSelectedButton, NewPostButton, SortControls, SearchBar, PaginationControls, HomeBtn } from './PostsControls';
import { FaPlusCircle, FaTrash } from 'react-icons/fa';
import LoadingSpinner from '../../components/LoadingSpinner';
import { FormatDate } from '../../utils/formatDate';
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
  const filters = useSelector(selectPostsFilters);
  const pagination = useSelector(selectPostsPagination);
  
  const allSelected = selectedIds.length === allPosts.length && allPosts.length > 0;
  const isEmpty = allPosts.length === 0;


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

  // Filter and sort handlers
  const handleSearch = (query) => {
    dispatch(setSearchFilter(query));
    dispatch(setCurrentPage(1));
    setSearchParams({ page: '1' });
  };

  const handleSort = (key, order) => {
    dispatch(setSortBy({ key, order }));
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

  const deleteSelected = () => {
    dispatch(deletePosts(selectedIds));
    setSelectedIds([]);
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

  return (
    <div className={styles.postsList}>
      <h2>All Posts</h2>

      <div className={styles.actions}>
        <HomeBtn />
        <NewPostButton />
        <SelectAllButton allSelected={allSelected} onToggle={toggleSelectAll} disabled={isEmpty} />
        <ClearSelectionButton disabled={allSelected || selectedIds.length === 0} onClear={clearSelection} />
        {(selectedIds.length > 0 || isEmpty) && ( <DeleteSelectedButton onDelete={deleteSelected} /> )}
        <div className={styles.searchBarWrapper}>
          <SearchBar onSearch={handleSearch} initialValue={filters.search} />
        </div>
      </div>
      
      <SortControls sortBy={filters.sortBy} sortOrder={filters.sortOrder} onSort={handleSort} />

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
              dispatch(deletePosts([post.id]));
            }}
          />
        </div>
      ))}

      {paginatedPosts.length > 0 && (
        <PaginationControls 
          currentPage={pageParam} 
          totalPages={Math.ceil(allPosts.length / pagination.itemsPerPage)} 
          onPageChange={handlePageChange}
          setSearchParams={setSearchParams} 
        />
      )}
    </div>
  );
}

export default PostsList;
