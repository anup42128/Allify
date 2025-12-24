import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { BackgroundGradient } from '../../../components/ui/BackgroundGradient';
import { SocialGraph } from '../../../components/ui/SocialGraph';
import { useReset } from '../contexts/ResetContext';

export const ForgotPasswordPage = () => {
    const navigate = useNavigate();
    const { setStep, setIdentity, resetFlow, generateToken } = useReset();
    const [identifier, setIdentifier] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Clear reset state on enter
    useEffect(() => {
        resetFlow();
    }, []);

    const handleSendOTP = async () => {
        setIsLoading(true);
        setMessage(null);

        try {
            let resetEmail = identifier;
            const isEmail = identifier.includes('@');
            let foundUsername = identifier;

            if (!isEmail) {
                // Lookup email by username
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('email, username')
                    .eq('username', identifier)
                    .single();

                if (profileError || !profile) {
                    setMessage({ type: 'error', text: "Username not found. Please check and try again." });
                    setIsLoading(false);
                    return;
                }
                resetEmail = profile.email;
                foundUsername = profile.username;
            } else {
                // Lookup username by email to ensure user exists
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('username')
                    .eq('email', identifier)
                    .single();

                if (profileError || !profile) {
                    setMessage({ type: 'error', text: "Email not found. Please check and try again." });
                    setIsLoading(false);
                    return;
                }
                foundUsername = profile.username;
            }

            // Trigger password reset OTP from Supabase
            const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
                redirectTo: `${window.location.origin}/auth/reset-password`,
            });

            if (error) {
                setMessage({ type: 'error', text: error.message });
            } else {
                // Success: Update context and move to next step
                setIdentity(resetEmail, foundUsername);
                setStep('verifying');
                generateToken();
                navigate('/auth/reset-verify');
            }
        } catch (err) {
            console.error("Reset password error:", err);
            setMessage({ type: 'error', text: "An unexpected error occurred." });
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
            <div className="absolute inset-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
                <div className="min-h-full w-full flex items-center justify-center py-6">
                    <div className="w-full max-w-md z-10 px-6 relative mt-12">
                        <button
                            onClick={() => navigate('/auth/login', { replace: true })}
                            className="absolute top-0 left-6 text-gray-400 hover:text-white transition-colors flex items-center gap-2 group whitespace-nowrap"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 group-hover:-translate-x-1 transition-transform">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                            </svg>
                            Back to Login
                        </button>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="space-y-6 mt-12"
                        >
                            <div className="text-center space-y-2 mb-8">
                                <motion.h1
                                    initial={{ scale: 0.9 }}
                                    animate={{ scale: 1 }}
                                    transition={{ duration: 0.5 }}
                                    className="text-6xl font-black tracking-tighter text-white drop-shadow-3xl mb-4"
                                >
                                    Allify
                                </motion.h1>
                                <h2 className="text-2xl font-bold text-gray-200">Reset Password</h2>
                                <p className="text-gray-400 text-sm max-w-xs mx-auto">
                                    Enter your email or username to receive a password reset link.
                                </p>
                            </div>

                            <div className="space-y-5">
                                <div className="relative group">
                                    <input
                                        type="text"
                                        placeholder="Email or Username"
                                        value={identifier}
                                        onChange={(e) => setIdentifier(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
                                        className="w-full px-5 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all backdrop-blur-sm shadow-inner"
                                    />
                                </div>

                                {message && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'} border rounded-lg p-3`}
                                    >
                                        <p className={`text-xs ${message.type === 'success' ? 'text-emerald-400' : 'text-red-400'} text-center`}>
                                            {message.text}
                                        </p>
                                    </motion.div>
                                )}

                                <button
                                    onClick={handleSendOTP}
                                    disabled={isLoading || !identifier.trim()}
                                    className="w-full px-8 py-3.5 rounded-full bg-white text-black font-bold text-lg hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 shadow-[0_0_15px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_0_20px_-5px_rgba(255,255,255,0.4)] mt-6"
                                >
                                    {isLoading ? (
                                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : null}
                                    <span>{isLoading ? 'Searching...' : 'Recover Account'}</span>
                                </button>

                                <div className="relative flex py-4 items-center">
                                    <div className="flex-grow border-t border-white/10"></div>
                                    <span className="flex-shrink-0 mx-4 text-gray-500 text-xs">or</span>
                                    <div className="flex-grow border-t border-white/10"></div>
                                </div>

                                <div className="text-center">
                                    <p className="text-sm text-gray-400">
                                        New to Allify?{' '}
                                        <button
                                            onClick={() => navigate('/auth/signup')}
                                            className="text-white hover:text-indigo-300 font-medium hover:underline transition-colors"
                                        >
                                            Create an account
                                        </button>
                                    </p>
                                </div>
                            </div>

                            {/* Copyright Footer */}
                            <div className="pt-8 text-center opacity-60">
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
