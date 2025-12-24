import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNavigation } from '../contexts/SignupContext';
import { SocialGraph } from '../../../components/ui/SocialGraph';
import { BackgroundGradient } from '../../../components/ui/BackgroundGradient';
import { supabase } from '../../../lib/supabase';

export const ConfirmPage = () => {
    const [code, setCode] = useState('');
    const [timeLeft, setTimeLeft] = useState(0);
    const [canResend, setCanResend] = useState(true);
    const navigate = useNavigate();


    const { allowRoute, removeRoute, signupFormData } = useNavigation();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // Check for existing timer in localStorage
        const storedEndTime = localStorage.getItem('allify_resend_end_time');

        if (storedEndTime) {
            const endTime = parseInt(storedEndTime, 10);
            const remaining = Math.ceil((endTime - Date.now()) / 1000);

            if (remaining > 0) {
                setTimeLeft(remaining);
                setCanResend(false);
            } else {
                setCanResend(true);
                setTimeLeft(0);
            }
        } else {
            // Initiate timer on first visit/load if no timer exists
            startTimer();
        }
    }, []);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        setCanResend(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timeLeft]);

    const startTimer = () => {
        const duration = 60;
        const endTime = Date.now() + duration * 1000;
        localStorage.setItem('allify_resend_end_time', endTime.toString());
        setTimeLeft(duration);
        setCanResend(false);
    };

    const handleResend = async () => {
        if (!canResend) return;

        startTimer();

        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: signupFormData.email
            });
            if (error) {
                console.error("Resend error:", error.message);
                if (error.status === 429) {
                    setError("Too many requests. Please wait 60s.");
                } else {
                    setError(error.message || "Failed to resend code.");
                }
            } else {
                setError(""); // Clear previous errors
            }
        } catch (err) {
            console.error("Resend error:", err);
        }
    };

    const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '');
        if (value.length <= 6) {
            setCode(value);
        }
    };

    const handleContinue = async () => {
        setIsLoading(true);
        setError('');

        try {
            const { error } = await supabase.auth.verifyOtp({
                email: signupFormData.email,
                token: code,
                type: 'signup'
            });

            if (error) {
                setError(error.message);
                setIsLoading(false);
                return;
            }

            // Success
            allowRoute('/sample');
            removeRoute('/auth/signup/confirm'); // Block access to confirmation page

            // Small delay to ensure allowedRoutes state propagates to ProtectedRoute
            setTimeout(() => {
                navigate('/sample', { replace: true });
            }, 100);
        } catch (err) {
            console.error("Verification error:", err);
            setError("Verification failed. Please try again.");
            setIsLoading(false);
        }
    };

    return (
        <div className="h-screen w-screen bg-black text-white relative selection:bg-indigo-500/30 overflow-hidden">
            <BackgroundGradient />
            <SocialGraph />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 z-0 pointer-events-none" />

            {/* Scrollable Overlay */}
            <div className="absolute inset-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
                <div className="min-h-full w-full flex items-center justify-center py-6">
                    <div className="w-full max-w-md z-10 px-6 relative">
                        {/* Back Button */}
                        <button
                            onClick={() => navigate('/auth/signup')}
                            className="absolute top-0 left-6 text-gray-400 hover:text-white transition-colors flex items-center gap-2 group z-50"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 group-hover:-translate-x-1 transition-transform">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                            </svg>
                            Back
                        </button>

                        {/* Allify Logo */}
                        <motion.h1
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="text-5xl font-black tracking-tight mb-12 pb-4 text-center bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/40 mt-12"
                        >
                            Allify
                        </motion.h1>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="space-y-6"
                        >
                            {/* Success Icon and Message */}
                            <div className="flex flex-col items-center space-y-4 mb-8">
                                {/* Success Checkmark Circle */}
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ duration: 0.5, delay: 0.4, type: "spring" }}
                                    className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-10 h-10 text-green-500">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                    </svg>
                                </motion.div>

                                {/* Success Message */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.6, delay: 0.6 }}
                                    className="text-center space-y-2"
                                >
                                    <h2 className="text-xl font-semibold text-green-500">Verification Code Sent</h2>
                                    <p className="text-sm text-gray-400">Please enter the code to continue</p>
                                </motion.div>
                            </div>

                            {/* Additional Info */}
                            <div className="bg-white/5 border border-white/10 rounded-lg p-4 backdrop-blur-sm">
                                <p className="text-xs text-gray-400 text-center leading-relaxed">
                                    We've sent a 6-digit verification code to your email address. Please check your inbox and enter the code below.
                                </p>
                            </div>

                            {/* 6-Digit Code Input */}
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    value={code}
                                    onChange={handleCodeChange}
                                    placeholder="000000"
                                    maxLength={6}
                                    className="w-full px-4 py-4 rounded-lg bg-white/5 border border-white/10 text-white text-center text-2xl font-mono tracking-[0.5em] placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all backdrop-blur-sm"
                                />
                                <p className="text-xs text-gray-500 text-center">Enter 6-digit code</p>
                                {error && (
                                    <p className="text-xs text-red-500 text-center mt-2">{error}</p>
                                )}
                            </div>

                            {/* Resend Code */}
                            <div className="text-center h-6"> {/* Fixed height to prevent layout shift */}
                                <p className="text-xs text-gray-400">
                                    Didn't receive the code?{' '}
                                    <button
                                        onClick={handleResend}
                                        disabled={!canResend}
                                        className={`transition-colors underline ${canResend
                                            ? 'text-indigo-400 hover:text-indigo-300 cursor-pointer'
                                            : 'text-gray-500 cursor-not-allowed no-underline'
                                            }`}
                                    >
                                        {canResend ? 'Resend' : `Resend in ${timeLeft}s`}
                                    </button>
                                </p>
                            </div>

                            {/* Continue Button */}
                            <button
                                onClick={handleContinue}
                                disabled={code.length !== 6 || isLoading}
                                className="w-full px-8 py-4 rounded-full bg-white text-black font-bold text-lg hover:bg-gray-100 transition-all disabled:bg-white/10 disabled:text-white/40 disabled:border disabled:border-white/10 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Verifying...</span>
                                    </>
                                ) : (
                                    "Continue"
                                )}
                            </button>
                        </motion.div>

                        {/* Copyright Footer */}
                        <div className="pt-20 text-center opacity-60">
                            <div className="text-[10px] text-gray-600 font-mono tracking-widest">
                                ALLIFY © 2025
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    );
};
