import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Car, Users, UserCircle, CalendarRange, Wallet, Settings, LogOut, CarFront, Fingerprint,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/cn';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/rentals', label: 'Car Rentals', icon: CalendarRange },
  { to: '/vehicles', label: 'Owners & Cars', icon: Car },
  { to: '/customers', label: 'Customers', icon: UserCircle },
  { to: '/staff', label: 'Staff', icon: Users },
  { to: '/finance', label: 'Finance', icon: Wallet },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 flex-shrink-0 bg-navy-900 text-white flex flex-col h-screen sticky top-0">
      <div className="flex items-center gap-2.5 px-6 py-6">
        <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
          <CarFront className="w-5 h-5 text-white" />
        </div>
        <div className="leading-tight">
          <div className="font-semibold text-[15px]">DriveDesk PMS</div>
          <div className="text-[11px] text-navy-300">Car Rental Manager</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
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
