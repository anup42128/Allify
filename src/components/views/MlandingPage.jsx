import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

const MlandingPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const preservedState = location.state?.preservedState;

    const [isLogin, setIsLogin] = useState(!preservedState);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState(preservedState?.email || '');
    const [password, setPassword] = useState(preservedState?.password || '');
    const [fullName, setFullName] = useState(preservedState?.fullName || '');
    const [username, setUsername] = useState(preservedState?.username || '');
    const [message, setMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [usernameError, setUsernameError] = useState('');

    // Clear form fields if user navigates back after account creation
    useEffect(() => {
        const checkAndClearForm = async () => {
            if (preservedState) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    setEmail('');
                    setPassword('');
                    setFullName('');
                    setUsername('');
                    setIsLogin(true);
                    navigate(location.pathname, { replace: true, state: null });
                }
            }
        };
        checkAndClearForm();
    }, []);

    // Prevent scrolling except when at top (for pull-to-refresh) or when input focused
    useEffect(() => {
        const container = document.querySelector('.mobile-landing');
        if (!container) return;

        let isInputFocused = false;
        let touchStartY = 0;

        // Track input focus state
        const handleFocus = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                isInputFocused = true;
            }
        };

        const handleBlur = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                isInputFocused = false;
            }
        };

        const handleTouchStart = (e) => {
            touchStartY = e.touches[0].clientY;
        };

        // Prevent scroll unless at top or input focused
        const handleTouchMove = (e) => {
            const scrollTop = container.scrollTop;
            const touchCurrentY = e.touches[0].clientY;
            const touchDelta = touchCurrentY - touchStartY;

            // Allow scroll if input is focused (keyboard open)
            if (isInputFocused) return;

            // Allow pull-to-refresh (pulling down when at top)
            if (scrollTop === 0 && touchDelta > 0) {
                return; // Pulling down from top
            }

            // Prevent all other scrolling
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

    // Show logo after page load to prevent black background flash
    useEffect(() => {
        const logoContainer = document.querySelector('.logo-container');
        if (logoContainer) {
            // Small delay to ensure blend mode is applied
            setTimeout(() => {
                logoContainer.style.opacity = '1';
            }, 100);
        }
    }, []);

    const handleAuth = async (e) => {
        e.preventDefault();

        // Custom validation: focus first empty required field
        if (!isLogin && !fullName.trim()) {
            document.querySelector('input[placeholder="Full Name"]')?.focus();
            return;
        }
        if (!isLogin && !username.trim()) {
            document.querySelector('input[placeholder="Username"]')?.focus();
            return;
        }
        if (!email.trim()) {
            document.querySelector('input[placeholder*="Email"]')?.focus();
            return;
        }
        if (!password.trim()) {
            document.querySelector('input[placeholder="Password"]')?.focus();
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            const normalizedEmail = email.trim().toLowerCase();

            if (isLogin) {
                let loginEmail = normalizedEmail;

                if (!email.includes('@')) {
                    const { data: resolvedEmail, error: resolveError } = await supabase
                        .rpc('get_email_by_username', { username_input: email });

                    if (resolveError) throw resolveError;
                    if (!resolvedEmail) {
                        throw new Error('Invalid login credentials');
                    }
                    loginEmail = resolvedEmail;
                }

                const { error } = await supabase.auth.signInWithPassword({
                    email: loginEmail,
                    password,
                });
                if (error) throw error;

                // Preload fonts/assets (simplified for mobile, but keeping core logic)
                const fontLink = document.createElement('link');
                fontLink.rel = 'preload';
                fontLink.as = 'style';
                fontLink.href = 'https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap';
                document.head.appendChild(fontLink);

                await new Promise(resolve => setTimeout(resolve, 1000)); // Shorter delay for mobile? Keeping it simple.

                const { data: { user } } = await supabase.auth.getUser();

                if (!user.email_confirmed_at) {
                    await supabase.auth.signOut();
                    throw new Error('Please verify your email before logging in.');
                }

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('birthday')
                    .eq('id', user.id)
                    .single();

                if (profile?.birthday) {
                    navigate('/welcome');
                } else {
                    navigate('/birthday-setup');
                }
            } else {
                // Signup Logic
                const usernameRegex = /^[a-zA-Z0-9_]+$/;
                if (username.length < 3) {
                    setMessage('Username must be at least 3 characters long.');
                    setLoading(false);
                    return;
                }
                if (!usernameRegex.test(username)) {
                    setMessage('Username can only contain letters, numbers, and underscores.');
                    setLoading(false);
                    return;
                }
                const alphabetCount = (username.match(/[a-zA-Z]/g) || []).length;
                if (alphabetCount < 2) {
                    setMessage('Username must contain at least 2 alphabets.');
                    setLoading(false);
                    return;
                }
                if (password.length < 6) {
                    setMessage('Password must be at least 6 characters long.');
                    setLoading(false);
                    return;
                }

                const { data: emailExists } = await supabase.rpc('check_email_exists', {
                    email_to_check: normalizedEmail,
                });

                if (emailExists) {
                    setMessage('This email is already registered. Please log in instead.');
                    setLoading(false);
                    return;
                }

                const { data: existingUser } = await supabase
                    .from('profiles')
                    .select('username')
                    .eq('username', username)
                    .single();

                if (existingUser) {
                    setMessage('Username is already taken.');
                    setLoading(false);
                    return;
                }

                navigate(location.pathname, {
                    state: {
                        preservedState: { email: normalizedEmail, password, fullName, username }
                    },
                    replace: true
                });

                setTimeout(() => {
                    navigate('/birthday-setup', {
                        state: { email: normalizedEmail, password, fullName, username }
                    });
                }, 0);
            }
        } catch (error) {
            if (error.message.includes('User already registered')) {
                setMessage('This email is already registered.');
            } else {
                setMessage(error.error_description || error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            const redirectUrl = window.location.origin + '/auth/callback';
            console.log('Google Login Redirect URL:', redirectUrl);

            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                },
            });
            if (error) throw error;
        } catch (error) {
            setMessage(error.error_description || error.message);
        }
    };

    return (
        <div className="mobile-landing">
            <div className="mobile-header">
                <div className="logo-container">
                    <img src="/mobile-logo.jpg" alt="Allify" className="mobile-logo-img" />
                </div>
            </div>

            <form className="mobile-form" onSubmit={handleAuth}>
                {!isLogin && (
                    <>
                        <input
                            type="text"
                            placeholder="Full Name"
                            className="mobile-input"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                        />
                        <div className="mobile-input-wrapper">
                            <input
                                type="text"
                                placeholder="Username"
                                className="mobile-input"
                                value={username}
                                maxLength={20}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setUsername(value);
                                    if (value.length >= 20) {
                                        setUsernameError('Username cannot exceed 20 characters');
                                    } else {
                                        setUsernameError('');
                                    }
                                }}
                            />
                            {usernameError && <p className="mobile-input-error">{usernameError}</p>}
                        </div>
                    </>
                )}

                <input
                    type={isLogin ? "text" : "email"}
                    placeholder={isLogin ? "Email or Username" : "Email"}
                    className="mobile-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <div className="mobile-password-wrapper">
                    <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        className="mobile-input"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    {password && (
                        <button
                            type="button"
                            className="mobile-password-toggle"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? "Hide" : "Show"}
                        </button>
                    )}
                </div>

                {isLogin && (
                    <div className="forgot-password-wrapper">
                        <button type="button" className="forgot-password-btn">
                            Forgot Password?
                        </button>
                    </div>
                )}

                <div className="mobile-actions">
                    <button type="submit" className="mobile-btn-primary" disabled={loading}>
                        {loading ? 'Processing...' : (isLogin ? 'Log in' : 'Sign up')}
                    </button>

                    <button type="button" className="mobile-btn-google" onClick={handleGoogleLogin}>
                        <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                            <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                                <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                                <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                                <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.734 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                                <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
                            </g>
                        </svg>
                        Continue with Google
                    </button>

                    <div className="mobile-divider">OR</div>

                    <button
                        type="button"
                        className="mobile-btn-secondary"
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setMessage('');
                        }}
                    >
                        {isLogin ? 'Create new account' : 'Log in to existing account'}
                    </button>
                </div>

                {message && <p className="mobile-message">{message}</p>}
            </form>

            <div className="mobile-footer">
                <div className="uni-logo-small">UNI</div>
            </div>

            <style>{`
        * {
          -webkit-tap-highlight-color: transparent; /* Remove blue tap effect */
        }

        .mobile-landing {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%; /* Fallback */
          height: 100dvh; /* Dynamic viewport height */
          display: flex;
          flex-direction: column;
          padding: 1rem 2rem; /* Reduced top padding */
          background: var(--bg-color); /* Solid background color, no gradients */
          justify-content: space-between;
          overflow-y: auto; /* Allow scrolling if content overflows (e.g. keyboard) */
          /* overscroll-behavior: none; Removed to enable pull-to-refresh */
          z-index: 9999;
          /* touch-action: none;  Removed to allow scroll on inputs */
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .mobile-header {
          margin-top: 0; /* Moved up */
          text-align: center;
          flex-shrink: 0;
          animation: fadeInUp 0.8s ease-out;
        }

        .logo-container {
          width: 180px; /* Increased size */
          height: 180px; /* Increased size */
          margin: 0 auto;
          border-radius: 50%;
          overflow: hidden;
          /* box-shadow: 0 4px 15px rgba(0,0,0,0.2); */ /* Removed shadow to blend better */
          background: var(--bg-color); /* Match exact page background color */
          opacity: 0; /* Start hidden */
          transition: opacity 0.4s ease-out; /* Smooth fade in */
        }

        .mobile-logo-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          mix-blend-mode: screen; /* Blends black background into transparency */
        }

        .mobile-form {
          display: flex;
          flex-direction: column;
          gap: 1rem; /* Tighter spacing */
          width: 100%;
          max-width: 400px;
          margin: 0 auto;
          flex-grow: 1;
          justify-content: center;
          animation: fadeInUp 0.8s ease-out 0.2s backwards;
        }

        .mobile-input {
          width: 100%;
          padding: 1rem;
          border: none;
          border-bottom: 1px solid var(--border-color);
          border-radius: 0;
          background: transparent;
          font-size: 1rem;
          color: var(--text-main);
          outline: none;
          transition: border-color 0.3s ease;
        }

        .mobile-input::placeholder {
          color: var(--text-muted);
          opacity: 0.7;
        }

        .mobile-input:focus {
          border-bottom-color: var(--primary-color);
          padding-left: 0;
        }

        .mobile-input-wrapper {
          position: relative;
        }

        .mobile-input-error {
          color: var(--accent-color);
          font-size: 0.75rem;
          margin-top: 0.25rem;
          margin-bottom: 0;
          animation: fadeInUp 0.3s ease-out;
        }

        .mobile-password-wrapper {
          position: relative;
        }

        .mobile-password-toggle {
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--primary-color);
          font-weight: 600;
          cursor: pointer;
          font-size: 0.9rem;
          padding: 0.5rem;
          outline: none;
        }

        .forgot-password-wrapper {
            display: flex;
            justify-content: flex-end;
            margin-top: -0.5rem;
            margin-bottom: 0.5rem;
        }

        .forgot-password-btn {
            background: transparent;
            border: 1px solid var(--border-color);
            border-radius: 50px; /* Rounded corners for circular box look */
            color: var(--text-muted);
            font-size: 0.8rem;
            cursor: pointer;
            padding: 0.4rem 1rem;
            outline: none;
            -webkit-tap-highlight-color: transparent; /* Remove blue tap effect */
        }

        .mobile-actions {
          margin-top: 0.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
          flex-shrink: 0;
          animation: fadeInUp 0.8s ease-out 0.4s backwards;
        }

        .mobile-btn-primary {
          width: 100%;
          padding: 0.9rem;
          background: var(--primary-gradient);
          color: white;
          border: none;
          border-radius: 1rem;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
          outline: none;
        }

        .mobile-btn-google {
            width: 100%;
            padding: 0.9rem;
            background: var(--surface-color);
            color: var(--text-main);
            border: 1px solid var(--border-color);
            border-radius: 1rem;
            font-weight: 600;
            font-size: 1rem;
            cursor: pointer;
            outline: none;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.8rem;
            transition: background-color 0.2s;
        }

        .mobile-btn-google:active {
            background-color: rgba(0,0,0,0.05);
        }

        .mobile-btn-secondary {
          width: 100%;
          padding: 0.9rem;
          background: var(--surface-color);
          color: var(--text-main);
          border: 1px solid var(--border-color);
          border-radius: 1rem;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          outline: none;
        }

        .mobile-divider {
          display: none;
        }

        .mobile-message {
          text-align: center;
          color: var(--accent-color);
          font-size: 0.85rem;
          margin-top: 0.5rem;
          animation: fadeInUp 0.3s ease-out;
        }

        .mobile-footer {
          padding-top: 1rem;
          padding-bottom: 1rem;
          text-align: center;
          opacity: 0.3;
          flex-shrink: 0;
          animation: fadeInUp 0.8s ease-out 0.6s backwards;
        }

        .uni-logo-small {
          font-weight: 900;
          font-size: 1.1rem;
          letter-spacing: 0.1em;
          color: var(--text-main);
          text-transform: uppercase;
        }
      `}</style>
        </div>
    );
};

export default MlandingPage;
