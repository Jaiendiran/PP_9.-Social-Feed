import { useNavigate } from 'react-router-dom';
import styles from './LandingPage.module.css';

export default function LandingPage(){
  const navigate = useNavigate();

  return (
    <div className={styles['landing-page']}>
      <div className={styles['landing-container']}>
        <div className={styles['landing-inner']}>
          <header className={styles['landing-header']}>
            <div className={styles.brand}>Blogyst</div>
            <button className={styles['signup-btn']} onClick={() => navigate('/signup')}>Sign up</button>
          </header>

          <section className={`${styles.hero} ${styles['hero-bg']}`} role="region" aria-label="Hero">
            <div className={styles['hero-content']}>
              <h1>Where Curiosity Meets Content</h1>
              <p>Explore insightful articles on technology, design, and modern lifestyle.</p>
              <button className={styles['read-btn']} onClick={() => navigate('/')}>Read Our Latest Post</button>
            </div>
          </section>

          <section className={styles.featured}>
            <h2 style={{margin:'0 0 12px'}}>Featured Posts</h2>
            <div className={styles['featured-grid']}>
              <article className={styles.card}>
                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDIIqymSdLOazZUZuNRna8NddyLw1GTGHCezy85Lz6Wt2iBQqFmJpCAq298IqFB557WwjzkTKifLvp5oqnGCQgdtWQ6kkJoTfTO0dYCnyeq5OPOucfpQ1CYazxX2lRLX4iZOFLeCuPMfyDasYUJwVZcmg0pf5do5txAW5RJ-kRQBq7yoESy7ENCXYAv3AHhMxyYf9Iob3994FQpXYbpEVWWsCQPRW4E7SP5j-42pjJEXz08YgDE-YuTY76DpIJmR4lBqDMm0pwbcD0" alt="Featured" />
                <div>
                  <div className={styles.tag}>Technology</div>
                  <h3>The Future of AI in Creative Industries</h3>
                  <p className={styles.meta}>John Doe - Oct 26, 2023</p>
                </div>
              </article>

              <article className={styles.card}>
                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDG7qw_IsvjHrv7SYYgo-j8FxoB35XeIIWLmwLhk6u7IgwtJDNVqw81EGLyldLU8nSjUFy8QCGdX5eeEu7CTX80awq0jRY4BX-8cgCc9793YpH_DFMb2a89YDkCraH2lx_HSeB9SQvdO6hXxOX2G4zSu6B1f7urSXenL2CiKTPQbcByd2baAYXmPykto_1_1EFUgFggsqE_ptPEnBg3g51jE2wAuBEoJWQ1Q9ATqwYbJYaRa7olz5cUlQZ1_UD5DsO2DYKJHmO1jmU" alt="Featured" />
                <div>
                  <div className={styles.tag}>Design</div>
                  <h3>10 UI/UX Principles for Better User Experiences</h3>
                  <p className={styles.meta}>Jane Smith - Oct 24, 2023</p>
                </div>
              </article>

              <article className={styles.card}>
                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAqvfMyeSmnd20rRV_2jhG-UfCqd2MxZghtTiMQ36dx6paa32ZOJ85rf3Z72vUlMW89cFHFtMWuVJJ5p18IdY2bZYV1CMloI4_vCIKeyuu3-pGj0fDM-S0omo-z2YCJCqbsGfQGtKpJppyZl1wO4a2hhhYIYvSZiu6VYCfBwCDiXjf1I03E4mNkroT7q5OBzjSPXsrD7saKU_RXpKrjvgHHeAKv36DZMm88SGygv_OUuR3QBLqpX2vd5P2bI-5BCS0wThkss8GRL_k" alt="Featured" />
                <div>
                  <div className={styles.tag}>Lifestyle</div>
                  <h3>Finding Balance in a High-Paced World</h3>
                  <p className={styles.meta}>Emily White - Oct 22, 2023</p>
                </div>
              </article>
            </div>
          </section>

          <section className={styles.topics}>
            <h2 style={{width:'100%'}}>Explore Topics</h2>
            <div className={styles['topics-list']}>
              {['Technology','Design','Lifestyle','Productivity','Marketing'].map(t => (
                <button key={t} className={styles['topic-btn']}>{t}</button>
              ))}
            </div>
          </section>

          <section className={styles.newsletter}>
            <div className={styles.box}>
              <div className={styles.text}>
                <h3 style={{margin:'0 0 6px'}}>Never Miss an Update</h3>
                <p style={{margin:0,color:'#6b7280'}}>Get weekly insights and articles delivered right to your inbox.</p>
              </div>
              <button className={styles.subscribe} onClick={() => navigate('/signup')}>Sign up</button>
            </div>
          </section>

          <footer className={styles['page-footer']}>
            <div>© 2025 Blogyst. All rights reserved.</div>
            <div style={{display:'flex',gap:18}}>
              <a href="#">About</a>
              <a href="#">Contact</a>
              <a href="#">Privacy Policy</a>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
