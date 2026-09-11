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
    <div className="flex flex-col gap-8 pb-8">
      {/* Header & Quick Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-light-surface dark:bg-dark-surface p-6 rounded-card border border-light-border dark:border-dark-border shadow-card">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-extrabold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-badge">
              Overview
            </span>
            <span className="text-xs text-light-muted dark:text-dark-muted font-semibold">
              Live Balance Summary
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-light-foreground dark:text-dark-foreground tracking-tight">
            Financial Dashboard
          </h1>
          <p className="text-xs md:text-sm text-light-muted dark:text-dark-muted mt-1">
            Welcome back, <span className="font-bold text-light-foreground dark:text-dark-foreground">{user?.name || user?.email}</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => navigate('/expenses')}>
            + Log Expense
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate('/groups')}>
            + New Group
          </Button>
        </div>
      </div>

      {/* 4 Financial Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Net Balance Card */}
        <Card className="flex flex-col justify-between gap-3 border-l-4 border-l-primary hover:shadow-card-hover transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-light-muted dark:text-dark-muted uppercase tracking-wider">
              Net Balance
            </span>
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
              </svg>
            </div>
          </div>
          <div>
            <span
              className={`text-2xl lg:text-3xl font-black tracking-tight block ${
                netBalancePaise > 0
                  ? 'text-light-success dark:text-dark-success'
                  : netBalancePaise < 0
                  ? 'text-light-danger dark:text-dark-danger'
                  : 'text-light-foreground dark:text-dark-foreground'
              }`}
            >
              {formatRupees(netBalancePaise)}
            </span>
            <span className="text-xs text-light-muted dark:text-dark-muted font-medium mt-1 block">
              {netBalancePaise > 0 ? 'You get back overall' : netBalancePaise < 0 ? 'You owe overall' : 'All balances settled'}
            </span>
          </div>
        </Card>

        {/* You Are Owed Card */}
        <Card className="flex flex-col justify-between gap-3 border-l-4 border-l-light-success dark:border-l-dark-success hover:shadow-card-hover transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-light-muted dark:text-dark-muted uppercase tracking-wider">
              You are Owed
            </span>
            <div className="w-8 h-8 rounded-full bg-light-success/10 text-light-success dark:text-dark-success flex items-center justify-center">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M9 5v2h6.59L4 18.59 5.41 20 17 8.41V15h2V5H9z" />
              </svg>
            </div>
          </div>
          <div>
            <span className="text-2xl lg:text-3xl font-black text-light-success dark:text-dark-success tracking-tight block">
              {formatRupees(totalOwedToUserPaise)}
            </span>
            <span className="text-xs text-light-muted dark:text-dark-muted font-medium mt-1 block">
              Total pending receivables
            </span>
          </div>
        </Card>

        {/* You Owe Card */}
        <Card className="flex flex-col justify-between gap-3 border-l-4 border-l-light-danger dark:border-l-dark-danger hover:shadow-card-hover transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-light-muted dark:text-dark-muted uppercase tracking-wider">
              You Owe
            </span>
            <div className="w-8 h-8 rounded-full bg-light-danger/10 text-light-danger dark:text-dark-danger flex items-center justify-center">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M20 5.41L18.59 4 7 15.59V9H5v10h10v-2H8.41L20 5.41z" />
              </svg>
            </div>
          </div>
          <div>
            <span className="text-2xl lg:text-3xl font-black text-light-danger dark:text-dark-danger tracking-tight block">
              {formatRupees(totalUserOwesPaise)}
            </span>
            <span className="text-xs text-light-muted dark:text-dark-muted font-medium mt-1 block">
              Total pending payables
            </span>
          </div>
        </Card>

        {/* Active Groups Card */}
        <Card className="flex flex-col justify-between gap-3 border-l-4 border-l-light-warning dark:border-l-dark-warning hover:shadow-card-hover transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-light-muted dark:text-dark-muted uppercase tracking-wider">
              Active Groups
            </span>
            <div className="w-8 h-8 rounded-full bg-light-warning/10 text-light-warning dark:text-dark-warning flex items-center justify-center">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
              </svg>
            </div>
          </div>
          <div>
            <span className="text-2xl lg:text-3xl font-black text-light-foreground dark:text-dark-foreground tracking-tight block">
              {groups.length}
            </span>
            <span className="text-xs text-light-muted dark:text-dark-muted font-medium mt-1 block">
              Joined expense groups
            </span>
          </div>
        </Card>
      </div>

      {/* Main Grid: Spending Analytics & Groups / Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Spending Analytics & Active Groups List */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Analytics Chart */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-light-foreground dark:text-dark-foreground">
                  Group Spending Distribution
                </h2>
                <p className="text-xs text-light-muted dark:text-dark-muted">
                  Total expense allocation across your active groups
                </p>
              </div>
              <Badge variant="primary">Analytics</Badge>
            </div>
            
            {chartData.length > 0 ? (
              <FinancialOverviewChart groupsData={chartData} />
            ) : (
              <EmptyState
                title="No Group Spending Data"
                description="Add expenses to your groups to view real-time spending distribution."
              />
            )}
          </Card>

          {/* Joined Groups List */}
          <Card>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-light-border dark:border-dark-border">
              <div>
                <h2 className="text-lg font-bold text-light-foreground dark:text-dark-foreground">
                  Your Expense Groups ({groups.length})
                </h2>
                <p className="text-xs text-light-muted dark:text-dark-muted">
                  Manage members, expenses, and settlements
                </p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => navigate('/groups')}>
                View All Groups
              </Button>
            </div>

            {groups.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {groups.slice(0, 4).map((g) => (
                  <div
                    key={g.id}
                    onClick={() => navigate(`/groups/${g.id}`)}
                    className="p-4 rounded-card bg-light-surface-secondary dark:bg-dark-surface-secondary border border-light-border dark:border-dark-border cursor-pointer hover:border-primary transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-black text-sm flex items-center justify-center border border-primary/20">
                        {g.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-light-foreground dark:text-dark-foreground group-hover:text-primary transition-colors">
                          {g.name}
                        </h3>
                        <p className="text-xs text-light-muted dark:text-dark-muted">
                          {g.member_count || 1} members
                        </p>
                      </div>
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

        {/* Right Column: Recent Expenses & Debt Minification Suggestions */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Recent Expenses Card */}
          <Card>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-light-border dark:border-dark-border">
              <div>
                <h2 className="text-lg font-bold text-light-foreground dark:text-dark-foreground">
                  Recent Expenses
                </h2>
                <p className="text-xs text-light-muted dark:text-dark-muted">
                  Latest activity across your groups
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => navigate('/expenses')}>
                View All
              </Button>
            </div>

            {expensesList.length > 0 ? (
              <div className="flex flex-col gap-3">
                {expensesList.slice(0, 5).map((exp) => (
                  <div
                    key={exp.id}
                    className="p-3.5 rounded-card bg-light-surface-secondary dark:bg-dark-surface-secondary border border-light-border dark:border-dark-border flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border flex items-center justify-center text-light-foreground dark:text-dark-foreground">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-bold text-light-foreground dark:text-dark-foreground">
                          {exp.description}
                        </p>
                        <p className="text-[11px] text-light-muted dark:text-dark-muted">
                          {exp.groupName} • Paid by {exp.paid_by_name || 'Member'}
                        </p>
                      </div>
                    </div>
                    <span className="font-black text-light-foreground dark:text-dark-foreground text-sm">
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

          {/* Suggested Settlements (Smart Debt Optimization) */}
          <Card>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-light-border dark:border-dark-border">
              <div>
                <h2 className="text-lg font-bold text-light-foreground dark:text-dark-foreground">
                  Suggested Settlements
                </h2>
                <p className="text-xs text-light-muted dark:text-dark-muted">
                  Optimized peer-to-peer balance settlements
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => navigate('/settlements')}>
                Details
              </Button>
            </div>

            {settlementsList.length > 0 ? (
              <div className="flex flex-col gap-3">
                {settlementsList.slice(0, 4).map((s, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-card bg-primary/5 dark:bg-primary/10 border border-primary/20 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-light-foreground dark:text-dark-foreground">
                        {s.groupName}
                      </p>
                      <p className="text-[11px] text-light-muted dark:text-dark-muted">
                        Consolidated debt balance
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-primary text-sm">
                        {formatRupees(s.amount)}
                      </span>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => navigate(`/groups/${s.groupId}`)}
                      >
                        Settle
                      </Button>
                    </div>
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
