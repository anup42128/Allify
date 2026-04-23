import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../shared/components/Sidebar';
import { supabase } from '../lib/supabase';
import { initGlobalChatSync } from '../lib/chatStore';
import { initGlobalNotificationSync } from '../lib/notificationStore';
import { initGlobalPresenceSync } from '../lib/presenceStore';

export const MainLayout = () => {
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data?.user) {
                initGlobalChatSync(data.user.id);
                initGlobalNotificationSync(data.user.id);
                initGlobalPresenceSync(data.user.id);
            }
        });
    }, []);

    return (
        <div className="relative h-screen w-screen bg-black overflow-hidden flex font-sans">
            {/* Fixed Sidebar */}
            <Sidebar />

            {/* Main Content Area - renders child routes */}
            <main className="flex-1 ml-20 transition-all duration-300 h-full overflow-y-auto custom-scrollbar bg-black">
                <Outlet />
            </main>
        </div>
    );
};
