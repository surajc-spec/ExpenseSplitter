import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { useTheme } from '../../context/ThemeContext';

export const FinancialOverviewChart = ({ groupsData = [] }) => {
  const { theme } = useTheme();

  if (!groupsData || groupsData.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-center text-xs text-light-muted dark:text-dark-muted border border-dashed border-light-border dark:border-dark-border rounded-card">
        No expense analytics available
      </div>
    );
  }

  const textColor = theme === 'dark' ? '#96A49E' : '#6D7A74';
  const tooltipBg = theme === 'dark' ? '#1B221E' : '#FAFFFD';
  const tooltipBorder = theme === 'dark' ? '#2A322E' : '#DEE4E1';

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={groupsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="name"
            stroke={textColor}
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke={textColor}
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `₹${val}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: tooltipBg,
              borderColor: tooltipBorder,
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
            formatter={(value) => [`₹${value}`, 'Amount']}
          />
          <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
            {groupsData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#36D79D' : '#29D163'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
