import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import MBirthdaySetup from './views/MBirthdaySetup';

const BirthdaySetup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const signupData = location.state;
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  // Load saved state on mount
  useEffect(() => {
    const savedState = sessionStorage.getItem('allify_birthday_temp');
    if (savedState) {
      const parsed = JSON.parse(savedState);
      // Only restore if it matches the current user (if we have signupData)
      if (signupData && parsed.username === signupData.username) {
        setDay(parsed.day || '');
        setMonth(parsed.month || '');
        setYear(parsed.year || '');
      }
    }
  }, [signupData]);

  // Save state on change
  useEffect(() => {
    if (signupData?.username) {
      const stateToSave = {
        username: signupData.username,
        day,
        month,
        year
      };
      sessionStorage.setItem('allify_birthday_temp', JSON.stringify(stateToSave));
    }
  }, [day, month, year, signupData]);
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

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isMobile) {
    return <MBirthdaySetup />;
  }

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
          // The actual signup will happen on the confirmation page

          // Clear saved state before navigating
          sessionStorage.removeItem('allify_birthday_temp');

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

          // Add delay for smooth transition and complete preloading
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
    <div className="setup-container">
      <div className="setup-card">
        <div className="header-section">
          <h1 className="logo-text">Allify</h1>
          <div className="cake-icon-wrapper">
            <svg
              width="80"
              height="80"
              viewBox="0 0 512 512"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="cake-icon"
            >
              <path
                id="draw1"
                d="M256,85.27c18.825,0,34.133-15.309,34.133-34.133c0-16.563-23.142-43.196-27.785-48.367c-3.234-3.61-9.463-3.61-12.698,0 c-4.642,5.171-27.785,31.804-27.785,48.367C221.867,69.962,237.175,85.27,256,85.27z M256,21.68 c9.054,11.315,17.067,24.021,17.067,29.457c0,9.412-7.654,17.067-17.067,17.067c-9.412,0-17.067-7.654-17.067-17.067 C238.933,45.701,246.946,32.995,256,21.68z"
                stroke="currentColor"
                strokeWidth="10"
                fill="none"
              />
              <path
                id="draw2"
                d="M213.333,119.404h85.333c4.719,0,8.533-3.823,8.533-8.533s-3.814-8.533-8.533-8.533h-85.333 c-4.719,0-8.533,3.823-8.533,8.533S208.614,119.404,213.333,119.404z"
                stroke="currentColor"
                strokeWidth="10"
                fill="none"
              />
              <path
                id="draw3"
                d="M102.4,218.698v62.839c0,4.71,3.814,8.533,8.533,8.533s8.533-3.823,8.533-8.533v-59.733 c10.138,0,18.748-7.125,27.87-14.677c11.008-9.122,23.484-19.456,40.397-19.456s29.389,10.334,40.397,19.456 c9.122,7.552,17.732,14.677,27.87,14.677c10.138,0,18.748-7.125,27.87-14.677c11.008-9.122,23.484-19.456,40.397-19.456 c16.913,0,29.389,10.334,40.397,19.456c9.122,7.552,17.732,14.677,27.87,14.677v59.733c0,4.71,3.814,8.533,8.533,8.533 c4.719,0,8.533-3.823,8.533-8.533v-62.839c19.652-7.219,34.133-26.3,34.133-48.094c0-19.456-14.677-34.133-34.133-34.133H102.4 c-19.456,0-34.133,14.677-34.133,34.133C68.267,192.398,82.748,211.478,102.4,218.698z M102.4,153.537h307.2 c10.052,0,17.067,7.014,17.067,17.067c0,18.5-15.633,34.133-34.133,34.133c-3.994,0-10.59-5.47-16.973-10.752 c-11.913-9.873-28.228-23.381-51.294-23.381c-23.066,0-39.381,13.508-51.294,23.381 c-6.383,5.282-12.979,10.752-16.973,10.752 s-10.59-5.47-16.973-10.752c-11.913-9.873-28.228-23.381-51.294-23.381s-39.381,13.508-51.294,23.381 c-6.383,5.282-12.979,10.752-16.973,10.752c-18.5,0-34.133-15.633-34.133-34.133C85.333,160.552,92.348,153.537,102.4,153.537z"
                stroke="currentColor"
                strokeWidth="10"
                fill="none"
              />
              <path
                id="draw5"
                d="M503.467,494.87H8.533c-4.719,0-8.533,3.823-8.533,8.533s3.814,8.533,8.533,8.533h494.933 c4.719,0,8.533-3.823,8.533-8.533S508.186,494.87,503.467,494.87z"
                stroke="currentColor"
                strokeWidth="10"
                fill="none"
              />
              <path
                id="draw4"
                d="M34.133,389.364v79.906c0,4.71,3.814,8.533,8.533,8.533s8.533-3.823,8.533-8.533v-76.8 c10.138,0,18.748-7.125,27.87-14.677c11.008-9.122,23.484-19.456,40.397-19.456s29.389,10.334,40.397,19.456 c9.122,7.552,17.732,14.677,27.87,14.677c10.138,0,18.748-7.125,27.87-14.677c11.008-9.122,23.484-19.456,40.397-19.456 s29.389,10.334,40.397,19.456c9.122,7.552,17.732,14.677,27.87,14.677c10.138,0,18.748-7.125,27.87-14.677 c11.008-9.122,23.484-19.456,40.397-19.456c16.913,0,29.389,10.334,40.397,19.456c9.122,7.552,17.732,14.677,27.87,14.677v76.8 c0,4.71,3.814,8.533,8.533,8.533s8.533-3.823,8.533-8.533v-79.906c19.652-7.219,34.133-26.3,34.133-48.094 c0-19.456-14.677-34.133-34.133-34.133H34.133C14.677,307.137,0,321.814,0,341.27C0,363.065,14.481,382.145,34.133,389.364z M34.133,324.204h443.733c10.052,0,17.067,7.014,17.067,17.067c0,18.5-15.633,34.133-34.133,34.133 c-3.994,0-10.59-5.47-16.973-10.752c-11.912-9.873-28.228-23.381-51.294-23.381c-23.066,0-39.381,13.508-51.294,23.381 c-6.383,5.282-12.979,10.752-16.973,10.752s-10.59-5.47-16.973-10.752c-11.913-9.873-28.228-23.381-51.294-23.381 c-23.066,0-39.381,13.508-51.294,23.381s-39.381,13.508-51.294,23.381c-6.383,5.282-12.979,10.752-16.973,10.752 c-18.5,0-34.133-15.633-34.133-34.133C17.067,331.218,24.081,324.204,34.133,324.204z"
                stroke="currentColor"
                strokeWidth="10"
                fill="none"
              />
            </svg>
          </div>
        </div>

        <h2>When's your birthday?</h2>
        <p className="subtitle">
          You must be at least 13 years old to use Allify.
        </p>

        <form onSubmit={handleSubmit}>
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
            className="btn btn-primary full-width"
            disabled={!isValidAge || loading}
          >
            {loading ? <div className="spinner"></div> : 'Continue'}
          </button>
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
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1rem;
        }

        .cake-icon-wrapper {
            display: flex;
            justify-content: center;
            align-items: center;
            color: var(--text-muted);
            opacity: 0.8;
        }

        .cake-icon {
            width: 80px;
            height: 80px;
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

        .date-selectors {
            display: flex;
            gap: 0.75rem;
            margin-bottom: 1.5rem;
        }

        .select-group {
            flex: 1;
        }

        .custom-select {
            width: 100%;
            padding: 0.75rem;
            font-size: 0.95rem;
            border: 1px solid var(--border-color);
            border-radius: 0.75rem;
            background: var(--bg-color);
            color: var(--text-main);
            appearance: none;
            cursor: pointer;
            transition: all 0.2s;
        }

        .custom-select:focus {
            border-color: var(--primary-color);
            outline: none;
            box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
        }

        .info-text {
            font-size: 0.8rem;
            color: var(--text-muted);
            margin-bottom: 1.5rem;
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
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
        }

        .btn-primary:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
        }

        .btn-primary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            box-shadow: 0 2px 8px rgba(99, 102, 241, 0.15);
        }

        .success-message {
            margin-bottom: 1rem;
            padding: 0.75rem;
            background: rgba(16, 185, 129, 0.1);
            color: #10b981;
            border-radius: 0.5rem;
            font-size: 0.9rem;
            border: 1px solid rgba(16, 185, 129, 0.2);
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
      `}</style>
    </div>
  );
};

export default BirthdaySetup;
