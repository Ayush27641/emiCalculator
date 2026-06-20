/**
 * EMI Calculator Utility Functions
 * Uses the standard reducing-balance method for all calculations.
 */

/**
 * Calculate Monthly EMI using reducing-balance formula
 * EMI = P × r × (1 + r)^n / ((1 + r)^n - 1)
 * 
 * @param {number} principal - Loan amount in ₹
 * @param {number} annualRate - Annual interest rate in %
 * @param {number} tenureMonths - Tenure in months
 * @returns {number} Monthly EMI amount
 */
export function calculateEMI(principal, annualRate, tenureMonths) {
  if (principal <= 0 || annualRate <= 0 || tenureMonths <= 0) return 0;

  const monthlyRate = annualRate / 12 / 100;
  const powerTerm = Math.pow(1 + monthlyRate, tenureMonths);
  const emi = (principal * monthlyRate * powerTerm) / (powerTerm - 1);

  return Math.round(emi);
}

/**
 * Calculate total amount payable = EMI × n
 */
export function calculateTotalPayable(emi, tenureMonths) {
  return Math.round(emi * tenureMonths);
}

/**
 * Calculate total interest = Total Payable - Principal
 */
export function calculateTotalInterest(totalPayable, principal) {
  return Math.round(totalPayable - principal);
}

/**
 * Calculate principal and interest share percentages
 */
export function calculateShares(principal, totalPayable) {
  if (totalPayable <= 0) return { principalShare: 0, interestShare: 0 };
  const principalShare = (principal / totalPayable) * 100;
  const interestShare = 100 - principalShare;
  return {
    principalShare: Math.round(principalShare * 100) / 100,
    interestShare: Math.round(interestShare * 100) / 100,
  };
}

/**
 * Generate full amortization schedule month by month
 * For each month:
 *   interestPaid = balance × r
 *   principalPaid = EMI - interestPaid
 *   balance = balance - principalPaid
 * 
 * @returns {Array} Array of month-by-month breakdown objects
 */
export function calculateAmortizationSchedule(principal, annualRate, tenureMonths, emi) {
  if (principal <= 0 || annualRate <= 0 || tenureMonths <= 0 || emi <= 0) return [];

  const monthlyRate = annualRate / 12 / 100;
  const schedule = [];
  let balance = principal;
  let cumulativePrincipal = 0;
  let cumulativeInterest = 0;

  for (let month = 1; month <= tenureMonths; month++) {
    const interestPaid = Math.round(balance * monthlyRate);
    let principalPaid = emi - interestPaid;

    // Last month adjustment
    if (month === tenureMonths) {
      principalPaid = balance;
    }

    balance = Math.max(0, balance - principalPaid);
    cumulativePrincipal += principalPaid;
    cumulativeInterest += interestPaid;

    schedule.push({
      month,
      emi: month === tenureMonths ? principalPaid + interestPaid : emi,
      principalPaid,
      interestPaid,
      prepayment: 0,
      balanceRemaining: Math.max(0, balance),
      cumulativePrincipal,
      cumulativeInterest,
    });
  }

  return schedule;
}

/**
 * Find the break-even month where cumulative principal > cumulative interest
 */
export function findBreakEvenMonth(schedule) {
  for (const row of schedule) {
    if (row.cumulativePrincipal > row.cumulativeInterest) {
      return row.month;
    }
  }
  return null;
}

/**
 * Generate sensitivity analysis data
 * Rate: current ± 1%, ± 2%, ± 3% (7 columns)
 * Tenure: current ± 6, ± 12, ± 24 months (7 rows)
 * Clamp to valid bounds (rate 1–36%, tenure 1–84) and de-duplicate.
 */
export function generateSensitivityData(principal, currentRate, currentTenure) {
  // Build rate axis: current ± 1, 2, 3, clamped and deduped
  const rateOffsets = [-3, -2, -1, 0, 1, 2, 3];
  const ratesRaw = rateOffsets.map(o => Math.round(currentRate + o));
  const ratesClamped = ratesRaw.map(r => Math.max(1, Math.min(36, r)));
  const rates = [...new Set(ratesClamped)];

  // Build tenure axis: current ± 6, 12, 24, clamped and deduped
  const tenureOffsets = [-24, -12, -6, 0, 6, 12, 24];
  const tenuresRaw = tenureOffsets.map(o => Math.round(currentTenure + o));
  const tenuresClamped = tenuresRaw.map(t => Math.max(1, Math.min(84, t)));
  const tenures = [...new Set(tenuresClamped)];

  const data = tenures.map(tenure => {
    const years = tenure / 12;
    const label = tenure < 12 ? `${tenure} mo` : `${years % 1 === 0 ? years : years.toFixed(1)} yr${years > 1 ? 's' : ''}`;
    const row = { tenure: label, tenureMonths: tenure };
    rates.forEach(rate => {
      row[`${rate}%`] = calculateEMI(principal, rate, tenure);
    });
    return row;
  });

  return { rates, tenures, data };
}

/**
 * Calculate amortization schedule WITH prepayments (reduce-tenure strategy).
 * Prepayment is applied at the start of its month, before interest is charged.
 * EMI stays fixed; the loan simply finishes sooner.
 *
 * @param {number} principal - Loan amount
 * @param {number} annualRate - Annual interest rate %
 * @param {number} tenureMonths - Original tenure in months
 * @param {number} emi - Fixed monthly EMI
 * @param {Array} prepayments - Array of { month, amount } objects
 * @returns {{ schedule, actualTenure, totalInterest, interestSaved, tenureReduced }}
 */
export function calculateAmortizationWithPrepayments(principal, annualRate, tenureMonths, emi, prepayments = []) {
  if (principal <= 0 || annualRate <= 0 || tenureMonths <= 0 || emi <= 0) {
    return { schedule: [], actualTenure: 0, totalInterest: 0, interestSaved: 0, tenureReduced: 0 };
  }

  // If no prepayments, use the standard schedule to avoid rounding drift
  if (!prepayments || prepayments.length === 0) {
    const schedule = calculateAmortizationSchedule(principal, annualRate, tenureMonths, emi);
    const totalInterest = schedule.length > 0 ? schedule[schedule.length - 1].cumulativeInterest : 0;
    return {
      schedule,
      actualTenure: tenureMonths,
      totalInterest,
      interestSaved: 0,
      tenureReduced: 0,
      originalTotalInterest: totalInterest,
    };
  }

  const monthlyRate = annualRate / 12 / 100;

  // Build a prepayment map: month -> total prepayment amount
  const prepaymentMap = {};
  for (const pp of prepayments) {
    const m = pp.month;
    if (m >= 1 && m <= tenureMonths) {
      prepaymentMap[m] = (prepaymentMap[m] || 0) + pp.amount;
    }
  }

  const schedule = [];
  let balance = principal;
  let cumulativePrincipal = 0;
  let cumulativeInterest = 0;
  let month = 0;
  const maxMonths = tenureMonths * 2; // safety cap

  while (balance > 0 && month < maxMonths) {
    month++;

    // 1. Apply prepayment at start of month (before interest)
    let prepaymentThisMonth = 0;
    if (prepaymentMap[month]) {
      prepaymentThisMonth = Math.min(prepaymentMap[month], balance);
      balance = Math.max(0, balance - prepaymentThisMonth);
    }

    if (balance <= 0) {
      // Prepayment cleared the loan
      schedule.push({
        month,
        emi: 0,
        principalPaid: 0,
        interestPaid: 0,
        prepayment: prepaymentThisMonth,
        balanceRemaining: 0,
        cumulativePrincipal: cumulativePrincipal + prepaymentThisMonth,
        cumulativeInterest,
      });
      break;
    }

    // 2. Calculate interest on remaining balance
    const interestPaid = Math.round(balance * monthlyRate);

    // 3. Principal portion of EMI
    let principalPaid = emi - interestPaid;

    // If remaining balance is less than the EMI principal portion, this is the last month
    if (principalPaid >= balance) {
      principalPaid = balance;
      balance = 0;
    } else {
      balance = balance - principalPaid;
    }

    cumulativePrincipal += principalPaid + prepaymentThisMonth;
    cumulativeInterest += interestPaid;

    schedule.push({
      month,
      emi: principalPaid + interestPaid,
      principalPaid,
      interestPaid,
      prepayment: prepaymentThisMonth,
      balanceRemaining: Math.max(0, balance),
      cumulativePrincipal,
      cumulativeInterest,
    });
  }

  const actualTenure = schedule.length;
  const totalInterestWithPrepay = cumulativeInterest;

  // Calculate original total interest for comparison
  const originalSchedule = calculateAmortizationSchedule(principal, annualRate, tenureMonths, emi);
  const originalTotalInterest = originalSchedule.length > 0
    ? originalSchedule[originalSchedule.length - 1].cumulativeInterest
    : 0;

  return {
    schedule,
    actualTenure,
    totalInterest: totalInterestWithPrepay,
    interestSaved: Math.max(0, originalTotalInterest - totalInterestWithPrepay),
    tenureReduced: Math.max(0, tenureMonths - actualTenure),
    originalTotalInterest,
  };
}

/**
 * Format number as Indian currency
 */
export function formatCurrency(num) {
  if (num === 0 || isNaN(num)) return '₹0';
  const isNegative = num < 0;
  num = Math.abs(Math.round(num));
  const str = num.toString();
  let result = '';
  
  if (str.length <= 3) {
    result = str;
  } else {
    result = str.slice(-3);
    let remaining = str.slice(0, -3);
    while (remaining.length > 2) {
      result = remaining.slice(-2) + ',' + result;
      remaining = remaining.slice(0, -2);
    }
    if (remaining.length > 0) {
      result = remaining + ',' + result;
    }
  }
  
  return (isNegative ? '-' : '') + '₹' + result;
}

/**
 * Export amortization schedule as CSV
 */
export function exportToCSV(schedule) {
  const headers = ['Month', 'EMI', 'Principal Paid', 'Interest Paid', 'Prepayment', 'Balance Remaining'];
  const rows = schedule.map(row => [
    row.month,
    row.emi,
    row.principalPaid,
    row.interestPaid,
    row.prepayment,
    row.balanceRemaining,
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'amortization_schedule.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}
