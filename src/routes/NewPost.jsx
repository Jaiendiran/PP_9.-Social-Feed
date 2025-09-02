import React from 'react';
import AddPostForm from '../features/posts/AddPostForm';
import styles from './NewPost.module.css';

function NewPost() {
  return (
    <section className={styles.newPost}>
      <h2>Create New Post</h2>
      <AddPostForm />
    </section>
  );
}

export default NewPost;
