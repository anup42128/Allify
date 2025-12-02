import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const UsernameSetup = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const preservedState = location.state?.preservedState;
    const isEditing = location.state?.editing;

    const [username, setUsername] = useState(preservedState?.username || '');
    const [password, setPassword] = useState(preservedState?.password || '');
    const [confirmPassword, setConfirmPassword] = useState(preservedState?.password || '');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [hasExistingPassword, setHasExistingPassword] = useState(false);

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/');
                return;
            }

            // Check if username already exists
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('username, birthday')
                .eq('id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching profile:', error);
            }

            if (profile?.username) {
                // If we are editing (came back from birthday setup), don't redirect
                // and pre-fill the state if not already passed
                if (isEditing) {
                    if (!preservedState) {
                        setUsername(profile.username);
                        // Password is not retrievable from DB, so it remains empty or user has to re-enter if they want to change it
                    }
                    setLoading(false);
                    return;
                }

                // If user has username but no birthday, they're in the middle of signup
                // Allow them to edit username (don't auto-redirect)
                if (!profile.birthday) {
                    setUsername(profile.username);
                    setHasExistingPassword(true); // They already set a password when they first submitted
                    setLoading(false);
                    return;
                }

                // User has both username and birthday, redirect to welcome
                if (profile.birthday) {
                    navigate('/welcome');
                }
            } else {
                setLoading(false);
            }
        } catch (err) {
            console.error('Error checking user:', err);
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        if (username.length < 3) {
            setError('Username must be at least 3 characters long');
            setSaving(false);
            return;
        }

        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        if (!usernameRegex.test(username)) {
            setError('Username can only contain letters, numbers, and underscores.');
            setSaving(false);
            return;
        }

        // Check for at least 2 alphabets
        const alphabetCount = (username.match(/[a-zA-Z]/g) || []).length;
        if (alphabetCount < 2) {
            setError('Username must contain at least 2 alphabets.');
            setSaving(false);
            return;
        }

        if (password && password.length < 6) {
            setError('Password must be at least 6 characters long');
            setSaving(false);
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setSaving(false);
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            // Check if username is taken by another user
            const { data: existing } = await supabase
                .from('profiles')
                .select('id')
                .eq('username', username)
                .neq('id', user.id) // Exclude current user
                .single();

            if (existing) {
                setError('Username is already taken');
                setSaving(false);
                return;
            }

            // Update profile with username and metadata from Google
            const { error: updateError } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    username: username,
                    full_name: user.user_metadata?.full_name,
                    avatar_url: user.user_metadata?.avatar_url,
                    updated_at: new Date(),
                });

            if (updateError) throw updateError;

            // Update password only if:
            // 1. Password is provided AND
            // 2. Either this is the first time setting a password (!hasExistingPassword)
            //    OR the user is explicitly changing it (password field was modified)
            // Note: We can't detect if the password is the same as before since passwords are hashed
            // So we skip the update if they already have a password and the field is empty
            if (password && !hasExistingPassword) {
                const { error: passwordError } = await supabase.auth.updateUser({
                    password: password
                });
                if (passwordError) throw passwordError;
                setHasExistingPassword(true); // Mark that password is now set
            }

            // Comprehensive preloading for next page
            const fontLink = document.createElement('link');
            fontLink.rel = 'preload';
            fontLink.as = 'style';
            fontLink.href = 'https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap';
            document.head.appendChild(fontLink);

            // Add delay for smooth transition and preloading
            setTimeout(() => {
                navigate('/birthday-setup', { replace: true });
            }, 3000);
        } catch (err) {
            setError(err.message);
            setSaving(false);
        }
    };



    return (
        <div className="setup-container">
            <div className="setup-card">
                <div className="header-section">
                    <h1 className="logo-text">Allify</h1>
                </div>

                <h2>Complete Your Profile</h2>
                <p className="subtitle">Choose a unique username to identify yourself across Allify.</p>

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <div className="input-icon-wrapper">
                            <svg xmlns="http://www.w3.org/2000/svg" className="input-icon" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Username"
                                className="input-field with-icon"
                                value={username}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val.length > 20) {
                                        setError('Username cannot exceed 20 characters');
                                    } else {
                                        if (error === 'Username cannot exceed 20 characters') setError('');
                                        setUsername(val);
                                    }
                                }}
                                required
                            />
                        </div>
                    </div>

                    <div className="divider">
                        <span>Optional Security</span>
                    </div>

                    <p className="security-note">Set a password to enable email login in the future.</p>

                    <div className="input-group password-input-wrapper">
                        <div className="input-icon-wrapper">
                            <svg xmlns="http://www.w3.org/2000/svg" className="input-icon" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="New Password (Optional)"
                                className="input-field with-icon"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
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
                    </div>

                    {password && (
                        <div className="input-group password-input-wrapper">
                            <div className="input-icon-wrapper">
                                <svg xmlns="http://www.w3.org/2000/svg" className="input-icon" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                </svg>
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="Confirm Password"
                                    className="input-field with-icon"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required={!!password}
                                />
                                {confirmPassword && (
                                    <button
                                        type="button"
                                        className="password-toggle-btn"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                    >
                                        {showConfirmPassword ? (
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
                        </div>
                    )}

                    {error && <p className="error-text">{error}</p>}

                    <button type="submit" className="btn btn-primary full-width" disabled={saving}>
                        {saving ? <div className="spinner"></div> : 'Continue'}
                    </button>

                    <p className="info-text-bottom">
                        You can change both username and password later.
                    </p>
                </form>
            </div>

            <style>{`
                .info-text-bottom {
                    margin-top: 1rem;
                    font-size: 0.85rem;
                    color: var(--text-muted);
                    text-align: center;
                }
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

                .input-icon-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                }

                .input-icon {
                    position: absolute;
                    left: 1rem;
                    width: 1.25rem;
                    height: 1.25rem;
                    color: var(--text-muted);
                    pointer-events: none;
                }

                .input-field.with-icon {
                    padding-left: 3rem;
                }

                .divider {
                    display: flex;
                    align-items: center;
                    text-align: center;
                    margin: 1.5rem 0 1rem;
                    color: var(--text-muted);
                    font-size: 0.8rem;
                    font-weight: 500;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
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

                .security-note {
                    font-size: 0.85rem;
                    color: var(--text-muted);
                    margin-bottom: 1.5rem;
                }

                .error-text {
                    color: #ef4444;
                    margin-bottom: 1rem;
                    font-size: 0.9rem;
                    background: rgba(239, 68, 68, 0.1);
                    padding: 0.5rem;
                    border-radius: 0.5rem;
                }

                .btn-primary {
                    margin-top: 1rem;
                    padding: 0.875rem;
                    font-size: 1rem;
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

export default UsernameSetup;
