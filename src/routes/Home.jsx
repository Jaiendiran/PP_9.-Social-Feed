import React, { useEffect } from 'react';
import PostsList from '../features/posts/PostsList';
import styles from './Home.module.css';
import { useDispatch } from 'react-redux';
import { fetchPosts } from '../features/posts/postsSlice';

function Home() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchPosts());
  }, [dispatch])

  return (
    <section className={styles.home}>
      <h2>All Posts</h2>
      <PostsList />
    </section>
  );
}

export default Home;
