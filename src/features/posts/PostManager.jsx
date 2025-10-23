import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { savePost, deletePosts, selectPostById, selectPostsStatus, selectPostsError } from './postsSlice';
import PostForm from './PostForm';
import PostActions from './PostAction';
import LoadingSpinner from '../../components/LoadingSpinner';
import { BackArrow, FormatDate } from './PostsControls';
import styles from './PostManager.module.css';

function PostManager() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { postId } = useParams();
  
  // Use selectors for state management
  const post = useSelector(state => selectPostById(state, postId));
  const status = useSelector(selectPostsStatus);
  const error = useSelector(selectPostsError);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(!postId);
  const [errors, setErrors] = useState({});

  // Add this before the first useEffect
  if (status === 'loading') {
    return <LoadingSpinner />;
  }

  if (status === 'failed') {
    return (
      <div className={styles.container}>
        <BackArrow />
        <div className={styles.error}>Error: {error}</div>
      </div>
    );
  }

  if (postId && !post) {
    return (
      <div className={styles.container}>
        <BackArrow />
        <div className={styles.error}>Post not found</div>
      </div>
    );
  }

  useEffect(() => {
    if (postId && post) {
      setTitle(post.title);
      setContent(post.content);
    }
  }, [postId, post]);

  const validate = () => {
    const errs = {};
    if (!title.trim()) errs.title = 'Title is required';
    if (!content.trim()) errs.content = 'Content is required';
    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      return;
    }

    const id = postId || Date.now().toString();
    const newPost = { 
      id, 
      title, 
      content, 
      createdAt: post ? post.createdAt : new Date().toISOString()
    };

    try {
      await dispatch(savePost(newPost)).unwrap();
      setIsEditing(false);
      if (!postId) {
        navigate(-1);
      }
    } catch (err) {
      setErrors({ submit: err.message });
    }
  };

  const handleDelete = async () => {
    try {
      await dispatch(deletePosts([postId])).unwrap();
      navigate("/");
    } catch (err) {
      setErrors({ submit: err.message });
    }
  };

  const handleCancel = () => {
    if (postId) {
      setTitle(post.title);
      setContent(post.content);
      setIsEditing(false);
      setErrors({});
    } else {
      navigate(-1);
    }
  };


  const handleSetTitle = (value) => {
    setTitle(value);
    setErrors(prev => ({ ...prev, title: '' }));
  };

  const handleSetContent = (value) => {
    setContent(value);
    setErrors(prev => ({ ...prev, content: '' }));
  };

  const handleEditToggle = () => {
    setIsEditing(true);
    setErrors({});
  };

  return (
    <div className={styles.container}>
      <>
        <BackArrow />

        <div className={styles.header}>
          <h2>{postId ? (isEditing ? 'Edit Post' : 'View Post') : 'Add New Post'}</h2>
          {postId && post && <p className={styles.createdAt}>Created on: {FormatDate(post.createdAt)}</p>}
        </div>

        <div className={styles.divider}></div>

        {errors.submit && (
          <div className={styles.error}>
            {errors.submit}
          </div>
        )}

        <PostForm
          title={title}
          content={content}
          isEditing={isEditing}
          setTitle={handleSetTitle}
          setContent={handleSetContent}
          errors={errors}
        />
        <PostActions
          postId={postId}
          isEditing={isEditing}
          onEditToggle={handleEditToggle}
          onSave={handleSave}
          onDelete={handleDelete}
          onCancel={handleCancel}
          isModified={title !== post?.title || content !== post?.content}
          status={status}
        />
      </>
    </div>
  );
}

export default PostManager;
