import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { FinancialOverviewChart } from '../components/charts/FinancialOverviewChart';
import { formatRupees } from '../utils/money';

export const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [balancesMap, setBalancesMap] = useState({}); // groupId -> array of balances
  const [expensesList, setExpensesList] = useState([]);
  const [settlementsList, setSettlementsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch user's joined groups
      const groupsRes = await api.getGroups();
      const userGroups = groupsRes.groups || [];
      setGroups(userGroups);

      // 2. Fetch expenses, balances & settlements for each group
      let allExpenses = [];
      let allSettlements = [];
      let groupBalMap = {};

      for (const group of userGroups) {
        try {
          const [expData, balData, setlData] = await Promise.all([
            api.getGroupExpenses(group.id),
            api.getGroupBalances(group.id),
            api.getSuggestedSettlements(group.id),
          ]);

          if (expData.expenses) {
            allExpenses = [...allExpenses, ...expData.expenses.map((e) => ({ ...e, groupName: group.name }))];
          }
          if (balData.balances) {
            groupBalMap[group.id] = balData.balances;
          }
          if (setlData.settlements) {
            allSettlements = [
              ...allSettlements,
              ...setlData.settlements.map((s) => ({ ...s, groupId: group.id, groupName: group.name })),
            ];
          }
        } catch (e) {
          console.warn(`Could not load details for group ${group.id}:`, e);
        }
      }

      // Sort expenses by date descending
      allExpenses.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setExpensesList(allExpenses);
      setSettlementsList(allSettlements);
      setBalancesMap(groupBalMap);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Compute aggregated net balance for current user
  let netBalancePaise = 0;
  let totalOwedToUserPaise = 0;
  let totalUserOwesPaise = 0;

  Object.values(balancesMap).forEach((groupBalances) => {
    groupBalances.forEach((b) => {
      if (b.user_id === user?.userId) {
        const bal = parseInt(b.balance || '0', 10);
        netBalancePaise += bal;
        if (bal > 0) totalOwedToUserPaise += bal;
        if (bal < 0) totalUserOwesPaise += Math.abs(bal);
      }
    });
  });

  // Prepare group spending chart data from real expenses
  const chartData = groups.map((g) => {
    const totalGroupSpendingPaise = expensesList
      .filter((e) => e.group_id === g.id)
      .reduce((sum, e) => sum + parseInt(e.total_amount || '0', 10), 0);
    return {
      name: g.name,
      amount: totalGroupSpendingPaise / 100, // Rupees for chart display
    };
  }).filter((d) => d.amount > 0);

  if (loading) {
    return <LoadingState message="Loading your financial dashboard..." />;
  }

  if (error) {
    return <ErrorState title="Dashboard Error" message={error} onRetry={fetchDashboardData} />;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-light-foreground dark:text-dark-foreground tracking-tight">
            Financial Dashboard
          </h1>
          <p className="text-xs md:text-sm text-light-muted dark:text-dark-muted mt-0.5">
            Welcome back, <span className="font-bold text-light-foreground dark:text-dark-foreground">{user?.name || user?.email}</span>
          </p>
        </div>

        <Button variant="primary" onClick={() => navigate('/groups')}>
          + Create or Join Group
        </Button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex flex-col gap-1 border-l-4 border-l-primary">
          <span className="text-xs font-bold text-light-muted dark:text-dark-muted uppercase tracking-wider">
            Net Balance
          </span>
          <span
            className={`text-2xl font-black tracking-tight ${
              netBalancePaise > 0
                ? 'text-light-success dark:text-dark-success'
                : netBalancePaise < 0
                ? 'text-light-danger dark:text-dark-danger'
                : 'text-light-foreground dark:text-dark-foreground'
            }`}
          >
            {formatRupees(netBalancePaise)}
          </span>
          <span className="text-[11px] text-light-muted dark:text-dark-muted">
            {netBalancePaise > 0 ? 'You get back overall' : netBalancePaise < 0 ? 'You owe overall' : 'Settled up'}
          </span>
        </Card>

        <Card className="flex flex-col gap-1 border-l-4 border-l-light-success dark:border-l-dark-success">
          <span className="text-xs font-bold text-light-muted dark:text-dark-muted uppercase tracking-wider">
            You are Owed
          </span>
          <span className="text-2xl font-black text-light-success dark:text-dark-success tracking-tight">
            {formatRupees(totalOwedToUserPaise)}
          </span>
          <span className="text-[11px] text-light-muted dark:text-dark-muted">
            Total pending receivables
          </span>
        </Card>

        <Card className="flex flex-col gap-1 border-l-4 border-l-light-danger dark:border-l-dark-danger">
          <span className="text-xs font-bold text-light-muted dark:text-dark-muted uppercase tracking-wider">
            You Owe
          </span>
          <span className="text-2xl font-black text-light-danger dark:text-dark-danger tracking-tight">
            {formatRupees(totalUserOwesPaise)}
          </span>
          <span className="text-[11px] text-light-muted dark:text-dark-muted">
            Total pending payables
          </span>
        </Card>

        <Card className="flex flex-col gap-1 border-l-4 border-l-light-warning dark:border-l-dark-warning">
          <span className="text-xs font-bold text-light-muted dark:text-dark-muted uppercase tracking-wider">
            Active Groups
          </span>
          <span className="text-2xl font-black text-light-foreground dark:text-dark-foreground tracking-tight">
            {groups.length}
          </span>
          <span className="text-[11px] text-light-muted dark:text-dark-muted">
            Groups joined
          </span>
        </Card>
      </div>

      {/* Main Grid: Chart & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Analytics Chart & Groups */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-light-foreground dark:text-dark-foreground">
                Group Spending Overview
              </h3>
              <Badge variant="primary">Real API Data</Badge>
            </div>
            {chartData.length > 0 ? (
              <FinancialOverviewChart groupsData={chartData} />
            ) : (
              <EmptyState
                title="No Group Spending Yet"
                description="Add expenses to your groups to view real-time spending distribution."
              />
            )}
          </Card>

          {/* Quick Groups List */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-light-foreground dark:text-dark-foreground">
                Your Groups ({groups.length})
              </h3>
              <Button size="sm" variant="ghost" onClick={() => navigate('/groups')}>
                View All →
              </Button>
            </div>

            {groups.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {groups.slice(0, 4).map((g) => (
                  <div
                    key={g.id}
                    onClick={() => navigate(`/groups/${g.id}`)}
                    className="p-3.5 rounded-card bg-light-surface-secondary dark:bg-dark-surface-secondary border border-light-border dark:border-dark-border cursor-pointer hover:border-primary transition-all flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-light-foreground dark:text-dark-foreground">
                        {g.name}
                      </h4>
                      <p className="text-xs text-light-muted dark:text-dark-muted">
                        {g.member_count || 1} members
                      </p>
                    </div>
                    <Badge variant={g.role === 'admin' ? 'primary' : 'muted'}>
                      {g.role || 'member'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No groups joined"
                description="You are not part of any expense groups yet."
                actionLabel="Create Group"
                onAction={() => navigate('/groups')}
              />
            )}
          </Card>
        </div>

        {/* Right Column: Recent Expenses & Suggested Settlements */}
        <div className="flex flex-col gap-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-light-foreground dark:text-dark-foreground">
                Recent Expenses
              </h3>
              <Button size="sm" variant="ghost" onClick={() => navigate('/expenses')}>
                View All →
              </Button>
            </div>

            {expensesList.length > 0 ? (
              <div className="flex flex-col gap-3">
                {expensesList.slice(0, 5).map((exp) => (
                  <div
                    key={exp.id}
                    className="p-3 rounded-card bg-light-surface-secondary dark:bg-dark-surface-secondary border border-light-border dark:border-dark-border flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-light-foreground dark:text-dark-foreground">
                        {exp.description}
                      </p>
                      <p className="text-[11px] text-light-muted dark:text-dark-muted">
                        {exp.groupName} • Paid by {exp.paid_by_name || 'Member'}
                      </p>
                    </div>
                    <span className="font-extrabold text-light-foreground dark:text-dark-foreground text-sm">
                      {formatRupees(exp.total_amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No expenses"
                description="No recent expenses recorded across your groups."
              />
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-light-foreground dark:text-dark-foreground">
                Suggested Settlements
              </h3>
              <Button size="sm" variant="ghost" onClick={() => navigate('/settlements')}>
                Details →
              </Button>
            </div>

            {settlementsList.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                {settlementsList.slice(0, 4).map((s, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-card bg-light-surface-secondary/60 dark:bg-dark-surface-secondary/60 border border-light-border dark:border-dark-border text-xs flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-light-foreground dark:text-dark-foreground">
                        {s.groupName}
                      </p>
                      <p className="text-[11px] text-light-muted dark:text-dark-muted">
                        Consolidated balance
                      </p>
                    </div>
                    <span className="font-bold text-primary text-sm">
                      {formatRupees(s.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="All settled up"
                description="No pending settlement suggestions at this time."
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
