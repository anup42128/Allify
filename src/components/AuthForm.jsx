import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const AuthForm = () => {
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

  // Clear form fields if user navigates back after account creation
  useEffect(() => {
    const checkAndClearForm = async () => {
      if (preservedState) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // User exists and we have preserved state
          // This means they're coming back after creating an account
          // Clear the preserved state and form fields
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
  }, []); // Run only once on mount

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (isLogin) {
        let loginEmail = normalizedEmail;

        // If input doesn't look like an email, assume it's a username
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

        // Comprehensive preloading for WelcomePage
        // Preload Great Vibes font
        const fontLink = document.createElement('link');
        fontLink.rel = 'preload';
        fontLink.as = 'style';
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap';
        document.head.appendChild(fontLink);

        // Preload font file directly
        const fontPreload = document.createElement('link');
        fontPreload.rel = 'preload';
        fontPreload.as = 'font';
        fontPreload.type = 'font/woff2';
        fontPreload.href = 'https://fonts.gstatic.com/s/greatvibes/v18/RWmMoKWR9v4ksMfaWd_JN-XCg6UKDXlq.woff2';
        fontPreload.crossOrigin = 'anonymous';
        document.head.appendChild(fontPreload);

        // Force browser to load and parse the font
        const tempDiv = document.createElement('div');
        tempDiv.style.fontFamily = 'Great Vibes, cursive';
        tempDiv.style.position = 'absolute';
        tempDiv.style.visibility = 'hidden';
        tempDiv.textContent = 'Preload';
        document.body.appendChild(tempDiv);
        setTimeout(() => document.body.removeChild(tempDiv), 100);

        // 5 second delay for smooth transition and complete preloading
        await new Promise(resolve => setTimeout(resolve, 4000));

        const { data: { user } } = await supabase.auth.getUser();

        // SECURITY CHECK: Verify email is confirmed
        if (!user.email_confirmed_at) {
          await supabase.auth.signOut();
          throw new Error('Please verify your email before logging in. Check your inbox for the verification code.');
        }

        // Check if user has completed setup (has birthday)
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
        // Validate username format
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

        // Check for at least 2 alphabets after any leading numbers/underscores
        const alphabetCount = (username.match(/[a-zA-Z]/g) || []).length;
        if (alphabetCount < 2) {
          setMessage('Username must contain at least 2 alphabets.');
          setLoading(false);
          return;
        }

        // Validate password length
        if (password.length < 6) {
          setMessage('Password must be at least 6 characters long.');
          setLoading(false);
          return;
        }

        // Check if email is already registered (securely via RPC)
        const { data: emailExists } = await supabase.rpc('check_email_exists', {
          email_to_check: normalizedEmail,
        });

        if (emailExists) {
          setMessage('This email is already registered. Please log in instead.');
          setLoading(false);
          return;
        }

        // Check if username is taken
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', username)
          .single();

        if (existingUser) {
          setMessage('Username is already taken. Please choose another one.');
          setLoading(false);
          return;
        }

        // Save current state to history before navigating so it can be restored on back
        navigate(location.pathname, {
          state: {
            preservedState: {
              email: normalizedEmail,
              password,
              fullName,
              username,
            }
          },
          replace: true
        });

        // Navigate to Birthday Setup with signup data
        // Use setTimeout to ensure the history replacement happens first
        setTimeout(() => {
          navigate('/birthday-setup', {
            state: {
              email: normalizedEmail,
              password,
              fullName,
              username,
            }
          });
        }, 0);
      }
    } catch (error) {
      if (error.message.includes('User already registered')) {
        setMessage('This email is already registered. Please log in instead.');
      } else {
        setMessage(error.error_description || error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/auth/callback',
        },
      });
      if (error) throw error;
    } catch (error) {
      setMessage(error.error_description || error.message);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-header">
        <h2 className="logo-text">Allify</h2>
        <p className="auth-subtitle">
          {isLogin ? 'Welcome back to the future.' : 'Join the next generation.'}
        </p>
      </div>

      <form className="auth-form" onSubmit={handleAuth}>
        {!isLogin && (
          <>
            <div className="input-group">
              <input
                type="text"
                placeholder="Full Name"
                className="input-field"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <input
                type="text"
                placeholder="Username"
                className="input-field"
                value={username}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.length > 20) {
                    setMessage('Username cannot exceed 20 characters.');
                  } else {
                    if (message === 'Username cannot exceed 20 characters.') setMessage('');
                    setUsername(val);
                  }
                }}
                required
              />
            </div>
          </>
        )}

        <div className="input-group">
          <input
            type={isLogin ? "text" : "email"}
            placeholder={isLogin ? "Email or Username" : "Email"}
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="input-group password-input-wrapper">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {password && (
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              )}
            </button>
          )}
        </div>

        <button type="submit" className="btn btn-primary full-width" disabled={loading}>
          {loading ? <div className="spinner"></div> : (isLogin ? 'Log In' : 'Sign Up')}
        </button>

        {message && <p className="auth-message">{message}</p>}

        <div className="divider">
          <span>OR</span>
        </div>

        <button
          type="button"
          className="btn btn-secondary full-width google-btn"
          onClick={handleGoogleLogin}
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="google-icon" />
          Continue with Google
        </button>
      </form>

      <div className="auth-footer">
        <p>
          {isLogin ? "Don't have an account?" : 'Already have an account?'}
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setIsLogin(!isLogin);
              setMessage('');
            }}
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>

      <style>{`
        .auth-card {
          background: var(--surface-color);
          padding: 2.5rem;
          border-radius: 1.5rem;
          box-shadow: var(--shadow-xl);
          width: 100%;
          max-width: 400px;
          border: 1px solid var(--border-color);
          backdrop-filter: blur(10px);
        }

        .auth-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .auth-subtitle {
          color: var(--text-muted);
          margin-top: 0.5rem;
          font-size: 0.95rem;
        }

        .full-width {
          width: 100%;
        }

        .divider {
          display: flex;
          align-items: center;
          text-align: center;
          margin: 1.5rem 0;
          color: var(--text-muted);
          font-size: 0.875rem;
        }

        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid var(--border-color);
        }

        .divider span {
          padding: 0 10px;
        }

        .google-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .google-icon {
          width: 1.25rem;
          height: 1.25rem;
        }

        .auth-footer {
          margin-top: 2rem;
          text-align: center;
          font-size: 0.9rem;
          color: var(--text-muted);
        }

        .link-btn {
          background: none;
          border: none;
          color: var(--primary-color);
          font-weight: 600;
          cursor: pointer;
          margin-left: 0.25rem;
          padding: 0;
        }
        
        .link-btn:hover {
          text-decoration: underline;
        }

        .auth-message {
            margin-top: 1rem;
            color: var(--primary-color);
            text-align: center;
            font-size: 0.9rem;
        }

        .password-input-wrapper {
          position: relative;
        }

        .password-toggle-btn {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          transition: all 0.2s ease;
          z-index: 10;
          border-radius: 0.375rem;
        }

        .password-toggle-btn:hover {
          color: var(--primary-color);
          background: rgba(139, 92, 246, 0.1);
        }

        .password-toggle-btn:active {
          transform: translateY(-50%) scale(0.95);
        }

        .password-toggle-btn svg {
          width: 1.25rem;
          height: 1.25rem;
          stroke-width: 2.5;
        }

        .password-input-wrapper .input-field {
          padding-right: 3rem;
        }
      `}</style>
    </div>
  );
};

export default AuthForm;
