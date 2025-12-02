import React, { useState, useEffect } from 'react';
import AuthForm from './AuthForm';
import MlandingPage from './views/MlandingPage';

const LandingPage = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isMobile) {
    return <MlandingPage />;
  }

  return (
    <div className="landing-page">
      <div className="uni-background">UNI</div>
      <div className="container landing-container">
        {/* Left Side: Hero / Visuals */}
        <div className="hero-section">
          <h1 className="hero-title">
            Connect with <span className="highlight">Everyone</span>,<br />
            Everywhere.
          </h1>
          <p className="hero-subtitle">
            Share your moments, connect with friends, and discover the world through Allify.
            The social platform designed for the next generation.
          </p>

          <div className="hero-visuals">
            <div className="phone-mockup">
              <div className="screen-content">
                <div className="chat-bubble bubble-1">Hey! Have you seen Allify? 🚀</div>
                <div className="chat-bubble bubble-2">Yeah! The UI is insane! ✨</div>
                <div className="chat-bubble bubble-3">Joining right now...</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="auth-section">
          <AuthForm />
        </div>
      </div>

      <style>{`
        .landing-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          background: radial-gradient(circle at bottom right, rgba(236, 72, 153, 0.1) 0%, transparent 40%);
          position: relative;
          overflow: hidden;
        }

        .uni-background {
          position: absolute;
          top: 35%;
          left: 29%;
          transform: translate(-50%, -50%);
          font-size: 35vw;
          font-weight: 900;
          color: var(--text-main);
          opacity: 0.02;
          pointer-events: none;
          z-index: 0;
          user-select: none;
          line-height: 1;
          white-space: nowrap;
          letter-spacing: -0.099999em;
        }

        @media (prefers-color-scheme: dark) {
          .landing-page {
            background: radial-gradient(circle at bottom right, rgba(236, 72, 153, 0.15) 0%, transparent 50%);
          }
        }

        .landing-container {
          display: grid;
          grid-template-columns: 5fr 3fr;
          gap: 4rem;
          align-items: flex-start;
          padding: 2rem;
          padding-top: 4rem;
          position: relative;
          z-index: 1;
        }

        .auth-section {
          padding-top: 2rem;
        }

        /* Hero Section */
        .hero-title {
          font-size: 4rem;
          font-weight: 800;
          line-height: 1.1;
          margin-bottom: 1.5rem;
          letter-spacing: -0.03em;
        }

        .highlight {
          background: var(--primary-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-subtitle {
          font-size: 1.25rem;
          color: var(--text-muted);
          max-width: 500px;
          margin-bottom: 3rem;
          line-height: 1.6;
        }

        /* Visuals / Phone Mockup */
        .hero-visuals {
          position: relative;
          height: 400px;
          display: flex;
          align-items: center;
        }

        .phone-mockup {
          width: 280px;
          height: 500px;
          background: var(--surface-color);
          border-radius: 2rem;
          border: 8px solid var(--text-main);
          box-shadow: var(--shadow-xl);
          position: absolute;
          left: 0;
          top: 0;
          overflow: hidden;
          transform: rotate(-5deg) translateY(-40px);
          transition: transform 0.5s ease;
          will-change: transform;
        }

        .phone-mockup:hover {
          transform: rotate(0deg) translateY(-50px);
        }

        .screen-content {
          padding: 1.5rem;
          height: 100%;
          background: linear-gradient(180deg, var(--bg-color) 0%, #f3f4f6 100%);
          display: flex;
          flex-direction: column;
          gap: 1rem;
          justify-content: center;
        }

        @media (prefers-color-scheme: dark) {
          .phone-mockup {
            border-color: #3f3f46;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          }
          
          .screen-content {
            background: linear-gradient(180deg, #1d1d26ff 0%, #09090b 100%);
          }
        }

        .chat-bubble {
          padding: 0.75rem 1rem;
          border-radius: 1rem;
          font-size: 0.9rem;
          max-width: 85%;
          box-shadow: var(--shadow-sm);
          animation: float 3s ease-in-out infinite;
        }

        .bubble-1 {
          background: var(--surface-color);
          border-bottom-left-radius: 0.25rem;
          align-self: flex-start;
        }

        .bubble-2 {
          background: var(--primary-color);
          color: white;
          border-bottom-right-radius: 0.25rem;
          align-self: flex-end;
          animation-delay: 1s;
        }

        .bubble-3 {
          background: var(--surface-color);
          border-bottom-left-radius: 0.25rem;
          align-self: flex-start;
          animation-delay: 2s;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }

        /* Auth Section */
        .auth-section {
          display: flex;
          justify-content: center;
        }

        /* Responsive Design */
        
        /* Mobile - Small screens */
        @media (max-width: 768px) {
          .landing-container {
            grid-template-columns: 1fr;
            text-align: center;
            gap: 2rem;
            padding: 0.5rem;
            padding-top: 2rem;
          }

          .hero-title {
            font-size: 2.5rem;
          }

          .hero-subtitle {
            font-size: 1rem;
            margin: 0 auto 2rem;
          }

          .hero-visuals {
            display: none;
          }

          .auth-section {
            width: 100%;
            padding-top: 0;
          }

          .uni-background {
            font-size: 40vw;
            left: 50%;
          }
        }

        /* Tablets - Portrait (768x1024, similar) */
        @media (min-width: 768px) and (max-width: 1024px) {
          .landing-container {
            grid-template-columns: 1fr;
            gap: 2rem;
            padding: 2rem 1.5rem;
            padding-top: 3rem;
          }

          .hero-section {
            text-align: center;
            max-width: 600px;
            margin: 0 auto;
          }

          .hero-title {
            font-size: 3rem;
            margin-bottom: 1rem;
          }

          .hero-subtitle {
            font-size: 1.1rem;
            margin: 0 auto 2rem;
            max-width: 500px;
          }

          .hero-visuals {
            max-width: 300px;
            margin: 0 auto;
          }

          .phone-mockup {
            width: 280px;
            height: 560px;
          }

          .auth-section {
            width: 100%;
            max-width: 450px;
            margin: 0 auto;
            padding-top: 1rem;
          }

          .uni-background {
            font-size: 30vw;
            left: 50%;
            top: 15%;
          }
        }

        /* Tablets - Landscape (1024x768, 1280x800) */
        @media (min-width: 1024px) and (max-width: 1366px) {
          .landing-container {
            grid-template-columns: 1.2fr 1fr;
            gap: 2.5rem;
            padding: 2rem;
            padding-top: 3rem;
          }

          .hero-title {
            font-size: 3.2rem;
          }

          .hero-subtitle {
            font-size: 1.1rem;
          }

          .phone-mockup {
            width: 280px;
            height: 488px;
            top : 10px;
          }

          .uni-background {
            font-size: 32vw;
            left: 27%;
          }
        }

        /* Extra Large Tablets (1920px-2559px - iPad Pro 12.9" and similar) */
        @media (min-width: 1920px) and (max-width: 2559px) {
          .landing-container {
            max-width: 1600px;
            margin: 0 auto;
            grid-template-columns: 6fr 4fr;
            gap: 4rem;
            padding: 2rem;
            padding-top: 5rem;
          }

          .hero-title {
            font-size: 5rem;
          }

          .hero-subtitle {
            font-size: 2rem;
            max-width: 500px;
          }

          .hero-visuals {
            max-width: 400px;
          }

          .phone-mockup {
            width: 340px;
            height: 680px;
          }

          .auth-section {
            padding-top: 4rem;
            width : 80%;
          }

          .uni-background {
            font-size: 35vw;
            left: 29%;
          }
        }

        /* 2560 x 1600 Tablet (MacBook Pro 13", Surface Book, etc.) */
        @media (min-width: 2560px) and (max-height: 1600px) {
          .landing-container {
            max-width: 2000px;
            margin: 0 auto;
            grid-template-columns: 1.4fr 1fr;
            gap: 6rem;
            padding: 3rem 6rem;
            padding-top: 6rem;
          }

          .hero-section {
            display: flex;
            flex-direction: column;
            justify-content: center;
          }

          .hero-title {
            font-size: 6rem;
            margin-bottom: 2rem;
          }

          .hero-subtitle {
            font-size: 1.5rem;
            max-width: 650px;
            margin-bottom: 4rem;
          }

          .hero-visuals {
            height: 500px;
            max-width: 500px;
          }

          .phone-mockup {
            width: 380px;
            height: 760px;
            transform: rotate(-5deg) translateY(-60px);
          }

          .phone-mockup:hover {
            transform: rotate(0deg) translateY(-70px);
          }

          .chat-bubble {
            padding: 1rem 1.25rem;
            font-size: 1.1rem;
          }

          .auth-section {
            padding-top: 5rem;
            width: 90%;
            max-width: 550px;
          }

          .uni-background {
            font-size: 28vw;
            left: 28%;
            top: 38%;
          }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;