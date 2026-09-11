import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

export const Hero = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <section className="py-12 md:py-20 px-4 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Side: Copy, User-POV Callouts & Actions */}
        <div className="lg:col-span-7 text-left">
        

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-light-foreground dark:text-dark-foreground tracking-tight leading-tight mb-6">
            Split Expenses Equitably & Settle Debts Effortlessly
          </h1>

          <p className="text-base sm:text-lg text-light-muted dark:text-dark-muted mb-8 font-medium leading-relaxed max-w-2xl">
            EquiSplit automatically balances group expenses, minimizes the number of transactions needed between friends, and ensures every single payment is 100% accurate and protected.
          </p>

          <div className="flex flex-wrap items-center gap-4 mb-10">
            {user ? (
              <Button size="lg" variant="primary" onClick={() => navigate('/dashboard')}>
                Go to Your Dashboard
              </Button>
            ) : (
              <>
                <Button size="lg" variant="primary" onClick={() => navigate('/register')}>
                  Get Started for Free
                </Button>
                <Button size="lg" variant="secondary" onClick={() => navigate('/login')}>
                  Log In to Account
                </Button>
              </>
            )}
          </div>

          {/* User-POV Feature Callouts */}
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 pt-6  border-light-border dark:border-dark-border">
            <div className="p-3.5 rounded-card bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border shadow-card">
              <p className="text-[11px] text-light-muted dark:text-dark-muted font-bold uppercase tracking-wider">
                Fewer Payments
              </p>
              <p className="text-sm font-black text-light-foreground dark:text-dark-foreground mt-0.5">
                Smart Debt Optimization
              </p>
            </div>

            <div className="p-3.5 rounded-card bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border shadow-card">
              <p className="text-[11px] text-light-muted dark:text-dark-muted font-bold uppercase tracking-wider">
                Zero Double-Pay
              </p>
              <p className="text-sm font-black text-light-foreground dark:text-dark-foreground mt-0.5">
                Protected Settlements
              </p>
            </div>

            <div className="p-3.5 rounded-card bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border shadow-card">
              <p className="text-[11px] text-light-muted dark:text-dark-muted font-bold uppercase tracking-wider">
                100% Precise
              </p>
              <p className="text-sm font-black text-light-foreground dark:text-dark-foreground mt-0.5">
                Zero Rounding Errors
              </p>
            </div>

            <div className="p-3.5 rounded-card bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border shadow-card">
              <p className="text-[11px] text-light-muted dark:text-dark-muted font-bold uppercase tracking-wider">
                Duplicate-Proof
              </p>
              <p className="text-sm font-black text-light-foreground dark:text-dark-foreground mt-0.5">
                Safe Payment Confirmations
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Vector SVG Illustration */}
        <div className="lg:col-span-5 relative flex items-center justify-center">
          <img
            src="/Money income-bro.svg"
            alt="EquiSplit Money Income Illustration"
            className="w-full max-w-md lg:max-w-full h-auto object-contain drop-shadow-xl"
          />
        </div>

      </div>
    </section>
  );
};
