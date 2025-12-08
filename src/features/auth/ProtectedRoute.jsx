import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import LoadingSpinner from '../../components/LoadingSpinner';

/**
 * ProtectedRoute component that restricts access to authenticated users only.
 * Redirects unauthenticated users to the login page.
 * 
 * Usage:
 * <Route path="/protected" element={
 *   <ProtectedRoute>
 *     <YourProtectedComponent />
 *   </ProtectedRoute>
 * } />
 */
const ProtectedRoute = ({ children }) => {
    const { user, isLoading } = useSelector((state) => state.auth);

    // Show loading spinner while checking authentication
    if (isLoading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh'
            }}>
                <LoadingSpinner size="large" />
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Render children if authenticated
    return children;
};

export default ProtectedRoute;
