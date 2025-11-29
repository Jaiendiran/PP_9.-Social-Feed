import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider } from './features/theme/ThemeProvider';
import './styles/theme.css';
import styles from './App.module.css';

// Lazy load components
const Home = lazy(() => import('./routes/Home'));
const PostManager = lazy(() => import('./features/posts/PostManager'));

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <ThemeProvider>
          <header className={styles.header}>
            <h1>Redux Blog</h1>
          </header>
          <Suspense fallback={<LoadingSpinner size="large" />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/add" element={<PostManager />} />
              <Route path='/posts/:postId' element={<PostManager />} />
            </Routes>
          </Suspense>
        </ThemeProvider>
      </ErrorBoundary>
    </Router>
  );
}

export default App;