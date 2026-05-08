import { useNavigate, useLocation } from 'react-router-dom';

export const useAuthNavigation = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const navigateWithCollapse = (targetPath: string) => {
        // Read current history from state, or initialize it
        const currentPath = location.pathname;
        const historyStack = (location.state?.history as string[]) || [currentPath];

        // Check if target is already in our tracked stack
        const targetIndex = historyStack.indexOf(targetPath);

        if (targetIndex !== -1) {
            // Target is in stack! We need to go back.
            const currentIndex = historyStack.length - 1;
            const stepsBack = targetIndex - currentIndex;
            
            if (stepsBack < 0) {
                navigate(stepsBack);
                return;
            }
        }

        // Target not in stack, push it
        const newStack = [...historyStack, targetPath];
        navigate(targetPath, { state: { history: newStack } });
    };

    return navigateWithCollapse;
};
