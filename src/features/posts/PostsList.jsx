import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchPosts, deletePosts } from './postsSlice';
import { useNavigate } from 'react-router-dom';
import { SelectAllButton, ClearSelectionButton, DeleteSelectedButton, NewPostButton } from './PostsControls';
import styles from './PostsList.module.css';
import { SortControls } from './PostsControls';
import { SearchBar } from './PostsControls';
import { PaginationControls } from './PostsControls';


function PostsList() {
  const posts = useSelector(state => state.posts);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState([]);
  const allSelected = selectedIds.length === posts.length && posts.length > 0;
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 5;
  const isEmpty = posts.length === 0;
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('');



  useEffect(() => {
    dispatch(fetchPosts());
  }, [dispatch]);

  // Control handlers
  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : posts.map(post => post.id));
  };

  const clearSelection = () => setSelectedIds([]);

  const deleteSelected = () => {
    dispatch(deletePosts(selectedIds));
    setSelectedIds([]);
  };

  const toggleSelect = id => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Post filteration
  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.content.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Sorting
  const sortedPosts = [...filteredPosts].sort((a, b) =>
    sortBy === 'title' ? a.title.localeCompare(b.title) :
    sortBy === 'date' ? new Date(b.createdAt) - new Date(a.createdAt) : 0
  );

  const totalPages = Math.ceil(sortedPosts.length / postsPerPage);

  const paginatedPosts = sortedPosts.slice(
    (currentPage - 1) * postsPerPage,
    currentPage * postsPerPage
  );
  // Empty state handler
  if (posts.length === 0) {
    return (
      <div className={styles.emptyState}>
        <button onClick={() => navigate('/add')}>+ Create New Post</button>
      </div>
    );
  }

  return (
    <div className={styles.postsList}>
      <div className={styles.actions}>
        <NewPostButton />
        <SelectAllButton allSelected={allSelected} onToggle={toggleSelectAll} disabled={isEmpty} />
        <ClearSelectionButton disabled={allSelected || selectedIds.length === 0} onClear={clearSelection} />
        {selectedIds.length > 0 || isEmpty && ( <DeleteSelectedButton onDelete={deleteSelected} /> )}
        <div className={styles.searchBarWrapper}>
          <SearchBar onSearch={setSearchQuery} />
        </div>
      </div>

      <SortControls setSortBy={setSortBy} />

      {paginatedPosts.map(post => (
        <div
          key={post.id}
          className={styles.postCard}
          onClick={() => navigate(`/posts/${post.id}`)}
        >
          <input
            type="checkbox"
            checked={selectedIds.includes(post.id)}
            onClick={e => e.stopPropagation()}
            onChange={() => toggleSelect(post.id)}
          />
          <div className={styles.postContent}>
            <h3>{post.title}</h3>
            <p>{post.content}</p>
          </div>
        </div>
      ))}

      <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  );
}

export default PostsList;
