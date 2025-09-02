import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './routes/Home';
import NewPost from './routes/NewPost';
import styles from './App.module.css';

function App() {
  return (
    <Router>
      <header className={styles.header}>
        <h1>Redux Blog</h1>
        <nav className={styles.nav}>
          <Link to="/">Home</Link>
          <Link to="/new">New Post</Link>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/new" element={<NewPost />} />
      </Routes>
    </Router>
  );
}

export default App;
