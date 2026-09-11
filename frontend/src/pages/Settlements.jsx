import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { SettlementCard } from '../components/settlements/SettlementCard';
import { RecordSettlementModal } from '../components/settlements/RecordSettlementModal';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';

export const Settlements = () => {
  const { user } = useAuth();

  const [settlements, setSettlements] = useState([]);
  const [memberMap, setMemberMap] = useState({});
  const [selectedSettlement, setSelectedSettlement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSettlementsData = async () => {
    setLoading(true);
    setError('');
    try {
      const groupsRes = await api.getGroups();
      const userGroups = groupsRes.groups || [];

      let allSetls = [];
      let mMap = {};

      for (const group of userGroups) {
        try {
          const [setlRes, memRes] = await Promise.all([
            api.getSuggestedSettlements(group.id),
            api.getGroupMembers(group.id),
          ]);

          if (memRes.members) {
            memRes.members.forEach((m) => {
              mMap[m.user_id || m.id] = m.name;
            });
          }

          if (setlRes.settlements) {
            allSetls = [
              ...allSetls,
              ...setlRes.settlements.map((s) => ({
                ...s,
                groupId: group.id,
                groupName: group.name,
              })),
            ];
          }
        } catch (e) {
          console.warn(`Error loading settlements for group ${group.id}:`, e);
        }
      }

      setMemberMap(mMap);
      setSettlements(allSetls);
    } catch (err) {
      setError(err.message || 'Failed to fetch settlements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettlementsData();
  }, []);

  const handleRecordSettlement = async ({ groupId, fromUser, toUser, amount, idempotencyKey }) => {
    await api.recordSettlement(
      groupId,
      {
        fromUser,
        toUser,
        amount,
      },
      idempotencyKey
    );
    await fetchSettlementsData();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-light-foreground dark:text-dark-foreground tracking-tight">
          Suggested Settlements
        </h1>
        <p className="text-xs md:text-sm text-light-muted dark:text-dark-muted mt-0.5">
          Greedy debt-minification suggestions across all your active groups
        </p>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingState message="Calculating debt consolidation suggestions..." />
      ) : error ? (
        <ErrorState title="Failed to Load Settlements" message={error} onRetry={fetchSettlementsData} />
      ) : settlements.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {settlements.map((s, idx) => (
            <div key={idx} className="flex flex-col gap-1">
              <span className="text-xs font-bold text-light-muted dark:text-dark-muted uppercase px-1">
                Group: {s.groupName}
              </span>
              <SettlementCard
                settlement={s}
                memberMap={memberMap}
                currentUserId={user?.userId}
                onRecordClick={(item) => setSelectedSettlement(item)}
              />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="All Settled Up!"
          description="There are no pending settlement suggestions across any of your groups."
        />
      )}

      {/* Record Settlement Modal */}
      <RecordSettlementModal
        isOpen={!!selectedSettlement}
        onClose={() => setSelectedSettlement(null)}
        settlement={selectedSettlement}
        memberMap={memberMap}
        groupId={selectedSettlement?.groupId}
        onSettled={handleRecordSettlement}
      />
    </div>
  );
};
