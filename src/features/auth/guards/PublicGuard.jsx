import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import LoadingSpinner from '../../../components/LoadingSpinner';

const PublicGuard = ({ children }) => {
    const { user, isLoading } = useSelector((state) => state.auth);

    if (isLoading) return <LoadingSpinner />;

    // If already authenticated, redirect to home
    if (user) return <Navigate to="/" replace />;

    return children;
};

export default PublicGuard;
