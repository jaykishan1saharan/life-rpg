'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  gold: number;
  streak: number;
}

const navigation = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: '◈',
  },
  {
    label: 'Quests',
    href: '/quests',
    icon: '⚔️',
  },
  {
    label: 'Character',
    href: '/character',
    icon: '🧙',
  },
  {
    label: 'Reward Shop',
    href: '/shop',
    icon: '🛒',
  },
  {
    label: 'Inventory',
    href: '/inventory',
    icon: '🎒',
  },
];

export default function Sidebar({
  gold,
  streak,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r border-white/10 bg-[#07070d]/95 px-4 py-6 backdrop-blur-xl lg:flex lg:flex-col">

      {/* LOGO */}
      <Link
        href="/dashboard"
        className="mb-8 flex items-center gap-3 px-3"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-xl">
          ⚔️
        </div>

        <div>
          <h1 className="text-sm font-black tracking-[0.25em]">
            LIFE RPG
          </h1>

          <p className="mt-1 text-[9px] tracking-[0.25em] text-cyan-400">
            REAL LIFE • REAL XP
          </p>
        </div>
      </Link>


      {/* NAVIGATION */}
      <nav className="space-y-1">
        <p className="mb-3 px-3 text-[9px] font-bold tracking-[0.3em] text-gray-600">
          ADVENTURE
        </p>

        {navigation.map((item) => {
          const active =
            pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-3 transition-all ${
                active
                  ? 'border border-cyan-400/20 bg-cyan-400/10 text-cyan-300 shadow-[0_0_25px_rgba(34,211,238,0.08)]'
                  : 'border border-transparent text-gray-500 hover:bg-white/[0.04] hover:text-gray-200'
              }`}
            >
              {active && (
                <span className="absolute left-0 h-5 w-0.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
              )}

              <span className="w-6 text-center text-base">
                {item.icon}
              </span>

              <span className="text-sm font-semibold">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* SPACER */}
      <div className="flex-1" />

      {/* RESOURCES */}
      <div className="mb-5 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-yellow-400/10 bg-yellow-400/[0.03] p-3">
          <p className="text-[9px] tracking-wider text-gray-600">
            GOLD
          </p>

          <p className="mt-1 text-sm font-black text-yellow-300">
            🪙 {gold}
          </p>
        </div>

        <div className="rounded-xl border border-orange-400/10 bg-orange-400/[0.03] p-3">
          <p className="text-[9px] tracking-wider text-gray-600">
            STREAK
          </p>

          <p className="mt-1 text-sm font-black text-orange-300">
            🔥 {streak}
          </p>
        </div>
      </div>

      {/* SETTINGS */}
      <Link
        href="/settings"
        className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-gray-600 transition hover:bg-white/[0.04] hover:text-gray-300"
      >
        <span className="w-6 text-center">
          ⚙️
        </span>

        Settings
      </Link>
    </aside>
  );
}