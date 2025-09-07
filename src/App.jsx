import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './routes/Home';
import PostManager from './features/posts/PostManager';
import styles from './App.module.css';

function App() {
  return (
    <Router>
      <header className={styles.header}>
        <h1>Redux Blog</h1>
      </header>
      <Routes>
        <Route path="PP_9.-Social-Feed/" element={<Home />} />
        <Route path="/add" element={<PostManager />} />
        <Route path='/posts/:postId' element={<PostManager />} />
      </Routes>
    </Router>
  );
}

export default App;
