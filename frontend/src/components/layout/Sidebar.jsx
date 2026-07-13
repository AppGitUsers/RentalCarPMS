import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Car, Users, UserCircle, CalendarRange, Wallet, Settings, LogOut, Fingerprint,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';
import { cn } from '../../utils/cn';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/rentals', label: 'Car Rentals', icon: CalendarRange },
  { to: '/vehicles', label: 'Owners & Cars', icon: Car },
  { to: '/customers', label: 'Customers', icon: UserCircle },
  { to: '/staff', label: 'Staff', icon: Users, adminOnly: true },
  { to: '/finance', label: 'Finance', icon: Wallet, adminOnly: true },
  { to: '/settings', label: 'Settings', icon: Settings, adminOnly: true },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { open, close } = useSidebar();
  const isAdmin = !user?.role || user?.role === 'admin';
  const visibleNav = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 w-64 flex-shrink-0 bg-navy-900 text-white flex flex-col',
        'transition-transform duration-300 ease-in-out',
        'md:sticky md:top-0 md:h-screen md:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      <div className="flex items-center gap-2.5 px-6 py-6">
        <img src="/drive_pilot_icon.jpg" alt="DrivePilot" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
        <div className="leading-tight">
          <div className="font-semibold text-[15px]">DrivePilot</div>
          <div className="text-[11px] text-navy-300">Car Rental Manager</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {visibleNav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={close}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-navy-200 hover:bg-navy-800 hover:text-white'
              )
            }
          >
            <Icon className="w-[18px] h-[18px] flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-navy-800">
        <div className="flex items-center gap-3 px-3.5 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-navy-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
            {(user?.full_name || user?.username || 'A')[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{user?.full_name || user?.username}</div>
            <div className="text-[11px] text-navy-400">Administrator</div>
          </div>
        </div>
        <a
          href="/kiosk"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-navy-300 hover:bg-navy-800 hover:text-white transition-colors mb-1"
        >
          <Fingerprint className="w-[18px] h-[18px]" />
          Staff Kiosk
        </a>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-navy-300 hover:bg-navy-800 hover:text-white transition-colors"
        >
          <LogOut className="w-[18px] h-[18px]" />
          Log Out
        </button>
      </div>
    </aside>
  );
}
