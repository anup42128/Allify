import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { BackgroundGradient } from '../../../components/ui/BackgroundGradient';
import { SocialGraph } from '../../../components/ui/SocialGraph';
import { useReset } from '../contexts/ResetContext';

export const NewPasswordPage = () => {
    const navigate = useNavigate();
    const { step, transitionToken, resetFlow } = useReset();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    // Security: Only allow access if we've reached the resetting or completed step AND have a valid token
    const isInvalid = (step !== 'resetting' && step !== 'completed') || !transitionToken;

    useEffect(() => {
        if (isInvalid && !isSuccess) {
            navigate('/auth/login', { replace: true });
        }
    }, [isInvalid, isSuccess, navigate]);

    if (isInvalid && !isSuccess) return null;

    const handleUpdatePassword = async () => {
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            });

            if (updateError) {
                setError(updateError.message);
            } else {
                // Set success state FIRST to block the security useEffect
                setIsSuccess(true);

                // Success: Password updated
                // Redirect to login with success message
                navigate('/auth/login', {
                    replace: true,
                    state: { message: "Password updated successfully. Please log in again." }
                });

                // Then clear the flow data
                resetFlow();
            }
        } catch (err) {
            console.error("Password update error:", err);
            setError("An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-screen w-screen bg-black text-white relative selection:bg-indigo-500/30 overflow-hidden">
            <BackgroundGradient />
            <SocialGraph />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 z-0 pointer-events-none" />

            {/* Scrollable Overlay */}
            <div className="absolute inset-0 overflow-y-auto overflow-x-hidden custom-scrollbar transform-gpu">
                <div className="min-h-full w-full flex items-center justify-center py-6">
                    <div className="w-full max-w-md z-10 px-6 relative">

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
                            {/* Key Icon and Message */}
                            <div className="flex flex-col items-center space-y-4 mb-8">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ duration: 0.5, delay: 0.4, type: "spring" }}
                                    className="w-20 h-20 rounded-full bg-indigo-500/20 border-2 border-indigo-500/50 flex items-center justify-center"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-10 h-10 text-indigo-400">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818l5.73-5.73a1.5 1.5 0 0 0 .43-1.563 6 6 0 1 1 11.72-2.312l-2.029 2.03a1.5 1.5 0 0 0-.43 1.563c.097.564-.026 1.16-.43 1.564l-1.438 1.439a1.5 1.5 0 0 1-2.121 0l-2.121-2.12a1.5 1.5 0 0 1 0-2.122l1.439-1.438a1.5 1.5 0 0 0 .43-1.563 6.002 6.002 0 0 1 3.511-7.029l2.03 2.03c.563.097 1.159-.026 1.563-.43L15.75 5.25Z" />
                                    </svg>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.6, delay: 0.6 }}
                                    className="text-center space-y-2"
                                >
                                    <h2 className="text-xl font-semibold text-white">Create New Password</h2>
                                    <p className="text-sm text-gray-400">Please choose a strong password to secure your account</p>
                                </motion.div>
                            </div>

                            {/* Additional Info */}
                            <div className="bg-white/[0.07] border border-white/10 rounded-lg p-4 shadow-xl">
                                <p className="text-xs text-gray-400 text-center leading-relaxed">
                                    Your new password should be unique and contain at least 6 characters for maximum security.
                                </p>
                            </div>

                            <div className="space-y-5">
                                <div className="space-y-4">
                                    <div className="relative group">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="New Password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full px-5 py-3.5 rounded-xl bg-white/[0.08] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.12] transition-all shadow-inner transform-gpu"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors p-1"
                                        >
                                            {showPassword ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.644C3.397 8.305 7.894 5.5 12 5.5s8.603 2.805 9.964 6.178a1.012 1.012 0 010 .644C20.603 15.695 16.106 18.5 12 18.5s-8.603-2.805-9.964-6.178z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                    <div className="relative group">
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            placeholder="Confirm New Password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full px-5 py-3.5 rounded-xl bg-white/[0.08] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.12] transition-all shadow-inner transform-gpu"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors p-1"
                                        >
                                            {showConfirmPassword ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.644C3.397 8.305 7.894 5.5 12 5.5s8.603 2.805 9.964 6.178a1.012 1.012 0 010 .644C20.603 15.695 16.106 18.5 12 18.5s-8.603-2.805-9.964-6.178z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-red-500/10 border border-red-500/20 rounded-lg p-3"
                                    >
                                        <p className="text-xs text-red-400 text-center">
                                            {error}
                                        </p>
                                    </motion.div>
                                )}

                                <button
                                    onClick={handleUpdatePassword}
                                    disabled={isLoading || !password || !confirmPassword}
                                    className="w-full px-8 py-3.5 rounded-full bg-white text-black font-bold text-lg hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 shadow-[0_0_15px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_0_20px_-5px_rgba(255,255,255,0.4)] mt-4"
                                >
                                    {isLoading ? (
                                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : null}
                                    <span>{isLoading ? 'Updating...' : 'Update Password'}</span>
                                </button>
                            </div>

                            <div className="pt-20 text-center opacity-60">
                                <div className="text-[10px] text-gray-600 font-mono tracking-widest">
                                    ALLIFY © 2025
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>

    );
};
