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
  const isAuthInitialized = useSelector(selectAuthInitialized); // Check if auth is ready
  const dispatch = useDispatch();

  // Header visibility will be handled by `AppHeader` via `useLocation` inside the Router

  // Initialize Inactivity Timer
  // Using default from hook (10s for testing as requested, usually 20 mins)
  useIdleTimer();

  useEffect(() => {
    document.body.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);

  // Passive Auth Listener to synchronize Redux with Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      // Only update if there's a mismatch or on init
      // We rely on authSlice logic: 
      // If firebaseUser matches request, user is logged in.
      // If null, user is logged out.

      // We pass serialized user to Redux
      // Note: authService.getUserDocument handles full data fetch.
      // Here we just ensure basic sync or trigger fetch.
      // If we rely on Login component to set user, this might overwrite?
      // Actually, Login component calls thunk which sets user.
      // onAuthStateChanged fires on login too.
      // To avoid race, we can use this ONLY for initialization or re-auth persistence.
      // But requirement says "Make Auth Listener Passive".
      // It should setAuthInitialized(true) primarily.

      // Let's just mark initialized here.
      // If user is already set by Login thunk, good.
      // If reload, this will fire.

      dispatch(setAuthInitialized(true));

      if (firebaseUser) {
        // Firebase says we are logged in.
        // Clear any stale session expiry flag from local state.
        dispatch(clearSessionExpiry());
      }

      // If we have a user in Redux but Firebase says no user -> Logout
      // If we have no user in Redux but Firebase has user -> We could restore, 
      // but Redux persistence (cacheUtils) handles that.
      // Typically we trust cacheUtils for initial state.

      // Strict Sync:
      if (!firebaseUser && user) {
        // Firebase thinks we are logged out, but Redux thinks logged in
        // This happens if token revoked or explicit signout elsewhere
        // dispatch(logout()); // BE CAREFUL: endless loops?
      }
    });

    return () => unsubscribe();
  }, [dispatch, user]);

  // Fetch preferences on login (moved down to ensure user exists)
  useEffect(() => {
    if (user && user.uid) {
      dispatch(fetchUserPreferences(user.uid));
    }
  }, [user, dispatch]);

  // Memoize preferences to save to prevent object recreation
  // Only persist Firestore-backed preferences (theme, etc.)
  const prefsToSave = useMemo(() => ({
    theme: preferences.theme
  }), [preferences.theme]);

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

  // Handle graceful session expiry: Save preferences then logout
  useEffect(() => {
    // Only run this check if Auth is fully initialized
    // This prevents premature logout during the split-second before login completes
    if (isAuthInitialized && isSessionExpired && user) {
      // Save preferences then logout on session expiry
      dispatch(saveUserPreferences({ uid: user.uid, preferences: prefsToSave }))
        .catch(err => console.error('Failed to save preferences on expiry:', err))
        .finally(() => {
          dispatch(logout());
        });
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