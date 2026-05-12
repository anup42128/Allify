import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../shared/components/Sidebar';
import { supabase } from '../lib/supabase';
import { initGlobalChatSync, fetchGlobalConversations, activeSyncUserId } from '../lib/chatStore';
import { initGlobalNotificationSync } from '../lib/notificationStore';
import { initGlobalPresenceSync } from '../lib/presenceStore';
import { SplashScreen } from '../components/ui/SplashScreen';

// Track if the splash screen has been shown in the current browser session
let hasShownSplash = false;

export const MainLayout = () => {
    const [isMobileChatActive, setIsMobileChatActive] = useState(false);
    // If it has been shown once, don't show it again until refresh
    const [isAppReady, setIsAppReady] = useState(hasShownSplash);

    useEffect(() => {
        const initializeApp = async () => {
            // If we've already shown the splash, we still need to fetch data
            // but we can do it without the 2-second delay
            const minDisplayPromise = hasShownSplash 
                ? Promise.resolve() 
                : new Promise(resolve => setTimeout(resolve, 2000));
            
            try {
                const { data } = await supabase.auth.getUser();
                if (data?.user) {
                    // Block UI rendering until ALL critical background data is perfectly fetched
                    await Promise.all([
                        initGlobalChatSync(data.user.id),
                        initGlobalNotificationSync(data.user.id),
                        minDisplayPromise
                    ]);
                    initGlobalPresenceSync(data.user.id);
                } else {
                    // Not logged in, still wait minimum time to prevent flashing
                    await minDisplayPromise;
                }
            } catch (error) {
                console.error("[MainLayout] Initialization failed:", error);
            } finally {
                setIsAppReady(true);
                hasShownSplash = true;
            }
        };

        initializeApp();
    }, []);

    useEffect(() => {
        const handleChatActive = (e: Event) => {
            const customEvent = e as CustomEvent<boolean>;
            setIsMobileChatActive(customEvent.detail);
        };
        window.addEventListener('chat-active', handleChatActive);
        return () => window.removeEventListener('chat-active', handleChatActive);
    }, []);

    // Crucial for mobile: Re-sync completely when app comes back from background
    // WebSockets drop when mobile browsers sleep. This catches missed messages instantly!
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && activeSyncUserId) {
                fetchGlobalConversations(activeSyncUserId);
                initGlobalNotificationSync(activeSyncUserId);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    return (
        <>
            <SplashScreen isVisible={!isAppReady} />
            <div className={`relative h-[100dvh] w-full md:h-screen md:w-screen bg-black overflow-hidden flex font-sans ${!isAppReady ? 'opacity-0' : 'opacity-100'}`}>
                {/* Fixed Navigation */}
                <Sidebar />

                {/* Main Content Area - renders child routes */}
                <main className={`flex-1 md:ml-20 w-full md:transition-all md:duration-300 h-full overflow-y-auto custom-scrollbar bg-black md:pb-0 ${isMobileChatActive ? 'pb-[env(safe-area-inset-bottom)]' : 'pb-[calc(3.5rem+env(safe-area-inset-bottom))]'}`}>
                    <Outlet />
                </main>
            </div>
        </>
    );
};
