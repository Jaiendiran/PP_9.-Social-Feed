import React from 'react';
import { useSelector } from 'react-redux';
import styles from './PostsList.module.css';
import { Link } from 'react-router-dom';

function PostsList() {
  const posts = useSelector(state => state.posts);

  return (
    <div className={styles.postsList}>
      {posts.map(post => (
        <div key={post.id} className={styles.postCard}>
          <h3>{post.title}</h3>
          <p>{post.content}</p>
          <Link to={`/posts/${post.id}`} className={styles.link} >View</Link>
        </div>
      ))}
    </div>
  );
}

export default PostsList;
