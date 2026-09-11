import React from 'react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="border-t border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface py-8 px-4 transition-colors">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <img
            src="/favicon2.png"
            alt="EquiSplit Logo"
            className="w-7 h-7 object-contain"
          />
          <span className="text-lg font-extrabold text-light-foreground dark:text-dark-foreground tracking-tight">
            EquiSplit
          </span>
        </div>

        <div className="flex items-center gap-6 text-xs font-semibold text-light-muted dark:text-dark-muted">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <Link to="/login" className="hover:text-primary transition-colors">Log In</Link>
          <Link to="/register" className="hover:text-primary transition-colors">Register</Link>
        </div>

        <p className="text-xs text-light-muted dark:text-dark-muted">
          © {new Date().getFullYear()} Suraj Chougule. All rights reserved.
        </p>
      </div>
    </footer>
  );
};
