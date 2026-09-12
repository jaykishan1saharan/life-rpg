'use client';

import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

interface AppShellProps {
    children: React.ReactNode;
    gold: number;
    streak: number;
}

export default function AppShell({
    children,
    gold,
    streak,
}: AppShellProps) {
    return (
        <div className="min-h-screen bg-[#050509]">
            <Sidebar
                gold={gold}
                streak={streak}
            />

            <div className="lg:pl-64">
                {children}
            </div>

            <MobileNav />
        </div>
    );
}