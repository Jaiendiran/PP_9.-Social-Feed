import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Suspense, lazy, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectTheme, fetchUserPreferences, saveUserPreferences, selectIsInitialized } from './features/preferences/preferencesSlice';
import { selectUser, selectIsSessionExpired, logout, setAuthInitialized, selectAuthInitialized, clearSessionExpiry } from './features/auth/authSlice';
import { useIdleTimer } from './utils/useIdleTimer';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import UserMenu from './components/UserMenu';
import PublicGuard from './features/auth/guards/PublicGuard';
import AuthGuard from './features/auth/guards/AuthGuard';
import './styles/theme.css';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase.config';
import styles from './App.module.css';

// Lazy load components
const Home = lazy(() => import('./routes/Home'));
const PostManager = lazy(() => import('./features/posts/PostManager'));
const Login = lazy(() => import('./features/auth/Login'));
const Signup = lazy(() => import('./features/auth/Signup'));
const ForgotPassword = lazy(() => import('./features/auth/ForgotPassword'));
const Profile = lazy(() => import('./features/auth/Profile'));
const LandingPage = lazy(() => import('./routes/LandingPage'));

function App() {
  const currentTheme = useSelector(selectTheme);
  const user = useSelector(selectUser);
  const preferences = useSelector(state => state.preferences);
  const isInitialized = useSelector(selectIsInitialized);
  const isSessionExpired = useSelector(selectIsSessionExpired);
  const isAuthInitialized = useSelector(selectAuthInitialized);
  const dispatch = useDispatch();

  useIdleTimer();

  useEffect(() => {
    document.body.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);

  // Passive Auth Listener to synchronize Redux with Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      dispatch(setAuthInitialized(true));

      if (firebaseUser) {
        dispatch(clearSessionExpiry());
      }
    });

    return () => unsubscribe();
  }, [dispatch, user]);

  // Fetch preferences on login
  useEffect(() => {
    if (user && user.uid) {
      dispatch(fetchUserPreferences(user.uid));
    }
  }, [user, dispatch]);

  // Memoize preferences to save to prevent object recreation
  const prefsToSave = useMemo(() => ({
    theme: preferences.theme
  }), [preferences.theme]);

  // Sync preferences to Firestore with increased debounce
  useEffect(() => {
    if (user && user.uid && isInitialized) {
      const timer = setTimeout(() => {
        dispatch(saveUserPreferences({ uid: user.uid, preferences: prefsToSave }));
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [prefsToSave, user, dispatch, isInitialized]);

  // Handle graceful session expiry: Save preferences then logout
  useEffect(() => {
    if (isAuthInitialized && isSessionExpired && user) {
      dispatch(saveUserPreferences({ uid: user.uid, preferences: prefsToSave }))
        .catch(err => console.error('Failed to save preferences on expiry:', err))
        .finally(() => { dispatch(logout()) });
    }
  }, [isSessionExpired, user, dispatch, prefsToSave, isAuthInitialized]);

  // Ensure auth and persistent preferences are initialized before rendering main UI
  if (!isAuthInitialized || (user && !isInitialized)) {
    return <LoadingSpinner size="large" />;
  }

  return (
    <Router>
      <ErrorBoundary>
        <AppHeader />
        <Suspense fallback={<LoadingSpinner size="large" />}>
            <Routes>
              <Route path="/landing" element={<LandingPage/>} />
              <Route path="/" element={ <AuthGuard> <Home /> </AuthGuard> } />
              <Route path="/add" element={ <AuthGuard> <PostManager /> </AuthGuard> } />
              <Route path="/posts" element={<AuthGuard><PostManager /></AuthGuard>} />
              <Route path='/posts/:postId' element={ <AuthGuard> <PostManager /> </AuthGuard> } />
              <Route path="/login" element={<PublicGuard><Login /></PublicGuard>} />
              <Route path="/signup" element={<PublicGuard><Signup /></PublicGuard>} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/profile" element={ <AuthGuard><Profile /></AuthGuard> } />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </Router>
  );
}

// Header component that conditionally renders based on route
function AppHeader() {
  const location = useLocation();
  const hideHeaderRoutes = ['/login', '/signup', '/forgot-password', '/landing'];
  
  if (hideHeaderRoutes.includes(location.pathname)) return null;

  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <h1>Blogyst</h1>
        <UserMenu />
      </div>
    </header>
  );
}

export default App;