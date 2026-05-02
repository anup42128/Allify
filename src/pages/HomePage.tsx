import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { unreadNotificationCount, subscribeToNotifications } from '../lib/notificationStore';

export const HomePage = () => {
    const [unreadNotifCount, setUnreadNotifCount] = useState(unreadNotificationCount);

    useEffect(() => {
        setUnreadNotifCount(unreadNotificationCount);
        const unsubscribe = subscribeToNotifications(() => {
            setUnreadNotifCount(unreadNotificationCount);
        });
        return () => { unsubscribe(); };
    }, []);

    return (
        <div className="flex flex-col h-full bg-black relative w-full overflow-hidden pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between px-5 py-4 border-b border-zinc-900 bg-black/80 backdrop-blur-md sticky top-0 z-50">
                <span className="text-white font-black text-2xl tracking-tighter">Allify</span>
                <div className="flex gap-4">
                    <Link to="/notifications" className="relative group">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7 text-white transition-transform group-hover:scale-110">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.31 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                        </svg>
                        {unreadNotifCount > 0 && (
                            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full ring-2 ring-black">
                                {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                            </div>
                        )}
                    </Link>
                    <Link to="/settings" className="relative group flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7 text-white transition-transform group-hover:rotate-90 duration-300">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </svg>
                    </Link>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center">
                <h1 className="text-white text-3xl font-light tracking-widest opacity-50">Home Feed</h1>
            </div>
        </div>
    );
};
