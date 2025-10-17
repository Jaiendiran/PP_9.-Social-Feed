import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchPosts, deletePosts } from './postsSlice';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SelectAllButton, ClearSelectionButton, DeleteSelectedButton, NewPostButton, SortControls, SearchBar, PaginationControls, HomeBtn, formatDate} from './PostsControls';
import { FaPlusCircle, FaTrash } from 'react-icons/fa';
// import { IoIosAddCircle } from "react-icons/io";
import styles from './PostsList.module.css';


function PostsList() {
  const posts = useSelector(state => state.posts);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState([]);
  const allSelected = selectedIds.length === posts.length && posts.length > 0;
  const [searchParams, setSearchParams] = useSearchParams({ page: '1' });
  const initialPage = parseInt(searchParams.get('page')) || 1;
  const [currentPage, setCurrentPage] = useState(initialPage);
  const postsPerPage = 5;
  const isEmpty = posts.length === 0;
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('');


  useEffect(() => {
    dispatch(fetchPosts());
  }, [dispatch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(parseInt(initialPage));
  }, [searchParams]);

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
  const postLength = filteredPosts.length > 0;
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
        {(selectedIds.length > 0 || isEmpty) && <DeleteSelectedButton onDelete={deleteSelected} />}
        <div className={styles.searchBarWrapper}>
          <SearchBar onSearch={setSearchQuery} />
        </div>
      </div>

      {postLength && <SortControls setSortBy={setSortBy} />}
      {postLength || <p>No posts found.</p>}

      {paginatedPosts.map(post => (
        <div
          key={post.id}
          className={styles.postCard}
          onClick={() => navigate(`/posts/${post.id}?page=${currentPage}`)}
        >
          <input
            type="checkbox"
            checked={selectedIds.includes(post.id)}
            onClick={e => e.stopPropagation()}
            onChange={() => toggleSelect(post.id)}
          />
          <div className={styles.postContent}>
            <h3>{post.title}</h3>
            <p className={styles.postMsg}>{post.content}</p>
            <p className={styles.postDate}>{formatDate(post.createdAt)}</p>
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

      {postLength && <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} setSearchParams={setSearchParams} />}
    </div>
  );
}

export default PostsList;
