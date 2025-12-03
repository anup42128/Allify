import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import MConfirmationPage from './views/MConfirmationPage';

const ConfirmationPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [resendCooldown, setResendCooldown] = useState(60);
    const signupData = location.state?.signupData;
    const email = location.state?.email || signupData?.email;
    const token = location.state?.token;
    const signupPerformedRef = useRef(false);

    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (isMobile) {
        return <MConfirmationPage />;
    }

    // Validate navigation token on mount
    useEffect(() => {
        if (signupData) {
            const validToken = sessionStorage.getItem('allify_valid_token');
            if (!token || token !== validToken) {
                // Invalid or missing token - redirect back to birthday setup
                console.warn('Invalid navigation token, redirecting to birthday setup');
                navigate('/birthday-setup', {
                    replace: true,
                    state: {
                        // Pass back data so user doesn't lose it
                        email: signupData.email,
                        password: signupData.password,
                        fullName: signupData.fullName,
                        username: signupData.username
                    }
                });
            }
        }
    }, [token, signupData, navigate]);

    // Handle new user signup on mount
    useEffect(() => {
        if (signupData && !signupPerformedRef.current) {
            // Check if we already sent the code for this email (persist across refreshes)
            const codeSentKey = `allify_code_sent_for_${signupData.email}`;
            const alreadySent = sessionStorage.getItem(codeSentKey);

            if (alreadySent) {
                console.log('Code already sent (session storage), skipping auto-send');
                setSuccess('Verification code sent! Check your email.');
                signupPerformedRef.current = true;
                return;
            }

            // This is a new signup - create the user account
            const performSignup = async () => {
                try {
                    setLoading(true);
                    console.log('Performing signup for:', signupData.email);

                    const { error } = await supabase.auth.signUp({
                        email: signupData.email,
                        password: signupData.password,
                        options: {
                            data: {
                                full_name: signupData.fullName,
                                username: signupData.username,
                                birthday: signupData.birthday
                            }
                        }
                    });

                    if (error) {
                        // Ignore "Database error saving new user" - this is expected
                        // The profile will be created automatically when user verifies email
                        if (error.message && error.message.includes('Database error saving new user')) {
                            console.log('Ignoring expected database error (profile will be created on verification)');
                        } else {
                            throw error;
                        }
                    }

                    console.log('Signup successful, verification code sent!');
                    setSuccess('Verification code sent! Check your email.');
                    sessionStorage.setItem(codeSentKey, 'true'); // Mark as sent

                    // Initialize timer
                    const timerEnd = Date.now() + 60000;
                    sessionStorage.setItem(`allify_resend_timer_end_${signupData.email}`, timerEnd.toString());
                    setResendCooldown(60);

                    signupPerformedRef.current = true; // Mark signup as completed
                    setLoading(false);
                } catch (err) {
                    console.error('Signup error:', err);
                    // Only show error if it's not a rate limit error
                    if (!err.message?.includes('For security purposes')) {
                        setError(err.message || 'Failed to send verification code.');
                    } else {
                        // If it's a rate limit error, just show success message
                        setSuccess('Verification code already sent! Check your email.');
                        sessionStorage.setItem(codeSentKey, 'true');
                        signupPerformedRef.current = true;
                    }
                    setLoading(false);
                }
            };

            performSignup();
        } else if (signupData && signupPerformedRef.current) {
            // Signup already performed, just show success message
            setSuccess('Verification code sent! Check your email.');
        }
    }, [signupData]);

    // Check verification status for existing users
    useEffect(() => {
        if (!email) {
            navigate('/');
            return;
        }

        // Only check verification status if this is NOT a new signup
        if (!signupData) {
            const checkVerificationStatus = async () => {
                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    console.log('Checking verification status:', user);

                    // If user exists and email is confirmed, redirect to welcome
                    if (user && user.email_confirmed_at) {
                        console.log('User already verified (email_confirmed_at set), redirecting to welcome...');
                        setSuccess('Email already verified! Redirecting...');
                        setTimeout(() => {
                            navigate('/welcome', { replace: true });
                        }, 2000); // Add delay so user sees the message
                    } else {
                        console.log('User not verified yet.');
                    }
                } catch (error) {
                    console.error('Error checking verification status:', error);
                }
            };

            checkVerificationStatus();
        }
    }, [email, navigate, signupData]);

    // Timer persistence logic
    useEffect(() => {
        if (!email) return;

        const timerKey = `allify_resend_timer_end_${email}`;

        // Check for existing timer on mount
        const savedTimerEnd = sessionStorage.getItem(timerKey);
        if (savedTimerEnd) {
            const remaining = Math.ceil((parseInt(savedTimerEnd) - Date.now()) / 1000);
            if (remaining > 0) {
                setResendCooldown(remaining);
            } else {
                setResendCooldown(0);
            }
        }

        if (resendCooldown > 0) {
            const timer = setInterval(() => {
                setResendCooldown((prev) => {
                    const newValue = prev - 1;
                    if (newValue <= 0) {
                        sessionStorage.removeItem(timerKey);
                        return 0;
                    }
                    return newValue;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [resendCooldown, email]);

    const handleResend = async () => {
        if (resendCooldown > 0) return;

        setSuccess('');
        setError('');

        // Set cooldown and save to session storage
        setResendCooldown(60);
        const timerEnd = Date.now() + 60000;
        sessionStorage.setItem(`allify_resend_timer_end_${email}`, timerEnd.toString());

        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: email,
            });

            if (error) {
                if (error.status === 429 || (error.message && error.message.toLowerCase().includes('rate limit'))) {
                    setError('Too many attempts. Please wait before resending.');
                    // Cooldown is already set, so we just return
                    return;
                }
                throw error;
            }

            setSuccess('A new code has been sent to your email! Check your inbox.');
        } catch (err) {
            console.error('Resend error:', err);
            setError(err.message || 'Failed to resend code. Please try again.');
            setResendCooldown(0); // Reset cooldown on non-rate-limit errors
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        if (loading || otp.length < 6) return;

        setLoading(true);
        setSuccess('');
        setError('');

        try {
            const { error } = await supabase.auth.verifyOtp({
                email,
                token: otp,
                type: 'signup',
            });

            if (error) throw error;

            console.log('Verification successful, preloading resources...');

            // Preload resources
            try {
                const fontLink = document.createElement('link');
                fontLink.rel = 'preload';
                fontLink.as = 'style';
                fontLink.href = 'https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap';
                document.head.appendChild(fontLink);

                const fontPreload = document.createElement('link');
                fontPreload.rel = 'preload';
                fontPreload.as = 'font';
                fontPreload.type = 'font/woff2';
                fontPreload.href = 'https://fonts.gstatic.com/s/greatvibes/v18/RWmMoKWR9v4ksMfaWd_JN-XCg6UKDXlq.woff2';
                fontPreload.crossOrigin = 'anonymous';
                document.head.appendChild(fontPreload);

                const tempDiv = document.createElement('div');
                tempDiv.style.fontFamily = 'Great Vibes, cursive';
                tempDiv.style.position = 'absolute';
                tempDiv.style.visibility = 'hidden';
                tempDiv.textContent = 'Preload';
                document.body.appendChild(tempDiv);
                setTimeout(() => {
                    if (document.body.contains(tempDiv)) {
                        document.body.removeChild(tempDiv);
                    }
                }, 100);
            } catch (preloadError) {
                console.warn('Preloading failed, continuing anyway:', preloadError);
            }

            // Wait for 5 seconds before redirecting
            await new Promise(resolve => setTimeout(resolve, 5000));
            navigate('/welcome', { replace: true });

        } catch (err) {
            console.error('Verification error:', err);
            setError(err.message || 'Invalid code. Please check and try again.');
            setLoading(false);
        }
    };

    return (
        <div className="setup-container">
            <div className="setup-card">
                <div className="header-section">
                    <h1 className="logo-text">Allify</h1>
                </div>

                <h2>Verify Your Email</h2>
                <p className="subtitle">
                    We've sent a code to <strong>{email}</strong>. Enter it below to confirm your account.
                </p>

                <form onSubmit={handleVerify}>
                    <div className="input-group">
                        <input
                            type="text"
                            placeholder="Enter 6-digit code"
                            className="input-field text-center"
                            value={otp}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                setOtp(val.slice(0, 6));
                            }}
                            maxLength={6}
                            required
                            disabled={loading}
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}
                    {success && <div className="success-message">{success}</div>}

                    <button
                        type="submit"
                        className="btn btn-primary full-width"
                        disabled={loading || otp.length < 6}
                    >
                        {loading ? <div className="spinner"></div> : 'Verify Account'}
                    </button>

                    <div className="resend-section">
                        <p className="resend-text">Didn't receive the code?</p>
                        <button
                            type="button"
                            className="btn-resend"
                            onClick={handleResend}
                            disabled={resendCooldown > 0 || loading}
                        >
                            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                        </button>
                    </div>
                </form>
            </div>

            <style>{`
                .setup-container {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--bg-color);
                    background-image: radial-gradient(var(--dot-pattern-color) 1px, transparent 1px);
                    background-size: 24px 24px;
                    padding: 1rem;
                }

                .setup-card {
                    background: var(--surface-color);
                    padding: 2.5rem 2rem;
                    border-radius: 1.5rem;
                    box-shadow: var(--shadow-xl);
                    width: 100%;
                    max-width: 400px;
                    border: 1px solid var(--border-color);
                    text-align: center;
                    backdrop-filter: blur(10px);
                }

                .header-section {
                    margin-bottom: 1.5rem;
                }

                .logo-text {
                    font-size: 1.75rem;
                    font-weight: 800;
                    margin: 0;
                    background: var(--primary-gradient);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                h2 {
                    margin-bottom: 0.5rem;
                    color: var(--text-main);
                    font-size: 1.5rem;
                    font-weight: 700;
                }

                .subtitle {
                    color: var(--text-muted);
                    margin-bottom: 2rem;
                    line-height: 1.5;
                    font-size: 0.95rem;
                }

                .input-group {
                    margin-bottom: 1rem;
                }

                .input-field {
                    width: 100%;
                    padding: 0.875rem 1rem;
                    border-radius: 0.5rem;
                    border: 1px solid var(--border-color);
                    background: var(--bg-color);
                    color: var(--text-main);
                    font-size: 1.25rem;
                    letter-spacing: 0.2em;
                    transition: border-color 0.2s;
                }
                
                .input-field.text-center {
                    text-align: center;
                }

                .input-field:focus {
                    border-color: var(--primary-color);
                    outline: 2px solid rgba(99, 102, 241, 0.2);
                }

                .btn-primary {
                    width: 100%;
                    padding: 0.875rem;
                    font-size: 1rem;
                    border-radius: 0.75rem;
                    border: none;
                    background: var(--primary-gradient);
                    color: white;
                    font-weight: 600;
                    cursor: pointer;
                    transition: opacity 0.2s;
                }

                .btn-primary:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .error-message {
                    margin-bottom: 1rem;
                    padding: 0.75rem;
                    background: rgba(239, 68, 68, 0.1);
                    color: #ef4444;
                    border-radius: 0.5rem;
                    font-size: 0.9rem;
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    word-wrap: break-word;
                    max-width: 100%;
                }

                .success-message {
                    margin-bottom: 1rem;
                    padding: 0.75rem;
                    background: rgba(16, 185, 129, 0.1);
                    color: #10b981;
                    border-radius: 0.5rem;
                    font-size: 0.9rem;
                    border: 1px solid rgba(16, 185, 129, 0.2);
                    word-wrap: break-word;
                    max-width: 100%;
                }

                .resend-section {
                    margin-top: 1.5rem;
                    text-align: center;
                }

                .resend-text {
                    font-size: 0.9rem;
                    color: var(--text-muted);
                    margin-bottom: 0.5rem;
                }

                .btn-resend {
                    background: none;
                    border: none;
                    color: var(--primary-color);
                    font-weight: 600;
                    font-size: 0.9rem;
                    cursor: pointer;
                    padding: 0.5rem 1rem;
                    transition: opacity 0.2s;
                }

                .btn-resend:hover:not(:disabled) {
                    text-decoration: underline;
                }

                .btn-resend:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
            `}</style>
        </div>
    );
};

export default ConfirmationPage;
