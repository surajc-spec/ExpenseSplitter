import React, { useState } from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { formatRupees } from '../../utils/money';

export const ExpenseCard = ({ expense }) => {
  const [expanded, setExpanded] = useState(false);

  const createdDate = expense.created_at
    ? new Date(expense.created_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-base font-bold text-light-foreground dark:text-dark-foreground">
              {expense.description}
            </h4>
            <Badge variant="primary">{expense.split_type}</Badge>
          </div>
          <p className="text-xs text-light-muted dark:text-dark-muted">
            Paid by <span className="font-bold text-light-foreground dark:text-dark-foreground">{expense.paid_by_name || 'Group Member'}</span> • {createdDate}
          </p>
        </div>

        <div className="text-right">
          <span className="text-lg font-extrabold text-light-foreground dark:text-dark-foreground tracking-tight">
            {formatRupees(expense.total_amount)}
          </span>
        </div>
      </div>

      {expense.splits && expense.splits.length > 0 && (
        <div className="pt-2 border-t border-light-border dark:border-dark-border">
          <button
            onClick={() => setExpanded((prev) => !prev)}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
          >
            <span>{expanded ? '▲ Hide Participants' : '▼ Show Participant Breakdown'}</span>
            <span className="text-light-muted dark:text-dark-muted font-normal">
              ({expense.splits.length})
            </span>
          </button>

          {expanded && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-light-surface-secondary/50 dark:bg-dark-surface-secondary/50 p-3 rounded-card border border-light-border dark:border-dark-border">
              {expense.splits.map((split, index) => (
                <div key={split.user_id || index} className="flex items-center justify-between text-xs p-1.5">
                  <span className="font-medium text-light-foreground dark:text-dark-foreground">
                    {split.user_name || 'Member'}
                  </span>
                  <span className="font-bold text-light-muted dark:text-dark-muted">
                    {formatRupees(split.amount)} {split.percentage ? `(${split.percentage}%)` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
