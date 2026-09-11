import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { ThemeToggle } from '../components/common/ThemeToggle';

export const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('All fields are required');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-light-background dark:bg-dark-background text-light-foreground dark:text-dark-foreground transition-colors duration-200">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-btn bg-primary text-primary-foreground font-black text-3xl flex items-center justify-center mx-auto shadow-card mb-3">
            ₹
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Equi<span className="text-primary">Split</span>
          </h1>
          <p className="text-sm text-light-muted dark:text-dark-muted mt-1">
            Create your account to start splitting expenses
          </p>
        </div>

        <Card className="p-8">
          <h2 className="text-xl font-bold mb-6 text-center">Create Account</h2>

          {success && (
            <div className="p-3 text-xs font-bold text-light-success dark:text-dark-success bg-light-success/10 dark:bg-dark-success/10 border border-light-success/20 rounded-badge mb-4 text-center">
              Registration successful! Redirecting to login...
            </div>
          )}

          {error && (
            <div className="p-3 text-xs font-medium text-light-danger dark:text-dark-danger bg-light-danger/10 dark:bg-dark-danger/10 border border-light-danger/20 rounded-badge mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-light-muted dark:text-dark-muted mb-1 uppercase tracking-wider">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-2.5 rounded-card bg-light-surface-secondary dark:bg-dark-surface-secondary border border-light-border dark:border-dark-border text-light-foreground dark:text-dark-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-light-muted dark:text-dark-muted mb-1 uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-4 py-2.5 rounded-card bg-light-surface-secondary dark:bg-dark-surface-secondary border border-light-border dark:border-dark-border text-light-foreground dark:text-dark-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-light-muted dark:text-dark-muted mb-1 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-4 py-2.5 rounded-card bg-light-surface-secondary dark:bg-dark-surface-secondary border border-light-border dark:border-dark-border text-light-foreground dark:text-dark-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <Button type="submit" variant="primary" fullWidth loading={loading} className="mt-2">
              Register
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-light-muted dark:text-dark-muted border-t border-light-border dark:border-dark-border pt-4">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-primary hover:underline">
              Log in instead
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
