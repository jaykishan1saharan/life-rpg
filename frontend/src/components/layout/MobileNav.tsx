'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigation = [
  {
    label: 'Home',
    href: '/dashboard',
    icon: '🏠',
  },
  {
    label: 'Quests',
    href: '/quests',
    icon: '⚔️',
  },
  {
    label: 'Hero',
    href: '/character',
    icon: '🧙',
  },
  {
    label: 'Water',
    href: '/hydration',
    icon: '💧',
  },
  {
    label: 'Shop',
    href: '/shop',
    icon: '🛒',
  },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#07070d]/95 px-1 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {navigation.map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 transition ${
                active
                  ? 'text-cyan-300'
                  : 'text-gray-600'
              }`}
            >
              {active && (
                <span className="absolute -top-2 h-0.5 w-8 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
              )}

              <span
                className={`text-xl transition-transform ${
                  active
                    ? 'scale-110'
                    : ''
                }`}
              >
                {item.icon}
              </span>

              <span className="text-[8px] font-bold tracking-wider sm:text-[9px]">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}