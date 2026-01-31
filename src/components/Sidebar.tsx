import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Utensils,
  Trees,
  Banknote,
  Settings,
} from 'lucide-react';

const navItems = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/log', label: 'Log Meal', icon: Utensils },
  { to: '/app/forest', label: 'Forest', icon: Trees },
  { to: '/app/rewards', label: 'Cash Out', icon: Banknote },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

const Sidebar = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-around border-t-2 border-mist-200 bg-white/90 p-2 backdrop-blur-md md:relative md:bottom-auto md:left-auto md:right-auto md:z-0 md:mx-0 md:mt-6 md:flex md:w-56 md:flex-col md:justify-start md:gap-2 md:rounded-3xl md:border-2 md:border-mist-200 md:bg-white/40 md:p-2 md:shadow-card">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center rounded-xl p-2 transition md:flex-row md:justify-start md:px-4 md:py-3 ${
              isActive
                ? 'text-pine-600 md:bg-moss-200 md:text-pine-900 md:shadow-soft'
                : 'text-mist-500 hover:bg-mist-100 hover:text-pine-700'
            }`
          }
        >
          <item.icon className="h-6 w-6 md:mr-3" strokeWidth={2.5} />
          <span className="mt-1 text-[10px] font-bold md:mt-0 md:text-sm">
            {item.label}
          </span>
        </NavLink>
      ))}
    </nav>
  );
};

export default Sidebar;
