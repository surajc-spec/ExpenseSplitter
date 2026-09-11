import React from 'react';
import { Card } from '../common/Card';

export const Features = () => {
  const featureList = [
    {
      title: 'Flexible Split Options',
      description: 'Support for equal distribution, exact rupee splits, and percentage breakdowns for any group expense.',
      tag: 'Splits',
    },
    {
      title: 'Greedy Debt Minification',
      description: 'Automatically aggregates all debts and minimizes the total number of payment transactions required.',
      tag: 'Optimization',
    },
    {
      title: 'Advisory Transaction Locks',
      description: 'PostgreSQL advisory transaction locking prevents parallel race conditions and over-settlement.',
      tag: 'Concurrency',
    },
    {
      title: 'Idempotent Settlements',
      description: 'Every settlement submission requires a unique Idempotency-Key with SHA-256 request payload verification.',
      tag: 'Safety',
    },
    {
      title: 'Full Audit Trail',
      description: 'Immutable transactional audit logging tracks every financial settlement with structured JSONB metadata.',
      tag: 'Auditing',
    },
    {
      title: 'Redis Rate Protection',
      description: 'Fixed-window IP rate limiting protects authentication and financial endpoints against brute-force attacks.',
      tag: 'Security',
    },
  ];

  return (
    <section className="py-16 bg-light-surface-secondary/60 dark:bg-dark-surface-secondary/60 border-y border-light-border dark:border-dark-border px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-light-foreground dark:text-dark-foreground tracking-tight">
            Built for Financial Correctness & Integrity
          </h2>
          <p className="text-sm text-light-muted dark:text-dark-muted mt-2 max-w-xl mx-auto">
            Everything you need for transparent, transparent, and concurrency-safe expense tracking.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featureList.map((f, idx) => (
            <Card key={idx} className="flex flex-col justify-between gap-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded-badge inline-block mb-3">
                  {f.tag}
                </span>
                <h3 className="text-lg font-bold text-light-foreground dark:text-dark-foreground mb-2">
                  {f.title}
                </h3>
                <p className="text-xs text-light-muted dark:text-dark-muted leading-relaxed">
                  {f.description}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
