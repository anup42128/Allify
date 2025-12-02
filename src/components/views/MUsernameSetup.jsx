import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

const MUsernameSetup = () => {
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
                if (isEditing) {
                    if (!preservedState) {
                        setUsername(profile.username);
                    }
                    setLoading(false);
                    return;
                }

                if (!profile.birthday) {
                    setUsername(profile.username);
                    setHasExistingPassword(true);
                    setLoading(false);
                    return;
                }

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

            const { data: existing } = await supabase
                .from('profiles')
                .select('id')
                .eq('username', username)
                .neq('id', user.id)
                .single();

            if (existing) {
                setError('Username is already taken');
                setSaving(false);
                return;
            }

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

            if (password && !hasExistingPassword) {
                const { error: passwordError } = await supabase.auth.updateUser({
                    password: password
                });
                if (passwordError) throw passwordError;
                setHasExistingPassword(true);
            }

            // Navigate to birthday setup (mobile version if exists, otherwise standard)
            // Assuming standard birthday setup is responsive or we'll make a mobile one later
            // For now, redirect to /birthday-setup
            navigate('/birthday-setup', { replace: true });

        } catch (err) {
            setError(err.message);
            setSaving(false);
        }
    };

    return (
        <div className="mobile-username-setup">
            <div className="setup-content">
                <div className="header-section">
                    <button className="back-btn" onClick={() => navigate(-1)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="brand-name">Allify</h1>
                    <p className="tagline">Create your unique identity</p>
                </div>

                <form onSubmit={handleSubmit} className="setup-form">
                    <div className="input-group">
                        <label className="input-label">Username</label>
                        <input
                            type="text"
                            placeholder="Choose a username"
                            className="mobile-input"
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
                        <p className="input-hint">Letters, numbers, and underscores only</p>
                    </div>

                    <div className="input-group">
                        <label className="input-label">Password (Optional)</label>
                        <div className="password-wrapper">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Set a password"
                                className="mobile-input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            {password && (
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? "Hide" : "Show"}
                                </button>
                            )}
                        </div>
                    </div>

                    {password && (
                        <div className="input-group">
                            <label className="input-label">Confirm Password</label>
                            <div className="password-wrapper">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="Confirm password"
                                    className="mobile-input"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required={!!password}
                                />
                                {confirmPassword && (
                                    <button
                                        type="button"
                                        className="password-toggle"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    >
                                        {showConfirmPassword ? "Hide" : "Show"}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {error && <div className="error-message">{error}</div>}

                    <button type="submit" className="continue-btn" disabled={saving}>
                        {saving ? (
                            <span className="loading-dots">
                                Saving
                                <span className="dot">.</span>
                                <span className="dot">.</span>
                                <span className="dot">.</span>
                            </span>
                        ) : 'Continue'}
                    </button>
                </form>
            </div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

                .mobile-username-setup {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100dvh;
                    background: var(--bg-color);
                    display: flex;
                    flex-direction: column;
                    padding: 1.5rem;
                    overflow-y: auto;
                    -webkit-overflow-scrolling: touch;
                }

                .setup-content {
                    width: 100%;
                    max-width: 400px;
                    margin: 0 auto;
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                    padding-top: 1rem;
                    animation: fadeInUp 0.6s ease-out;
                }

                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .header-section {
                    text-align: center;
                    position: relative;
                    padding-top: 1rem;
                }

                .back-btn {
                    position: absolute;
                    left: 0;
                    top: 0.5rem;
                    background: none;
                    border: none;
                    color: var(--text-color);
                    padding: 0.5rem;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    -webkit-tap-highlight-color: transparent;
                    outline: none;
                }

                .brand-name {
                    font-family: 'Inter', sans-serif;
                    font-size: 2rem;
                    font-weight: 900;
                    background: var(--primary-gradient);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    margin: 0 0 0.5rem 0;
                    letter-spacing: -0.02em;
                }

                .tagline {
                    font-family: 'Inter', sans-serif;
                    font-size: 0.95rem;
                    color: var(--text-secondary);
                    margin: 0;
                    font-weight: 500;
                }

                .setup-form {
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                }

                .input-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .input-label {
                    font-family: 'Inter', sans-serif;
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: var(--text-color);
                    margin-left: 0.25rem;
                }

                .mobile-input {
                    width: 100%;
                    padding: 1rem;
                    font-family: 'Inter', sans-serif;
                    font-size: 1rem;
                    background: var(--surface-color);
                    border: 1px solid var(--border-color);
                    border-radius: 0.75rem;
                    color: var(--text-color);
                    outline: none;
                    transition: all 0.2s ease;
                }

                .mobile-input:focus {
                    border-color: var(--primary-color);
                    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
                }

                .input-hint {
                    font-family: 'Inter', sans-serif;
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                    margin: 0 0 0 0.25rem;
                }

                .password-wrapper {
                    position: relative;
                }

                .password-toggle {
                    position: absolute;
                    right: 1rem;
                    top: 50%;
                    transform: translateY(-50%);
                    background: none;
                    border: none;
                    color: var(--primary-color);
                    font-family: 'Inter', sans-serif;
                    font-size: 0.85rem;
                    font-weight: 600;
                    cursor: pointer;
                    padding: 0.25rem;
                }

                .error-message {
                    background: rgba(239, 68, 68, 0.1);
                    color: #ef4444;
                    padding: 0.75rem;
                    border-radius: 0.5rem;
                    font-family: 'Inter', sans-serif;
                    font-size: 0.9rem;
                    text-align: center;
                    font-weight: 500;
                }

                .continue-btn {
                    width: 100%;
                    padding: 1rem;
                    margin-top: 1rem;
                    background: var(--primary-gradient);
                    color: white;
                    border: none;
                    border-radius: 0.75rem;
                    font-family: 'Inter', sans-serif;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
                }

                .continue-btn:active:not(:disabled) {
                    transform: scale(0.98);
                }

                .continue-btn:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }

                .loading-dots .dot {
                    animation: dotPulse 1.4s ease-in-out infinite;
                    opacity: 0;
                    margin-left: 2px;
                }

                .loading-dots .dot:nth-child(2) { animation-delay: 0.2s; }
                .loading-dots .dot:nth-child(3) { animation-delay: 0.4s; }

                @keyframes dotPulse {
                    0%, 60%, 100% { opacity: 0; }
                    30% { opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default MUsernameSetup;
