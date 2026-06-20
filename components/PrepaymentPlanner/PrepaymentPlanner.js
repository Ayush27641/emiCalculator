'use client';

import { useState, useMemo, useCallback } from 'react';
import styles from './PrepaymentPlanner.module.css';
import {
  calculateEMI,
  calculateAmortizationWithPrepayments,
  formatCurrency,
} from '../../utils/emiCalculator';

export default function PrepaymentPlanner({ loanAmount, interestRate, tenure, prepayments, onUpdatePrepayments, onUpdate }) {
  const [newMonth, setNewMonth] = useState('');
  const [newAmount, setNewAmount] = useState('');

  const handleLoanAmount = useCallback((value) => {
    const num = Math.min(50000000, Math.max(10000, Number(value) || 10000));
    onUpdate({ loanAmount: num });
  }, [onUpdate]);

  const handleInterestRate = useCallback((value) => {
    const num = Math.min(36, Math.max(1, Number(value) || 1));
    onUpdate({ interestRate: num });
  }, [onUpdate]);

  const handleTenure = useCallback((value) => {
    const num = Math.min(360, Math.max(1, Math.round(Number(value)) || 1));
    onUpdate({ tenure: num });
  }, [onUpdate]);

  const emi = useMemo(() => calculateEMI(loanAmount, interestRate, tenure), [loanAmount, interestRate, tenure]);

  const prepaymentResult = useMemo(() => {
    return calculateAmortizationWithPrepayments(loanAmount, interestRate, tenure, emi, prepayments);
  }, [loanAmount, interestRate, tenure, emi, prepayments]);

  const handleAddPrepayment = useCallback(() => {
    const month = parseInt(newMonth);
    const amount = parseInt(newAmount);
    if (!month || !amount || month < 1 || month > tenure || amount < 1) return;

    const updated = [...prepayments, { month, amount, id: Date.now() }].sort((a, b) => a.month - b.month);
    onUpdatePrepayments(updated);
    setNewMonth('');
    setNewAmount('');
  }, [newMonth, newAmount, tenure, prepayments, onUpdatePrepayments]);

  const handleRemovePrepayment = useCallback(
    (id) => {
      onUpdatePrepayments(prepayments.filter((p) => p.id !== id));
    },
    [prepayments, onUpdatePrepayments]
  );

  const totalPrepaymentAmount = prepayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className={styles.card}>
      <h2 className={styles.title}>Prepayment Planner</h2>
      <p className={styles.subtitle}>
        Schedule lump-sum payments to reduce tenure and save interest — synced across tabs.
      </p>

      {/* Loan inputs bar */}
      <div className={styles.loanSummaryBar}>
        <div className={styles.loanSummaryItem}>
          <label className={styles.loanSummaryLabel} htmlFor="pp-loan-amount">Loan Amount</label>
          <div className={styles.loanInputWrapper}>
            <input
              id="pp-loan-amount"
              type="number"
              className={styles.loanInput}
              value={loanAmount}
              min={10000}
              max={50000000}
              step={10000}
              onChange={(e) => handleLoanAmount(e.target.value)}
            />
            <span className={styles.loanInputSuffix}>₹</span>
          </div>
        </div>
        <div className={styles.loanSummaryDivider} />
        <div className={styles.loanSummaryItem}>
          <label className={styles.loanSummaryLabel} htmlFor="pp-interest-rate">Interest Rate</label>
          <div className={styles.loanInputWrapper}>
            <input
              id="pp-interest-rate"
              type="number"
              className={styles.loanInput}
              value={interestRate}
              min={1}
              max={36}
              step={0.1}
              onChange={(e) => handleInterestRate(e.target.value)}
            />
            <span className={styles.loanInputSuffix}>% p.a.</span>
          </div>
        </div>
        <div className={styles.loanSummaryDivider} />
        <div className={styles.loanSummaryItem}>
          <label className={styles.loanSummaryLabel} htmlFor="pp-tenure">Tenure</label>
          <div className={styles.loanInputWrapper}>
            <input
              id="pp-tenure"
              type="number"
              className={styles.loanInput}
              value={tenure}
              min={1}
              max={360}
              step={1}
              onChange={(e) => handleTenure(e.target.value)}
            />
            <span className={styles.loanInputSuffix}>months</span>
          </div>
        </div>
        <div className={styles.loanSummaryDivider} />
        <div className={styles.loanSummaryItem}>
          <span className={styles.loanSummaryLabel}>Monthly EMI</span>
          <span className={styles.loanSummaryValue}>{formatCurrency(emi)}</span>
        </div>
      </div>

      {/* Prepayment input + savings side by side */}
      <div className={styles.layout}>
        {/* Left: Add prepayments */}
        <div className={styles.leftPanel}>
          <div className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>💰</span> Add Prepayment
          </div>
          <div className={styles.prepaymentForm}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Month #</label>
                <input
                  id="prepayment-month-input"
                  type="number"
                  className={styles.formInput}
                  placeholder={`1 – ${tenure}`}
                  min={1}
                  max={tenure}
                  value={newMonth}
                  onChange={(e) => setNewMonth(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPrepayment()}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Amount (₹)</label>
                <input
                  id="prepayment-amount-input"
                  type="number"
                  className={styles.formInput}
                  placeholder="e.g. 100000"
                  min={1}
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPrepayment()}
                />
              </div>
              <button
                id="add-prepayment-btn"
                className={styles.addPrepaymentBtn}
                onClick={handleAddPrepayment}
                disabled={!newMonth || !newAmount}
              >
                Add
              </button>
            </div>

            {prepayments.length > 0 ? (
              <ul className={styles.prepaymentsList}>
                {prepayments.map((pp) => (
                  <li key={pp.id} className={styles.prepaymentItem}>
                    <div className={styles.prepaymentInfo}>
                      <span className={styles.prepaymentMonth}>Month {pp.month}</span>
                      <span className={styles.prepaymentAmount}>{formatCurrency(pp.amount)}</span>
                    </div>
                    <button
                      className={styles.removeBtn}
                      onClick={() => handleRemovePrepayment(pp.id)}
                      title="Remove"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={styles.emptyState}>
                No prepayments added yet. Add one above to see savings.
              </div>
            )}
          </div>
        </div>

        {/* Right: Savings results */}
        <div className={styles.rightPanel}>
          <div className={styles.savingsGrid}>
            <div className={`${styles.savingsCard} ${prepaymentResult.interestSaved > 0 ? styles.savingsCardHighlight : ''}`}>
              <div className={styles.savingsLabel}>Interest Saved</div>
              <div className={`${styles.savingsValue} ${prepaymentResult.interestSaved > 0 ? styles.savingsValueGreen : ''}`}>
                {formatCurrency(prepaymentResult.interestSaved)}
              </div>
            </div>
            <div className={`${styles.savingsCard} ${prepaymentResult.tenureReduced > 0 ? styles.savingsCardHighlight : ''}`}>
              <div className={styles.savingsLabel}>Tenure Reduced</div>
              <div className={`${styles.savingsValue} ${prepaymentResult.tenureReduced > 0 ? styles.savingsValueGreen : ''}`}>
                {prepaymentResult.tenureReduced} mo
              </div>
            </div>
            <div className={styles.savingsCard}>
              <div className={styles.savingsLabel}>New Tenure</div>
              <div className={styles.savingsValue}>
                {prepaymentResult.actualTenure} mo
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full amortization schedule */}
      {prepaymentResult.schedule.length > 0 && (
        <div className={styles.scheduleSection}>
          <div className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>📊</span>
            {prepayments.length > 0 ? 'Updated Amortization Schedule' : 'Amortization Schedule'}
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>EMI</th>
                  <th>Principal</th>
                  <th>Interest</th>
                  <th>Prepayment</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {prepaymentResult.schedule.map((row) => (
                  <tr
                    key={row.month}
                    className={row.prepayment > 0 ? styles.prepaymentRow : ''}
                  >
                    <td>{row.month}</td>
                    <td>{formatCurrency(row.emi)}</td>
                    <td>{formatCurrency(row.principalPaid)}</td>
                    <td>{formatCurrency(row.interestPaid)}</td>
                    <td className={row.prepayment > 0 ? styles.prepaymentHighlight : ''}>
                      {row.prepayment > 0 ? formatCurrency(row.prepayment) : '—'}
                    </td>
                    <td>{formatCurrency(row.balanceRemaining)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
