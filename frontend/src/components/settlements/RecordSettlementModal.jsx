import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { formatRupees } from '../../utils/money';
import { generateIdempotencyKey } from '../../utils/idempotency';

export const RecordSettlementModal = ({ isOpen, onClose, settlement, memberMap, groupId, onSettled }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Generate a unique Idempotency-Key when the modal opens for a new settlement action
      setIdempotencyKey(generateIdempotencyKey());
      setError('');
    }
  }, [isOpen, settlement]);

  if (!settlement) return null;

  const fromName = memberMap[settlement.from] || 'Member';
  const toName = memberMap[settlement.to] || 'Member';

  const handleConfirm = async () => {
    setError('');
    setLoading(true);
    try {
      // Send settlement recording request with exact Idempotency-Key
      await onSettled({
        groupId,
        fromUser: settlement.from,
        toUser: settlement.to,
        amount: settlement.amount,
        idempotencyKey,
      });
      onClose();
    } catch (err) {
      // Keep the SAME idempotencyKey if the user clicks retry!
      setError(err.message || 'Failed to record settlement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm Financial Settlement">
      <div className="flex flex-col gap-4">
        {error && (
          <div className="p-3 text-xs font-medium text-light-danger dark:text-dark-danger bg-light-danger/10 dark:bg-dark-danger/10 border border-light-danger/20 rounded-badge">
            {error}
          </div>
        )}

        <div className="p-4 rounded-card bg-light-surface-secondary dark:bg-dark-surface-secondary border border-light-border dark:border-dark-border text-center">
          <p className="text-xs text-light-muted dark:text-dark-muted font-bold uppercase mb-1">
            Settlement Summary
          </p>
          <div className="text-2xl font-black text-light-foreground dark:text-dark-foreground my-2">
            {formatRupees(settlement.amount)}
          </div>
          <p className="text-sm font-semibold text-light-foreground dark:text-dark-foreground">
            From <span className="text-primary font-bold">{fromName}</span> to <span className="text-primary font-bold">{toName}</span>
          </p>
        </div>

        <div className="text-xs text-light-muted dark:text-dark-muted p-2 bg-light-surface-tertiary/50 dark:bg-dark-surface-tertiary/50 rounded-badge">
          <p className="font-bold mb-0.5">Transaction & Advisory Lock Protected</p>
          <p>
            Recording this settlement will update debt balances for all group members and log an atomic audit record.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirm} loading={loading}>
            Confirm & Record
          </Button>
        </div>
      </div>
    </Modal>
  );
};
