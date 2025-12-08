import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import UserMenu from './components/UserMenu';
import { ThemeProvider } from './features/theme/ThemeProvider';
import ProtectedRoute from './features/auth/ProtectedRoute';
import './styles/theme.css';
import styles from './App.module.css';

// Lazy load components
const Home = lazy(() => import('./routes/Home'));
const PostManager = lazy(() => import('./features/posts/PostManager'));
const Login = lazy(() => import('./features/auth/Login'));
const Signup = lazy(() => import('./features/auth/Signup'));
const ForgotPassword = lazy(() => import('./features/auth/ForgotPassword'));
const Profile = lazy(() => import('./features/auth/Profile'));

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <ThemeProvider>
          <header className={styles.header}>
            <div className={styles.headerContent}>
              <h1>Redux Blog</h1>
              <UserMenu />
            </div>
          </header>
          <Suspense fallback={<LoadingSpinner size="large" />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/add" element={<PostManager />} />
              <Route path='/posts/:postId' element={<PostManager />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/profile" element={<Profile />} />
            </Routes>
          </Suspense>
        </ThemeProvider>
      </ErrorBoundary>
    </Router>
  );
}

export default App;