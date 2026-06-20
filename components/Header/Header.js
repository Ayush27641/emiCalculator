'use client';

import styles from './Header.module.css';

export default function Header({
  theme,
  toggleTheme,
  activeTab,
  setActiveTab,
  isSynced,
  tabId,
  tabCount,
  isLeader,
}) {
  const tabs = [
    { id: 'single', label: '☐ Single' },
    { id: 'compare', label: '☷ Compare' },
    { id: 'prepayment', label: '$ Prepayment' },
  ];

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <div className={styles.logoSection}>
          <div className={styles.logoIcon}>E</div>
          <div className={styles.logoText}>
            <h1>EMI Workspace</h1>
            <p>Loan calculator &bull; synced across tabs</p>
          </div>
        </div>

        <nav className={styles.nav}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              id={`nav-tab-${tab.id}`}
              className={`${styles.navButton} ${activeTab === tab.id ? styles.navButtonActive : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className={styles.actions}>
          {/* Tab Identity */}
          <div className={styles.tabIdentity} id="tab-identity">
            <span className={styles.tabIdLabel}>{tabId || 'Tab 01'}</span>
            {isLeader && <span className={styles.leaderBadge}>LEADER</span>}
          </div>

          {/* Active Tab Count */}
          <div className={`${styles.tabCountBadge} ${isSynced ? styles.syncBadgeActive : ''}`} id="tab-count">
            <span className={styles.syncDot}></span>
            {tabCount || 1} tab{(tabCount || 1) !== 1 ? 's' : ''}
          </div>

          {/* Theme Toggle */}
          <button
            id="theme-toggle"
            className={styles.themeToggle}
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </div>
    </header>
  );
}
