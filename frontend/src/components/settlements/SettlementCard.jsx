import React from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { formatRupees } from '../../utils/money';

export const SettlementCard = ({ settlement, memberMap, currentUserId, onRecordClick }) => {
  const fromName = memberMap[settlement.from] || settlement.fromName || 'Member';
  const toName = memberMap[settlement.to] || settlement.toName || 'Member';

  const isDebtor = settlement.from === currentUserId;
  const isCreditor = settlement.to === currentUserId;

  return (
    <Card className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-l-4 border-l-primary">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/20 text-primary font-black flex items-center justify-center text-xs tracking-tighter">
          PAY
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-light-foreground dark:text-dark-foreground">
              {fromName}
            </span>
            <span className="text-xs text-light-muted dark:text-dark-muted font-bold">pays</span>
            <span className="font-bold text-light-foreground dark:text-dark-foreground">
              {toName}
            </span>
          </div>
          <p className="text-xs text-light-muted dark:text-dark-muted mt-0.5">
            {isDebtor
              ? 'You owe this settlement'
              : isCreditor
              ? 'You will receive this settlement'
              : 'Suggested debt consolidation'}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-light-border dark:border-dark-border">
        <span className="text-xl font-black text-light-foreground dark:text-dark-foreground tracking-tight">
          {formatRupees(settlement.amount)}
        </span>
        
        {onRecordClick && (
          <Button
            size="sm"
            variant={isDebtor ? 'primary' : 'secondary'}
            onClick={() => onRecordClick(settlement)}
          >
            Record Settlement
          </Button>
        )}
      </div>
    </Card>
  );
};
