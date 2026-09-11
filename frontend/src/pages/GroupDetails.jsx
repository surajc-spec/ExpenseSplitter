import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { AddMemberModal } from '../components/groups/AddMemberModal';
import { TransferOwnershipModal } from '../components/groups/TransferOwnershipModal';
import { AddExpenseModal } from '../components/expenses/AddExpenseModal';
import { ExpenseCard } from '../components/expenses/ExpenseCard';
import { SettlementCard } from '../components/settlements/SettlementCard';
import { RecordSettlementModal } from '../components/settlements/RecordSettlementModal';
import { formatRupees } from '../utils/money';

export const GroupDetails = () => {
  const { groupId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [settlements, setSettlements] = useState([]);

  const [activeTab, setActiveTab] = useState('expenses'); // 'expenses' | 'balances' | 'settlements' | 'members'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState(null);

  const fetchGroupDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const [membersRes, expRes, balRes, setlRes] = await Promise.all([
        api.getGroupMembers(groupId),
        api.getGroupExpenses(groupId),
        api.getGroupBalances(groupId),
        api.getSuggestedSettlements(groupId),
      ]);

      setGroup(membersRes.group);
      setMembers(membersRes.members || []);
      setExpenses(expRes.expenses || []);
      setBalances(balRes.balances || []);
      setSettlements(setlRes.settlements || []);
    } catch (err) {
      setError(err.message || 'Failed to load group details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (groupId) {
      fetchGroupDetails();
    }
  }, [groupId]);

  // Current user's role in this group
  const currentUserMember = members.find((m) => (m.user_id || m.id) === user?.userId);
  const isAdmin = currentUserMember?.role === 'admin' || group?.created_by === user?.userId;
  const isOwner = group?.created_by === user?.userId;

  // Map member user_id -> name for quick lookup
  const memberMap = {};
  members.forEach((m) => {
    memberMap[m.user_id || m.id] = m.name;
  });

  // Member Management Actions
  const handleAddMember = async (email) => {
    await api.addMember(groupId, email);
    await fetchGroupDetails();
  };

  const handleRemoveMember = async (targetUserId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    try {
      await api.removeMember(groupId, targetUserId);
      await fetchGroupDetails();
    } catch (err) {
      alert(err.message || 'Failed to remove member');
    }
  };

  const handleRoleChange = async (targetUserId, newRole) => {
    try {
      await api.updateMemberRole(groupId, targetUserId, newRole);
      await fetchGroupDetails();
    } catch (err) {
      alert(err.message || 'Failed to update member role');
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm('Are you sure you want to leave this group?')) return;
    try {
      await api.leaveGroup(groupId);
      navigate('/groups');
    } catch (err) {
      alert(err.message || 'Failed to leave group');
    }
  };

  const handleTransferOwnership = async (targetUserId) => {
    await api.transferOwnership(groupId, targetUserId);
    await fetchGroupDetails();
  };

  // Expense & Settlement Actions
  const handleCreateExpense = async (expenseData) => {
    await api.createExpense(groupId, expenseData);
    await fetchGroupDetails();
  };

  const handleRecordSettlement = async ({ fromUser, toUser, amount, idempotencyKey }) => {
    await api.recordSettlement(
      groupId,
      {
        fromUser,
        toUser,
        amount,
      },
      idempotencyKey
    );
    await fetchGroupDetails();
  };

  if (loading) {
    return <LoadingState message="Loading group details..." />;
  }

  if (error) {
    return <ErrorState title="Error Loading Group" message={error} onRetry={fetchGroupDetails} />;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner */}
      <Card className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-l-4 border-l-primary">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => navigate('/groups')}
              className="text-xs font-bold text-light-muted dark:text-dark-muted hover:text-primary transition-colors"
            >
              ← Back to Groups
            </button>
            <span className="text-xs text-light-border dark:text-dark-border">•</span>
            <Badge variant={isAdmin ? 'primary' : 'muted'}>
              {isAdmin ? (isOwner ? 'Group Owner' : 'Group Admin') : 'Member'}
            </Badge>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-light-foreground dark:text-dark-foreground tracking-tight">
            {group?.name}
          </h1>

          <p className="text-xs text-light-muted dark:text-dark-muted mt-1">
            {members.length} members • Created on{' '}
            {new Date(group?.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" onClick={() => setIsAddExpenseOpen(true)}>
            + Add Expense
          </Button>

          <Button variant="secondary" size="md" onClick={() => setIsAddMemberOpen(true)}>
            + Add Member
          </Button>

          {!isOwner && (
            <Button variant="secondary" size="md" onClick={handleLeaveGroup}>
              Leave Group
            </Button>
          )}
        </div>
      </Card>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-light-border dark:border-dark-border pb-2 overflow-x-auto">
        {[
          { id: 'expenses', label: `Expenses (${expenses.length})` },
          { id: 'balances', label: 'Net Balances' },
          { id: 'settlements', label: `Settlements (${settlements.length})` },
          { id: 'members', label: `Members (${members.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-btn text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground shadow-card'
                : 'bg-light-surface-secondary dark:bg-dark-surface-secondary text-light-foreground dark:text-dark-foreground hover:bg-light-surface-tertiary dark:hover:bg-dark-surface-tertiary'
            }`}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab 1: Expenses */}
      {activeTab === 'expenses' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-light-foreground dark:text-dark-foreground">
              Group Expense History
            </h3>
            <Button size="sm" variant="primary" onClick={() => setIsAddExpenseOpen(true)}>
              + New Expense
            </Button>
          </div>

          {expenses.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {expenses.map((expense) => (
                <ExpenseCard key={expense.id} expense={expense} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No expenses recorded yet"
              description="Click '+ New Expense' to add the first shared expense for this group."
              actionLabel="Add First Expense"
              onAction={() => setIsAddExpenseOpen(true)}
            />
          )}
        </div>
      )}

      {/* Tab 2: Net Balances */}
      {activeTab === 'balances' && (
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-bold text-light-foreground dark:text-dark-foreground">
            Member Net Balances
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {balances.map((b) => {
              const balInt = parseInt(b.balance || '0', 10);
              const isPositive = balInt > 0;
              const isNegative = balInt < 0;

              return (
                <Card
                  key={b.user_id}
                  className={`flex items-center justify-between border-l-4 ${
                    isPositive
                      ? 'border-l-light-success dark:border-l-dark-success'
                      : isNegative
                      ? 'border-l-light-danger dark:border-l-dark-danger'
                      : 'border-l-light-border dark:border-l-dark-border'
                  }`}
                >
                  <div>
                    <h4 className="text-base font-bold text-light-foreground dark:text-dark-foreground">
                      {b.name}
                    </h4>
                    <p className="text-xs text-light-muted dark:text-dark-muted">
                      {b.user_id === user?.userId ? 'You' : b.email}
                    </p>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-lg font-extrabold tracking-tight ${
                        isPositive
                          ? 'text-light-success dark:text-dark-success'
                          : isNegative
                          ? 'text-light-danger dark:text-dark-danger'
                          : 'text-light-muted dark:text-dark-muted'
                      }`}
                    >
                      {formatRupees(b.balance)}
                    </span>
                    <p className="text-[10px] font-bold text-light-muted dark:text-dark-muted">
                      {isPositive ? 'gets back' : isNegative ? 'owes in group' : 'settled up'}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Suggested Settlements */}
      {activeTab === 'settlements' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-light-foreground dark:text-dark-foreground">
                Optimal Suggested Settlements
              </h3>
              <p className="text-xs text-light-muted dark:text-dark-muted">
                Minimizes total payment transactions using greedy balance minification.
              </p>
            </div>
          </div>

          {settlements.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {settlements.map((s, idx) => (
                <SettlementCard
                  key={idx}
                  settlement={s}
                  memberMap={memberMap}
                  currentUserId={user?.userId}
                  onRecordClick={(sItem) => setSelectedSettlement(sItem)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No settlements required"
              description="Everyone in this group is currently settled up!"
            />
          )}
        </div>
      )}

      {/* Tab 4: Members & RBAC */}
      {activeTab === 'members' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-light-foreground dark:text-dark-foreground">
              Group Members ({members.length})
            </h3>
            <div className="flex gap-2">
              {isOwner && (
                <Button size="sm" variant="secondary" onClick={() => setIsTransferOpen(true)}>
                  Transfer Ownership
                </Button>
              )}
              <Button size="sm" variant="primary" onClick={() => setIsAddMemberOpen(true)}>
                + Add Member
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {members.map((m) => {
              const mId = m.user_id || m.id;
              const isSelf = mId === user?.userId;
              const mIsOwner = group?.created_by === mId;

              return (
                <Card key={mId} className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-light-foreground dark:text-dark-foreground">
                        {m.name} {isSelf && '(You)'}
                      </h4>
                      <Badge variant={mIsOwner ? 'primary' : m.role === 'admin' ? 'warning' : 'muted'}>
                        {mIsOwner ? 'Owner' : m.role}
                      </Badge>
                    </div>
                    <p className="text-xs text-light-muted dark:text-dark-muted">{m.email}</p>
                  </div>

                  {isAdmin && !mIsOwner && !isSelf && (
                    <div className="flex items-center gap-2">
                      {m.role === 'member' ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleRoleChange(mId, 'admin')}
                        >
                          Make Admin
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleRoleChange(mId, 'member')}
                        >
                          Demote
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleRemoveMember(mId)}
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        onAddMember={handleAddMember}
      />

      <TransferOwnershipModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        members={members}
        currentUserId={user?.userId}
        onTransfer={handleTransferOwnership}
      />

      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        members={members}
        onSubmit={handleCreateExpense}
      />

      <RecordSettlementModal
        isOpen={!!selectedSettlement}
        onClose={() => setSelectedSettlement(null)}
        settlement={selectedSettlement}
        memberMap={memberMap}
        groupId={groupId}
        onSettled={handleRecordSettlement}
      />
    </div>
  );
};
