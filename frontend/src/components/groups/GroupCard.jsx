import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';

export const GroupCard = ({ group }) => {
  const navigate = useNavigate();

  return (
    <Card
      hoverable
      onClick={() => navigate(`/groups/${group.id}`)}
      className="flex flex-col justify-between gap-4"
    >
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-light-foreground dark:text-dark-foreground tracking-tight">
            {group.name}
          </h3>
          <Badge variant={group.role === 'admin' ? 'primary' : 'muted'}>
            {group.role || 'member'}
          </Badge>
        </div>
        <p className="text-xs text-light-muted dark:text-dark-muted">
          Created on {new Date(group.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-light-border dark:border-dark-border text-xs font-semibold text-light-muted dark:text-dark-muted">
        <span>
          {group.member_count || group.memberCount || 1} {group.member_count === 1 ? 'member' : 'members'}
        </span>
        <span className="text-primary font-bold">View Details →</span>
      </div>
    </Card>
  );
};
