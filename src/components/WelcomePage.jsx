import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import MWelcomePage from './views/MWelcomePage';

const WelcomePage = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [showNamaste, setShowNamaste] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showAllify, setShowAllify] = useState(false);
  const [showName, setShowName] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isMobile) {
    return <MWelcomePage />;
  }

  // Preload font for smooth animations
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.href = 'https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap';
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          navigate('/');
          return;
        }

        // Check if email is verified
        if (!user.email_confirmed_at) {
          console.log('Email not verified, redirecting to confirmation...');
          navigate('/confirmation', { state: { email: user.email }, replace: true });
          return;
        }

        // Get user's username from profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();

        if (profile?.username) {
          setUserName(profile.username);
        } else {
          setUserName('Friend');
        }

        // Namaste SVG drawing animation
        setTimeout(() => {
          setShowNamaste(false);
          setShowWelcome(true);
          setShowAllify(true);
        }, 2700);
      } catch (error) {
        console.error('Error fetching user data:', error);
        navigate('/');
      }
    };

    fetchUserData();
  }, [navigate]);

  // Trigger name animation and button after Allify appears
  useEffect(() => {
    if (showAllify) {
      setTimeout(() => setShowName(true), 1000);
      setTimeout(() => setShowButton(true), 2900); // Reduced delay
    }
  }, [showAllify]);

  const handleUnlock = () => {
    setIsUnlocked(true);
    // Navigate to sample page after unlock animation
    setTimeout(() => {
      navigate('/sample');
    }, 5000);
  };

  return (
    <div className="welcome-container">
      <div className="uni-background">UNI</div>
      {showNamaste && (
        <div className="namaste-screen">
          <svg viewBox="0 0 1200 500" className="namaste-svg" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style={{ stopColor: '#6366f1' }} />
                <stop offset="50%" style={{ stopColor: '#a855f7' }} />
                <stop offset="100%" style={{ stopColor: '#ec4899' }} />
              </linearGradient>
            </defs>

            <text
              x="50%"
              y="50%"
              dominantBaseline="middle"
              textAnchor="middle"
              fontFamily="Great Vibes, cursive"
              fontSize="180"
              fill="none"
              stroke="url(#textGradient)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="namaste-text-path"
            >
              Namaste
            </text>
          </svg>
        </div>
      )}

      {!showNamaste && (
        <div className="welcome-content">
          <div className="welcome-header">
            {showWelcome && (
              <div className="welcome-message">
                Welcome to
              </div>
            )}

            {showAllify && (
              <div className="logo-text">
                Allify
              </div>
            )}
          </div>

          {showName && (
            <div className="name-container">
              <svg viewBox="0 0 5000 500" className="name-svg" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="nameGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style={{ stopColor: '#6366f1' }} />
                    <stop offset="50%" style={{ stopColor: '#a855f7' }} />
                    <stop offset="100%" style={{ stopColor: '#ec4899' }} />
                  </linearGradient>
                </defs>

                <text
                  x="50%"
                  y="50%"
                  dominantBaseline="middle"
                  textAnchor="middle"
                  fontFamily="Great Vibes, cursive"
                  fontSize={userName.length > 15 ? "200" : userName.length > 10 ? "230" : "270"}
                  fill="none"
                  stroke="url(#nameGradient)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="name-text-path"
                >
                  {userName}
                </text>
              </svg>
            </div>
          )}


          {showButton && (
            <div className="button-container">
              <button
                className="btn btn-primary unlock-btn"
                onClick={handleUnlock}
                disabled={isUnlocked}
              >
                {isUnlocked ? (
                  <svg className="unlock-icon" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 8V6a6 6 0 1 1 12 0h-3v2h4a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-8c0-1.1.9-2 2-2h1zm5 6.73V17h2v-2.27a2 2 0 1 0-2 0zM7 6v2h6V6a3 3 0 0 0-6 0z"></path>
                  </svg>
                ) : (
                  <svg className="lock-icon" fill="currentColor" viewBox="0 0 114.872 114.872" xmlns="http://www.w3.org/2000/svg">
                    <path d="M97.856,49.821c0.426-2.44,0.661-4.95,0.661-7.516C98.517,18.979,80.088,0,57.436,0C34.783,0,16.353,18.979,16.353,42.305 c0,2.566,0.236,5.074,0.663,7.516c-3.567,2.278-5.939,6.261-5.939,10.81v41.415c0,7.084,5.743,12.826,12.825,12.826h67.067 c7.08,0,12.822-5.742,12.822-12.826h0.004V60.631C103.795,56.083,101.425,52.099,97.856,49.821z M63.095,85.983v9 c0,3.128-2.534,5.662-5.661,5.662c-3.127,0-5.661-2.534-5.661-5.662v-9.004c-3.631-2.001-6.094-5.862-6.094-10.302 c0-6.492,5.263-11.756,11.757-11.756s11.758,5.264,11.758,11.756C69.194,80.119,66.729,83.983,63.095,85.983z M82.886,47.804 H31.985c-0.349-1.775-0.535-3.616-0.535-5.499c0-15.003,11.657-27.208,25.986-27.208c14.328,0,25.984,12.204,25.984,27.208 C83.42,44.188,83.236,46.029,82.886,47.804z"></path>
                  </svg>
                )}
                <span>
                  {isUnlocked ? (
                    <>
                      Unlocking
                      <span className="loading-dots">
                        <span className="dot">.</span>
                        <span className="dot">.</span>
                        <span className="dot">.</span>
                      </span>
                    </>
                  ) : (
                    'Unlock Allify'
                  )}
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');

        .welcome-container {
          min-height: 100vh;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 4rem;
          background: var(--bg-color);
          background-image: radial-gradient(var(--border-color) 1px, transparent 1px);
          background-size: 24px 24px;
          padding-left: 2rem;
          padding-right: 2rem;
          position: relative;
          overflow: hidden;
        }

        .namaste-screen {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-color);
          z-index: 1000;
        }

        .namaste-svg {
          width: 90%;
          max-width: 1200px;
          height: auto;
        }

        .namaste-text-path {
          stroke-dasharray: 3000;
          stroke-dashoffset: 3000;
          animation: drawText 3s ease-in-out forwards;
        }

        @keyframes drawText {
          to {
            stroke-dashoffset: 0;
          }
        }

        .uni-background {
          position: absolute;
          top: 35%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 35vw;
          font-weight: 900;
          color: var(--text-main);
          opacity: 0.0066;
          pointer-events: none;
          z-index: 0;
          user-select: none;
          line-height: 1;
          white-space: nowrap;
          letter-spacing: -0.099999em;
        }

        .welcome-content {
          text-align: center;
          max-width: 100%;
          width: 100%;
          position: relative;
          z-index: 1;
        }

        .welcome-header {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 1.5rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }

        .welcome-message {
          font-family: 'Great Vibes', cursive;
          font-size: 7rem;
          background: var(--primary-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0;
          padding: 1rem 0.5rem; /* Add top/bottom padding to prevent clipping */
          opacity: 0;
          animation: fadeIn 1.5s ease-out forwards;
          will-change: opacity;
          transform: translateZ(0);
          line-height: 1.2; /* Increase line-height slightly */
        }

        .logo-text {
          font-size: 4rem;
          margin: 0;
          padding: 0 1rem; /* Add padding to prevent clipping */
          opacity: 0;
          animation: fadeIn 1.5s ease-out forwards;
          will-change: opacity;
          transform: translateZ(0);
          font-weight: 800;
          background: var(--primary-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .name-container {
          margin: 1rem 0;
          min-height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          width: 100%;
        }

        .name-svg {
          width: 100%;
          max-width: 100vw;
          height: auto;
        }

        .name-text-path {
          stroke-dasharray: 3000;
          stroke-dashoffset: 3000;
          animation: drawText 3s ease-in-out forwards;
          will-change: stroke-dashoffset;
        }

        .button-container {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
        }

        .unlock-btn {
          margin-top: 1rem;
          min-width: 280px;
          padding: 1rem 2rem;
          font-size: 1.1rem;
          animation: fadeIn 1s ease-out forwards;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          cursor: pointer;
          transition: all 0.3s ease;
          background: var(--primary-gradient);
          border: none;
          color: white;
          font-weight: 600;
        }

        .unlock-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 13px rgba(99, 102, 241, 0.25);
        }

        .unlock-btn:disabled {
          cursor: not-allowed;
          animation: pulse 1.5s ease-in-out infinite;
        }

        .lock-icon,
        .unlock-icon {
          width: 24px;
          height: 24px;
          transition: all 0.5s ease;
        }

        .unlock-btn:hover:not(:disabled) .lock-icon {
          animation: shake 0.5s ease;
        }

        /* Lock icon bounce on initial appearance */
        .lock-icon {
          animation: bounceIn 0.6s ease-out;
        }

        @keyframes shake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-10deg); }
          75% { transform: rotate(10deg); }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { 
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
            transform: scale(1);
          }
          50% { 
            box-shadow: 0 6px 18px rgba(99, 102, 241, 0.35);
            transform: scale(1.01);
          }
        }

        @keyframes bounceIn {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          50% {
            opacity: 1;
            transform: scale(1.1);
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            transform: scale(1);
          }
        }

        .loading-dots {
          display: inline-block;
          margin-left: 2px;
        }

        .loading-dots .dot {
          animation: dotPulse 1.4s ease-in-out infinite;
          opacity: 0;
        }

        .loading-dots .dot:nth-child(1) {
          animation-delay: 0s;
        }

        .loading-dots .dot:nth-child(2) {
          animation-delay: 0.2s;
        }

        .loading-dots .dot:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes dotPulse {
          0%, 60%, 100% {
            opacity: 0;
          }
          30% {
            opacity: 1;
          }
        }


        /* Responsive */
        @media (max-width: 768px) {
          .welcome-container {
            padding-top: 6rem;
          }

          .namaste-svg {
            width: 95%;
          }

          .welcome-message {
            font-size: 3.5rem;
          }

          .logo-text {
            font-size: 3rem;
          }

          .continue-btn {
            min-width: 200px;
            padding: 0.875rem 1.5rem;
            font-size: 1rem;
          }
        }

        @media (max-width: 480px) {
          .welcome-container {
            padding-top: 4rem;
          }

          .welcome-message {
            font-size: 2.5rem;
          }

          .logo-text {
            font-size: 2.5rem;
          }

          .name-container {
            margin: 3rem 0;
            min-height: 150px;
          }
        }
      `}</style>
    </div>
  );
};

export default WelcomePage;
