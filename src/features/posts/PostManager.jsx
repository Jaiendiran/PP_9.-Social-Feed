import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { savePost, deletePosts, createExternalPost, updateExternalPost, deleteExternalPosts, selectPostByIdCombined, selectPostsStatus, selectPostsError, fetchPostById } from './postsSlice';
import { selectUser } from '../auth/authSlice';
import PostForm from './PostForm';
import PostActions from './PostAction';
import LoadingSpinner from '../../components/LoadingSpinner';
import { BackArrow } from './PostsControls';
import { FormatDate } from '../../utils/formatDate';
import ConfirmDialog from '../../components/ConfirmDialog';
import Toast from '../../components/Toast';
import styles from './PostManager.module.css';

function PostManager() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { postId } = useParams();

  const post = useSelector(state => selectPostByIdCombined(state, postId));
  const status = useSelector(selectPostsStatus);
  const error = useSelector(selectPostsError);
  const user = useSelector(selectUser);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(!postId);
  const [errors, setErrors] = useState({});

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('info'); // 'success' | 'error' | 'info'


  useEffect(() => {
    if (postId && !post) {
      dispatch(fetchPostById(postId));
    }
  }, [postId, post, dispatch]);

  useEffect(() => {
    if (postId && post) {
      setTitle(post.title);
      setContent(post.content);
    }
  }, [postId, post]);

  // Removed obsolete fetchPosts effect. 
  // Deep linking requires a dedicated fetchPostById thunk which is outside Phase 2 scope.
  // Currently relies on list being loaded or aggressive caching.

  // All useCallback hooks MUST be defined before any early returns (React rules of hooks)
  const handleSetTitle = useCallback((value) => {
    setTitle(value);
    setErrors(prev => ({ ...prev, title: '' }));
  }, []);

  const handleSetContent = useCallback((value) => {
    setContent(value);
    setErrors(prev => ({ ...prev, content: '' }));
  }, []);

  const handleEditToggle = useCallback(() => {
    setIsEditing(true);
    setErrors({});
  }, []);

  // Early returns AFTER all hooks are defined
  // Only block if loading a specific post
  if (postId && status === 'loading') {
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
      userId: post?.userId || user.uid,
      authorName: post?.authorName || user.displayName || 'Unknown User',
      createdAt: post ? post.createdAt : new Date().toISOString(),
      isExternal: post?.isExternal ?? false
    };

    try {
      if (newPost.isExternal) {
        await dispatch(updateExternalPost(newPost)).unwrap();
      } else {
        await dispatch(savePost(newPost)).unwrap();
      }
      setIsEditing(false);

      if (!postId) {
        navigate('/', {
          state: { toast: { message: 'Post created', type: 'success' } },
        });
      } else {
        setToastMsg('Post updated');
        setToastType('success');
        setToastOpen(true);
      }
    } catch (err) {
      setErrors({ submit: err.message });
      setToastMsg(err?.message || 'Save failed');
      setToastType('error');
      setToastOpen(true);
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



  const handleConfirmDelete = async () => {
    try {
      if (post?.isExternal) {
        await dispatch(deleteExternalPosts([postId])).unwrap();
      } else {
        await dispatch(deletePosts([postId])).unwrap();
      }
      navigate('/', {
        state: { toast: { message: 'Post deleted', type: 'success' } },
      });
    } catch (err) {
      setToastMsg(err?.message || 'Delete failed');
      setToastType('error');
      setToastOpen(true);
    } finally {
      setConfirmOpen(false);
    }
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
          onClick={() => setConfirmOpen(true)}
          onDelete={() => setConfirmOpen(true)}
          onCancel={handleCancel}
          isModified={title !== post?.title || content !== post?.content}
          status={status}
          canEdit={user && (user.role === 'Admin' || (post && post.userId === user.uid))}
          canDelete={user && (user.role === 'Admin' || (post && post.userId === user.uid))}
        />
        <ConfirmDialog
          open={confirmOpen}
          title="Delete post?"
          message="Are you sure you want to delete this post? This action cannot be undone."
          onCancel={() => setConfirmOpen(false)}
          onConfirm={handleConfirmDelete}
        />

        <Toast open={toastOpen} message={toastMsg} type={toastType} onClose={() => setToastOpen(false)} />
      </>
    </div>
  );
}

export default React.memo(PostManager);
