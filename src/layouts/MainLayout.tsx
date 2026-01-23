import { Outlet } from 'react-router-dom';
import { Sidebar } from '../shared/components/Sidebar';

export const MainLayout = () => {
    return (
        <div className="relative h-screen w-screen bg-black overflow-hidden flex font-sans">
            {/* Fixed Sidebar */}
            <Sidebar />

            {/* Main Content Area - renders child routes */}
            <main className="flex-1 ml-20 transition-all duration-300 h-full overflow-y-auto bg-black">
                <Outlet />
            </main>
        </div>
    );
};
