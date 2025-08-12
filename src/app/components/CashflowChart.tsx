import React, { useState, useEffect } from 'react';

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
  period: string;
  currency: string;
}

const CashflowChart = () => {
  const [financialData, setFinancialData] = useState<FinancialData>({
    income: {},
    expenses: {},
    savings: {},
    debts: {},
    period: 'monthly',
    currency: 'USD',
  });

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

  const hasData = totalIncome > 0 || totalExpenses > 0;

  // Generate 12 months of projected cashflow with cumulative savings
  const generateTimelineData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    let cumulativeSavings = 0;
    
    return months.map((month, index) => {
      const isPastMonth = index < currentMonth;
      const isCurrentMonth = index === currentMonth;
      const isFutureMonth = index > currentMonth;
      
      // For past months, use actual data, for future use projections
      const monthlyIncome = totalIncome;
      const monthlyExpenses = totalExpenses;
      const monthlySavings = totalSavings;
      const monthlyDebtPayments = totalDebtPayments;
      const monthlyNetCashflow = monthlyIncome - monthlyExpenses - monthlySavings - monthlyDebtPayments;
      
      // Accumulate savings for cumulative net worth projection (savings build wealth)
      if (isPastMonth || isCurrentMonth) {
        cumulativeSavings += monthlySavings; // Only count actual savings/investments toward net worth
      } else {
        // Project future accumulation
        cumulativeSavings += monthlySavings;
      }
      
      return {
        month,
        income: monthlyIncome,
        expenses: monthlyExpenses,
        savings: monthlySavings,
        debtPayments: monthlyDebtPayments,
        netCashflow: monthlyNetCashflow,
        cumulativeSavings: cumulativeSavings,
        isPast: isPastMonth,
        isCurrent: isCurrentMonth,
        isFuture: isFutureMonth
      };
    });
  };

  const timelineData = generateTimelineData();
  const maxValue = Math.max(...timelineData.map(d => Math.max(d.income, d.expenses, d.savings, Math.abs(d.netCashflow))), 1000);
  const chartHeight = 280;

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-50 to-blue-50 p-6 overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Cash Flow Analysis</h1>
            <p className="text-gray-600 text-lg">12-Month Financial Projection</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Current Period</div>
            <div className="text-lg font-semibold text-blue-600">{financialData.period.charAt(0).toUpperCase() + financialData.period.slice(1)}</div>
          </div>
        </div>
      </div>

      {!hasData ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-center max-w-lg">
            <div className="text-8xl mb-6">📈</div>
            <h2 className="text-3xl font-bold text-gray-700 mb-4">Business Cashflow Model</h2>
            <p className="text-gray-500 text-lg leading-relaxed">
              Discuss your finances with the agent to generate a professional 12-month cashflow projection
            </p>
            <div className="mt-6 p-4 bg-white rounded-lg border shadow-sm">
              <p className="text-gray-400 text-sm">💡 Example: &ldquo;I earn $5000 monthly and spend $1500 on rent&rdquo;</p>
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
            </div>
            
            <div className="bg-white rounded-lg shadow-md border p-4 text-center">
              <div className="text-2xl mb-2">💸</div>
              <div className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Expenses</div>
              <div className="text-lg font-bold text-red-600 mt-1">{formatCurrency(totalExpenses)}</div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md border p-4 text-center">
              <div className="text-2xl mb-2">💎</div>
              <div className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Savings & Investments</div>
              <div className="text-lg font-bold text-blue-600 mt-1">{formatCurrency(totalSavings)}</div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md border p-4 text-center">
              <div className="text-2xl mb-2">📄</div>
              <div className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Debt Payments</div>
              <div className="text-lg font-bold text-orange-600 mt-1">{formatCurrency(totalDebtPayments)}</div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md border p-4 text-center">
              <div className="text-2xl mb-2">{netCashflow >= 0 ? '📈' : '📉'}</div>
              <div className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Net Cashflow</div>
              <div className={`text-lg font-bold mt-1 ${netCashflow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(netCashflow)}
              </div>
            </div>
          </div>

          {/* Main Timeline Chart */}
          <div className="bg-white rounded-lg shadow-lg border p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">12-Month Cashflow Projection</h2>
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
                  <div className="w-4 h-2 bg-purple-500 rounded mr-2"></div>
                  <span className="text-gray-600">Net Worth Growth</span>
                </div>
              </div>
            </div>

            {/* Chart Area */}
            <div className="relative" style={{ height: `${chartHeight + 60}px` }}>
              {/* Y-axis grid lines */}
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

              {/* Bars */}
              <div className="flex justify-center items-end space-x-3 pt-8 relative" style={{ height: `${chartHeight}px` }}>
                {/* Cumulative savings line */}
                <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
                  <polyline
                    fill="none"
                    stroke="#8b5cf6"
                    strokeWidth="3"
                    strokeDasharray="5,5"
                    points={timelineData.map((d, i) => {
                      const x = ((i + 0.5) / timelineData.length) * 100; // Center on bars
                      const y = 100 - ((Math.max(d.cumulativeSavings, 0) / maxValue) * 80); // Use same scale as bars
                      return `${x}%,${y}%`;
                    }).join(' ')}
                  />
                  {/* Data points on the line */}
                  {timelineData.map((d, i) => {
                    const x = ((i + 0.5) / timelineData.length) * 100;
                    const y = 100 - ((Math.max(d.cumulativeSavings, 0) / maxValue) * 80);
                    return (
                      <circle
                        key={i}
                        cx={`${x}%`}
                        cy={`${y}%`}
                        r="3"
                        fill="#8b5cf6"
                        stroke="#ffffff"
                        strokeWidth="1"
                        className="transition-all duration-1000"
                        style={{ transitionDelay: `${i * 100}ms` }}
                      />
                    );
                  })}
                </svg>

                {timelineData.map((monthData, index) => {
                  const incomeHeight = (monthData.income / maxValue) * (chartHeight * 0.8);
                  const expenseHeight = (monthData.expenses / maxValue) * (chartHeight * 0.8);
                  const savingsHeight = (monthData.savings / maxValue) * (chartHeight * 0.8);
                  const debtHeight = (monthData.debtPayments / maxValue) * (chartHeight * 0.8);
                  const netHeight = Math.abs(monthData.netCashflow / maxValue) * (chartHeight * 0.8);
                  const isNegative = monthData.netCashflow < 0;
                  
                  return (
                    <div key={monthData.month} className="flex flex-col items-center group relative">
                      {/* Bars container */}
                      <div className="flex items-end space-x-0.5 mb-2" style={{ height: `${chartHeight * 0.9}px` }}>
                        {/* Income bar */}
                        <div className="relative">
                          <div 
                            className={`w-5 rounded-t transition-all duration-1000 ${
                              monthData.isPast ? 'bg-blue-600' : 
                              monthData.isCurrent ? 'bg-blue-500' : 'bg-blue-300'
                            } ${monthData.isCurrent ? 'ring-2 ring-blue-400' : ''}`}
                            style={{ 
                              height: `${incomeHeight}px`,
                              transitionDelay: `${index * 50}ms`,
                              opacity: monthData.isFuture ? 0.7 : 1
                            }}
                          ></div>
                        </div>

                        {/* Expenses bar */}
                        <div className="relative">
                          <div 
                            className={`w-5 rounded-t transition-all duration-1000 ${
                              monthData.isPast ? 'bg-red-600' : 
                              monthData.isCurrent ? 'bg-red-500' : 'bg-red-300'
                            } ${monthData.isCurrent ? 'ring-2 ring-red-400' : ''}`}
                            style={{ 
                              height: `${expenseHeight}px`,
                              transitionDelay: `${index * 50 + 25}ms`,
                              opacity: monthData.isFuture ? 0.7 : 1
                            }}
                          ></div>
                        </div>

                        {/* Savings/Investments bar */}
                        <div className="relative">
                          <div 
                            className={`w-5 rounded-t transition-all duration-1000 ${
                              monthData.isPast ? 'bg-blue-500' : 
                              monthData.isCurrent ? 'bg-blue-400' : 'bg-blue-200'
                            } ${monthData.isCurrent ? 'ring-2 ring-blue-300' : ''}`}
                            style={{ 
                              height: `${savingsHeight}px`,
                              transitionDelay: `${index * 50 + 50}ms`,
                              opacity: monthData.isFuture ? 0.7 : 1
                            }}
                          ></div>
                        </div>

                        {/* Debt Payments bar */}
                        <div className="relative">
                          <div 
                            className={`w-5 rounded-t transition-all duration-1000 ${
                              monthData.isPast ? 'bg-orange-600' : 
                              monthData.isCurrent ? 'bg-orange-500' : 'bg-orange-300'
                            } ${monthData.isCurrent ? 'ring-2 ring-orange-400' : ''}`}
                            style={{ 
                              height: `${debtHeight}px`,
                              transitionDelay: `${index * 50 + 75}ms`,
                              opacity: monthData.isFuture ? 0.7 : 1
                            }}
                          ></div>
                        </div>

                        {/* Net Cashflow bar */}
                        <div className="relative">
                          <div 
                            className={`w-5 rounded-t transition-all duration-1000 ${
                              isNegative 
                                ? (monthData.isPast ? 'bg-red-700' : monthData.isCurrent ? 'bg-red-600' : 'bg-red-400')
                                : (monthData.isPast ? 'bg-green-600' : monthData.isCurrent ? 'bg-green-500' : 'bg-green-300')
                            } ${monthData.isCurrent ? 'ring-2 ring-gray-400' : ''}`}
                            style={{ 
                              height: `${netHeight}px`,
                              transitionDelay: `${index * 50 + 100}ms`,
                              transform: isNegative ? 'scaleY(-1)' : 'none',
                              transformOrigin: 'bottom',
                              opacity: monthData.isFuture ? 0.7 : 1
                            }}
                          ></div>
                        </div>
                      </div>

                      {/* Enhanced tooltip on hover */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-4 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        <div className="bg-gray-800 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                          <div className="space-y-1">
                            <div>📅 <strong>{monthData.month}</strong> {monthData.isFuture && '(Projected)'}</div>
                            <div>💰 Income: {formatCurrency(monthData.income)}</div>
                            <div>💸 Expenses: {formatCurrency(monthData.expenses)}</div>
                            <div>💎 Savings: {formatCurrency(monthData.savings)}</div>
                            <div>📄 Debt Payments: {formatCurrency(monthData.debtPayments)}</div>
                            <div className="border-t border-gray-600 pt-1">
                              <div>💵 Net: {formatCurrency(monthData.netCashflow)}</div>
                              <div>📈 Total Saved: {formatCurrency(monthData.cumulativeSavings)}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Month label */}
                      <div className={`text-xs font-medium ${monthData.isCurrent ? 'text-blue-600 font-bold' : 'text-gray-600'}`}>
                        {monthData.month}
                      </div>
                      
                      {/* Status indicator */}
                      {monthData.isCurrent && (
                        <div className="text-xs text-blue-600 font-bold mt-1">Current</div>
                      )}
                      {monthData.isFuture && (
                        <div className="text-xs text-gray-400 mt-1">Projected</div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* X-axis line */}
              <div className="absolute bottom-16 left-16 right-4 border-t-2 border-gray-300"></div>
            </div>
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
                  <span className="text-gray-600">Year-End Savings:</span>
                  <span className="font-bold text-purple-600">
                    {formatCurrency(timelineData[11]?.cumulativeSavings || 0)}
                  </span>
                </div>
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
                    <span className="text-gray-600">Emergency Fund:</span>
                    <span className="font-medium">
                      {netCashflow > 0 ? `${Math.floor(netCashflow > 0 ? (totalExpenses * 6) / netCashflow : 0)} months` : 'N/A'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Break-even Point:</span>
                    <span className="font-medium">
                      {totalExpenses > 0 ? `${Math.round((totalExpenses / totalIncome) * 100)}% of income` : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="border-t pt-3">
                  <div className="text-xs text-gray-600 space-y-1">
                    {netCashflow >= totalIncome * 0.2 && (
                      <div className="text-green-700">✅ Strong financial position</div>
                    )}
                    {netCashflow > 0 && netCashflow < totalIncome * 0.1 && (
                      <div className="text-yellow-700">⚠️ Increase savings rate</div>
                    )}
                    {netCashflow < 0 && (
                      <div className="text-red-700">🚨 Reduce expenses urgently</div>
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