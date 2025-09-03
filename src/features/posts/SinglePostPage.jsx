import React from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import styles from './SinglePostPage.module.css';

function SinglePostPage() {
  const { postId } = useParams();
  const post = useSelector(state =>
    state.posts.find(post => post.id === postId)
  );

  if (!post) {
    return <div className={styles.notFound}>Post not found.</div>;
  }

  return (
    <article className={styles.post}>
      <h2>{post.title}</h2>
      <p>{post.content}</p>
    </article>
  );
}

export default SinglePostPage;
