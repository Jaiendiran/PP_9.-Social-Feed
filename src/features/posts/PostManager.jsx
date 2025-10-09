import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { savePost, deletePosts } from './postsSlice';
import PostForm from './PostForm';
import PostActions from './PostAction';
import styles from './PostManager.module.css';
import { BackArrow } from './PostsControls';

function PostManager() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { postId } = useParams();
  const post = useSelector(state => state.posts.find(p => p.id === postId));

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(!postId);
  const [errors, setErrors] = useState({});

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

  const handleSave = () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      return;
    }
    const id = postId || Date.now().toString();
    dispatch(savePost({ id, title, content }));
    setIsEditing(false);
    navigate("/PP_9.-Social-Feed/")
  };

  const handleDelete = () => {
    dispatch(deletePosts([postId]));
    setTitle('');
    setContent('');
    setIsEditing(false);
    navigate("/");
  };

  const handleCancel = () => {
    setTitle(post.title);
    setContent(post.content);
    setIsEditing(false);
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

        <h2>{postId ? 'Edit Post' : 'Add New Post'}</h2>

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
        />
      </>
    </div>
  );
}

export default PostManager;
