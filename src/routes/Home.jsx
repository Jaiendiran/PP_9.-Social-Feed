import PostsList from '../features/posts/PostsList';
import styles from './Home.module.css';

function Home() {
  return (
    <section className={styles.home}>
      <PostsList />
    </section>
  );
}

export default Home;
