import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

const MConfirmationPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [resendCooldown, setResendCooldown] = useState(60);
    const signupData = location.state?.signupData;
    const email = location.state?.email || signupData?.email;
    const signupPerformedRef = useRef(false);

    // Scroll prevention logic
    useEffect(() => {
        const container = document.querySelector('.mobile-confirmation');
        if (!container) return;

        let isInputFocused = false;
        let touchStartY = 0;

        const handleFocus = (e) => {
            if (e.target.tagName === 'INPUT') {
                isInputFocused = true;
            }
        };

        const handleBlur = (e) => {
            if (e.target.tagName === 'INPUT') {
                isInputFocused = false;
            }
        };

        const handleTouchStart = (e) => {
            touchStartY = e.touches[0].clientY;
        };

        const handleTouchMove = (e) => {
            const scrollTop = container.scrollTop;
            const touchCurrentY = e.touches[0].clientY;
            const touchDelta = touchCurrentY - touchStartY;

            if (isInputFocused) return;

            if (scrollTop === 0 && touchDelta > 0) {
                return;
            }

            e.preventDefault();
        };

        document.addEventListener('focus', handleFocus, true);
        document.addEventListener('blur', handleBlur, true);
        container.addEventListener('touchstart', handleTouchStart, { passive: true });
        container.addEventListener('touchmove', handleTouchMove, { passive: false });

        return () => {
            document.removeEventListener('focus', handleFocus, true);
            document.removeEventListener('blur', handleBlur, true);
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
        };
    }, []);

    // Handle new user signup on mount
    useEffect(() => {
        if (signupData && !signupPerformedRef.current) {
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
                        if (error.message && error.message.includes('Database error saving new user')) {
                            console.log('Ignoring expected database error (profile will be created on verification)');
                        } else {
                            throw error;
                        }
                    }

                    console.log('Signup successful, verification code sent!');
                    setSuccess('Verification code sent! Check your email.');
                    signupPerformedRef.current = true;
                    setLoading(false);
                } catch (err) {
                    console.error('Signup error:', err);
                    if (!err.message?.includes('For security purposes')) {
                        setError(err.message || 'Failed to send verification code.');
                    } else {
                        setSuccess('Verification code already sent! Check your email.');
                        signupPerformedRef.current = true;
                    }
                    setLoading(false);
                }
            };

            performSignup();
        } else if (signupData && signupPerformedRef.current) {
            setSuccess('Verification code sent! Check your email.');
        }
    }, [signupData]);

    // Check verification status for existing users
    useEffect(() => {
        if (!email) {
            navigate('/');
            return;
        }

        if (!signupData) {
            const checkVerificationStatus = async () => {
                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user && user.email_confirmed_at) {
                        setSuccess('Email already verified! Redirecting...');
                        setTimeout(() => {
                            navigate('/welcome', { replace: true });
                        }, 2000);
                    }
                } catch (error) {
                    console.error('Error checking verification status:', error);
                }
            };

            checkVerificationStatus();
        }
    }, [email, navigate, signupData]);

    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setInterval(() => {
                setResendCooldown((prev) => prev - 1);
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [resendCooldown]);

    const handleResend = async () => {
        if (resendCooldown > 0 || resending) return;

        setResending(true);
        setSuccess('');
        setError('');
        setResendCooldown(60);

        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: email,
            });

            if (error) {
                if (error.status === 429 || (error.message && error.message.toLowerCase().includes('rate limit'))) {
                    setError('Too many attempts. Please wait before resending.');
                    return;
                }
                throw error;
            }

            setSuccess('A new code has been sent to your email! Check your inbox.');
        } catch (err) {
            console.error('Resend error:', err);
            setError(err.message || 'Failed to resend code. Please try again.');
            setResendCooldown(0);
        } finally {
            setResending(false);
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

            // Clear birthday setup data from session storage
            sessionStorage.removeItem('birthday_day');
            sessionStorage.removeItem('birthday_month');
            sessionStorage.removeItem('birthday_year');

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

            await new Promise(resolve => setTimeout(resolve, 5000));
            navigate('/welcome', { replace: true });

        } catch (err) {
            console.error('Verification error:', err);
            setError(err.message || 'Invalid code. Please check and try again.');
            setLoading(false);
        }
    };

    return (
        <div className="mobile-confirmation">
            <div className="mobile-header">
                <button
                    className="back-btn"
                    onClick={() => navigate('/', {
                        state: {
                            preservedState: signupData
                        },
                        replace: true
                    })}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 12H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Back
                </button>
            </div>

            <div className="content-wrapper">
                <div className="icon-wrapper">
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M21.75 6.75V17.25C21.75 18.4926 20.7426 19.5 19.5 19.5H4.5C3.25736 19.5 2.25 18.4926 2.25 17.25V6.75C2.25 5.50736 3.25736 4.5 4.5 4.5H19.5C20.7426 4.5 21.75 5.50736 21.75 6.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M2.25 6.75L12 13.5L21.75 6.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>

                <h2 className="title">Check your email</h2>
                <p className="subtitle">
                    We've sent a 6-digit verification code to<br />
                    <span className="email-highlight">{email}</span>
                </p>

                <form onSubmit={handleVerify} className="mobile-form">
                    <div className="input-group">
                        <input
                            type="text"
                            placeholder="000000"
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
                        className="btn-primary"
                        disabled={loading || otp.length < 6}
                    >
                        {loading ? <div className="spinner-small"></div> : 'Verify Account'}
                    </button>

                    <div className="resend-section">
                        <p className="resend-text">Didn't receive the code?</p>
                        <button
                            type="button"
                            className="btn-resend"
                            onClick={handleResend}
                            disabled={resendCooldown > 0 || loading || resending}
                        >
                            {resending ? <div className="spinner-resend"></div> : (resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code')}
                        </button>
                    </div>
                </form>
            </div>

            <style>{`
                .mobile-confirmation {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100dvh;
                    background: var(--bg-color);
                    display: flex;
                    flex-direction: column;
                    padding: 1rem 1.5rem;
                    overflow: hidden; /* Prevent scrolling */
                }

                .mobile-header {
                    padding: 0.5rem 0;
                    flex-shrink: 0;
                }

                .back-btn {
                    background: none;
                    border: none;
                    color: var(--text-main);
                    font-size: 1rem;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    cursor: pointer;
                    padding: 1.5rem 2rem 1.5rem 0; /* Significantly increased hit area */
                    margin: -1rem 0 -1rem 0; /* Compensate for padding */
                    outline: none;
                    -webkit-tap-highlight-color: transparent;
                    z-index: 10;
                    position: relative;
                }

                .content-wrapper {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    justify-content: center; /* Center vertically */
                    margin-top: -2rem; /* Slight offset to visual center */
                }

                .icon-wrapper {
                    margin-bottom: 1.5rem;
                    color: var(--primary-color);
                    opacity: 0.9;
                    padding: 1.25rem;
                    background: var(--surface-color);
                    border-radius: 50%;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.05);
                }

                .title {
                    font-size: 1.5rem;
                    font-weight: 800;
                    margin-bottom: 0.5rem;
                    color: var(--text-main);
                }

                .subtitle {
                    color: var(--text-muted);
                    font-size: 0.95rem;
                    margin-bottom: 2rem;
                    line-height: 1.5;
                }

                .email-highlight {
                    color: var(--text-main);
                    font-weight: 600;
                }

                .mobile-form {
                    width: 100%;
                }

                .input-group {
                    margin-bottom: 1.5rem;
                }

                .input-field {
                    width: 100%;
                    padding: 1rem;
                    border-radius: 1rem;
                    border: 1px solid var(--border-color);
                    background: var(--surface-color);
                    color: var(--text-main);
                    font-size: 1.75rem;
                    font-weight: 600;
                    letter-spacing: 0.5em;
                    transition: all 0.2s;
                    outline: none;
                    -webkit-tap-highlight-color: transparent;
                }
                
                .input-field::placeholder {
                    color: var(--text-muted);
                    opacity: 0.3;
                    letter-spacing: 0.5em;
                }
                
                .input-field.text-center {
                    text-align: center;
                }

                .input-field:focus {
                    border-color: var(--primary-color);
                    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
                    transform: translateY(-2px);
                }

                .btn-primary {
                    width: 100%;
                    padding: 1rem;
                    background: var(--primary-gradient);
                    color: white;
                    border: none;
                    border-radius: 1rem;
                    font-weight: 600;
                    font-size: 1.1rem;
                    cursor: pointer;
                    box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
                    outline: none;
                    -webkit-tap-highlight-color: transparent;
                    transition: transform 0.2s;
                    min-height: 3.5rem; /* Ensure consistent height */
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .btn-primary:active {
                    transform: scale(0.98);
                }

                .btn-primary:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                }

                .spinner-small {
                    width: 24px;
                    height: 24px;
                    border: 3px solid rgba(255, 255, 255, 0.3);
                    border-radius: 50%;
                    border-top-color: #fff;
                    animation: spin 0.8s linear infinite;
                }

                .spinner-resend {
                    width: 20px;
                    height: 20px;
                    border: 2px solid rgba(99, 102, 241, 0.1);
                    border-radius: 50%;
                    border-top-color: var(--primary-color);
                    animation: spin 0.8s linear infinite;
                    display: inline-block;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .error-message {
                    color: #ef4444;
                    font-size: 0.85rem;
                    margin-bottom: 1rem;
                    padding: 0.5rem;
                    background: rgba(239, 68, 68, 0.1);
                    border-radius: 0.75rem;
                    width: 100%;
                }

                .success-message {
                    color: #10b981;
                    font-size: 0.85rem;
                    margin-bottom: 1rem;
                    padding: 0.5rem;
                    background: rgba(16, 185, 129, 0.1);
                    border-radius: 0.75rem;
                    width: 100%;
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
                    font-size: 1rem;
                    cursor: pointer;
                    padding: 0.5rem 1rem;
                    outline: none;
                    -webkit-tap-highlight-color: transparent;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto;
                }

                .btn-resend:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
            `}</style>
        </div>
    );
};

export default MConfirmationPage;
