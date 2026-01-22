import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import LoadingSpinner from '../../../components/LoadingSpinner';

const RequireRole = ({ allowedRoles, children }) => {
    const { user, isLoading } = useSelector((state) => state.auth);
    const location = useLocation();

    if (isLoading) return <LoadingSpinner />
    if (!user) return <Navigate to="/login" state={{ from: location }} replace />
    if (!allowedRoles.includes(user.role)) return <Navigate to="/" replace />

    return children;
};

export default RequireRole;
