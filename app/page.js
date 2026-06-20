'use client';

import { useCallback } from 'react';
import styles from './page.module.css';
import Header from '../components/Header/Header';
import LoanInputs from '../components/LoanInputs/LoanInputs';
import Summary from '../components/Summary/Summary';
import SensitivityTable from '../components/SensitivityTable/SensitivityTable';
import AmortizationSchedule from '../components/AmortizationSchedule/AmortizationSchedule';
import CompareScenarios from '../components/CompareScenarios/CompareScenarios';
import PrepaymentPlanner from '../components/PrepaymentPlanner/PrepaymentPlanner';
import { useSharedState, useSharedTheme } from '../hooks/useSharedState';
import { useTabPresence } from '../hooks/useTabPresence';

const DEFAULT_STATE = {
  loanAmount: 1500000,
  interestRate: 11,
  tenure: 48,
  activeTab: 'single',
  scenarios: [
    { id: 1, name: 'Conservative', loanAmount: 1500000, interestRate: 10.5, tenure: 60 },
    { id: 2, name: 'Aggressive', loanAmount: 1500000, interestRate: 12, tenure: 24 },
  ],
  prepayments: [],
};

export default function Home() {
  const [state, setState, isSynced, undo] = useSharedState(DEFAULT_STATE);
  const { theme, toggleTheme } = useSharedTheme();
  const { tabId, tabCount, isLeader } = useTabPresence();

  const activeTab = state.activeTab || 'single';
  const setActiveTab = useCallback(
    (tab) => setState((prev) => ({ ...prev, activeTab: tab })),
    [setState]
  );

  const handleUpdate = useCallback(
    (updates) => {
      setState((prev) => ({ ...prev, ...updates }));
    },
    [setState]
  );

  const handleUpdateScenarios = useCallback(
    (scenarios) => {
      setState((prev) => ({ ...prev, scenarios }));
    },
    [setState]
  );

  const handleUpdatePrepayments = useCallback(
    (prepayments) => {
      setState((prev) => ({ ...prev, prepayments }));
    },
    [setState]
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'single':
        return (
          <>
            <div className={styles.topGrid}>
              <LoanInputs
                loanAmount={state.loanAmount}
                interestRate={state.interestRate}
                tenure={state.tenure}
                onUpdate={handleUpdate}
              />
              <div className={styles.rightColumn}>
                <Summary
                  loanAmount={state.loanAmount}
                  interestRate={state.interestRate}
                  tenure={state.tenure}
                />
                <SensitivityTable
                  loanAmount={state.loanAmount}
                  interestRate={state.interestRate}
                  tenure={state.tenure}
                />
              </div>
            </div>
            <div className={styles.fullWidth}>
              <AmortizationSchedule
                loanAmount={state.loanAmount}
                interestRate={state.interestRate}
                tenure={state.tenure}
                prepayments={state.prepayments || []}
              />
            </div>
          </>
        );
      case 'compare':
        return (
          <CompareScenarios
            scenarios={state.scenarios || DEFAULT_STATE.scenarios}
            onUpdateScenarios={handleUpdateScenarios}
          />
        );
      case 'prepayment':
        return (
          <PrepaymentPlanner
            loanAmount={state.loanAmount}
            interestRate={state.interestRate}
            tenure={state.tenure}
            prepayments={state.prepayments || []}
            onUpdatePrepayments={handleUpdatePrepayments}
            onUpdate={handleUpdate}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Header
        theme={theme}
        toggleTheme={toggleTheme}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isSynced={isSynced}
        tabId={tabId}
        tabCount={tabCount}
        isLeader={isLeader}
      />
      <main className={styles.main}>
        <div className="container">
          {renderTabContent()}
          <footer className={styles.footer}>
            Open this page in a second tab — inputs, theme, and mode stay in sync via the BroadcastChannel API.
            <br />
            <span className={styles.footerHint}>Press <kbd>Ctrl+Z</kbd> to undo across all tabs</span>
          </footer>
        </div>
      </main>
    </>
  );
}
