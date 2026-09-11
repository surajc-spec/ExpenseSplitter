import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

export const CreateGroupModal = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [memberEmails, setMemberEmails] = useState(['']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailChange = (index, value) => {
    const updated = [...memberEmails];
    updated[index] = value;
    setMemberEmails(updated);
  };

  const handleAddEmailField = () => {
    setMemberEmails([...memberEmails, '']);
  };

  const handleRemoveEmailField = (index) => {
    const updated = memberEmails.filter((_, i) => i !== index);
    setMemberEmails(updated.length > 0 ? updated : ['']);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Group name is required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const validEmails = memberEmails.map((email) => email.trim()).filter((email) => email.length > 0);
      await onCreate(name.trim(), validEmails);
      setName('');
      setMemberEmails(['']);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setMemberEmails(['']);
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New Group">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="p-3 text-xs font-medium text-light-danger dark:text-dark-danger bg-light-danger/10 dark:bg-dark-danger/10 border border-light-danger/20 rounded-badge">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-light-muted dark:text-dark-muted mb-1 uppercase tracking-wider">
            Group Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Goa Trip 2026, Flatmates..."
            className="w-full px-4 py-2.5 rounded-card bg-light-surface-secondary dark:bg-dark-surface-secondary border border-light-border dark:border-dark-border text-light-foreground dark:text-dark-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-light-muted dark:text-dark-muted uppercase tracking-wider">
              Add Initial Members (Optional)
            </label>
            <button
              type="button"
              onClick={handleAddEmailField}
              className="text-xs font-bold text-primary hover:underline"
            >
              + Add Email
            </button>
          </div>
          <p className="text-[11px] text-light-muted dark:text-dark-muted mb-2">
            Enter emails of registered users to add them directly to this group.
          </p>

          <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
            {memberEmails.map((email, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => handleEmailChange(idx, e.target.value)}
                  placeholder={`Member ${idx + 1} Email (e.g. friend@example.com)`}
                  className="flex-1 px-3 py-2 rounded-card bg-light-surface-secondary dark:bg-dark-surface-secondary border border-light-border dark:border-dark-border text-light-foreground dark:text-dark-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {memberEmails.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveEmailField(idx)}
                    className="p-1.5 text-xs text-light-danger dark:text-dark-danger hover:bg-light-danger/10 rounded"
                    title="Remove email field"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-light-border dark:border-dark-border mt-2">
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Create Group
          </Button>
        </div>
      </form>
    </Modal>
  );
};

