import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectTheme, fetchUserPreferences, saveUserPreferences } from './features/preferences/preferencesSlice';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import UserMenu from './components/UserMenu';
import AuthGuard from './features/auth/guards/AuthGuard';
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
  const currentTheme = useSelector(selectTheme);
  const { user } = useSelector(state => state.auth);
  const preferences = useSelector(state => state.preferences);
  const dispatch = useDispatch();

  useEffect(() => {
    document.body.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);

  // Fetch preferences on login
  useEffect(() => {
    if (user && user.uid) {
      dispatch(fetchUserPreferences(user.uid));
    }
  }, [user, dispatch]);

  // Sync preferences to Firestore
  useEffect(() => {
    if (user && user.uid) {
      // Create a stripped down version of preferences to save (excluding loading states)
      const prefsToSave = {
        theme: preferences.theme,
        filters: preferences.filters,
        pagination: preferences.pagination
      };

      const timer = setTimeout(() => {
        dispatch(saveUserPreferences({ uid: user.uid, preferences: prefsToSave }));
      }, 1000); // Debounce for 1 second

      return () => clearTimeout(timer);
    }
  }, [preferences.theme, preferences.filters, preferences.pagination, user, dispatch]);

  return (
    <Router>
      <ErrorBoundary>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <h1>Redux Blog</h1>
            <UserMenu />
          </div>
        </header>
        <Suspense fallback={<LoadingSpinner size="large" />}>
          <Routes>
            <Route path="/" element={
              <AuthGuard>
                <Home />
              </AuthGuard>
            } />
            <Route path="/add" element={
              <AuthGuard>
                <PostManager />
              </AuthGuard>
            } />
            <Route path='/posts/:postId' element={
              <AuthGuard>
                <PostManager />
              </AuthGuard>
            } />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/profile" element={
              <AuthGuard>
                <Profile />
              </AuthGuard>
            } />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </Router>
  );
}

export default App;