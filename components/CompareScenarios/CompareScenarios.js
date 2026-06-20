'use client';

import { useMemo, useCallback } from 'react';
import styles from './CompareScenarios.module.css';
import {
  calculateEMI,
  calculateTotalPayable,
  calculateTotalInterest,
  formatCurrency,
} from '../../utils/emiCalculator';

const SCENARIO_NAMES = ['Conservative', 'Aggressive', 'Balanced'];
const DEFAULT_SCENARIOS = [
  { id: 1, name: 'Conservative', loanAmount: 1500000, interestRate: 10.5, tenure: 60 },
  { id: 2, name: 'Aggressive', loanAmount: 1500000, interestRate: 12, tenure: 24 },
];

export default function CompareScenarios({ scenarios, onUpdateScenarios }) {
  const items = scenarios && scenarios.length > 0 ? scenarios : DEFAULT_SCENARIOS;

  // Calculate results for each scenario
  const results = useMemo(() => {
    return items.map((s) => {
      const emi = calculateEMI(s.loanAmount, s.interestRate, s.tenure);
      const totalPayable = calculateTotalPayable(emi, s.tenure);
      const totalInterest = calculateTotalInterest(totalPayable, s.loanAmount);
      return { ...s, emi, totalPayable, totalInterest };
    });
  }, [items]);

  // Find the best scenario (lowest total payable)
  const bestId = useMemo(() => {
    if (results.length === 0) return null;
    return results.reduce((best, curr) =>
      curr.totalPayable < best.totalPayable ? curr : best
    ).id;
  }, [results]);

  const handleAddScenario = useCallback(() => {
    if (items.length >= 3) return;
    const newId = Math.max(...items.map((s) => s.id), 0) + 1;
    const name = SCENARIO_NAMES[items.length] || `Scenario ${newId}`;
    const newScenarios = [
      ...items,
      { id: newId, name, loanAmount: 1500000, interestRate: 11, tenure: 48 },
    ];
    onUpdateScenarios(newScenarios);
  }, [items, onUpdateScenarios]);

  const handleRemoveScenario = useCallback(
    (id) => {
      if (items.length <= 1) return;
      onUpdateScenarios(items.filter((s) => s.id !== id));
    },
    [items, onUpdateScenarios]
  );

  const handleUpdateScenario = useCallback(
    (id, field, value) => {
      const updated = items.map((s) => {
        if (s.id !== id) return s;
        let numValue = Number(value);
        switch (field) {
          case 'loanAmount':
            numValue = Math.min(5000000, Math.max(10000, numValue || 10000));
            break;
          case 'interestRate':
            numValue = Math.min(36, Math.max(1, numValue || 1));
            break;
          case 'tenure':
            numValue = Math.min(84, Math.max(1, Math.round(numValue) || 1));
            break;
        }
        return { ...s, [field]: numValue };
      });
      onUpdateScenarios(updated);
    },
    [items, onUpdateScenarios]
  );

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>Compare Scenarios</h2>
        <button
          id="add-scenario-btn"
          className={styles.addButton}
          onClick={handleAddScenario}
          disabled={items.length >= 3}
        >
          + Add Scenario
        </button>
      </div>
      <p className={styles.subtitle}>
        Configure up to 3 scenarios — the lowest total cost is highlighted.
      </p>

      <div className={styles.scenariosGrid}>
        {results.map((scenario) => {
          const isBest = scenario.id === bestId && results.length > 1;
          return (
            <div
              key={scenario.id}
              className={`${styles.scenarioCard} ${isBest ? styles.bestScenario : ''}`}
            >
              {isBest && <span className={styles.bestBadge}>BEST VALUE</span>}
              <div className={styles.scenarioHeader}>
                <span className={styles.scenarioName}>{scenario.name}</span>
                {items.length > 1 && (
                  <button
                    className={styles.removeButton}
                    onClick={() => handleRemoveScenario(scenario.id)}
                    title="Remove scenario"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Amount */}
              <div className={styles.inputRow}>
                <div className={styles.inputRowLabel}>Amount</div>
                <div className={styles.inputRowContent}>
                  <span className={styles.inputUnit}>₹</span>
                  <input
                    type="number"
                    className={styles.scenarioInput}
                    value={scenario.loanAmount}
                    min={10000}
                    max={5000000}
                    onChange={(e) =>
                      handleUpdateScenario(scenario.id, 'loanAmount', e.target.value)
                    }
                  />
                </div>
                <input
                  type="range"
                  className={styles.scenarioSlider}
                  min={10000}
                  max={5000000}
                  step={10000}
                  value={scenario.loanAmount}
                  onChange={(e) =>
                    handleUpdateScenario(scenario.id, 'loanAmount', e.target.value)
                  }
                />
                <div className={styles.sliderRange}>
                  <span>₹10K</span>
                  <span>₹50.00L</span>
                </div>
              </div>

              {/* Rate */}
              <div className={styles.inputRow}>
                <div className={styles.inputRowLabel}>Rate</div>
                <div className={styles.inputRowContent}>
                  <input
                    type="number"
                    className={styles.scenarioInput}
                    value={scenario.interestRate}
                    min={1}
                    max={36}
                    step={0.1}
                    onChange={(e) =>
                      handleUpdateScenario(scenario.id, 'interestRate', e.target.value)
                    }
                  />
                  <span className={styles.inputUnit}>%</span>
                </div>
                <input
                  type="range"
                  className={styles.scenarioSlider}
                  min={1}
                  max={36}
                  step={0.1}
                  value={scenario.interestRate}
                  onChange={(e) =>
                    handleUpdateScenario(scenario.id, 'interestRate', e.target.value)
                  }
                />
                <div className={styles.sliderRange}>
                  <span>1%</span>
                  <span>36%</span>
                </div>
              </div>

              {/* Tenure */}
              <div className={styles.inputRow}>
                <div className={styles.inputRowLabel}>Tenure</div>
                <div className={styles.inputRowContent}>
                  <input
                    type="number"
                    className={styles.scenarioInput}
                    value={scenario.tenure}
                    min={1}
                    max={84}
                    onChange={(e) =>
                      handleUpdateScenario(scenario.id, 'tenure', e.target.value)
                    }
                  />
                  <span className={styles.inputUnit}>mo</span>
                </div>
                <input
                  type="range"
                  className={styles.scenarioSlider}
                  min={1}
                  max={84}
                  step={1}
                  value={scenario.tenure}
                  onChange={(e) =>
                    handleUpdateScenario(scenario.id, 'tenure', e.target.value)
                  }
                />
                <div className={styles.sliderRange}>
                  <span>1 mo</span>
                  <span>7 yr</span>
                </div>
              </div>

              {/* Results */}
              <div className={styles.results}>
                <div className={styles.resultRow}>
                  <span className={styles.resultLabel}>Monthly EMI</span>
                  <span className={`${styles.resultValue} ${styles.resultValueEmi}`}>
                    {formatCurrency(scenario.emi)}
                  </span>
                </div>
                <div className={styles.resultRow}>
                  <span className={styles.resultLabel}>Total Interest</span>
                  <span className={styles.resultValue}>
                    {formatCurrency(scenario.totalInterest)}
                  </span>
                </div>
                <div className={styles.resultRow}>
                  <span className={styles.resultLabel}>Total Payable</span>
                  <span className={styles.resultValue}>
                    {formatCurrency(scenario.totalPayable)}
                    {isBest && (
                      <span className={styles.lowestBadge}>✓ lowest</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
