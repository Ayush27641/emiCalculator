'use client';

import { useMemo, useState, useEffect } from 'react';
import styles from './AmortizationSchedule.module.css';
import {
  calculateEMI,
  calculateAmortizationSchedule,
  calculateAmortizationWithPrepayments,
  findBreakEvenMonth,
  formatCurrency,
  exportToCSV,
} from '../../utils/emiCalculator';
import AmortizationChart from '../AmortizationChart/AmortizationChart';

const ROWS_PER_PAGE = 12;

export default function AmortizationSchedule({ loanAmount, interestRate, tenure, prepayments = [] }) {
  const [viewMode, setViewMode] = useState('table');
  const [currentPage, setCurrentPage] = useState(1);

  const { schedule, breakEvenMonth } = useMemo(() => {
    const emi = calculateEMI(loanAmount, interestRate, tenure);
    let schedule;
    if (prepayments.length > 0) {
      const result = calculateAmortizationWithPrepayments(loanAmount, interestRate, tenure, emi, prepayments);
      schedule = result.schedule;
    } else {
      schedule = calculateAmortizationSchedule(loanAmount, interestRate, tenure, emi);
    }
    const breakEvenMonth = findBreakEvenMonth(schedule);
    return { schedule, breakEvenMonth };
  }, [loanAmount, interestRate, tenure, prepayments]);

  const totalPages = Math.ceil(schedule.length / ROWS_PER_PAGE);
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
  const visibleRows = schedule.slice(startIndex, startIndex + ROWS_PER_PAGE);

  // Reset page when schedule changes
  useEffect(() => {
    setCurrentPage(1);
  }, [tenure, prepayments]);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2>Amortization Schedule</h2>
          <p>Month-by-month principal &amp; interest breakdown</p>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.viewToggle}>
            <button
              id="view-table-btn"
              className={`${styles.viewButton} ${viewMode === 'table' ? styles.viewButtonActive : ''}`}
              onClick={() => setViewMode('table')}
            >
              Table
            </button>
            <button
              id="view-chart-btn"
              className={`${styles.viewButton} ${viewMode === 'chart' ? styles.viewButtonActive : ''}`}
              onClick={() => setViewMode('chart')}
            >
              Chart
            </button>
          </div>
          {breakEvenMonth && (
            <span
              style={{
                fontSize: '12px',
                color: 'var(--accent-primary)',
                fontWeight: 600,
                padding: '4px 12px',
                background: 'var(--accent-primary-light)',
                borderRadius: 'var(--radius-full)',
              }}
            >
              Break-even at month {breakEvenMonth}
            </span>
          )}
          <button
            id="export-csv-btn"
            className={styles.exportButton}
            onClick={() => exportToCSV(schedule)}
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table} id="amortization-table">
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
                {visibleRows.map((row) => (
                  <tr
                    key={row.month}
                    className={`${row.month === breakEvenMonth ? styles.breakEvenRow : ''} ${row.prepayment > 0 ? styles.prepaymentRow : ''}`}
                  >
                    <td>
                      {row.month}
                      {row.month === breakEvenMonth && (
                        <span className={styles.breakEvenBadge}>Break-even</span>
                      )}
                    </td>
                    <td>{formatCurrency(row.emi)}</td>
                    <td>{formatCurrency(row.principalPaid)}</td>
                    <td>{formatCurrency(row.interestPaid)}</td>
                    <td className={row.prepayment > 0 ? styles.prepaymentHighlight : styles.prepaymentDash}>
                      {row.prepayment > 0 ? formatCurrency(row.prepayment) : '—'}
                    </td>
                    <td>{formatCurrency(row.balanceRemaining)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <span className={styles.pageInfo}>
                Showing {startIndex + 1}–{Math.min(startIndex + ROWS_PER_PAGE, schedule.length)} of{' '}
                {schedule.length} months
              </span>
              <div className={styles.pageButtons}>
                <button
                  className={styles.pageButton}
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                >
                  «
                </button>
                <button
                  className={styles.pageButton}
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  ‹
                </button>
                {getPageNumbers().map((page) => (
                  <button
                    key={page}
                    className={`${styles.pageButton} ${page === currentPage ? styles.pageButtonActive : ''}`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}
                <button
                  className={styles.pageButton}
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  ›
                </button>
                <button
                  className={styles.pageButton}
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                >
                  »
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className={styles.chartContainer}>
          <AmortizationChart schedule={schedule} />
        </div>
      )}
    </div>
  );
}
