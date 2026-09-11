import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

export const TransferOwnershipModal = ({ isOpen, onClose, members, currentUserId, onTransfer }) => {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const eligibleMembers = (members || []).filter((m) => (m.user_id || m.id) !== currentUserId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserId) {
      setError('Please select a member to transfer ownership');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onTransfer(selectedUserId);
      setSelectedUserId('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to transfer ownership');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transfer Group Ownership">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="p-3 text-xs font-medium text-light-danger dark:text-dark-danger bg-light-danger/10 dark:bg-dark-danger/10 border border-light-danger/20 rounded-badge">
            {error}
          </div>
        )}

        <p className="text-xs text-light-muted dark:text-dark-muted">
          Select an existing group member to become the new owner of this group. You will remain an admin.
        </p>

        <div>
          <label className="block text-xs font-bold text-light-muted dark:text-dark-muted mb-1 uppercase tracking-wider">
            Select Member
          </label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full px-4 py-2.5 rounded-card bg-light-surface-secondary dark:bg-dark-surface-secondary border border-light-border dark:border-dark-border text-light-foreground dark:text-dark-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            required
          >
            <option value="">Choose a member...</option>
            {eligibleMembers.map((m) => (
              <option key={m.user_id || m.id} value={m.user_id || m.id}>
                {m.name} ({m.email})
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Transfer Ownership
          </Button>
        </div>
      </form>
    </Modal>
  );
};
