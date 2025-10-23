import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchPosts, deletePosts, selectPaginatedPosts, selectPostsStatus, selectPostsError, selectPostsFilters, setSearchFilter, setSortBy, setCurrentPage, selectAllPosts } from './postsSlice';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SelectAllButton, ClearSelectionButton, DeleteSelectedButton, NewPostButton, SortControls, SearchBar, PaginationControls, HomeBtn, FormatDate} from './PostsControls';
import { FaPlusCircle, FaTrash } from 'react-icons/fa';
import LoadingSpinner from '../../components/LoadingSpinner';
import styles from './PostsList.module.css';


function PostsList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams({ page: '1' });
  // Use new selectors
  const status = useSelector(selectPostsStatus);
  const error = useSelector(selectPostsError);
  const allPosts = useSelector(selectAllPosts);
  const paginatedPosts = useSelector(selectPaginatedPosts);
  const filters = useSelector(selectPostsFilters);
  
  const allSelected = selectedIds.length === allPosts.length && allPosts.length > 0;
  const isEmpty = allPosts.length === 0;

  // Filter and sort handlers
  const handleSearch = (query) => {
    dispatch(setSearchFilter(query));
    setCurrentPage(1);
  };

  const handleSort = (key, order) => {
    dispatch(setSortBy({ key, order }));
  };

  const handlePageChange = (page) => {
    dispatch(setCurrentPage(page));
    setSearchParams({ page: page.toString() });
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
        <div key={post.id} className={styles.postCard} onClick={() => navigate(`/posts/${post.id}?page=${currentPage}`)} >
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
          currentPage={currentPage} 
          totalPages={Math.ceil(allPosts.length / filters.itemsPerPage)} 
          onPageChange={handlePageChange}
          setSearchParams={setSearchParams} 
        />
      )}
    </div>
  );
}

export default PostsList;
