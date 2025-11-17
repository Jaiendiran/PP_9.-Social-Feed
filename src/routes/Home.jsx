import React, { useEffect } from 'react';
import PostsList from '../features/posts/PostsList';
import { useDispatch } from 'react-redux';
import { fetchPosts } from '../features/posts/postsSlice';
import styles from './Home.module.css';

function Home() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchPosts());
  }, [dispatch])

  return (
    <section className={styles.home}>
      <PostsList />
    </section>
  );
}

export default Home;
