import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

const MBirthdaySetup = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const signupData = location.state;
    const [day, setDay] = useState(() => sessionStorage.getItem('birthday_day') || '');
    const [month, setMonth] = useState(() => sessionStorage.getItem('birthday_month') || '');
    const [year, setYear] = useState(() => sessionStorage.getItem('birthday_year') || '');
    const [isValidAge, setIsValidAge] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => currentYear - i);
    const days = Array.from({ length: 31 }, (_, i) => i + 1);

    // Save to sessionStorage whenever inputs change
    useEffect(() => {
        sessionStorage.setItem('birthday_day', day);
        sessionStorage.setItem('birthday_month', month);
        sessionStorage.setItem('birthday_year', year);
    }, [day, month, year]);

    useEffect(() => {
        if (day && month && year) {
            const monthIndex = months.indexOf(month);
            const birthDateObj = new Date(year, monthIndex, day);
            const today = new Date();

            // Check if date is valid (e.g., not Feb 31)
            if (
                birthDateObj.getDate() !== parseInt(day) ||
                birthDateObj.getMonth() !== monthIndex ||
                birthDateObj.getFullYear() !== parseInt(year)
            ) {
                setIsValidAge(false);
                return;
            }

            let age = today.getFullYear() - birthDateObj.getFullYear();
            const m = today.getMonth() - birthDateObj.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
                age--;
            }

            const isYearValid = parseInt(year) >= 1900 && birthDateObj <= today;
            setIsValidAge(age >= 13 && isYearValid);
        } else {
            setIsValidAge(false);
        }
    }, [day, month, year]);

    // Prevent scrolling except when at top (for pull-to-refresh) or when input focused
    useEffect(() => {
        const container = document.querySelector('.mobile-birthday');
        if (!container) return;

        let isInputFocused = false;
        let touchStartY = 0;

        // Track input focus state
        const handleFocus = (e) => {
            if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') {
                isInputFocused = true;
            }
        };

        const handleBlur = (e) => {
            if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') {
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (isValidAge) {
            setLoading(true);
            try {
                const monthIndex = months.indexOf(month);
                // Format date as YYYY-MM-DD for PostgreSQL date type
                const birthDate = new Date(Date.UTC(year, monthIndex, day)).toISOString().split('T')[0];

                if (signupData) {
                    // New User Signup - pass all data to confirmation page
                    navigate('/confirmation', {
                        state: {
                            signupData: {
                                email: signupData.email,
                                password: signupData.password,
                                fullName: signupData.fullName,
                                username: signupData.username,
                                birthday: birthDate
                            }
                        },
                        replace: true
                    });
                } else {
                    // Existing User (Google or previously logged in)
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) throw new Error('No user found');

                    // SAFETY CHECK: If user is not verified, send to confirmation
                    if (!user.email_confirmed_at) {
                        navigate('/confirmation', { state: { email: user.email } });
                        return;
                    }

                    const { error } = await supabase
                        .from('profiles')
                        .upsert({
                            id: user.id,
                            birthday: birthDate,
                            updated_at: new Date(),
                        });

                    if (error) throw error;

                    // Comprehensive preloading for WelcomePage
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
                    setTimeout(() => document.body.removeChild(tempDiv), 100);

                    setTimeout(() => {
                        navigate('/welcome', { replace: true });
                    }, 5000);
                }
            } catch (error) {
                console.error('Error updating profile:', error.message);
                setError('Error saving birthday: ' + error.message);
                setLoading(false);
            }
        }
    };

    return (
        <div className="mobile-birthday">
            <div className="mobile-header">
                <button
                    className="back-btn"
                    onClick={() => {
                        // Navigate back with preserved state
                        if (signupData) {
                            navigate('/', {
                                state: {
                                    preservedState: {
                                        email: signupData.email,
                                        password: signupData.password,
                                        fullName: signupData.fullName,
                                        username: signupData.username
                                    }
                                },
                                replace: true
                            });
                        } else {
                            navigate('/');
                        }
                    }}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 12H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Back
                </button>
            </div>

            <div className="content-wrapper">
                <div className="cake-icon-wrapper">
                    <svg width="100" height="100" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className="cake-icon">
                        <path id="draw1" d="M256,85.27c18.825,0,34.133-15.309,34.133-34.133c0-16.563-23.142-43.196-27.785-48.367c-3.234-3.61-9.463-3.61-12.698,0 c-4.642,5.171-27.785,31.804-27.785,48.367C221.867,69.962,237.175,85.27,256,85.27z M256,21.68 c9.054,11.315,17.067,24.021,17.067,29.457c0,9.412-7.654,17.067-17.067,17.067c-9.412,0-17.067-7.654-17.067-17.067 C238.933,45.701,246.946,32.995,256,21.68z" stroke="currentColor" strokeWidth="10" fill="none" />
                        <path id="draw2" d="M213.333,119.404h85.333c4.719,0,8.533-3.823,8.533-8.533s-3.814-8.533-8.533-8.533h-85.333 c-4.719,0-8.533,3.823-8.533,8.533S208.614,119.404,213.333,119.404z" stroke="currentColor" strokeWidth="10" fill="none" />
                        <path id="draw3" d="M102.4,218.698v62.839c0,4.71,3.814,8.533,8.533,8.533s8.533-3.823,8.533-8.533v-59.733 c10.138,0,18.748-7.125,27.87-14.677c11.008-9.122,23.484-19.456,40.397-19.456s29.389,10.334,40.397,19.456 c9.122,7.552,17.732,14.677,27.87,14.677c10.138,0,18.748-7.125,27.87-14.677c11.008-9.122,23.484-19.456,40.397-19.456 c16.913,0,29.389,10.334,40.397,19.456c9.122,7.552,17.732,14.677,27.87,14.677v59.733c0,4.71,3.814,8.533,8.533,8.533 c4.719,0,8.533-3.823,8.533-8.533v-62.839c19.652-7.219,34.133-26.3,34.133-48.094c0-19.456-14.677-34.133-34.133-34.133H102.4 c-19.456,0-34.133,14.677-34.133,34.133C68.267,192.398,82.748,211.478,102.4,218.698z M102.4,153.537h307.2 c10.052,0,17.067,7.014,17.067,17.067c0,18.5-15.633,34.133-34.133,34.133c-3.994,0-10.59-5.47-16.973-10.752 c-11.913-9.873-28.228-23.381-51.294-23.381c-23.066,0-39.381,13.508-51.294,23.381 c-6.383,5.282-12.979,10.752-16.973,10.752 s-10.59-5.47-16.973-10.752c-11.913-9.873-28.228-23.381-51.294-23.381s-39.381,13.508-51.294,23.381 c-6.383,5.282-12.979,10.752-16.973,10.752c-18.5,0-34.133-15.633-34.133-34.133C85.333,160.552,92.348,153.537,102.4,153.537z" stroke="currentColor" strokeWidth="10" fill="none" />
                        <path id="draw5" d="M503.467,494.87H8.533c-4.719,0-8.533,3.823-8.533,8.533s3.814,8.533,8.533,8.533h494.933 c4.719,0,8.533-3.823,8.533-8.533S508.186,494.87,503.467,494.87z" stroke="currentColor" strokeWidth="10" fill="none" />
                        <path id="draw4" d="M34.133,389.364v79.906c0,4.71,3.814,8.533,8.533,8.533s8.533-3.823,8.533-8.533v-76.8 c10.138,0,18.748-7.125,27.87-14.677c11.008-9.122,23.484-19.456,40.397-19.456s29.389,10.334,40.397,19.456 c9.122,7.552,17.732,14.677,27.87,14.677c10.138,0,18.748-7.125,27.87-14.677c11.008-9.122,23.484-19.456,40.397-19.456 s29.389,10.334,40.397,19.456c9.122,7.552,17.732,14.677,27.87,14.677c10.138,0,18.748-7.125,27.87-14.677 c11.008-9.122,23.484-19.456,40.397-19.456c16.913,0,29.389,10.334,40.397,19.456c9.122,7.552,17.732,14.677,27.87,14.677v76.8 c0,4.71,3.814,8.533,8.533,8.533s8.533-3.823,8.533-8.533v-79.906c19.652-7.219,34.133-26.3,34.133-48.094 c0-19.456-14.677-34.133-34.133-34.133H34.133C14.677,307.137,0,321.814,0,341.27C0,363.065,14.481,382.145,34.133,389.364z M34.133,324.204h443.733c10.052,0,17.067,7.014,17.067,17.067c0,18.5-15.633,34.133-34.133,34.133 c-3.994,0-10.59-5.47-16.973-10.752c-11.912-9.873-28.228-23.381-51.294-23.381c-23.066,0-39.381,13.508-51.294,23.381 c-6.383,5.282-12.979,10.752-16.973,10.752s-10.59-5.47-16.973-10.752c-11.913-9.873-28.228-23.381-51.294-23.381 c-23.066,0-39.381,13.508-51.294,23.381s-39.381,13.508-51.294,23.381c-6.383,5.282-12.979,10.752-16.973,10.752 c-18.5,0-34.133-15.633-34.133-34.133C17.067,331.218,24.081,324.204,34.133,324.204z" stroke="currentColor" strokeWidth="10" fill="none" />
                    </svg>
                </div>

                <h2 className="title">When's your birthday?</h2>
                <p className="subtitle">
                    You must be at least 13 years old to use Allify.
                </p>

                <form onSubmit={handleSubmit} className="mobile-form">
                    <div className="date-selectors">
                        <div className="select-group">
                            <select
                                value={month}
                                onChange={(e) => setMonth(e.target.value)}
                                className="custom-select"
                                required
                            >
                                <option value="" disabled>Month</option>
                                {months.map((m) => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>

                        <div className="select-group">
                            <select
                                value={day}
                                onChange={(e) => setDay(e.target.value)}
                                className="custom-select"
                                required
                            >
                                <option value="" disabled>Day</option>
                                {days.map((d) => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                        </div>

                        <div className="select-group">
                            <select
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                                className="custom-select"
                                required
                            >
                                <option value="" disabled>Year</option>
                                {years.map((y) => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <p className="info-text">
                        Your birthday won't be shown publicly unless you choose to share it.
                    </p>

                    {message && <div className="success-message">{message}</div>}
                    {error && <div className="error-message">{error}</div>}

                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={!isValidAge || loading}
                    >
                        {loading ? 'Processing...' : 'Continue'}
                    </button>
                </form>
            </div>

            <style>{`
                .mobile-birthday {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100dvh;
                    background: var(--bg-color);
                    display: flex;
                    flex-direction: column;
                    padding: 1rem 1.5rem;
                    overflow-y: auto;
                }

                .mobile-header {
                    padding: 1rem 0;
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
                    padding: 0.5rem 0;
                    outline: none;
                    -webkit-tap-highlight-color: transparent;
                }

                .content-wrapper {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    text-align: center;
                    margin-top: -2rem; /* Visual adjustment */
                }

                .cake-icon-wrapper {
                    margin-bottom: 2rem;
                    color: var(--primary-color);
                    opacity: 0.9;
                }

                .cake-icon {
                    width: 100px;
                    height: 100px;
                }

                .title {
                    font-size: 1.75rem;
                    font-weight: 700;
                    margin-bottom: 0.5rem;
                    color: var(--text-main);
                }

                .subtitle {
                    color: var(--text-muted);
                    font-size: 0.95rem;
                    margin-bottom: 2.5rem;
                }

                .mobile-form {
                    width: 100%;
                }

                .date-selectors {
                    display: flex;
                    gap: 0.5rem;
                    margin-bottom: 1.5rem;
                }

                .select-group {
                    flex: 1;
                }

                .custom-select {
                    width: 100%;
                    padding: 0.8rem 0.5rem;
                    font-size: 0.9rem;
                    border: 1px solid var(--border-color);
                    border-radius: 0.8rem;
                    background: var(--surface-color);
                    color: var(--text-main);
                    appearance: none;
                    text-align: center;
                }

                .info-text {
                    font-size: 0.8rem;
                    color: var(--text-muted);
                    margin-bottom: 2rem;
                    line-height: 1.4;
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
                }

                .btn-primary:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .error-message {
                    color: #ef4444;
                    font-size: 0.9rem;
                    margin-bottom: 1rem;
                    padding: 0.5rem;
                    background: rgba(239, 68, 68, 0.1);
                    border-radius: 0.5rem;
                }
            `}</style>
        </div >
    );
};

export default MBirthdaySetup;
