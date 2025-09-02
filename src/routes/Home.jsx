import React from 'react';
import PostsList from '../features/posts/PostsList';
import styles from './Home.module.css';

function Home() {
  return (
    <section className={styles.home}>
      <h2>All Posts</h2>
      <PostsList />
    </section>
  );
}

export default Home;
