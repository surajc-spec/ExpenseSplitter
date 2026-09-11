import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

export const AddMemberModal = ({ isOpen, onClose, onAddMember }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Member email is required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onAddMember(email.trim());
      setEmail('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Group Member">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="p-3 text-xs font-medium text-light-danger dark:text-dark-danger bg-light-danger/10 dark:bg-dark-danger/10 border border-light-danger/20 rounded-badge">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-light-muted dark:text-dark-muted mb-1 uppercase tracking-wider">
            User Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="friend@example.com"
            className="w-full px-4 py-2.5 rounded-card bg-light-surface-secondary dark:bg-dark-surface-secondary border border-light-border dark:border-dark-border text-light-foreground dark:text-dark-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
          <p className="text-[11px] text-light-muted dark:text-dark-muted mt-1">
            User must already have an account on EquiSplit.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Add Member
          </Button>
        </div>
      </form>
    </Modal>
  );
};
