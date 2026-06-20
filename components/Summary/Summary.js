'use client';

import { useMemo } from 'react';
import styles from './Summary.module.css';
import { calculateEMI, calculateTotalPayable, calculateTotalInterest, calculateShares, formatCurrency } from '../../utils/emiCalculator';

export default function Summary({ loanAmount, interestRate, tenure }) {
  const { emi, totalPayable, totalInterest, principalShare, interestShare } = useMemo(() => {
    const emi = calculateEMI(loanAmount, interestRate, tenure);
    const totalPayable = calculateTotalPayable(emi, tenure);
    const totalInterest = calculateTotalInterest(totalPayable, loanAmount);
    const { principalShare, interestShare } = calculateShares(loanAmount, totalPayable);
    return { emi, totalPayable, totalInterest, principalShare, interestShare };
  }, [loanAmount, interestRate, tenure]);

  return (
    <div>
      <div className={styles.summaryGrid}>
        <div className={`${styles.summaryCard} ${styles.summaryCardEmi}`}>
          <div className={styles.summaryLabel}>Monthly EMI</div>
          <div className={styles.summaryValue} id="emi-value">{formatCurrency(emi)}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Total Interest</div>
          <div className={styles.summaryValue} id="total-interest-value">{formatCurrency(totalInterest)}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Total Amount</div>
          <div className={styles.summaryValue} id="total-amount-value">{formatCurrency(totalPayable)}</div>
        </div>
      </div>

      <div className={styles.ratioSection}>
        <div className={styles.ratioTitle}>Principal vs Interest</div>
        <div className={styles.ratioBar}>
          <div className={styles.ratioPrincipal} style={{ width: `${principalShare}%` }} />
          <div className={styles.ratioInterest} style={{ width: `${interestShare}%` }} />
        </div>
        <div className={styles.ratioLegend}>
          <div className={styles.ratioLegendItem}>
            <span className={`${styles.legendDot} ${styles.legendDotPrincipal}`} />
            Principal <span className={styles.legendValue}>{formatCurrency(loanAmount)}</span>
            <span>({principalShare}%)</span>
          </div>
          <div className={styles.ratioLegendItem}>
            <span className={`${styles.legendDot} ${styles.legendDotInterest}`} />
            Interest <span className={styles.legendValue}>{formatCurrency(totalInterest)}</span>
            <span>({interestShare}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
