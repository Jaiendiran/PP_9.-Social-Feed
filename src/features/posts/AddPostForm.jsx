import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { postAdded } from './postsSlice';
import styles from './AddPostForm.module.css';

function AddPostForm() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const dispatch = useDispatch();

  const onSavePostClicked = () => {
    if (title && content) {
      dispatch(postAdded({ id: Date.now().toString(), title, content }));
      setTitle('');
      setContent('');
    }
  };

  return (
    <form className={styles.form}>
      <input
        className={styles.input}
        type="text"
        value={title}
        placeholder="Title"
        onChange={e => setTitle(e.target.value)}
      />
      <textarea
        className={styles.textarea}
        value={content}
        placeholder="Content"
        onChange={e => setContent(e.target.value)}
      />
      <button className={styles.button} type="button" onClick={onSavePostClicked}>
        Save Post
      </button>
    </form>
  );
}

export default AddPostForm;
