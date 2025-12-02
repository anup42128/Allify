import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

const MWelcomePage = () => {
  const navigate = useNavigate();
  const [isUnlocked, setIsUnlocked] = useState(false);

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
      } catch (error) {
        console.error('Error fetching user data:', error);
        navigate('/');
      }
    };

    fetchUserData();
  }, [navigate]);

  // Prevent scrolling except when at top (for pull-to-refresh)
  useEffect(() => {
    const container = document.querySelector('.mobile-welcome');
    if (!container) return;

    let touchStartY = 0;

    const handleTouchStart = (e) => {
      touchStartY = e.touches[0].clientY;
    };

    // Prevent scroll unless at top
    const handleTouchMove = (e) => {
      const scrollTop = container.scrollTop;
      const touchCurrentY = e.touches[0].clientY;
      const touchDelta = touchCurrentY - touchStartY;

      // Allow pull-to-refresh (pulling down when at top)
      if (scrollTop === 0 && touchDelta > 0) {
        return; // Pulling down from top
      }

      // Prevent all other scrolling
      e.preventDefault();
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  const handleUnlock = () => {
    setIsUnlocked(true);
    // Navigate to sample page after unlock animation
    setTimeout(() => {
      navigate('/sample');
    }, 2000);
  };

  return (
    <div className="mobile-welcome">
      <div className="welcome-content">
        {/* Hero Section */}
        <div className="hero-section">
          <p className="tagline">
            Inspired to connect, not divide.<br />
            When people matter, we unite
          </p>
          <p className="uni-initiative">A UNI initiative</p>
        </div>

        {/* Welcome Message */}
        <div className="welcome-section">
          <h2 className="welcome-title">Welcome to Allify</h2>
          <p className="welcome-description">
            Allify is a social space for real people. No labels. No fights. Just connection.
          </p>
        </div>

        {/* Instructions */}
        <div className="instructions-section">
          <h3 className="instructions-title">Start Connecting</h3>
          <div className="instruction-list">
            <div className="instruction-item">
              <div className="instruction-bullet">•</div>
              <p className="instruction-text">Discover People, not profiles.</p>
            </div>
            <div className="instruction-item">
              <div className="instruction-bullet">•</div>
              <p className="instruction-text">Share what you think, not who you're told to be.</p>
            </div>
            <div className="instruction-item">
              <div className="instruction-bullet">•</div>
              <p className="instruction-text">Connect beyond religion, caste, or status.</p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="button-container">
          <button
            className="enter-btn"
            onClick={handleUnlock}
            disabled={isUnlocked}
          >
            {isUnlocked ? (
              <span>
                Entering
                <span className="loading-dots">
                  <span className="dot">.</span>
                  <span className="dot">.</span>
                  <span className="dot">.</span>
                </span>
              </span>
            ) : (
              <span>Enter Allify</span>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        .mobile-welcome {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100dvh;
          background: var(--bg-color);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1.5rem;
          overflow-y: auto;
        }

        .welcome-content {
          width: 100%;
          max-width: 500px;
          display: flex;
          flex-direction: column;
          gap: 2rem;
          animation: fadeInUp 0.6s ease-out;
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

        /* Hero Section */
        .hero-section {
          text-align: center;
          padding-bottom: 1.25rem;
          border-bottom: 1px solid var(--border-color);
        }

        .tagline {
          font-family: 'Inter', sans-serif;
          font-size: 1.1rem;
          line-height: 1.6;
          color: var(--text-secondary);
          margin: 0 0 0.75rem 0;
          font-weight: 600;
        }

        .uni-initiative {
          font-family: 'Inter', sans-serif;
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin: 0;
          font-weight: 500;
          opacity: 0.7;
        }

        /* Welcome Section */
        .welcome-section {
          text-align: center;
        }

        .welcome-title {
          font-family: 'Inter', sans-serif;
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--text-color);
          margin: 0 0 0.875rem 0;
          letter-spacing: -0.01em;
        }

        .welcome-description {
          font-family: 'Inter', sans-serif;
          font-size: 1rem;
          line-height: 1.6;
          color: var(--text-secondary);
          margin: 0;
          font-weight: 400;
        }

        /* Instructions Section */
        .instructions-section {
          background: var(--card-bg);
          border-radius: 1rem;
          padding: 1.5rem;
          border: 1px solid var(--border-color);
        }

        .instructions-title {
          font-family: 'Inter', sans-serif;
          font-size: 1.3rem;
          font-weight: 700;
          color: var(--text-color);
          margin: 0 0 1.25rem 0;
          text-align: center;
        }

        .instruction-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .instruction-item {
          display: flex;
          align-items: flex-start;
          gap: 0.875rem;
        }

        .instruction-bullet {
          flex-shrink: 0;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--primary-gradient);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Inter', sans-serif;
          font-size: 1.4rem;
          font-weight: 700;
          line-height: 1;
        }

        .instruction-text {
          font-family: 'Inter', sans-serif;
          font-size: 0.95rem;
          line-height: 1.6;
          color: var(--text-secondary);
          margin: 0;
          padding-top: 0.25rem;
          font-weight: 500;
        }

        /* Button Container */
        .button-container {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          padding-top: 0.5rem;
        }

        .enter-btn {
          width: 100%;
          max-width: 320px;
          padding: 1rem 1.5rem;
          font-family: 'Inter', sans-serif;
          font-size: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          background: var(--primary-gradient);
          border: none;
          color: white;
          font-weight: 600;
          border-radius: 0.75rem;
          box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
          outline: none;
          -webkit-tap-highlight-color: transparent;
        }

        .enter-btn:active:not(:disabled) {
          transform: scale(0.98);
        }

        .enter-btn:disabled {
          cursor: not-allowed;
          opacity: 0.8;
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

        /* Responsive adjustments for smaller screens */
        @media (max-height: 700px) {
          .mobile-welcome {
            padding: 1.5rem 1.25rem;
          }

          .welcome-content {
            gap: 1.5rem;
          }

          .tagline {
            font-size: 1rem;
          }

          .welcome-title {
            font-size: 1.5rem;
          }

          .welcome-description {
            font-size: 0.9rem;
          }
          
          .instructions-section {
            padding: 1.25rem;
          }

          .instructions-title {
            font-size: 1.15rem;
            margin-bottom: 1rem;
          }

          .instruction-list {
            gap: 0.875rem;
          }

          .instruction-bullet {
            width: 30px;
            height: 30px;
            font-size: 1.3rem;
          }

          .instruction-text {
            font-size: 0.875rem;
          }

          .enter-btn {
            padding: 0.875rem 1.5rem;
            font-size: 0.95rem;
          }
        }

        @media (max-height: 600px) {
          .mobile-welcome {
            padding: 1.25rem 1rem;
          }

          .welcome-content {
            gap: 1.25rem;
          }

          .hero-section {
            padding-bottom: 1rem;
          }

          .tagline {
            font-size: 0.95rem;
            line-height: 1.5;
          }

          .uni-initiative {
            font-size: 0.75rem;
          }

          .welcome-title {
            font-size: 1.35rem;
            margin-bottom: 0.75rem;
          }

          .welcome-description {
            font-size: 0.85rem;
            line-height: 1.5;
          }

          .instructions-section {
            padding: 1rem;
          }

          .instructions-title {
            font-size: 1.05rem;
            margin-bottom: 0.875rem;
          }

          .instruction-list {
            gap: 0.75rem;
          }

          .instruction-bullet {
            width: 28px;
            height: 28px;
            font-size: 1.2rem;
          }

          .instruction-text {
            font-size: 0.8rem;
            line-height: 1.5;
          }

          .enter-btn {
            padding: 0.8rem 1.25rem;
            font-size: 0.9rem;
            max-width: 300px;
          }
        }
      `}</style>
    </div>
  );
};

export default MWelcomePage;
