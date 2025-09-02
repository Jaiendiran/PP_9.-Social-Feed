import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { postAdded } from './postsSlice';

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
    <section>
      <h2>Add a New Post</h2>
      <input
        type="text"
        placeholder="Post title"
        value={title}
        onChange={e => setTitle(e.target.value)}
      />
      <textarea
        placeholder="Post content"
        value={content}
        onChange={e => setContent(e.target.value)}
      />
      <button onClick={onSavePostClicked}>Save Post</button>
    </section>
  );
}

export default AddPostForm;
