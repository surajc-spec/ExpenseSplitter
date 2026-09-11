import React from 'react';

export const HowItWorks = () => {
  const steps = [
    {
      step: '01',
      title: 'Create Your Expense Group',
      description: 'Start a group for a trip, house, or event and invite members using their registered email addresses.',
    },
    {
      step: '02',
      title: 'Log Shared Expenses',
      description: 'Add expenses paid by anyone. Choose equal, exact rupee amounts, or percentage splits for the participants.',
    },
    {
      step: '03',
      title: 'Settle Up Optimally',
      description: 'View simplified settlement suggestions that reduce transaction counts, and record settlements safely.',
    },
  ];

  return (
    <section className="py-16 px-4 max-w-5xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-black text-light-foreground dark:text-dark-foreground tracking-tight">
          How EquiSplit Works
        </h2>
        <p className="text-sm text-light-muted dark:text-dark-muted mt-2">
          Three simple steps to seamless group expense management
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {steps.map((s, idx) => (
          <div
            key={idx}
            className="p-6 rounded-card bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border shadow-card flex flex-col justify-between"
          >
            <div>
              <span className="text-3xl font-black text-primary block mb-3">
                {s.step}
              </span>
              <h3 className="text-base font-bold text-light-foreground dark:text-dark-foreground mb-2">
                {s.title}
              </h3>
              <p className="text-xs text-light-muted dark:text-dark-muted leading-relaxed">
                {s.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
