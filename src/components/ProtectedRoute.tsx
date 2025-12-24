import { Navigate, useLocation } from 'react-router-dom';
import { useNavigation } from '../features/auth/contexts/SignupContext';
import { type ReactNode } from 'react';

interface ProtectedRouteProps {
    children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
    const location = useLocation();
    const { isRouteAllowed } = useNavigation();

    if (!isRouteAllowed(location.pathname)) {
        // Redirect to landing page if route is not allowed
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};
