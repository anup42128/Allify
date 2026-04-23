import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { BackgroundGradient } from '../../../components/ui/BackgroundGradient';
import { SocialGraph } from '../../../components/ui/SocialGraph';
import { useReset } from '../contexts/ResetContext';
import { api } from '../../../lib/api';

export const ForgotPasswordPage = () => {
    const navigate = useNavigate();
    const { setStep, setIdentity, resetFlow, generateToken } = useReset();
    const [identifier, setIdentifier] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [cooldownTimeLeft, setCooldownTimeLeft] = useState(0);

    // Initialize timer from localStorage on mount
    useEffect(() => {
        const storedExpiry = localStorage.getItem('allify_reset_cooldown_expiry');
        if (storedExpiry) {
            const expiry = parseInt(storedExpiry, 10);
            const now = Date.now();
            if (expiry > now) {
                setCooldownTimeLeft(Math.ceil((expiry - now) / 1000));
            } else {
                localStorage.removeItem('allify_reset_cooldown_expiry');
            }
        }
    }, []);

    // Timer countdown effect - Uses absolute time to prevent drift/pausing
    useEffect(() => {
        if (cooldownTimeLeft <= 0) return;

        const syncTimer = () => {
            const storedExpiry = localStorage.getItem('allify_reset_cooldown_expiry');
            if (storedExpiry) {
                const expiry = parseInt(storedExpiry, 10);
                const now = Date.now();
                const remaining = Math.ceil((expiry - now) / 1000);

                if (remaining <= 0) {
                    localStorage.removeItem('allify_reset_cooldown_expiry');
                    setCooldownTimeLeft(0);
                } else {
                    setCooldownTimeLeft(remaining);
                }
            } else {
                setCooldownTimeLeft(0);
            }
        };

        const interval = setInterval(syncTimer, 1000);
        return () => clearInterval(interval);
    }, [cooldownTimeLeft]);

    // Clear reset state on enter and ensure Device ID exists
    useEffect(() => {
        resetFlow();

        // Generate stable Device ID if missing
        if (!localStorage.getItem('allify_device_id')) {
            const newDeviceId = crypto.randomUUID ? crypto.randomUUID() : `device_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            localStorage.setItem('allify_device_id', newDeviceId);
        }
    }, []);

    const handleSendOTP = async () => {
        setIsLoading(true);
        setMessage(null);

        try {
            const isEmail = identifier.includes('@');
            let resetEmail = '';
            let foundUsername = '';

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
                resetEmail = identifier;
            }

            // 1. Security Check: Device Rate Limiting (Check only AFTER validation passes)
            const deviceId = localStorage.getItem('allify_device_id');
            if (deviceId) {
                const permission = await api.checkResetPermission(deviceId);
                if (permission && permission.status === 'error') {
                    // Sync local timer if backend provides remaining time
                    if (permission.cooldown_remaining) {
                        const remaining = permission.cooldown_remaining;
                        setCooldownTimeLeft(remaining);
                        const expiry = Date.now() + (remaining * 1000);
                        localStorage.setItem('allify_reset_cooldown_expiry', expiry.toString());
                    }

                    // Block request if rate limit exceeded
                    setMessage({
                        type: 'error',
                        text: permission.message || "Too many attempts. Please try again later."
                    });
                    setIsLoading(false);
                    return;
                }
            }

            // Trigger password reset OTP from Supabase
            const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
                redirectTo: `${window.location.origin}/auth/reset-password`,
            });

            if (error) {
                setMessage({ type: 'error', text: error.message });
            } else {
                // Success: Update context and move to next step
                // Set 150s cooldown (2m 30s)
                const COOLDOWN_SECONDS = 150;
                setCooldownTimeLeft(COOLDOWN_SECONDS);
                localStorage.setItem('allify_reset_cooldown_expiry', (Date.now() + COOLDOWN_SECONDS * 1000).toString());

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
        <div className="min-h-[100svh] md:h-screen w-full bg-black text-white relative selection:bg-indigo-500/30 md:overflow-hidden overflow-x-hidden">
            <div className="fixed md:absolute top-0 left-0 w-full h-[100vh] md:h-full z-0 pointer-events-none">
                <BackgroundGradient />
                <SocialGraph />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80" />
            </div>

            {/* Scrollable Overlay */}
            <div className="relative md:absolute inset-0 md:overflow-y-auto overflow-x-hidden custom-scrollbar z-10 w-full min-h-[100svh]">
                <div className="min-h-[100svh] md:min-h-full w-full flex items-center justify-center py-6 pb-[12vh] md:pb-0">
                    <div className="w-full max-w-md z-10 px-6 relative mt-16 md:mt-0">
                        <button
                            onClick={() => navigate('/auth/login', { replace: true })}
                            className="absolute -top-14 md:top-0 left-4 md:left-6 text-gray-400 hover:text-white transition-colors flex items-center gap-2 group p-2 md:p-0 backdrop-blur-md md:backdrop-blur-none bg-white/[0.03] md:bg-transparent border border-white/5 md:border-transparent rounded-full md:rounded-none z-50 text-xs md:text-base pr-4 md:pr-0 font-medium whitespace-nowrap"
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
                            className="space-y-6 mt-4 md:mt-12"
                        >
                            <div className="text-center space-y-1 md:space-y-2 mb-8">
                                <motion.h1
                                    initial={{ scale: 0.9 }}
                                    animate={{ scale: 1 }}
                                    transition={{ duration: 0.5 }}
                                    className="text-5xl md:text-6xl font-black tracking-tighter text-white drop-shadow-3xl mb-2 md:mb-4 leading-none"
                                >
                                    Allify
                                </motion.h1>
                                <h2 className="text-xl md:text-2xl font-bold text-gray-200 tracking-tight">Reset Password</h2>
                                <p className="text-zinc-500 md:text-gray-400 text-[13px] md:text-sm max-w-xs mx-auto font-medium md:font-normal">
                                    Enter your email or username to receive a secure password reset link.
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
                                        className="w-full px-4 md:px-5 py-3.5 rounded-2xl md:rounded-xl bg-white/[0.03] md:bg-white/5 border border-white/5 md:border-white/10 text-white placeholder-zinc-500 md:placeholder-gray-400 text-sm md:text-base focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all backdrop-blur-md shadow-inner text-center md:text-left"
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
                                    disabled={isLoading || !identifier.trim() || cooldownTimeLeft > 0}
                                    className="w-full px-6 md:px-8 py-3.5 md:py-4 rounded-[20px] md:rounded-full bg-white text-black font-bold text-base md:text-lg hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 shadow-[0_0_15px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_0_20px_-5px_rgba(255,255,255,0.4)] mt-6 md:mt-6"
                                >
                                    {isLoading ? (
                                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : null}
                                    <span>
                                        {isLoading
                                            ? 'Searching...'
                                            : cooldownTimeLeft > 0
                                                ? `Wait ${Math.floor(cooldownTimeLeft / 60)}m ${cooldownTimeLeft % 60}s`
                                                : 'Recover Account'
                                        }
                                    </span>
                                </button>

                                <div className="text-center pt-2">
                                    <button
                                        onClick={() => navigate('/auth/signup')}
                                        className="w-full px-6 md:px-8 py-3.5 md:py-4 rounded-[20px] md:rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:text-white hover:bg-indigo-500/20 font-semibold text-sm md:text-base transition-all flex items-center justify-center mt-3"
                                    >
                                        <span>Don't have an account? <span className="text-indigo-300/60 font-medium ml-1.5">Create one.</span></span>
                                    </button>
                                </div>
                            </div>

                            {/* Security Footer */}
                            <div className="pt-8 pb-4 text-center">
                                <p className="text-[10px] md:text-xs text-gray-500/70 font-medium tracking-wide">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 inline-block mr-1.5 -mt-0.5 text-indigo-500/70">
                                        <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
                                    </svg>
                                    Your data is secure and encrypted.
                                </p>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>

    );
};
