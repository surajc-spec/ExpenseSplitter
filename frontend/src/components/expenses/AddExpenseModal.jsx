import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { rupeesToPaise, formatRupees } from '../../utils/money';

export const AddExpenseModal = ({ isOpen, onClose, members, onSubmit }) => {
  const [description, setDescription] = useState('');
  const [rupees, setRupees] = useState('');
  const [splitType, setSplitType] = useState('equal');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [splitInputs, setSplitInputs] = useState({}); // userId -> input value (rupees or percentage)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (members && members.length > 0) {
      const allIds = members.map((m) => m.user_id || m.id);
      setSelectedMembers(allIds);
    }
  }, [members, isOpen]);

  const handleMemberToggle = (userId) => {
    if (selectedMembers.includes(userId)) {
      if (selectedMembers.length === 1) {
        setError('At least one participant must be included in the split');
        return;
      }
      setSelectedMembers(selectedMembers.filter((id) => id !== userId));
    } else {
      setSelectedMembers([...selectedMembers, userId]);
    }
  };

  const handleSplitInputChange = (userId, value) => {
    setSplitInputs((prev) => ({
      ...prev,
      [userId]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!description.trim()) {
      setError('Description is required');
      return;
    }

    const totalPaise = rupeesToPaise(rupees);
    if (totalPaise <= 0) {
      setError('Total amount must be greater than zero');
      return;
    }

    if (selectedMembers.length === 0) {
      setError('Select at least one participant');
      return;
    }

    let splits = [];

    if (splitType === 'equal') {
      splits = selectedMembers.map((userId) => ({
        userId,
      }));
    } else if (splitType === 'exact') {
      let sumPaise = 0;
      for (const userId of selectedMembers) {
        const val = splitInputs[userId] || '0';
        const itemPaise = rupeesToPaise(val);
        sumPaise += itemPaise;
        splits.push({
          userId,
          amount: itemPaise,
        });
      }
      if (sumPaise !== totalPaise) {
        setError(
          `Sum of split amounts (${formatRupees(sumPaise)}) does not equal total amount (${formatRupees(totalPaise)})`
        );
        return;
      }
    } else if (splitType === 'percentage') {
      let sumPct = 0;
      for (const userId of selectedMembers) {
        const val = parseFloat(splitInputs[userId] || '0');
        sumPct += val;
        splits.push({
          userId,
          percentage: val,
        });
      }
      if (Math.abs(sumPct - 100) > 0.01) {
        setError(`Sum of percentages (${sumPct.toFixed(2)}%) must equal exactly 100%`);
        return;
      }
    }

    setLoading(true);
    try {
      await onSubmit({
        description: description.trim(),
        totalAmount: totalPaise,
        splitType,
        splits,
      });
      // Reset form
      setDescription('');
      setRupees('');
      setSplitType('equal');
      setSplitInputs({});
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Expense" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-h-[80vh] overflow-y-auto pr-1">
        {error && (
          <div className="p-3 text-xs font-medium text-light-danger dark:text-dark-danger bg-light-danger/10 dark:bg-dark-danger/10 border border-light-danger/20 rounded-badge">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-light-muted dark:text-dark-muted mb-1 uppercase tracking-wider">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Dinner, Taxi fare, Grocery..."
            className="w-full px-4 py-2.5 rounded-card bg-light-surface-secondary dark:bg-dark-surface-secondary border border-light-border dark:border-dark-border text-light-foreground dark:text-dark-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-light-muted dark:text-dark-muted mb-1 uppercase tracking-wider">
            Total Amount (₹)
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={rupees}
            onChange={(e) => setRupees(e.target.value)}
            placeholder="0.00"
            className="w-full px-4 py-2.5 rounded-card bg-light-surface-secondary dark:bg-dark-surface-secondary border border-light-border dark:border-dark-border text-light-foreground dark:text-dark-foreground text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-light-muted dark:text-dark-muted mb-1 uppercase tracking-wider">
            Split Method
          </label>
          <div className="grid grid-cols-3 gap-2">
            {['equal', 'exact', 'percentage'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSplitType(type)}
                className={`py-2 px-3 text-xs font-bold rounded-card capitalize border transition-all ${
                  splitType === type
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-light-surface-secondary dark:bg-dark-surface-secondary text-light-foreground dark:text-dark-foreground border-light-border dark:border-dark-border'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-light-muted dark:text-dark-muted mb-2 uppercase tracking-wider">
            Participants & Breakdown
          </label>

          <div className="flex flex-col gap-2">
            {(members || []).map((member) => {
              const mId = member.user_id || member.id;
              const isSelected = selectedMembers.includes(mId);

              return (
                <div
                  key={mId}
                  className={`flex items-center justify-between p-3 rounded-card border transition-colors ${
                    isSelected
                      ? 'bg-light-surface dark:bg-dark-surface border-primary'
                      : 'bg-light-surface-secondary/40 dark:bg-dark-surface-secondary/40 border-light-border dark:border-dark-border opacity-60'
                  }`}
                >
                  <label className="flex items-center gap-3 cursor-pointer text-xs font-bold text-light-foreground dark:text-dark-foreground">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleMemberToggle(mId)}
                      className="w-4 h-4 rounded text-primary focus:ring-primary"
                    />
                    <span>{member.name}</span>
                  </label>

                  {isSelected && splitType === 'exact' && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={splitInputs[mId] || ''}
                        onChange={(e) => handleSplitInputChange(mId, e.target.value)}
                        className="w-24 px-2 py-1 text-xs font-bold rounded bg-light-surface-secondary dark:bg-dark-surface-secondary border border-light-border dark:border-dark-border text-right"
                      />
                    </div>
                  )}

                  {isSelected && splitType === 'percentage' && (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0"
                        value={splitInputs[mId] || ''}
                        onChange={(e) => handleSplitInputChange(mId, e.target.value)}
                        className="w-20 px-2 py-1 text-xs font-bold rounded bg-light-surface-secondary dark:bg-dark-surface-secondary border border-light-border dark:border-dark-border text-right"
                      />
                      <span className="text-xs font-bold">%</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-light-border dark:border-dark-border mt-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Save Expense
          </Button>
        </div>
      </form>
    </Modal>
  );
};
