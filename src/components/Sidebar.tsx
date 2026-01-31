import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/app/dashboard', label: 'Dashboard' },
  { to: '/app/log', label: 'Log a Meal' },
  { to: '/app/forest', label: 'Forest' },
  { to: '/app/rewards', label: 'Cash Out' },
  { to: '/app/settings', label: 'Settings' }
];

const Sidebar = () => {
  return (
    <nav className="card mx-4 mt-4 flex gap-2 overflow-x-auto p-2 md:mx-0 md:mt-6 md:w-56 md:flex-col">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `rounded-full px-4 py-2 text-sm font-semibold transition ${
              isActive
                ? 'bg-moss-200 text-pine-900 shadow-soft'
                : 'text-mist-700 hover:bg-mist-100 hover:text-pine-900'
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
};

export default Sidebar;
