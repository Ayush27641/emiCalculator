'use client';

import { useCallback } from 'react';
import styles from './LoanInputs.module.css';

export default function LoanInputs({ loanAmount, interestRate, tenure, onUpdate }) {
  const handleLoanAmount = useCallback((value) => {
    const num = Math.min(5000000, Math.max(10000, Number(value) || 10000));
    onUpdate({ loanAmount: num });
  }, [onUpdate]);

  const handleInterestRate = useCallback((value) => {
    const num = Math.min(36, Math.max(1, Number(value) || 1));
    onUpdate({ interestRate: num });
  }, [onUpdate]);

  const handleTenure = useCallback((value) => {
    const num = Math.min(84, Math.max(1, Math.round(Number(value)) || 1));
    onUpdate({ tenure: num });
  }, [onUpdate]);

  const getSliderPercent = (value, min, max) => {
    return ((value - min) / (max - min)) * 100;
  };

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>Loan Details</h2>
      <p className={styles.cardSubtitle}>Adjust and watch every tab update</p>

      {/* Loan Amount */}
      <div className={styles.inputGroup}>
        <div className={styles.inputLabel}>
          <span className={styles.inputLabelText}>Loan Amount</span>
        </div>
        <div className={styles.inputWrapper}>
          <input
            id="loan-amount-input"
            type="number"
            className={styles.numberInput}
            value={loanAmount}
            min={10000}
            max={5000000}
            onChange={(e) => handleLoanAmount(e.target.value)}
            onBlur={(e) => handleLoanAmount(e.target.value)}
          />
          <span className={styles.unitLabel}>₹</span>
        </div>
        <div className={styles.sliderContainer}>
          <div className={styles.sliderTrack}>
            <div
              className={styles.sliderFill}
              style={{ width: `${getSliderPercent(loanAmount, 10000, 5000000)}%` }}
            />
          </div>
          <input
            id="loan-amount-slider"
            type="range"
            className={styles.slider}
            min={10000}
            max={5000000}
            step={10000}
            value={loanAmount}
            onChange={(e) => handleLoanAmount(e.target.value)}
            style={{
              position: 'relative',
              marginTop: '-6px',
              background: 'transparent',
            }}
          />
          <div className={styles.sliderLabels}>
            <span className={styles.sliderMin}>₹10K</span>
            <span className={styles.sliderMax}>₹50L</span>
          </div>
        </div>
      </div>

      {/* Interest Rate */}
      <div className={styles.inputGroup}>
        <div className={styles.inputLabel}>
          <span className={styles.inputLabelText}>Interest Rate (p.a.)</span>
        </div>
        <div className={styles.inputWrapper}>
          <input
            id="interest-rate-input"
            type="number"
            className={styles.numberInput}
            value={interestRate}
            min={1}
            max={36}
            step={0.1}
            onChange={(e) => handleInterestRate(e.target.value)}
            onBlur={(e) => handleInterestRate(e.target.value)}
          />
          <span className={styles.unitLabel}>% p.a.</span>
        </div>
        <div className={styles.sliderContainer}>
          <div className={styles.sliderTrack}>
            <div
              className={styles.sliderFill}
              style={{ width: `${getSliderPercent(interestRate, 1, 36)}%` }}
            />
          </div>
          <input
            id="interest-rate-slider"
            type="range"
            className={styles.slider}
            min={1}
            max={36}
            step={0.1}
            value={interestRate}
            onChange={(e) => handleInterestRate(e.target.value)}
            style={{
              position: 'relative',
              marginTop: '-6px',
              background: 'transparent',
            }}
          />
          <div className={styles.sliderLabels}>
            <span className={styles.sliderMin}>1%</span>
            <span className={styles.sliderMax}>36%</span>
          </div>
        </div>
      </div>

      {/* Tenure */}
      <div className={styles.inputGroup}>
        <div className={styles.inputLabel}>
          <span className={styles.inputLabelText}>Tenure</span>
        </div>
        <div className={styles.inputWrapper}>
          <input
            id="tenure-input"
            type="number"
            className={styles.numberInput}
            value={tenure}
            min={1}
            max={84}
            onChange={(e) => handleTenure(e.target.value)}
            onBlur={(e) => handleTenure(e.target.value)}
          />
          <span className={styles.unitLabel}>months</span>
        </div>
        <div className={styles.sliderContainer}>
          <div className={styles.sliderTrack}>
            <div
              className={styles.sliderFill}
              style={{ width: `${getSliderPercent(tenure, 1, 84)}%` }}
            />
          </div>
          <input
            id="tenure-slider"
            type="range"
            className={styles.slider}
            min={1}
            max={84}
            step={1}
            value={tenure}
            onChange={(e) => handleTenure(e.target.value)}
            style={{
              position: 'relative',
              marginTop: '-6px',
              background: 'transparent',
            }}
          />
          <div className={styles.sliderLabels}>
            <span className={styles.sliderMin}>1 mo</span>
            <span className={styles.sliderMax}>84 mo</span>
          </div>
        </div>
      </div>
    </div>
  );
}
