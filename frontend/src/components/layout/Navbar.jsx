import React from 'react';
import { useNavigate, Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ThemeToggle } from '../common/ThemeToggle';
import { Button } from '../common/Button';

export const Navbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navLinks = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/groups', label: 'Groups' },
    { path: '/expenses', label: 'Expenses' },
    { path: '/settlements', label: 'Settlements' },
  ];

  return (
    <header className="sticky top-0 z-navbar bg-light-surface dark:bg-dark-surface border-b border-light-border dark:border-dark-border px-4 sm:px-6 py-3 shadow-card transition-colors">
      <div className="flex items-center justify-between max-w-7xl mx-auto gap-4">
        {/* Left Side: Mobile Sidebar Toggle & Brand Logo */}
        <div className="flex items-center gap-3">
          {user && (
            <button
              onClick={onToggleSidebar}
              className="md:hidden p-2 rounded-card bg-light-surface-secondary dark:bg-dark-surface-secondary text-light-foreground dark:text-dark-foreground text-sm font-bold border border-light-border dark:border-dark-border cursor-pointer"
              aria-label="Toggle Navigation"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
              </svg>
            </button>
          )}

          <Link to="/" className="flex items-center gap-2.5 group">
            <img
              src="/favicon2.png"
              alt="EquiSplit Logo"
              className="w-8 h-8 max-w-[32px] max-h-[32px] object-contain transition-transform group-hover:scale-105"
            />
            <span className="text-xl font-extrabold text-light-foreground dark:text-dark-foreground tracking-tight">
              EquiSplit
            </span>
          </Link>
        </div>

        {/* Center Navigation Links for Authenticated User (Desktop) */}
        {user && (
          <nav className="hidden md:flex items-center gap-1 bg-light-surface-secondary/50 dark:bg-dark-surface-secondary/50 p-1 rounded-btn border border-light-border/60 dark:border-dark-border/60">
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) =>
                  `px-3.5 py-1.5 rounded-btn text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-card'
                      : 'text-light-foreground dark:text-dark-foreground hover:bg-light-surface-tertiary dark:hover:bg-dark-surface-tertiary'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        )}

        {/* Right Side: Theme Toggle, Profile Icon & Red Logout Button */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          {user ? (
            <div className="flex items-center gap-2.5 pl-2.5 border-l border-light-border dark:border-dark-border">
              {/* Profile Icon Button */}
              <button
                onClick={() => navigate('/profile')}
                className="p-2 rounded-btn bg-light-surface-secondary dark:bg-dark-surface-secondary hover:bg-light-surface-tertiary dark:hover:bg-dark-surface-tertiary border border-light-border dark:border-dark-border text-light-foreground dark:text-dark-foreground transition-all cursor-pointer flex items-center justify-center"
                aria-label="Profile"
                title="View Profile"
              >
                <svg
                  className="w-5 h-5 fill-current"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </button>

              {/* Red Logout Button with White Text */}
              <button
                onClick={logout}
                className="px-3.5 py-1.5 rounded-btn bg-light-danger dark:bg-dark-danger hover:bg-red-700 dark:hover:bg-red-700 text-white font-bold text-xs transition-colors cursor-pointer border-none shadow-card"
                title="Log out of EquiSplit"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button onClick={() => navigate('/login')} variant="secondary" size="sm">
                Log In
              </Button>
              <Button onClick={() => navigate('/register')} variant="primary" size="sm">
                Get Started
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
