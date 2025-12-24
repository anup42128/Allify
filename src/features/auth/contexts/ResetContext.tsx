import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type ResetStep = 'idle' | 'identifying' | 'verifying' | 'resetting' | 'completed';

interface ResetContextType {
    step: ResetStep;
    email: string;
    username: string;
    transitionToken: string | null;
    setStep: (step: ResetStep) => void;
    setIdentity: (email: string, username: string) => void;
    generateToken: () => void;
    clearToken: () => void;
    resetFlow: () => void;
}

const ResetContext = createContext<ResetContextType | undefined>(undefined);

export const ResetProvider = ({ children }: { children: ReactNode }) => {
    // Initial state from localStorage
    const [step, setStep] = useState<ResetStep>(() => {
        return (localStorage.getItem('allify_reset_step') as ResetStep) || 'idle';
    });
    const [email, setEmail] = useState(() => {
        return localStorage.getItem('allify_reset_email') || '';
    });
    const [username, setUsername] = useState(() => {
        return localStorage.getItem('allify_reset_username') || '';
    });
    const [transitionToken, setTransitionToken] = useState<string | null>(() => {
        return localStorage.getItem('allify_reset_token');
    });

    // Sync state to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('allify_reset_step', step);
    }, [step]);

    useEffect(() => {
        localStorage.setItem('allify_reset_email', email);
    }, [email]);

    useEffect(() => {
        localStorage.setItem('allify_reset_username', username);
    }, [username]);

    useEffect(() => {
        if (transitionToken) {
            localStorage.setItem('allify_reset_token', transitionToken);
        } else {
            localStorage.removeItem('allify_reset_token');
        }
    }, [transitionToken]);

    const setIdentity = (email: string, username: string) => {
        setEmail(email);
        setUsername(username);
    };

    const generateToken = () => {
        setTransitionToken(Math.random().toString(36).substring(2, 15));
    };

    const clearToken = () => {
        setTransitionToken(null);
    };

    const resetFlow = () => {
        setStep('idle');
        setEmail('');
        setUsername('');
        setTransitionToken(null);
        // Explicitly clear all keys
        localStorage.removeItem('allify_reset_step');
        localStorage.removeItem('allify_reset_email');
        localStorage.removeItem('allify_reset_username');
        localStorage.removeItem('allify_reset_token');
        localStorage.removeItem('allify_reset_resend_end_time');
    };

    return (
        <ResetContext.Provider value={{
            step,
            email,
            username,
            transitionToken,
            setStep,
            setIdentity,
            generateToken,
            clearToken,
            resetFlow
        }}>
            {children}
        </ResetContext.Provider>
    );
};

export const useReset = () => {
    const context = useContext(ResetContext);
    if (context === undefined) {
        throw new Error('useReset must be used within a ResetProvider');
    }
    return context;
};
