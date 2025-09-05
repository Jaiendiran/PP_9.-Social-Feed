import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { savePost, deletePosts } from './postsSlice';
import PostForm from './PostForm';
import PostActions from './PostAction';
import styles from './PostManager.module.css';
import { BackArrow } from './PostsControls';

function PostManager() {
  const { postId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const post = useSelector(state => state.posts.find(p => p.id === postId));

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(!postId);

  useEffect(() => {
    if (postId && post) {
      setTitle(post.title);
      setContent(post.content);
    }
  }, [postId, post]);

  const handleSave = () => {
    const id = postId || Date.now().toString();
    dispatch(savePost({ id, title, content }));
    setIsEditing(false);
    navigate("/")
  };

  const handleDelete = () => {
    dispatch(deletePosts([postId]));
    setTitle('');
    setContent('');
    setIsEditing(false);
    navigate("/");
  };

  const handleEditToggle = () => setIsEditing(true);

  return (
    <div className={styles.container}>
      <>
        <BackArrow />

        <h2>{postId ? 'Edit Post' : 'Add New Post'}</h2>

        <PostForm
            title={title}
            content={content}
            isEditing={isEditing}
            setTitle={setTitle}
            setContent={setContent}
        />
        <PostActions
            postId={postId}
            isEditing={isEditing}
            onEditToggle={handleEditToggle}
            onSave={handleSave}
            onDelete={handleDelete}
            isModified={title !== post?.title || content !== post?.content}
        />
      </>
    </div>
  );
}

export default PostManager;
