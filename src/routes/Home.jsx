import React, { useEffect } from 'react';
import PostsList from '../features/posts/PostsList';
import { useDispatch } from 'react-redux';
import styles from './Home.module.css';

function Home() {
  const dispatch = useDispatch();

  useEffect(() => {
    // Initial fetch handled by PostsList based on filters
  }, []);

  return (
    <section className={styles.home}>
      <PostsList />
    </section>
  );
}

export default Home;
