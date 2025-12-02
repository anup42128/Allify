import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const AuthCallback = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const handleCallback = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    navigate('/', { replace: true });
                    return;
                }

                // Check user profile status
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('username, birthday')
                    .eq('id', user.id)
                    .single();

                if (error && error.code !== 'PGRST116') {
                    console.error('Error fetching profile:', error);
                }

                if (profile?.username) {
                    if (profile.birthday) {
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

                        // 5 second delay for smooth transition
                        await new Promise(resolve => setTimeout(resolve, 2500));
                        navigate('/welcome', { replace: true });
                    } else {
                        navigate('/birthday-setup', { replace: true });
                    }
                } else {
                    // No username, go to setup
                    if (window.innerWidth <= 768) {
                        navigate('/m-username-setup', { replace: true });
                    } else {
                        navigate('/username-setup', { replace: true });
                    }
                }
            } catch (err) {
                console.error('Error in auth callback:', err);
                navigate('/', { replace: true });
            }
        };

        handleCallback();
    }, [navigate]);

    // Render a minimal loading state (or nothing) to avoid flash
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-color)',
            backgroundImage: 'radial-gradient(var(--dot-pattern-color) 1px, transparent 1px)',
            backgroundSize: '24px 24px'
        }}>
            <div className="spinner"></div>
        </div>
    );
};

export default AuthCallback;
