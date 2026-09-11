import React from 'react';
import { NavLink } from 'react-router-dom';

export const Sidebar = ({ isOpen, onClose }) => {
  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/groups', label: 'My Groups' },
    { path: '/expenses', label: 'All Expenses' },
    { path: '/settlements', label: 'Settlements' },
    { path: '/profile', label: 'My Profile' },
  ];

  const sidebarClasses = `
    fixed inset-y-0 left-0 z-sidebar w-64 bg-light-surface dark:bg-dark-surface border-r border-light-border dark:border-dark-border p-4 transition-transform duration-200 ease-in-out
    md:translate-x-0 md:static md:z-auto shadow-card
    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
  `;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-modal bg-black/40 md:hidden backdrop-blur-xs"
        />
      )}

      <aside className={sidebarClasses}>
        <div className="flex items-center justify-between md:hidden mb-4 pb-2 border-b border-light-border dark:border-dark-border">
          <span className="text-xs font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted">Navigation Menu</span>
          <button
            onClick={onClose}
            className="p-1 text-sm font-bold text-light-muted dark:text-dark-muted hover:text-light-foreground dark:hover:text-dark-foreground"
          >
            Close
          </button>
        </div>

        <nav className="flex flex-col gap-1.5 mt-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => onClose()}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-card text-xs font-bold tracking-wide transition-colors duration-150 ${
                  isActive
                    ? 'bg-primary text-primary-foreground font-bold shadow-card'
                    : 'text-light-foreground dark:text-dark-foreground hover:bg-light-surface-secondary dark:hover:bg-dark-surface-secondary'
                }`
              }
            >
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
};
