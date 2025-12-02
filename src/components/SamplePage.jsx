import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const SamplePage = () => {
    const navigate = useNavigate();
    const [userName, setUserName] = useState('');

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    navigate('/');
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
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
            }
        };

        fetchUserData();
    }, [navigate]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    return (
        <div className="sample-container">
            <div className="uni-background">UNI</div>

            <div className="sample-content">
                <div className="welcome-header">
                    <h1 className="gradient-text">🎉 Welcome to Allify!</h1>
                </div>

                <div className="info-card">
                    <h2>Hello, {userName || 'Friend'}!</h2>
                    <p>You've successfully unlocked Allify. This is your dashboard where you can:</p>

                    <ul className="feature-list">
                        <li>
                            <svg className="check-icon" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Manage your profile and preferences
                        </li>
                        <li>
                            <svg className="check-icon" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Connect with other users
                        </li>
                        <li>
                            <svg className="check-icon" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Access exclusive features
                        </li>
                        <li>
                            <svg className="check-icon" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Customize your experience
                        </li>
                    </ul>
                </div>

                <div className="action-buttons">
                    <button className="btn btn-primary" onClick={() => alert('Coming soon!')}>
                        Explore Features
                    </button>
                    <button className="btn btn-secondary" onClick={handleLogout}>
                        Logout
                    </button>
                </div>
            </div>

            <style>{`
        .sample-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-color);
          background-image: radial-gradient(var(--dot-pattern-color) 1px, transparent 1px);
          background-size: 24px 24px;
          padding: 2rem;
          position: relative;
          overflow: hidden;
        }

        .uni-background {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 40vw;
          font-weight: 900;
          color: var(--text-main);
          opacity: 0.03;
          pointer-events: none;
          z-index: 0;
          white-space: nowrap;
          letter-spacing: -0.099999em;
        }

        .sample-content {
          max-width: 800px;
          width: 100%;
          position: relative;
          z-index: 1;
          animation: fadeIn 0.8s ease-out;
        }

        .welcome-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .gradient-text {
          font-size: 3rem;
          background: var(--primary-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0;
          font-weight: 800;
        }

        .info-card {
          background: var(--surface-color);
          padding: 2.5rem;
          border-radius: 1.5rem;
          box-shadow: var(--shadow-xl);
          border: 1px solid var(--border-color);
          margin-bottom: 2rem;
          backdrop-filter: blur(10px);
        }

        .info-card h2 {
          color: var(--text-main);
          margin-bottom: 1rem;
          font-size: 1.75rem;
        }

        .info-card p {
          color: var(--text-muted);
          margin-bottom: 1.5rem;
          line-height: 1.6;
        }

        .feature-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .feature-list li {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 0;
          color: var(--text-main);
          font-size: 1.05rem;
        }

        .check-icon {
          width: 24px;
          height: 24px;
          color: #10b981;
          flex-shrink: 0;
        }

        .action-buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .btn {
          padding: 1rem 2rem;
          border-radius: 0.75rem;
          font-size: 1.05rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          border: none;
          min-width: 180px;
        }

        .btn-primary {
          background: var(--primary-gradient);
          color: white;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
        }

        .btn-secondary {
          background: transparent;
          color: var(--text-main);
          border: 2px solid var(--border-color);
        }

        .btn-secondary:hover {
          background: var(--surface-color);
          border-color: var(--text-muted);
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .gradient-text {
            font-size: 2rem;
          }

          .info-card {
            padding: 1.5rem;
          }

          .action-buttons {
            flex-direction: column;
          }

          .btn {
            width: 100%;
          }
        }
      `}</style>
        </div>
    );
};

export default SamplePage;
