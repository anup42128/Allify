import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface SignupFormData {
    fullName: string;
    email: string;
    username: string;
    password?: string;
    birthday?: string;
}

interface NavigationContextType {
    allowedRoutes: Set<string>;
    allowRoute: (route: string) => void;
    removeRoute: (route: string) => void;
    isRouteAllowed: (route: string) => boolean;
    signupFormData: SignupFormData;
    saveSignupFormData: (data: SignupFormData) => void;
    clearSignupFormData: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

const STORAGE_KEY_ROUTES = 'allify_allowed_routes';
const STORAGE_KEY_FORM = 'allify_signup_form';

export const NavigationProvider = ({ children }: { children: ReactNode }) => {
    // Load initial state from localStorage
    const [allowedRoutes, setAllowedRoutes] = useState<Set<string>>(() => {
        const stored = localStorage.getItem(STORAGE_KEY_ROUTES);
        const baseRoutes = new Set([
            '/', '/auth/signup',
            '/home', '/profile', '/profile/edit', '/search',
            '/messages', '/notifications', '/settings', '/create', '/more'
        ]); // All main app routes are accessible
        const currentPath = window.location.pathname; // Get current URL path

        if (stored) {
            try {
                const routes = JSON.parse(stored);
                // Normalize current path by removing basename for comparison
                const basename = '/Allify';
                const normalizedPath = currentPath.startsWith(basename)
                    ? currentPath.slice(basename.length) || '/'
                    : currentPath;

                // Filter out temporary routes, but keep the current page if user is already on it (refresh)
                const filteredRoutes = routes.filter((route: string) => {
                    // If user is on confirmation page (refresh), keep that route
                    if (route === normalizedPath) return true;
                    // Otherwise, filter out temporary routes
                    return route !== '/auth/signup/confirm';
                });
                // Merge with base routes
                filteredRoutes.forEach((route: string) => baseRoutes.add(route));
                return baseRoutes;
            } catch {
                return baseRoutes;
            }
        }
        return baseRoutes;
    });

    const [signupFormData, setSignupFormData] = useState<SignupFormData>(() => {
        const stored = localStorage.getItem(STORAGE_KEY_FORM);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch {
                return { fullName: '', email: '', username: '', password: '', birthday: '' };
            }
        }
        return { fullName: '', email: '', username: '', password: '', birthday: '' };
    });

    // Persist allowed routes to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_ROUTES, JSON.stringify([...allowedRoutes]));
    }, [allowedRoutes]);

    // Persist form data to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_FORM, JSON.stringify(signupFormData));
    }, [signupFormData]);

    const allowRoute = (route: string) => {
        setAllowedRoutes(prev => new Set([...prev, route]));
    };

    const removeRoute = (route: string) => {
        setAllowedRoutes(prev => {
            const newSet = new Set(prev);
            newSet.delete(route);
            return newSet;
        });
    };

    const isRouteAllowed = (route: string) => {
        return allowedRoutes.has(route);
    };

    const saveSignupFormData = (data: SignupFormData) => {
        setSignupFormData(data);
    };

    const clearSignupFormData = () => {
        setSignupFormData({
            fullName: '',
            email: '',
            username: '',
            password: '',
            birthday: ''
        });
    };

    return (
        <NavigationContext.Provider value={{
            allowedRoutes,
            allowRoute,
            removeRoute,
            isRouteAllowed,
            signupFormData,
            saveSignupFormData,
            clearSignupFormData
        }}>
            {children}
        </NavigationContext.Provider>
    );
};

export const useNavigation = () => {
    const context = useContext(NavigationContext);
    if (!context) {
        throw new Error('useNavigation must be used within NavigationProvider');
    }
    return context;
};
