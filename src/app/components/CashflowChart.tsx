import React, { useState, useEffect } from 'react';

interface LumpSum {
  id: string;
  amount: number;
  description: string;
  date: string; // YYYY-MM-DD format
  type: 'income' | 'expense';
  category?: string;
}

interface FinancialData {
  income: {
    salary?: number;
    business?: number;
    freelance?: number;
    investments?: number;
    other?: number;
  };
  expenses: {
    housing?: number;
    transportation?: number;
    food?: number;
    utilities?: number;
    entertainment?: number;
    insurance?: number;
    healthcare?: number;
    other?: number;
  };
  savings: {
    emergency_fund?: number;
    retirement_401k?: number;
    retirement_ira?: number;
    general_savings?: number;
    investments?: number;
  };
  debts: {
    credit_cards?: number;
    student_loans?: number;
    mortgage?: number;
    auto_loan?: number;
    personal_loans?: number;
  };
  lumpSums?: LumpSum[];
  period: string;
  currency: string;
}

const CashflowChart = () => {
  const [financialData, setFinancialData] = useState<FinancialData>({
    income: {},
    expenses: {},
    savings: {},
    debts: {},
    lumpSums: [],
    period: 'monthly',
    currency: 'USD',
  });

  const [projectionYears, setProjectionYears] = useState(5);
  const [viewMode, setViewMode] = useState<'monthly' | 'quarterly' | 'yearly'>('yearly');
  const [lumpSumsExpanded, setLumpSumsExpanded] = useState(false);
  const [showUncertainty, setShowUncertainty] = useState(true);
  const [netWorthExpanded, setNetWorthExpanded] = useState(true);

  useEffect(() => {
    console.log('🔄 Timeline Cashflow Chart mounted, listening for automatic updates');
    
    const handleFinancialDataUpdate = (event: CustomEvent) => {
      console.log('📊 Financial data updated automatically:', event.detail);
      setFinancialData(event.detail);
    };

    window.addEventListener('financial-data-extracted', handleFinancialDataUpdate as EventListener);

    return () => {
      window.removeEventListener('financial-data-extracted', handleFinancialDataUpdate as EventListener);
    };
  }, []);

  // Calculate totals including savings and debt payments as expenses
  const totalIncome = Object.values(financialData.income).reduce((sum, val) => sum + (val || 0), 0);
  const totalExpenses = Object.values(financialData.expenses).reduce((sum, val) => sum + (val || 0), 0);
  const totalSavings = Object.values(financialData.savings).reduce((sum, val) => sum + (val || 0), 0);
  const totalDebtPayments = Object.values(financialData.debts).reduce((sum, val) => sum + (val || 0), 0);
  
  // Net cashflow after all expenses, savings, and debt payments
  const totalOutgoings = totalExpenses + totalSavings + totalDebtPayments;
  const netCashflow = totalIncome - totalOutgoings;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: financialData.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const hasData = totalIncome > 0 || totalExpenses > 0 || (financialData.lumpSums && financialData.lumpSums.length > 0);

  // Helper function to get lump sums for a specific period
  const getLumpSumsForPeriod = (year: number, quarter?: number, month?: number) => {
    if (!financialData.lumpSums) return { income: 0, expenses: 0, items: [] };
    
    let startDate: Date;
    let endDate: Date;
    
    if (month !== undefined) {
      // Monthly view
      startDate = new Date(year, month, 1);
      endDate = new Date(year, month + 1, 0);
    } else if (quarter !== undefined) {
      // Quarterly view
      startDate = new Date(year, quarter * 3, 1);
      endDate = new Date(year, (quarter + 1) * 3, 0);
    } else {
      // Yearly view
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 12, 0);
    }
    
    const relevantLumpSums = financialData.lumpSums.filter(lumpSum => {
      const lumpSumDate = new Date(lumpSum.date);
      return lumpSumDate >= startDate && lumpSumDate <= endDate;
    });
    
    const lumpSumIncome = relevantLumpSums
      .filter(ls => ls.type === 'income')
      .reduce((sum, ls) => sum + ls.amount, 0);
    
    const lumpSumExpenses = relevantLumpSums
      .filter(ls => ls.type === 'expense')
      .reduce((sum, ls) => sum + ls.amount, 0);
    
    return {
      income: lumpSumIncome,
      expenses: lumpSumExpenses,
      items: relevantLumpSums
    };
  };

  // Generate multi-year projection data with uncertainty ranges
  const generateTimelineData = () => {
    const currentYear = new Date().getFullYear();
    let cumulativeSavings = 0;
    let cumulativeSavingsOptimistic = 0;
    let cumulativeSavingsPessimistic = 0;
    
    if (viewMode === 'yearly') {
      return Array.from({ length: projectionYears }, (_, index) => {
        const year = currentYear + index;
        const isCurrentYear = index === 0;
        
        // Base uncertainty factors that increase over time
        const uncertaintyFactor = Math.min(0.15 + (index * 0.05), 0.35); // 15% to 35% max
        const incomeVariability = 0.1 + (index * 0.02); // Income gets more variable over time
        const expenseVariability = 0.08 + (index * 0.015); // Expenses too
        
        // Get lump sums for this year
        const yearLumpSums = getLumpSumsForPeriod(year);
        
        // Base annual calculations
        const baseAnnualIncome = (totalIncome * 12) + yearLumpSums.income;
        const baseAnnualExpenses = (totalExpenses * 12) + yearLumpSums.expenses;
        const annualSavings = totalSavings * 12;
        const annualDebtPayments = totalDebtPayments * 12;
        
        // Calculate optimistic scenario (higher income, lower expenses)
        const optimisticIncome = baseAnnualIncome * (1 + incomeVariability);
        const optimisticExpenses = baseAnnualExpenses * (1 - expenseVariability);
        const optimisticNetCashflow = optimisticIncome - optimisticExpenses - annualSavings - annualDebtPayments;
        
        // Calculate pessimistic scenario (lower income, higher expenses)
        const pessimisticIncome = baseAnnualIncome * (1 - incomeVariability);
        const pessimisticExpenses = baseAnnualExpenses * (1 + expenseVariability);
        const pessimisticNetCashflow = pessimisticIncome - pessimisticExpenses - annualSavings - annualDebtPayments;
        
        // Base scenario
        const annualNetCashflow = baseAnnualIncome - baseAnnualExpenses - annualSavings - annualDebtPayments;
        
        // Update cumulative savings with ranges
        cumulativeSavings += annualSavings + Math.max(0, annualNetCashflow);
        cumulativeSavingsOptimistic += annualSavings + Math.max(0, optimisticNetCashflow);
        cumulativeSavingsPessimistic += annualSavings + Math.max(0, pessimisticNetCashflow);
        
        return {
          period: `${year}`,
          income: baseAnnualIncome,
          expenses: baseAnnualExpenses,
          savings: annualSavings,
          debtPayments: annualDebtPayments,
          netCashflow: annualNetCashflow,
          cumulativeSavings: cumulativeSavings,
          cumulativeSavingsOptimistic: cumulativeSavingsOptimistic,
          cumulativeSavingsPessimistic: cumulativeSavingsPessimistic,
          uncertaintyFactor: uncertaintyFactor,
          lumpSums: yearLumpSums,
          isCurrent: isCurrentYear,
          isFuture: index > 0
        };
      });
    } else if (viewMode === 'quarterly') {
      // Quarterly view for more detailed short-term analysis
      const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
      const data = [];
      
      for (let year = 0; year < Math.min(projectionYears, 3); year++) {
        for (let quarter = 0; quarter < 4; quarter++) {
          const currentQuarter = new Date().getMonth() / 3;
          const isCurrentPeriod = year === 0 && quarter === Math.floor(currentQuarter);
          const periodIndex = year * 4 + quarter;
          
          // Uncertainty increases over time, but less dramatically for quarterly
          const uncertaintyFactor = Math.min(0.1 + (periodIndex * 0.01), 0.25);
          const incomeVariability = 0.05 + (periodIndex * 0.005);
          const expenseVariability = 0.04 + (periodIndex * 0.004);
          
          // Get lump sums for this quarter
          const quarterLumpSums = getLumpSumsForPeriod(currentYear + year, quarter);
          
          // Base quarterly calculations
          const baseQuarterlyIncome = (totalIncome * 3) + quarterLumpSums.income;
          const baseQuarterlyExpenses = (totalExpenses * 3) + quarterLumpSums.expenses;
          const quarterlySavings = totalSavings * 3;
          const quarterlyDebtPayments = totalDebtPayments * 3;
          
          // Calculate scenarios
          const optimisticIncome = baseQuarterlyIncome * (1 + incomeVariability);
          const optimisticExpenses = baseQuarterlyExpenses * (1 - expenseVariability);
          const optimisticNetCashflow = optimisticIncome - optimisticExpenses - quarterlySavings - quarterlyDebtPayments;
          
          const pessimisticIncome = baseQuarterlyIncome * (1 - incomeVariability);
          const pessimisticExpenses = baseQuarterlyExpenses * (1 + expenseVariability);
          const pessimisticNetCashflow = pessimisticIncome - pessimisticExpenses - quarterlySavings - quarterlyDebtPayments;
          
          const quarterlyNetCashflow = baseQuarterlyIncome - baseQuarterlyExpenses - quarterlySavings - quarterlyDebtPayments;
          
          // Update cumulative savings
          cumulativeSavings += quarterlySavings + Math.max(0, quarterlyNetCashflow);
          cumulativeSavingsOptimistic += quarterlySavings + Math.max(0, optimisticNetCashflow);
          cumulativeSavingsPessimistic += quarterlySavings + Math.max(0, pessimisticNetCashflow);
          
          data.push({
            period: `${quarters[quarter]} ${currentYear + year}`,
            income: baseQuarterlyIncome,
            expenses: baseQuarterlyExpenses,
            savings: quarterlySavings,
            debtPayments: quarterlyDebtPayments,
            netCashflow: quarterlyNetCashflow,
            cumulativeSavings: cumulativeSavings,
            cumulativeSavingsOptimistic: cumulativeSavingsOptimistic,
            cumulativeSavingsPessimistic: cumulativeSavingsPessimistic,
            uncertaintyFactor: uncertaintyFactor,
            lumpSums: quarterLumpSums,
            isCurrent: isCurrentPeriod,
            isFuture: year > 0 || (year === 0 && quarter > Math.floor(currentQuarter))
          });
        }
      }
      
      return data;
    } else {
      // Monthly view for detailed short-term analysis
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const data = [];
      
      for (let year = 0; year < Math.min(projectionYears, 2); year++) {
        for (let month = 0; month < 12; month++) {
          const currentMonth = new Date().getMonth();
          const isCurrentPeriod = year === 0 && month === currentMonth;
          const periodIndex = year * 12 + month;
          
          // Less uncertainty for monthly view since it's shorter term
          const uncertaintyFactor = Math.min(0.05 + (periodIndex * 0.003), 0.15);
          const incomeVariability = 0.02 + (periodIndex * 0.002);
          const expenseVariability = 0.02 + (periodIndex * 0.002);
          
          // Get lump sums for this month
          const monthLumpSums = getLumpSumsForPeriod(currentYear + year, undefined, month);
          
          // Base monthly calculations
          const baseMonthlyIncome = totalIncome + monthLumpSums.income;
          const baseMonthlyExpenses = totalExpenses + monthLumpSums.expenses;
          const monthlySavings = totalSavings;
          const monthlyDebtPayments = totalDebtPayments;
          
          // Calculate scenarios
          const optimisticIncome = baseMonthlyIncome * (1 + incomeVariability);
          const optimisticExpenses = baseMonthlyExpenses * (1 - expenseVariability);
          const optimisticNetCashflow = optimisticIncome - optimisticExpenses - monthlySavings - monthlyDebtPayments;
          
          const pessimisticIncome = baseMonthlyIncome * (1 - incomeVariability);
          const pessimisticExpenses = baseMonthlyExpenses * (1 + expenseVariability);
          const pessimisticNetCashflow = pessimisticIncome - pessimisticExpenses - monthlySavings - monthlyDebtPayments;
          
          const monthlyNetCashflow = baseMonthlyIncome - baseMonthlyExpenses - monthlySavings - monthlyDebtPayments;
          
          // Update cumulative savings
          cumulativeSavings += monthlySavings + Math.max(0, monthlyNetCashflow);
          cumulativeSavingsOptimistic += monthlySavings + Math.max(0, optimisticNetCashflow);
          cumulativeSavingsPessimistic += monthlySavings + Math.max(0, pessimisticNetCashflow);
          
          data.push({
            period: `${months[month]} ${currentYear + year}`,
            income: baseMonthlyIncome,
            expenses: baseMonthlyExpenses,
            savings: monthlySavings,
            debtPayments: monthlyDebtPayments,
            netCashflow: monthlyNetCashflow,
            cumulativeSavings: cumulativeSavings,
            cumulativeSavingsOptimistic: cumulativeSavingsOptimistic,
            cumulativeSavingsPessimistic: cumulativeSavingsPessimistic,
            uncertaintyFactor: uncertaintyFactor,
            lumpSums: monthLumpSums,
            isCurrent: isCurrentPeriod,
            isFuture: year > 0 || (year === 0 && month > currentMonth)
          });
        }
      }
      
      return data;
    }
  };

  const timelineData = generateTimelineData();
  const maxValue = Math.max(...timelineData.map(d => Math.max(d.income, d.expenses, d.savings, Math.abs(d.netCashflow))), 1000);
  const maxCumulative = Math.max(...timelineData.map(d => Math.max(d.cumulativeSavings, d.cumulativeSavingsOptimistic || 0)));
  const minCumulative = Math.min(...timelineData.map(d => Math.min(d.cumulativeSavings, d.cumulativeSavingsPessimistic || 0)), 0);
  const chartHeight = 300;

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-50 to-blue-50 p-6 overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Cash Flow Analysis</h1>
            <p className="text-gray-600 text-lg">{projectionYears}-Year Financial Projection</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm text-gray-600">Current Period</div>
              <div className="text-lg font-semibold text-blue-600">{financialData.period.charAt(0).toUpperCase() + financialData.period.slice(1)}</div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Projection Period:</label>
              <select 
                value={projectionYears} 
                onChange={(e) => setProjectionYears(Number(e.target.value))}
                className="border border-gray-300 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={3}>3 Years</option>
                <option value={5}>5 Years</option>
                <option value={10}>10 Years</option>
                <option value={20}>20 Years</option>
                <option value={30}>30 Years</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">View:</label>
              <select 
                value={viewMode} 
                onChange={(e) => setViewMode(e.target.value as 'monthly' | 'quarterly' | 'yearly')}
                className="border border-gray-300 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="yearly">Yearly</option>
                <option value="quarterly">Quarterly (3 years max)</option>
                <option value="monthly">Monthly (2 years max)</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Uncertainty:</label>
              <button
                onClick={() => setShowUncertainty(!showUncertainty)}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  showUncertainty 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {showUncertainty ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
          
          <div className="text-sm text-gray-600">
            Total periods: {timelineData.length}
            {financialData.lumpSums && financialData.lumpSums.length > 0 && (
              <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                {financialData.lumpSums.length} lump sum{financialData.lumpSums.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {!hasData ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-center max-w-lg">
            <div className="text-8xl mb-6">📈</div>
            <h2 className="text-3xl font-bold text-gray-700 mb-4">Multi-Year Cashflow Model</h2>
            <p className="text-gray-500 text-lg leading-relaxed">
              Discuss your finances with the agent to generate a professional long-term cashflow projection
            </p>
            <div className="mt-6 p-4 bg-white rounded-lg border shadow-sm">
              <p className="text-gray-400 text-sm">💡 Example: &ldquo;I earn $5000 monthly, spend $1500 on rent, and expect a $10k bonus in December&rdquo;</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Key Performance Indicators */}
          <div className="grid grid-cols-5 gap-3">
            <div className="bg-white rounded-lg shadow-md border p-4 text-center">
              <div className="text-2xl mb-2">💰</div>
              <div className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Total Income</div>
              <div className="text-lg font-bold text-green-600 mt-1">{formatCurrency(totalIncome)}</div>
              <div className="text-xs text-gray-500 mt-1">per month</div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md border p-4 text-center">
              <div className="text-2xl mb-2">💸</div>
              <div className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Expenses</div>
              <div className="text-lg font-bold text-red-600 mt-1">{formatCurrency(totalExpenses)}</div>
              <div className="text-xs text-gray-500 mt-1">per month</div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md border p-4 text-center">
              <div className="text-2xl mb-2">💎</div>
              <div className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Savings & Investments</div>
              <div className="text-lg font-bold text-blue-600 mt-1">{formatCurrency(totalSavings)}</div>
              <div className="text-xs text-gray-500 mt-1">per month</div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md border p-4 text-center">
              <div className="text-2xl mb-2">📄</div>
              <div className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Debt Payments</div>
              <div className="text-lg font-bold text-orange-600 mt-1">{formatCurrency(totalDebtPayments)}</div>
              <div className="text-xs text-gray-500 mt-1">per month</div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md border p-4 text-center">
              <div className="text-2xl mb-2">{netCashflow >= 0 ? '📈' : '📉'}</div>
              <div className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Net Cashflow</div>
              <div className={`text-lg font-bold mt-1 ${netCashflow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(netCashflow)}
              </div>
              <div className="text-xs text-gray-500 mt-1">per month</div>
            </div>
          </div>

          {/* Lump Sums Summary */}
          {financialData.lumpSums && financialData.lumpSums.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg border p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">🎯 Scheduled Lump Sums</h2>
                <button
                  onClick={() => setLumpSumsExpanded(!lumpSumsExpanded)}
                  className="flex items-center space-x-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium text-gray-700"
                >
                  <span>{lumpSumsExpanded ? 'Collapse' : 'Expand'}</span>
                  <svg 
                    className={`w-4 h-4 transition-transform duration-200 ${lumpSumsExpanded ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              
              {/* Summary stats always visible */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrency(financialData.lumpSums.filter(ls => ls.type === 'income').reduce((sum, ls) => sum + ls.amount, 0))}
                  </div>
                  <div className="text-sm text-green-700">Total Income</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="text-lg font-bold text-red-600">
                    {formatCurrency(financialData.lumpSums.filter(ls => ls.type === 'expense').reduce((sum, ls) => sum + ls.amount, 0))}
                  </div>
                  <div className="text-sm text-red-700">Total Expenses</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-lg font-bold text-blue-600">
                    {financialData.lumpSums.length}
                  </div>
                  <div className="text-sm text-blue-700">Total Events</div>
                </div>
              </div>

              {/* Expandable detailed list */}
              <div className={`transition-all duration-300 overflow-hidden ${lumpSumsExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {financialData.lumpSums
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((lumpSum) => (
                      <div key={lumpSum.id} className={`p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md ${
                        lumpSum.type === 'income' 
                          ? 'bg-green-50 border-green-200 hover:border-green-300' 
                          : 'bg-red-50 border-red-200 hover:border-red-300'
                      }`}>
                        <div className="flex justify-between items-start mb-2">
                          <div className={`text-lg font-bold ${
                            lumpSum.type === 'income' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {lumpSum.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(lumpSum.amount))}
                          </div>
                          <div className="text-xs text-gray-600 bg-white px-2 py-1 rounded">
                            {new Date(lumpSum.date).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-sm font-medium text-gray-800 mb-1">{lumpSum.description}</div>
                        {lumpSum.category && (
                          <div className="text-xs text-gray-600 capitalize bg-gray-100 px-2 py-1 rounded inline-block">
                            {lumpSum.category.replace('_', ' ')}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
              
              {!lumpSumsExpanded && (
                <div className="text-center text-sm text-gray-500 mt-2">
                  Click &ldquo;Expand&rdquo; to see detailed breakdown of all {financialData.lumpSums.length} scheduled events
                </div>
              )}
            </div>
          )}

          {/* Main Timeline Chart */}
          <div className="bg-white rounded-lg shadow-lg border p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">{projectionYears}-Year Cashflow Projection</h2>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
                  <span className="text-gray-600">Income</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                  <span className="text-gray-600">Expenses</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-400 rounded mr-2"></div>
                  <span className="text-gray-600">Savings/Investments</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-orange-500 rounded mr-2"></div>
                  <span className="text-gray-600">Debt Payments</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                  <span className="text-gray-600">Net Cashflow</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-purple-500 rounded mr-2"></div>
                  <span className="text-gray-600">Lump Sums</span>
                </div>
              </div>
            </div>

            {/* Chart Area */}
            <div className="relative" style={{ height: `${chartHeight + 100}px` }}>
              {/* Y-axis grid lines for bars */}
              <div className="absolute left-0 w-full">
                {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
                  <div 
                    key={fraction}
                    className="absolute w-full border-t border-gray-200"
                    style={{ top: `${fraction * chartHeight + 30}px` }}
                  >
                    <span className="absolute -left-20 -top-3 text-xs text-gray-500 font-medium">
                      {formatCurrency(maxValue * (1 - fraction))}
                    </span>
                  </div>
                ))}
              </div>

              {/* Zero line */}
              <div 
                className="absolute w-full border-t-2 border-gray-400"
                style={{ top: `${chartHeight + 30}px` }}
              >
                <span className="absolute -left-20 -top-3 text-xs text-gray-700 font-bold">$0</span>
              </div>

              {/* Main chart container */}
              <div className="flex justify-center items-end space-x-2 pt-8 relative" style={{ height: `${chartHeight}px` }}>
                {timelineData.map((periodData, index) => {
                  const incomeHeight = (periodData.income / maxValue) * (chartHeight * 0.8);
                  const expenseHeight = (periodData.expenses / maxValue) * (chartHeight * 0.8);
                  const savingsHeight = (periodData.savings / maxValue) * (chartHeight * 0.8);
                  const debtHeight = (periodData.debtPayments / maxValue) * (chartHeight * 0.8);
                  const netHeight = Math.abs(periodData.netCashflow / maxValue) * (chartHeight * 0.8);
                  const isNegative = periodData.netCashflow < 0;
                  const hasLumpSums = periodData.lumpSums && (periodData.lumpSums.income > 0 || periodData.lumpSums.expenses > 0);
                  
                  return (
                    <div key={periodData.period} className="flex flex-col items-center group relative">
                      {/* Lump sum indicator */}
                      {hasLumpSums && (
                        <div className="absolute -top-8 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold z-10">
                          !
                        </div>
                      )}

                      {/* Bars container */}
                      <div className="flex items-end space-x-0.5 mb-2" style={{ height: `${chartHeight * 0.9}px` }}>
                        {/* Income bar */}
                        <div className="relative">
                          <div 
                            className={`w-4 rounded-t transition-all duration-1000 ${
                              periodData.isCurrent ? 'bg-blue-600 ring-2 ring-blue-400' : 
                              periodData.isFuture ? 'bg-blue-300' : 'bg-blue-500'
                            }`}
                            style={{ 
                              height: `${incomeHeight}px`,
                              transitionDelay: `${index * 25}ms`,
                              opacity: periodData.isFuture ? 0.8 : 1
                            }}
                          ></div>
                        </div>

                        {/* Expenses bar */}
                        <div className="relative">
                          <div 
                            className={`w-4 rounded-t transition-all duration-1000 ${
                              periodData.isCurrent ? 'bg-red-600 ring-2 ring-red-400' : 
                              periodData.isFuture ? 'bg-red-300' : 'bg-red-500'
                            }`}
                            style={{ 
                              height: `${expenseHeight}px`,
                              transitionDelay: `${index * 25 + 10}ms`,
                              opacity: periodData.isFuture ? 0.8 : 1
                            }}
                          ></div>
                        </div>

                        {/* Savings/Investments bar */}
                        <div className="relative">
                          <div 
                            className={`w-4 rounded-t transition-all duration-1000 ${
                              periodData.isCurrent ? 'bg-blue-400 ring-2 ring-blue-300' : 
                              periodData.isFuture ? 'bg-blue-200' : 'bg-blue-400'
                            }`}
                            style={{ 
                              height: `${savingsHeight}px`,
                              transitionDelay: `${index * 25 + 20}ms`,
                              opacity: periodData.isFuture ? 0.8 : 1
                            }}
                          ></div>
                        </div>

                        {/* Debt Payments bar */}
                        <div className="relative">
                          <div 
                            className={`w-4 rounded-t transition-all duration-1000 ${
                              periodData.isCurrent ? 'bg-orange-600 ring-2 ring-orange-400' : 
                              periodData.isFuture ? 'bg-orange-300' : 'bg-orange-500'
                            }`}
                            style={{ 
                              height: `${debtHeight}px`,
                              transitionDelay: `${index * 25 + 30}ms`,
                              opacity: periodData.isFuture ? 0.8 : 1
                            }}
                          ></div>
                        </div>

                        {/* Net Cashflow bar */}
                        <div className="relative">
                          <div 
                            className={`w-4 rounded-t transition-all duration-1000 ${
                              isNegative 
                                ? (periodData.isCurrent ? 'bg-red-700 ring-2 ring-red-400' : periodData.isFuture ? 'bg-red-400' : 'bg-red-600')
                                : (periodData.isCurrent ? 'bg-green-600 ring-2 ring-green-400' : periodData.isFuture ? 'bg-green-300' : 'bg-green-500')
                            }`}
                            style={{ 
                              height: `${netHeight}px`,
                              transitionDelay: `${index * 25 + 40}ms`,
                              transform: isNegative ? 'scaleY(-1)' : 'none',
                              transformOrigin: 'bottom',
                              opacity: periodData.isFuture ? 0.8 : 1
                            }}
                          ></div>
                        </div>
                      </div>

                      {/* Enhanced tooltip on hover */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-4 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                        <div className="bg-gray-800 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                          <div className="space-y-1">
                            <div>📅 <strong>{periodData.period}</strong> {periodData.isFuture && '(Projected)'}</div>
                            <div>💰 Income: {formatCurrency(periodData.income)}</div>
                            <div>💸 Expenses: {formatCurrency(periodData.expenses)}</div>
                            <div>💎 Savings: {formatCurrency(periodData.savings)}</div>
                            <div>📄 Debt Payments: {formatCurrency(periodData.debtPayments)}</div>
                            {hasLumpSums && (
                              <div className="border-t border-gray-600 pt-1">
                                <div className="text-purple-300 font-bold">Lump Sums:</div>
                                {periodData.lumpSums.income > 0 && (
                                  <div>✅ Income: {formatCurrency(periodData.lumpSums.income)}</div>
                                )}
                                {periodData.lumpSums.expenses > 0 && (
                                  <div>❌ Expenses: {formatCurrency(periodData.lumpSums.expenses)}</div>
                                )}
                                {periodData.lumpSums.items.map((item, i) => (
                                  <div key={i} className="text-xs text-gray-300">
                                    • {item.description}: {item.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(item.amount))}
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="border-t border-gray-600 pt-1">
                              <div>💵 Net: {formatCurrency(periodData.netCashflow)}</div>
                              <div>📈 Total Saved: {formatCurrency(periodData.cumulativeSavings)}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Period label */}
                      <div className={`text-xs font-medium text-center ${periodData.isCurrent ? 'text-blue-600 font-bold' : 'text-gray-600'}`}>
                        {periodData.period}
                      </div>
                      
                      {/* Status indicator */}
                      {periodData.isCurrent && (
                        <div className="text-xs text-blue-600 font-bold mt-1">Current</div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* X-axis line */}
              <div className="absolute bottom-12 left-16 right-4 border-t-2 border-gray-300"></div>
            </div>
          </div>

          {/* Cumulative Savings Chart with Uncertainty Bands - Collapsible */}
          <div className="bg-white rounded-lg shadow-lg border p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">📈 Cumulative Net Worth Growth</h2>
              <div className="flex items-center space-x-4">
                {showUncertainty && netWorthExpanded && (
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center">
                      <div className="w-4 h-2 bg-green-500 rounded mr-2"></div>
                      <span className="text-gray-600">Best Case</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-2 bg-purple-500 rounded mr-2"></div>
                      <span className="text-gray-600">Expected</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-2 bg-red-500 rounded mr-2"></div>
                      <span className="text-gray-600">Worst Case</span>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => setNetWorthExpanded(!netWorthExpanded)}
                  className="flex items-center space-x-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium text-gray-700"
                >
                  <span>{netWorthExpanded ? 'Collapse' : 'Expand'}</span>
                  <svg 
                    className={`w-4 h-4 transition-transform duration-200 ${netWorthExpanded ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Summary stats always visible */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              {showUncertainty ? (
                <>
                  <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(timelineData[timelineData.length - 1]?.cumulativeSavingsOptimistic || 0)}
                    </div>
                    <div className="text-sm text-green-700">Best Case</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-xl font-bold text-purple-600">
                      {formatCurrency(timelineData[timelineData.length - 1]?.cumulativeSavings || 0)}
                    </div>
                    <div className="text-sm text-purple-700">Expected</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="text-lg font-bold text-red-600">
                      {formatCurrency(timelineData[timelineData.length - 1]?.cumulativeSavingsPessimistic || 0)}
                    </div>
                    <div className="text-sm text-red-700">Worst Case</div>
                  </div>
                </>
              ) : (
                <div className="col-span-3 text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="text-2xl font-bold text-purple-600">
                    {formatCurrency(timelineData[timelineData.length - 1]?.cumulativeSavings || 0)}
                  </div>
                  <div className="text-sm text-purple-700">
                    After {projectionYears} {projectionYears === 1 ? 'year' : 'years'}
                  </div>
                </div>
              )}
            </div>

            {/* Expandable detailed chart */}
            <div className={`transition-all duration-500 overflow-hidden ${netWorthExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="relative" style={{ height: '200px' }}>
                {/* Y-axis for cumulative savings */}
                <div className="absolute left-0 w-full">
                  {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
                    <div 
                      key={fraction}
                      className="absolute w-full border-t border-gray-200"
                      style={{ top: `${fraction * 160 + 20}px` }}
                    >
                      <span className="absolute -left-20 -top-3 text-xs text-gray-500 font-medium">
                        {formatCurrency((maxCumulative - minCumulative) * (1 - fraction) + minCumulative)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Cumulative savings chart with multiple scenario lines */}
                <svg className="absolute inset-0 w-full h-full">
                  <defs>
                    <linearGradient id="savingsGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3"/>
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.05"/>
                    </linearGradient>
                    <linearGradient id="uncertaintyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.08"/>
                      <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.05"/>
                      <stop offset="100%" stopColor="#ef4444" stopOpacity="0.08"/>
                    </linearGradient>
                  </defs>
                  
                  {/* Light uncertainty band background (if enabled) */}
                  {showUncertainty && (
                    <path
                      fill="url(#uncertaintyGradient)"
                      d={`M 10% ${90 - ((timelineData[0]?.cumulativeSavingsOptimistic - minCumulative) / (maxCumulative - minCumulative)) * 70}% 
                          ${timelineData.map((d, i) => {
                            const x = 10 + ((i / (timelineData.length - 1)) * 80);
                            const yOpt = 90 - ((d.cumulativeSavingsOptimistic - minCumulative) / (maxCumulative - minCumulative)) * 70;
                            return `L ${x}% ${yOpt}%`;
                          }).join(' ')} 
                          ${timelineData.slice().reverse().map((d, i) => {
                            const x = 90 - ((i / (timelineData.length - 1)) * 80);
                            const yPess = 90 - ((d.cumulativeSavingsPessimistic - minCumulative) / (maxCumulative - minCumulative)) * 70;
                            return `L ${x}% ${yPess}%`;
                          }).join(' ')} Z`}
                    />
                  )}
                  
                  {/* Best Case (Optimistic) line - Bold Green */}
                  {showUncertainty && (
                    <polyline
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3"
                      opacity="0.9"
                      points={timelineData.map((d, i) => {
                        const x = 10 + ((i / (timelineData.length - 1)) * 80);
                        const y = 90 - ((d.cumulativeSavingsOptimistic - minCumulative) / (maxCumulative - minCumulative)) * 70;
                        return `${x}%,${y}%`;
                      }).join(' ')}
                    />
                  )}
                  
                  {/* Worst Case (Pessimistic) line - Bold Red */}
                  {showUncertainty && (
                    <polyline
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="3"
                      opacity="0.9"
                      points={timelineData.map((d, i) => {
                        const x = 10 + ((i / (timelineData.length - 1)) * 80);
                        const y = 90 - ((d.cumulativeSavingsPessimistic - minCumulative) / (maxCumulative - minCumulative)) * 70;
                        return `${x}%,${y}%`;
                      }).join(' ')}
                    />
                  )}
                  
                  {/* Expected/Base area fill (only if uncertainty is off) */}
                  {!showUncertainty && (
                    <path
                      fill="url(#savingsGradient)"
                      d={`M 10% 90% ${timelineData.map((d, i) => {
                        const x = 10 + ((i / (timelineData.length - 1)) * 80);
                        const y = 90 - ((d.cumulativeSavings - minCumulative) / (maxCumulative - minCumulative)) * 70;
                        return `L ${x}% ${y}%`;
                      }).join(' ')} L 90% 90% Z`}
                    />
                  )}
                  
                  {/* Expected/Base line - Bold Purple */}
                  <polyline
                    fill="none"
                    stroke="#8b5cf6"
                    strokeWidth="4"
                    points={timelineData.map((d, i) => {
                      const x = 10 + ((i / (timelineData.length - 1)) * 80);
                      const y = 90 - ((d.cumulativeSavings - minCumulative) / (maxCumulative - minCumulative)) * 70;
                      return `${x}%,${y}%`;
                    }).join(' ')}
                  />
                  
                  {/* Data points for Best Case */}
                  {showUncertainty && timelineData.map((d, i) => {
                    const x = 10 + ((i / (timelineData.length - 1)) * 80);
                    const y = 90 - ((d.cumulativeSavingsOptimistic - minCumulative) / (maxCumulative - minCumulative)) * 70;
                    const hasLumpSums = d.lumpSums && (d.lumpSums.income > 0 || d.lumpSums.expenses > 0);
                    return (
                      <circle
                        key={`opt-${i}`}
                        cx={`${x}%`}
                        cy={`${y}%`}
                        r={hasLumpSums ? "5" : "3"}
                        fill="#10b981"
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="transition-all duration-1000"
                        style={{ transitionDelay: `${i * 50}ms` }}
                      />
                    );
                  })}
                  
                  {/* Data points for Worst Case */}
                  {showUncertainty && timelineData.map((d, i) => {
                    const x = 10 + ((i / (timelineData.length - 1)) * 80);
                    const y = 90 - ((d.cumulativeSavingsPessimistic - minCumulative) / (maxCumulative - minCumulative)) * 70;
                    const hasLumpSums = d.lumpSums && (d.lumpSums.income > 0 || d.lumpSums.expenses > 0);
                    return (
                      <circle
                        key={`pess-${i}`}
                        cx={`${x}%`}
                        cy={`${y}%`}
                        r={hasLumpSums ? "5" : "3"}
                        fill="#ef4444"
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="transition-all duration-1000"
                        style={{ transitionDelay: `${i * 50 + 100}ms` }}
                      />
                    );
                  })}
                  
                  {/* Data points for Expected */}
                  {timelineData.map((d, i) => {
                    const x = 10 + ((i / (timelineData.length - 1)) * 80);
                    const y = 90 - ((d.cumulativeSavings - minCumulative) / (maxCumulative - minCumulative)) * 70;
                    const hasLumpSums = d.lumpSums && (d.lumpSums.income > 0 || d.lumpSums.expenses > 0);
                    return (
                      <circle
                        key={`exp-${i}`}
                        cx={`${x}%`}
                        cy={`${y}%`}
                        r={hasLumpSums ? "6" : "4"}
                        fill="#8b5cf6"
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="transition-all duration-1000"
                        style={{ transitionDelay: `${i * 50 + 200}ms` }}
                      />
                    );
                  })}
                </svg>
              </div>
              
              {showUncertainty && (
                <div className="text-center mt-4">
                  <div className="text-sm text-gray-600">
                    Projection range after {projectionYears} {projectionYears === 1 ? 'year' : 'years'} • Uncertainty increases over time
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Final year variability: ±{Math.round((timelineData[timelineData.length - 1]?.uncertaintyFactor || 0) * 100)}% 
                    • Range: {formatCurrency((timelineData[timelineData.length - 1]?.cumulativeSavingsOptimistic || 0) - (timelineData[timelineData.length - 1]?.cumulativeSavingsPessimistic || 0))}
                  </div>
                </div>
              )}
            </div>
            
            {!netWorthExpanded && (
              <div className="text-center text-sm text-gray-500 mt-2">
                Click &ldquo;Expand&rdquo; to see detailed net worth growth chart and projections
              </div>
            )}
          </div>

          {/* Bottom Analysis Panel */}
          <div className="grid grid-cols-3 gap-6">
            {/* Cash Flow Summary */}
            <div className="bg-white rounded-lg shadow-md border p-4">
              <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Flow Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Monthly Income:</span>
                  <span className="font-bold text-green-600">{formatCurrency(totalIncome)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Monthly Expenses:</span>
                  <span className="font-bold text-red-600">{formatCurrency(totalExpenses)}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between">
                    <span className="text-gray-700 font-medium">Net Monthly Flow:</span>
                    <span className={`font-bold ${netCashflow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(netCashflow)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Annual Projection:</span>
                  <span className={`font-bold ${netCashflow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(netCashflow * 12)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{projectionYears}-Year Savings:</span>
                  <span className="font-bold text-purple-600">
                    {formatCurrency(timelineData[timelineData.length - 1]?.cumulativeSavings || 0)}
                  </span>
                </div>
                {financialData.lumpSums && financialData.lumpSums.length > 0 && (
                  <div className="border-t pt-2">
                    <div className="text-xs text-purple-600 font-medium">
                      Includes {financialData.lumpSums.length} scheduled lump sum{financialData.lumpSums.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Expense Breakdown */}
            <div className="bg-white rounded-lg shadow-md border p-4">
              <h3 className="text-lg font-bold text-gray-800 mb-4">💸 Expense Categories</h3>
              <div className="space-y-2">
                {Object.entries(financialData.expenses)
                  .filter(([, value]) => value && value > 0)
                  .sort(([, a], [, b]) => (b || 0) - (a || 0))
                  .map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 capitalize">{key.replace('_', ' ')}</span>
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-red-500 h-2 rounded-full transition-all duration-1000"
                            style={{ width: `${totalExpenses > 0 ? ((value || 0) / totalExpenses) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-16 text-right">
                          {formatCurrency(value || 0)}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Financial Health */}
            <div className="bg-white rounded-lg shadow-md border p-4">
              <h3 className="text-lg font-bold text-gray-800 mb-4">🎯 Financial Health</h3>
              <div className="space-y-4">
                <div className="text-center">
                  <div className={`text-3xl font-bold ${
                    netCashflow >= totalIncome * 0.2 ? 'text-green-600' :
                    netCashflow >= totalIncome * 0.1 ? 'text-yellow-600' :
                    netCashflow > 0 ? 'text-orange-600' : 'text-red-600'
                  }`}>
                    {netCashflow >= totalIncome * 0.2 ? 'A+' :
                     netCashflow >= totalIncome * 0.1 ? 'B' :
                     netCashflow > 0 ? 'C' : 'D'}
                  </div>
                  <div className="text-sm text-gray-600">Overall Grade</div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Savings Rate:</span>
                    <span className="font-medium">
                      {totalIncome > 0 ? `${Math.round((totalSavings / totalIncome) * 100)}%` : 'N/A'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Expense Ratio:</span>
                    <span className="font-medium">
                      {totalIncome > 0 ? `${Math.round((totalExpenses / totalIncome) * 100)}%` : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="border-t pt-3">
                  <div className="text-xs text-gray-600 space-y-1">
                    {netCashflow >= totalIncome * 0.2 && (
                      <div className="text-green-700">✅ Excellent financial position</div>
                    )}
                    {netCashflow > 0 && netCashflow < totalIncome * 0.1 && (
                      <div className="text-yellow-700">⚠️ Consider increasing savings</div>
                    )}
                    {netCashflow < 0 && (
                      <div className="text-red-700">🚨 Review expenses immediately</div>
                    )}
                    {totalSavings / totalIncome >= 0.15 && (
                      <div className="text-green-700">💎 Strong savings habit</div>
                    )}
                    {financialData.lumpSums && financialData.lumpSums.length > 0 && (
                      <div className="text-purple-700">🎯 Lump sums factored in</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashflowChart;