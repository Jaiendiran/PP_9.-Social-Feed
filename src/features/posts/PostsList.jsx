import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchPosts, deletePosts } from './postsSlice';
import { useNavigate } from 'react-router-dom';
import { SelectAllButton, ClearSelectionButton, DeleteSelectedButton, NewPostButton } from './PostsControls';
import styles from './PostsList.module.css';


function PostsList() {
  const posts = useSelector(state => state.posts);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    dispatch(fetchPosts());
  }, [dispatch]);

  const allSelected = selectedIds.length === posts.length && posts.length > 0;

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

  return (
    <div className={styles.postsList}>
      <div className={styles.actions}>
        <NewPostButton />
        <SelectAllButton allSelected={allSelected} onToggle={toggleSelectAll} />
        <ClearSelectionButton disabled={allSelected || selectedIds.length === 0} onClear={clearSelection} />
        {selectedIds.length > 0 && ( <DeleteSelectedButton onDelete={deleteSelected} /> )}
      </div>

      {posts.map(post => (
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
    </div>
  );
}

export default PostsList;
