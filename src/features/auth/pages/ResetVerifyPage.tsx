import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { BackgroundGradient } from '../../../components/ui/BackgroundGradient';
import { SocialGraph } from '../../../components/ui/SocialGraph';
import { useReset } from '../contexts/ResetContext';
import { api } from '../../../lib/api';

export const ResetVerifyPage = () => {
    const navigate = useNavigate();
    const { step, email, setStep, transitionToken, generateToken } = useReset();
    const [otp, setOtp] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [canResend, setCanResend] = useState(true);
    const [isResendLocked, setIsResendLocked] = useState(false);

    // Security: Only allow access if we're in the exact verifying step AND have a valid transition token
    // If not, go back to where the user came from (effectively blocking the navigation)
    const isInvalid = (step !== 'verifying' && step !== 'resetting') || !transitionToken;

    useEffect(() => {
        if (isInvalid) {
            navigate('/auth/login', { replace: true });
            return;
        }

        // Check persistent resend lock
        const lockedUntil = localStorage.getItem('allify_resend_locked_until');
        let currentlyLocked = false;

        if (lockedUntil) {
            const lockTime = parseInt(lockedUntil, 10);
            const now = Date.now();
            if (lockTime > now) {
                setTimeLeft(Math.ceil((lockTime - now) / 1000));
                setCanResend(false);
                setIsResendLocked(true);
                currentlyLocked = true;
            } else {
                localStorage.removeItem('allify_resend_locked_until');
            }
        }

        // Initialize resend timer
        // Only check for short timer if NOT locked
        if (!currentlyLocked) {
            const storedEndTime = localStorage.getItem('allify_reset_resend_end_time');
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
                // Only start timer automatically on the VERY FIRST visit to this page
                startTimer();
            }
        }

        // Sync with Backend (Double Check) in case local storage was cleared but backend is locked
        const currentStateLocked = currentlyLocked; // Capture current state to avoid closure staleness if needed (though useEffect runs once)
        // If we think we are safe, let's ask the backend just to be sure.
        if (!currentStateLocked) {
            const deviceId = localStorage.getItem('allify_device_id');
            if (deviceId) {
                api.checkResetPermission(deviceId, 'resend', true).then(check => {
                    if (check && check.status === 'error' && check.cooldown_remaining) {
                        // Backend says NO. Lock it down.
                        const lockExpiry = Date.now() + (check.cooldown_remaining * 1000);
                        localStorage.setItem('allify_resend_locked_until', lockExpiry.toString());

                        setCanResend(false);
                        setIsResendLocked(true);
                        setTimeLeft(check.cooldown_remaining);
                    }
                });
            }
        }
    }, [isInvalid, navigate]);

    // Cleanup timer effect to unlock when zero
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        // Timer finished
                        setCanResend(true);
                        setIsResendLocked(false);
                        localStorage.removeItem('allify_resend_locked_until');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timeLeft]);

    const formatTime = (seconds: number) => {
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    };

    const startTimer = () => {
        const duration = 60;
        const endTime = Date.now() + duration * 1000;
        localStorage.setItem('allify_reset_resend_end_time', endTime.toString());
        setTimeLeft(duration);
        setCanResend(false);
    };

    const handleResend = async () => {
        if (!canResend || isLoading) return;

        // Rate Limit Check
        const deviceId = localStorage.getItem('allify_device_id');
        if (deviceId) {
            const check = await api.checkResetPermission(deviceId, 'resend');
            if (check && check.status === 'error') {
                setIsResendLocked(true);
                setCanResend(false);

                // Persist lock if cooldown returned
                if (check.cooldown_remaining) {
                    const lockExpiry = Date.now() + (check.cooldown_remaining * 1000);
                    localStorage.setItem('allify_resend_locked_until', lockExpiry.toString());
                    setTimeLeft(check.cooldown_remaining);
                }
                return;
            }
        }

        setError(null);
        startTimer();

        try {
            const { error: resendError } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/reset-password`,
            });
            if (resendError) {
                setError(resendError.message);
            }
        } catch (err) {
            console.error("Resend error:", err);
            setError("Failed to resend code.");
        }
    };

    if (isInvalid) return null; // Render nothing while redirecting back

    const handleVerifyOtp = async () => {
        if (otp.length < 6) return;

        setIsLoading(true);
        setError(null);

        try {
            const { error: verifyError } = await supabase.auth.verifyOtp({
                email,
                token: otp,
                type: 'recovery',
            });

            if (verifyError) {
                setError(verifyError.message);
            } else {
                // Success: OTP verified, move to password reset step
                setStep('resetting');
                generateToken(); // Create a new token for the next step
                navigate('/auth/reset-password', { replace: true });
            }
        } catch (err) {
            console.error("OTP verification error:", err);
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
                <div className="min-h-full w-full flex items-center justify-center py-6 pb-[12vh] md:pb-0">
                    <div className="w-full max-w-md z-10 px-6 relative mt-16 md:mt-0">
                        {/* Back Button */}
                        <button
                            onClick={() => navigate('/auth/forgot-password')}
                            className="absolute -top-14 md:top-0 left-4 md:left-6 text-gray-400 hover:text-white transition-colors flex items-center gap-2 group p-2 md:p-0 backdrop-blur-md md:backdrop-blur-none bg-white/[0.03] md:bg-transparent border border-white/5 md:border-transparent rounded-full md:rounded-none z-50 text-xs md:text-base pr-4 md:pr-0 font-medium whitespace-nowrap"
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
                            className="text-5xl md:text-6xl font-black tracking-tight mb-8 md:mb-12 pb-4 text-center text-white drop-shadow-3xl mt-4 md:mt-12 leading-none"
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
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ duration: 0.5, delay: 0.4, type: "spring" }}
                                    className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-indigo-500/20 border-2 border-indigo-500/50 flex items-center justify-center"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8 md:w-10 md:h-10 text-indigo-400">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                                    </svg>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.6, delay: 0.6 }}
                                    className="text-center space-y-2"
                                >
                                    <h2 className="text-xl font-semibold text-white">Verification Code Sent</h2>
                                    <p className="text-sm text-gray-400">Please enter the code to reset your password</p>
                                </motion.div>
                            </div>

                            {/* Additional Info */}
                            <div className="bg-white/[0.07] border border-white/10 rounded-lg p-4 shadow-xl">
                                <p className="text-xs text-gray-400 text-center leading-relaxed">
                                    A 6-digit security code has been sent to <span className="text-indigo-400 font-medium">{email}</span>. This code will expire soon for your security.
                                </p>
                            </div>

                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <p className="text-sm text-gray-500 text-center font-medium">
                                        Enter your 6-digit code below
                                    </p>
                                    <div className="relative group">
                                        <input
                                            type="text"
                                            maxLength={6}
                                            placeholder="000000"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                                            onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                                            className="w-full px-5 py-4 rounded-2xl md:rounded-xl bg-white/[0.03] md:bg-white/[0.08] border border-white/5 md:border-white/10 text-white placeholder-gray-600 text-center text-3xl font-mono tracking-[0.4em] md:tracking-[0.5em] focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all shadow-inner transform-gpu backdrop-blur-md"
                                            autoFocus
                                        />
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
                                    onClick={handleVerifyOtp}
                                    disabled={isLoading || otp.length < 6}
                                    className="w-full px-6 md:px-8 py-3.5 md:py-4 rounded-[20px] md:rounded-full bg-white text-black font-bold text-base md:text-lg hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 shadow-[0_0_15px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_0_20px_-5px_rgba(255,255,255,0.4)]"
                                >
                                    {isLoading ? (
                                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : null}
                                    <span>{isLoading ? 'Verifying...' : 'Verify Code'}</span>
                                </button>

                                <div className="text-center -mt-1 md:-mt-2 relative z-10">
                                    <button
                                        onClick={handleResend}
                                        disabled={!canResend || isResendLocked}
                                        className={`w-full px-6 md:px-8 py-3.5 md:py-4 rounded-[20px] md:rounded-full border text-sm md:text-base font-semibold transition-all flex items-center justify-center ${canResend && !isResendLocked
                                            ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300 hover:text-white hover:bg-indigo-500/20'
                                            : 'bg-white/[0.01] border-white/5 text-gray-600 cursor-not-allowed'
                                            }`}
                                    >
                                        {isResendLocked
                                            ? `Try again in ${formatTime(timeLeft)}`
                                            : canResend
                                                ? <span>Didn't receive code? <span className="text-indigo-300/60 font-medium ml-1.5">Resend.</span></span>
                                                : `Wait ${timeLeft}s to resend`
                                        }
                                    </button>

                                    {isResendLocked && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-left"
                                        >
                                            <p className="text-xs text-red-300 leading-relaxed font-medium">
                                                You’ve reached the resend limit. Please enter the code already sent. If you didn’t receive it, go back and restart the verification process.
                                            </p>
                                        </motion.div>
                                    )}
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
