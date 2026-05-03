import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../shared/components/Sidebar';
import { supabase } from '../lib/supabase';
import { initGlobalChatSync } from '../lib/chatStore';
import { initGlobalNotificationSync } from '../lib/notificationStore';
import { initGlobalPresenceSync } from '../lib/presenceStore';
import { SplashScreen } from '../components/ui/SplashScreen';

export const MainLayout = () => {
    const [isMobileChatActive, setIsMobileChatActive] = useState(false);
    const [isAppReady, setIsAppReady] = useState(false);

    useEffect(() => {
        const initializeApp = async () => {
            // Ensure the splash screen is visible long enough to play its animation and feel deliberate (2 seconds)
            const minDisplayPromise = new Promise(resolve => setTimeout(resolve, 2000));
            
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
