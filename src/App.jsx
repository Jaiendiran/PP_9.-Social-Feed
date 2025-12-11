import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Suspense, lazy, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectTheme, fetchUserPreferences, saveUserPreferences, selectIsInitialized } from './features/preferences/preferencesSlice';
import { selectUser } from './features/auth/authSlice';
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
  const user = useSelector(selectUser);
  const preferences = useSelector(state => state.preferences);
  const isInitialized = useSelector(selectIsInitialized);
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

  // Memoize preferences to save to prevent object recreation
  const prefsToSave = useMemo(() => ({
    theme: preferences.theme,
    filters: preferences.filters,
    pagination: preferences.pagination
  }), [preferences.theme, preferences.filters, preferences.pagination]);

  // Sync preferences to Firestore with increased debounce
  // IMPORTANT: Only sync AFTER initial Firestore preferences have been loaded
  useEffect(() => {
    if (user && user.uid && isInitialized) {
      const timer = setTimeout(() => {
        dispatch(saveUserPreferences({ uid: user.uid, preferences: prefsToSave }));
      }, 3000); // Increased debounce to 3 seconds to reduce Firestore writes

      return () => clearTimeout(timer);
    }
  }, [prefsToSave, user, dispatch, isInitialized]);

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