import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

const ProtectedRoute = ({ allowedRoles, children }) => {
	const { isAuthenticated, user } = useSelector((state) => state.auth);

	if (!isAuthenticated) {
		// User is not authenticated (either no token or verification failed)
		return <Navigate to="/login" replace />;
	}

	if (allowedRoles && user && !allowedRoles.includes(user.user_role)) {
		// User is authenticated but does not have the required role
		return <Navigate to="/unauthorized" replace />;
	}

	// User is authenticated and has the required role (if specified), render the children
	return <>{children}</>;
};

export default ProtectedRoute;