import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { ExpenseCard } from '../components/expenses/ExpenseCard';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';

export const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchExpensesData = async () => {
    setLoading(true);
    setError('');
    try {
      const groupsRes = await api.getGroups();
      const userGroups = groupsRes.groups || [];
      setGroups(userGroups);

      let allExps = [];
      for (const group of userGroups) {
        try {
          const expRes = await api.getGroupExpenses(group.id);
          if (expRes.expenses) {
            allExps = [
              ...allExps,
              ...expRes.expenses.map((e) => ({ ...e, groupName: group.name })),
            ];
          }
        } catch (e) {
          console.warn(`Error loading expenses for group ${group.id}:`, e);
        }
      }

      allExps.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setExpenses(allExps);
    } catch (err) {
      setError(err.message || 'Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpensesData();
  }, []);

  const filteredExpenses =
    selectedGroupId === 'all'
      ? expenses
      : expenses.filter((e) => e.group_id === selectedGroupId);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-light-foreground dark:text-dark-foreground tracking-tight">
            All Expenses
          </h1>
          <p className="text-xs md:text-sm text-light-muted dark:text-dark-muted mt-0.5">
            Consolidated expense activity across your groups
          </p>
        </div>

        {groups.length > 0 && (
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="px-4 py-2 rounded-btn bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border text-light-foreground dark:text-dark-foreground text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary shadow-card"
          >
            <option value="all">All Groups ({groups.length})</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* List */}
      {loading ? (
        <LoadingState message="Loading expenses across groups..." />
      ) : error ? (
        <ErrorState title="Failed to Load Expenses" message={error} onRetry={fetchExpensesData} />
      ) : filteredExpenses.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {filteredExpenses.map((expense) => (
            <ExpenseCard key={expense.id} expense={expense} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No expenses found"
          description={
            selectedGroupId === 'all'
              ? 'You have not added any expenses across your groups yet.'
              : 'No expenses have been added to this specific group.'
          }
        />
      )}
    </div>
  );
};
