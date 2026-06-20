'use client';

import { useMemo } from 'react';
import styles from './SensitivityTable.module.css';
import { generateSensitivityData, formatCurrency } from '../../utils/emiCalculator';

export default function SensitivityTable({ loanAmount, interestRate, tenure }) {
  const { rates, data } = useMemo(
    () => generateSensitivityData(loanAmount, interestRate, tenure),
    [loanAmount, interestRate, tenure]
  );

  // The center cell (offset 0 on both axes) is the current selection
  const currentRate = Math.round(interestRate);
  const currentTenure = Math.round(tenure);

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>Sensitivity Analysis</h2>
      <p className={styles.cardSubtitle}>
        Rate ±3% × Tenure ±24mo — current values highlighted
      </p>

      <div className={styles.tableWrapper}>
        <table className={styles.table} id="sensitivity-table">
          <thead>
            <tr>
              <th>Tenure ╲ Rate</th>
              {rates.map((rate) => (
                <th
                  key={rate}
                  className={rate === currentRate ? styles.currentHeader : ''}
                >
                  {rate}%
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={row.tenureMonths}
                className={row.tenureMonths === currentTenure ? styles.currentRow : ''}
              >
                <td>{row.tenure}</td>
                {rates.map((rate) => {
                  const isCurrent =
                    rate === currentRate && row.tenureMonths === currentTenure;
                  return (
                    <td
                      key={rate}
                      className={isCurrent ? styles.currentCell : ''}
                    >
                      {formatCurrency(row[`${rate}%`])}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
