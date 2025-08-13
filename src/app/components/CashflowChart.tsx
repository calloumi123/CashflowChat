import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronDown, ChevronUp, BarChart3, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

interface FinancialGoal {
  id?: string;
  title: string;
  targetAmount: number;
  targetDate: string;
  category: 'emergency_fund' | 'retirement' | 'major_purchase' | 'debt_payoff' | 'vacation' | 'other';
  priority: 'high' | 'medium' | 'low';
}

interface LumpSum {
  id?: string;
  amount: number;
  description: string;
  date: string;
  type: 'income' | 'expense';
  category?: string;
}

interface DebtAccount {
  id?: string;
  name: string;
  totalBalance: number;
  interestRate: number; // Annual percentage rate
  minimumPayment: number;
  type: 'credit_card' | 'student_loan' | 'mortgage' | 'personal_loan' | 'car_loan' | 'other';
}

interface FinancialData {
  income: Record<string, number>;
  expenses: Record<string, number>;
  savings: Record<string, number>;
  investments: Record<string, number>;
  debts: DebtAccount[];
  lumpSums: LumpSum[];
  goals: FinancialGoal[];
  period: string;
  currency: string;
  riskTolerance: 'low' | 'medium' | 'high';
}

interface MonthlyData {
  period: string;
  income: number;
  expenses: number;
  surplus: number;
  netWorth: number;
  investments: number;
  investmentsLow: number;
  investmentsHigh: number;
  availableCash: number;
  liabilities: number;
  lumpSums: number;
  totalDebtBalance: number;
  totalDebtPayments: number;
}

// Constants and utilities
const RETURN_RATES = {
  low: { base: 3.0, variance: 1.0 },
  medium: { base: 6.0, variance: 2.5 },
  high: { base: 9.0, variance: 4.0 }
};

const COLORS = {
  income: '#22c55e',
  expenses: '#ef4444',
  surplus: '#10b981',
  netWorth: '#1e40af',
  investments: '#8b5cf6',
  investmentsLow: '#dc2626',
  investmentsHigh: '#16a34a',
  availableCash: '#06b6d4',
  liabilities: '#b91c1c',
  lumpSums: '#f59e0b',
  totalDebtBalance: '#dc2626',
  totalDebtPayments: '#991b1b'
};

const CATEGORY_LABELS = {
  income: 'Income',
  expenses: 'Monthly Expenses',
  surplus: 'Monthly Surplus',
  netWorth: 'Total Net Worth',
  investments: 'Investments (Expected)',
  investmentsLow: 'Investments (Pessimistic)',
  investmentsHigh: 'Investments (Optimistic)',
  availableCash: 'Available Cash',
  liabilities: 'Total Liabilities',
  lumpSums: 'Lump Sums',
  totalDebtBalance: 'Total Debt Balance',
  totalDebtPayments: 'Monthly Debt Payments'
};

const DEBT_TYPE_ICONS = {
  credit_card: '💳',
  student_loan: '🎓',
  mortgage: '🏠',
  personal_loan: '💰',
  car_loan: '🚗',
  other: '📋'
};

const FinancialDashboard: React.FC = () => {
  const [financialData, setFinancialData] = useState<FinancialData>({
    income: {},
    expenses: {},
    savings: {},
    investments: {},
    debts: [],
    lumpSums: [],
    goals: [],
    period: 'monthly',
    currency: 'GBP',
    riskTolerance: 'medium',
  });

  const [activeCategories, setActiveCategories] = useState({
    income: true, expenses: true, surplus: true, netWorth: false, investments: true,
    investmentsLow: false, investmentsHigh: false, availableCash: false, liabilities: false, 
    lumpSums: false, totalDebtBalance: false, totalDebtPayments: true
  });

  const [chartType, setChartType] = useState('bar');
  const [timeRange, setTimeRange] = useState('24'); // months forward
  const [expandedSections, setExpandedSections] = useState({
    income: false, expenses: false, lumpSums: false, investments: false, debt: false, goals: false
  });

  // Listen for AI agent data updates
  useEffect(() => {
    const handleFinancialDataUpdate = (event: CustomEvent) => {
      setFinancialData(event.detail);
    };
    window.addEventListener('financial-data-extracted', handleFinancialDataUpdate as EventListener);
    return () => window.removeEventListener('financial-data-extracted', handleFinancialDataUpdate as EventListener);
  }, []);

  // Calculate debt totals and monthly payments
  const calculateDebtTotals = () => {
    const debts = Array.isArray(financialData.debts) ? financialData.debts : [];
    const totalDebtBalance = debts.reduce((sum, debt) => sum + (debt.totalBalance || 0), 0);
    const totalMinimumPayments = debts.reduce((sum, debt) => sum + (debt.minimumPayment || 0), 0);
    
    return { totalDebtBalance, totalMinimumPayments };
  };

  // Calculate totals including proper debt payments
  const calculateTotals = () => {
    const totalIncome = Object.values(financialData.income || {}).reduce((sum, val) => sum + (val || 0), 0);
    const totalExpenses = Object.values(financialData.expenses || {}).reduce((sum, val) => sum + (val || 0), 0);
    const totalSavings = Object.values(financialData.savings || {}).reduce((sum, val) => sum + (val || 0), 0);
    const totalInvestments = Object.values(financialData.investments || {}).reduce((sum, val) => sum + (val || 0), 0);
    const { totalDebtBalance, totalMinimumPayments } = calculateDebtTotals();
    
    // Total expenses now include debt payments
    const totalExpensesWithDebt = totalExpenses + totalMinimumPayments;
    const surplus = totalIncome - totalExpensesWithDebt - totalSavings - totalInvestments;
    const expectedReturn = RETURN_RATES[financialData.riskTolerance || 'medium'].base;
    
    return { 
      totalIncome, 
      totalExpenses: totalExpensesWithDebt, 
      totalExpensesExcludingDebt: totalExpenses,
      totalSavings, 
      totalInvestments, 
      totalDebtBalance, 
      totalMinimumPayments,
      surplus, 
      expectedReturn 
    };
  };

  // Enhanced debt calculation with amortization
  const calculateDebtProjection = (debt: DebtAccount, months: number): { balance: number; totalPaid: number; monthlyPayment: number } => {
    let balance = debt.totalBalance;
    let totalPaid = 0;
    const monthlyRate = debt.interestRate / 100 / 12;
    const monthlyPayment = debt.minimumPayment;
    
    for (let i = 0; i < months; i++) {
      if (balance <= 0) break;
      
      const interestCharge = balance * monthlyRate;
      const principalPayment = Math.min(monthlyPayment - interestCharge, balance);
      
      balance -= principalPayment;
      totalPaid += monthlyPayment;
      
      // Ensure balance doesn't go negative
      balance = Math.max(0, balance);
    }
    
    return { balance, totalPaid, monthlyPayment };
  };

  // Generate chart data with dynamic debt tracking
  const generateChartData = (): MonthlyData[] => {
    const totals = calculateTotals();
    const { totalDebtBalance, totalMinimumPayments } = calculateDebtTotals();
    const data: MonthlyData[] = [];
    const currentDate = new Date();
    const hasAnyData = totals.totalIncome > 0 || totals.totalExpenses > 0 || totals.totalSavings > 0 || totals.totalInvestments > 0;
    
    let cumulativeAvailableCash = 0;
    
    // Track each debt individually for proper payoff calculations
    let currentDebts = Array.isArray(financialData.debts) ? financialData.debts.map(debt => ({
      ...debt,
      remainingBalance: debt.totalBalance
    })) : [];
    
    // Track investment balances that can be permanently reduced
    let currentInvestmentBalance = 0; // Start at 0, will be built up over time
    let currentInvestmentBalanceLow = 0;
    let currentInvestmentBalanceHigh = 0;
    
    const monthsForward = parseInt(timeRange);
    
    for (let i = -12; i <= monthsForward; i++) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() + i);
      const monthName = date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      
      if (!hasAnyData) {
        data.push({
          period: monthName, income: 0, expenses: 0, surplus: 0, netWorth: 0,
          investments: 0, investmentsLow: 0, investmentsHigh: 0, availableCash: 0, 
          liabilities: 0, lumpSums: 0, totalDebtBalance: 0, totalDebtPayments: 0
        });
        continue;
      }

      // Calculate current month's debt situation
      let currentMonthDebtBalance = 0;
      let currentMonthDebtPayments = 0;
      
      if (i > 0) {
        // For future months, update debt balances based on payments
        currentDebts = currentDebts.map(debt => {
          if (debt.remainingBalance <= 0) {
            return { ...debt, remainingBalance: 0 }; // Already paid off
          }
          
          const monthlyInterest = debt.remainingBalance * (debt.interestRate / 100 / 12);
          const principalPayment = Math.max(0, debt.minimumPayment - monthlyInterest);
          const newBalance = Math.max(0, debt.remainingBalance - principalPayment);
          
          return { ...debt, remainingBalance: newBalance };
        });
      }
      
      // Calculate totals for this month
      currentDebts.forEach(debt => {
        currentMonthDebtBalance += debt.remainingBalance;
        if (debt.remainingBalance > 0) {
          currentMonthDebtPayments += debt.minimumPayment; // Only add payments for active debts
        }
      });

      // Calculate investment growth for this month
      const riskData = RETURN_RATES[financialData.riskTolerance || 'medium'];
      const baseReturnMonthly = riskData.base / 100 / 12;
      const varianceMonthly = riskData.variance / 100 / 12;
      
      // Add monthly contributions and apply growth
      currentInvestmentBalance = (currentInvestmentBalance + totals.totalInvestments) * (1 + baseReturnMonthly);
      currentInvestmentBalanceLow = (currentInvestmentBalanceLow + totals.totalInvestments) * (1 + Math.max(baseReturnMonthly - varianceMonthly, -0.08));
      currentInvestmentBalanceHigh = (currentInvestmentBalanceHigh + totals.totalInvestments) * (1 + baseReturnMonthly + varianceMonthly);

      // Calculate lump sums for this month
      const monthLumpSumsIncome = Array.isArray(financialData.lumpSums) ? financialData.lumpSums
        .filter(lump => {
          const lumpDate = new Date(lump.date);
          return lumpDate.getMonth() === date.getMonth() && 
                 lumpDate.getFullYear() === date.getFullYear() && 
                 lump.type === 'income';
        })
        .reduce((sum, lump) => sum + lump.amount, 0) : 0;

      const monthLumpSumsExpense = Array.isArray(financialData.lumpSums) ? financialData.lumpSums
        .filter(lump => {
          const lumpDate = new Date(lump.date);
          return lumpDate.getMonth() === date.getMonth() && 
                 lumpDate.getFullYear() === date.getFullYear() && 
                 lump.type === 'expense';
        })
        .reduce((sum, lump) => sum + lump.amount, 0) : 0;

      // Add goal expenses
      const monthGoalExpenses = Array.isArray(financialData.goals) ? financialData.goals
        .filter(goal => {
          const goalDate = new Date(goal.targetDate);
          return goalDate.getMonth() === date.getMonth() && goalDate.getFullYear() === date.getFullYear();
        })
        .reduce((sum, goal) => sum + goal.targetAmount, 0) : 0;

      const netLumpSums = monthLumpSumsIncome - monthLumpSumsExpense - monthGoalExpenses;
      
      const actualMonthlyIncome = totals.totalIncome + monthLumpSumsIncome;
      // Use dynamic debt payments that decrease as debts are paid off
      const baseExpenses = Object.values(financialData.expenses).reduce((sum, val) => sum + val, 0);
      const actualMonthlyExpenses = baseExpenses + currentMonthDebtPayments + monthLumpSumsExpense + monthGoalExpenses;
      
      // Calculate the true monthly surplus
      const monthlySurplus = actualMonthlyIncome - actualMonthlyExpenses - totals.totalSavings - totals.totalInvestments;
      
      // Available cash accumulates over time, with investment liquidation for negative cash
      cumulativeAvailableCash += totals.totalSavings;
      
      // Only adjust cash by surplus amount (positive adds, negative subtracts)
      cumulativeAvailableCash += monthlySurplus;
      
      // Subtract goal expenses when they occur
      if (monthGoalExpenses > 0) {
        cumulativeAvailableCash -= monthGoalExpenses;
      }
      
      // Handle negative cash by PERMANENTLY liquidating investments
      if (cumulativeAvailableCash < 0) {
        const cashShortfall = Math.abs(cumulativeAvailableCash);
        
        // Liquidate from investments to cover the shortfall - PERMANENTLY
        if (currentInvestmentBalance >= cashShortfall) {
          // Sufficient investments to cover shortfall
          currentInvestmentBalance -= cashShortfall;
          currentInvestmentBalanceLow = Math.max(0, currentInvestmentBalanceLow - cashShortfall);
          currentInvestmentBalanceHigh = Math.max(0, currentInvestmentBalanceHigh - cashShortfall);
          cumulativeAvailableCash = 0; // Reset cash to zero after liquidation
        } else {
          // Not enough investments - liquidate all and still have negative cash
          const remainingShortfall = cashShortfall - currentInvestmentBalance;
          currentInvestmentBalance = 0;
          currentInvestmentBalanceLow = 0;
          currentInvestmentBalanceHigh = 0;
          cumulativeAvailableCash = -remainingShortfall; // Still negative after liquidating everything
        }
      }
      
      const projectedNetWorth = cumulativeAvailableCash + currentInvestmentBalance - currentMonthDebtBalance;
      
      data.push({
        period: monthName,
        income: actualMonthlyIncome,
        expenses: actualMonthlyExpenses,
        surplus: monthlySurplus,
        netWorth: projectedNetWorth,
        investments: currentInvestmentBalance,
        investmentsLow: currentInvestmentBalanceLow,
        investmentsHigh: currentInvestmentBalanceHigh,
        availableCash: Math.max(0, cumulativeAvailableCash), // Show 0 instead of negative for display
        liabilities: currentMonthDebtBalance,
        lumpSums: netLumpSums,
        totalDebtBalance: currentMonthDebtBalance,
        totalDebtPayments: currentMonthDebtPayments
      });
    }
    
    return data;
  };

  // Utility functions - Updated for UK formatting
  const formatCurrency = (value: number) => new Intl.NumberFormat('en-GB', {
    style: 'currency', currency: 'GBP', minimumFractionDigits: 0,
  }).format(value);

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const toggleCategory = (category: string) => {
    setActiveCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getActiveDataKeys = () => Object.entries(activeCategories)
    .filter(([_, isActive]) => isActive)
    .map(([key, _]) => key);

  // Breakdown data generators
  const getBreakdown = (data: Record<string, number>, total: number) => 
    Object.entries(data).map(([category, amount]) => ({
      category: category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      amount,
      percentage: total > 0 ? Math.round((amount / total) * 100) : 0
    }));

  // Enhanced debt analysis
  const getDebtAnalysis = () => {
    const debts = Array.isArray(financialData.debts) ? financialData.debts : [];
    return debts.map(debt => {
      const projection = calculateDebtProjection(debt, parseInt(timeRange));
      
      // Calculate payoff time
      let payoffMonths = 0;
      let balance = debt.totalBalance || 0;
      const monthlyRate = (debt.interestRate || 0) / 100 / 12;
      
      while (balance > 0 && payoffMonths < 1000) { // Safety limit
        const interestCharge = balance * monthlyRate;
        const principalPayment = Math.max(0, (debt.minimumPayment || 0) - interestCharge);
        if (principalPayment <= 0) {
          payoffMonths = Infinity; // Never pays off
          break;
        }
        balance -= principalPayment;
        payoffMonths++;
      }

      return {
        ...debt,
        projection,
        payoffMonths,
        payoffDate: payoffMonths < 1000 ? new Date(Date.now() + payoffMonths * 30 * 24 * 60 * 60 * 1000) : null,
        isHighInterest: (debt.interestRate || 0) > 15,
        monthlyInterestCost: (debt.totalBalance || 0) * ((debt.interestRate || 0) / 100 / 12)
      };
    });
  };

  // Goals calculations
  const getGoalsData = () => {
    const currentDate = new Date();
    const totals = calculateTotals();
    const chartData = generateChartData();
    const goals = Array.isArray(financialData.goals) ? financialData.goals : [];
    
    const currentAvailableCash = chartData.length > 0 ? chartData[chartData.length - 1].availableCash : 0;
    const monthlyCashAccumulation = totals.totalSavings + Math.max(0, totals.surplus);
    
    return goals.map(goal => {
      const targetDate = new Date(goal.targetDate);
      const monthsUntilTarget = Math.ceil((targetDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
      
      const projectedCashAtTarget = monthsUntilTarget > 0 
        ? currentAvailableCash + (monthlyCashAccumulation * monthsUntilTarget)
        : currentAvailableCash;
        
      const projectedCashAfterGoal = projectedCashAtTarget - (goal.targetAmount || 0);
      const isAffordable = projectedCashAtTarget >= (goal.targetAmount || 0);
      const isOverdue = targetDate < currentDate;
      
      return {
        ...goal,
        monthsUntilTarget: Math.max(0, monthsUntilTarget),
        projectedCashAtTarget,
        projectedCashAfterGoal,
        cashShortfall: Math.max(0, (goal.targetAmount || 0) - projectedCashAtTarget),
        isAffordable,
        isOverdue,
        feasibilityStatus: isOverdue ? 'overdue' : isAffordable ? 'achievable' : 'shortfall',
        currentAvailableCash,
        monthlyCashAccumulation
      };
    }).sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());
  };

  // Styling helpers
  const getPriorityColor = (priority: string) => ({
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    low: 'bg-green-100 text-green-700 border-green-200'
  }[priority] || 'bg-yellow-100 text-yellow-700 border-yellow-200');

  const getFeasibilityColor = (status: string) => ({
    achievable: 'bg-green-100 text-green-700 border-green-200',
    shortfall: 'bg-red-100 text-red-700 border-red-200',
    overdue: 'bg-gray-100 text-gray-700 border-gray-200'
  }[status] || 'bg-red-100 text-red-700 border-red-200');

  const getCategoryIcon = (category: string) => ({
    emergency_fund: '🛡️', retirement: '🏖️', major_purchase: '🏠',
    debt_payoff: '💳', vacation: '✈️', other: '🎯'
  }[category] || '🎯');

  const getDebtTypeColor = (type: string) => ({
    credit_card: 'bg-red-100 text-red-700 border-red-200',
    student_loan: 'bg-blue-100 text-blue-700 border-blue-200',
    mortgage: 'bg-green-100 text-green-700 border-green-200',
    personal_loan: 'bg-purple-100 text-purple-700 border-purple-200',
    car_loan: 'bg-orange-100 text-orange-700 border-orange-200',
    other: 'bg-gray-100 text-gray-700 border-gray-200'
  }[type] || 'bg-gray-100 text-gray-700 border-gray-200');

  // Main calculations
  const totals = calculateTotals();
  const { totalDebtBalance, totalMinimumPayments } = calculateDebtTotals();
  const chartData = generateChartData();
  const goalsData = getGoalsData();
  const debtAnalysis = getDebtAnalysis();
  const estimatedNetWorth = chartData.length > 0 ? chartData[chartData.length - 1].netWorth : 0;

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-white">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">UK Financial Dashboard</h1>
          <p className="text-gray-600">Live data from your conversation</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-6 py-4 shadow-sm">
          <div className="text-right">
            <p className="text-sm text-gray-500 mb-1">Estimated Net Worth</p>
            <p className="text-2xl font-bold text-indigo-600">{formatCurrency(estimatedNetWorth)}</p>
            <span className="text-sm text-green-600 font-medium">
              Monthly Surplus: {formatCurrency(totals.surplus)}
            </span>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-gray-50 rounded-lg p-6 mb-8">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Financial Flow Analysis</h2>
          <p className="text-gray-600">Live projection based on your current financial data</p>
        </div>
        
        <div className="flex flex-wrap gap-4 mb-6">
          {/* Category toggles */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => toggleCategory(key)}
                className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  activeCategories[key as keyof typeof activeCategories]
                    ? 'text-white border-transparent'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
                style={{
                  backgroundColor: activeCategories[key as keyof typeof activeCategories] ? COLORS[key as keyof typeof COLORS] : 'white',
                  borderColor: activeCategories[key as keyof typeof activeCategories] ? COLORS[key as keyof typeof COLORS] : '#e5e7eb'
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Time range selector */}
          <div className="flex bg-white rounded-lg border border-gray-200 overflow-hidden">
            <span className="px-3 py-2 text-sm text-gray-600 bg-gray-50">Project:</span>
            {['12', '24', '36', '60'].map((months) => (
              <button
                key={months}
                onClick={() => setTimeRange(months)}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  timeRange === months ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {months}m
              </button>
            ))}
          </div>

          {/* Chart type toggle */}
          <div className="flex bg-white rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setChartType('bar')}
              className={`px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors ${
                chartType === 'bar' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <BarChart3 size={16} />
              Bar
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors ${
                chartType === 'line' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <TrendingUp size={16} />
              Line
            </button>
          </div>
        </div>

        {/* Chart */}
        <div className="h-96 bg-white rounded-lg border border-gray-200 p-4">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'bar' ? (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} angle={-45} textAnchor="end" height={80} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={formatCurrency} />
                <Tooltip formatter={(value, name) => [formatCurrency(Number(value)), CATEGORY_LABELS[name as keyof typeof CATEGORY_LABELS] || name]} />
                {getActiveDataKeys().map((key) => (
                  <Bar key={key} dataKey={key} fill={COLORS[key as keyof typeof COLORS]} radius={[2, 2, 0, 0]} />
                ))}
              </BarChart>
            ) : (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} angle={-45} textAnchor="end" />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={formatCurrency} />
                <Tooltip formatter={(value, name) => [formatCurrency(Number(value)), CATEGORY_LABELS[name as keyof typeof CATEGORY_LABELS] || name]} />
                {getActiveDataKeys().map((key) => (
                  <Line key={key} type="monotone" dataKey={key} stroke={COLORS[key as keyof typeof COLORS]} strokeWidth={3} dot={{ fill: COLORS[key as keyof typeof COLORS], strokeWidth: 2, r: 4 }} />
                ))}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Financial Boxes */}
      <div className="flex gap-8 max-w-7xl">
        {/* Left Column - Main Financial Boxes */}
        <div className="grid grid-cols-2 gap-8 flex-1 max-w-5xl">
          {/* Income Box */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection('income')}>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Income</h3>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.totalIncome)}</p>
                <p className="text-sm text-gray-500">Monthly Total</p>
              </div>
              {expandedSections.income ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
            </div>
            
            {expandedSections.income && financialData.income && Object.keys(financialData.income).length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Breakdown</h4>
                {getBreakdown(financialData.income, totals.totalIncome).map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">{item.category}</span>
                    <div className="text-right">
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(item.amount)}</span>
                      <span className="text-xs text-gray-500 ml-2">({item.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Expenses Box */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection('expenses')}>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Monthly Expenses</h3>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totals.totalExpenses)}</p>
                <p className="text-sm text-gray-500">Including debt payments: {formatCurrency(totalMinimumPayments)}</p>
              </div>
              {expandedSections.expenses ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
            </div>
            
            {expandedSections.expenses && financialData.expenses && Object.keys(financialData.expenses).length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Breakdown</h4>
                {getBreakdown(financialData.expenses, totals.totalExpensesExcludingDebt).map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">{item.category}</span>
                    <div className="text-right">
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(item.amount)}</span>
                      <span className="text-xs text-gray-500 ml-2">({item.percentage}%)</span>
                    </div>
                  </div>
                ))}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-red-700 font-medium">+ Debt Payments</span>
                    <span className="text-sm font-bold text-red-600">{formatCurrency(totalMinimumPayments)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Lump Sums */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection('lumpSums')}>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Lump Sum Events</h3>
                <p className="text-2xl font-bold text-purple-600">{(financialData.lumpSums?.length || 0) + (financialData.goals?.length || 0)}</p>
                <p className="text-sm text-gray-500">Events & goals</p>
              </div>
              {expandedSections.lumpSums ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
            </div>
            
            {expandedSections.lumpSums && (financialData.lumpSums && financialData.lumpSums.length > 0 || financialData.goals && financialData.goals.length > 0) && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Timeline</h4>
                {[
                  ...(Array.isArray(financialData.lumpSums) ? financialData.lumpSums.map(item => ({ ...item, isGoal: false })) : []),
                  ...(Array.isArray(financialData.goals) ? financialData.goals.map(goal => ({
                    amount: goal.targetAmount, description: goal.title, date: goal.targetDate,
                    type: 'expense' as const, category: goal.category, isGoal: true, priority: goal.priority
                  })) : [])
                ]
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map((item, index) => {
                    const itemDate = new Date(item.date);
                    const isUpcoming = itemDate > new Date();
                    const daysUntil = Math.ceil((itemDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    
                    return (
                      <div key={index} className="flex justify-between items-center py-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">{item.description}</span>
                            {item.isGoal && <span className="text-lg">{getCategoryIcon(item.category || 'other')}</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              item.isGoal ? 'bg-indigo-100 text-indigo-700' : 
                              item.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {item.isGoal ? 'goal expense' : item.type}
                            </span>
                            <span className="text-xs text-gray-500">{itemDate.toLocaleDateString('en-GB')}</span>
                            {isUpcoming && daysUntil > 0 && (
                              <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                                {daysUntil < 30 ? `${daysUntil} days` : `${Math.ceil(daysUntil/30)} months`}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`text-sm font-medium ${
                          item.type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Investments */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection('investments')}>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Investments & Pensions</h3>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(totals.totalInvestments)}</p>
                <p className="text-sm text-gray-500">Monthly contributions • {totals.expectedReturn}% expected return</p>
              </div>
              {expandedSections.investments ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
            </div>
            
            {expandedSections.investments && financialData.investments && Object.keys(financialData.investments).length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Monthly Contributions</h4>
                {Object.entries(financialData.investments).map(([category, amount], index) => (
                  <div key={index} className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">{category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(amount)}</span>
                  </div>
                ))}
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className={`p-3 bg-${financialData.riskTolerance === 'low' ? 'green' : financialData.riskTolerance === 'medium' ? 'yellow' : 'red'}-50 rounded`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Risk Tolerance:</span>
                      <span className={`text-xs px-3 py-1 rounded-full border font-medium ${getPriorityColor(financialData.riskTolerance)}`}>
                        {financialData.riskTolerance.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Debt Box */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection('debt')}>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Total Debt</h3>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDebtBalance)}</p>
                <p className="text-sm text-gray-500">Monthly payments: {formatCurrency(totalMinimumPayments)}</p>
              </div>
              {expandedSections.debt ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
            </div>
            
            {expandedSections.debt && financialData.debts && financialData.debts.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Debt Accounts</h4>
                <div className="space-y-3">
                  {debtAnalysis.map((debt, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{DEBT_TYPE_ICONS[debt.type]}</span>
                          <div>
                            <h5 className="font-medium text-gray-900">{debt.name}</h5>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-2 py-1 rounded-full border ${getDebtTypeColor(debt.type)}`}>
                                {debt.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </span>
                              {debt.isHighInterest && (
                                <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                                  <AlertTriangle size={10} />
                                  High Interest
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-red-600">{formatCurrency(debt.totalBalance)}</p>
                          <p className="text-xs text-gray-500">{formatPercentage(debt.interestRate)} APR</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                        <div>
                          <span className="block">Monthly Payment:</span>
                          <span className="font-medium text-red-600">{formatCurrency(debt.minimumPayment)}</span>
                        </div>
                        <div>
                          <span className="block">Monthly Interest:</span>
                          <span className="font-medium text-orange-600">{formatCurrency(debt.monthlyInterestCost)}</span>
                        </div>
                        <div>
                          <span className="block">Payoff Time:</span>
                          <span className="font-medium text-blue-600">
                            {debt.payoffMonths === Infinity ? 'Never*' : `${Math.ceil(debt.payoffMonths / 12)}y ${debt.payoffMonths % 12}m`}
                          </span>
                        </div>
                        <div>
                          <span className="block">Balance in {timeRange}m:</span>
                          <span className="font-medium text-gray-700">{formatCurrency(debt.projection.balance)}</span>
                        </div>
                      </div>
                      
                      {debt.payoffMonths === Infinity && (
                        <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                          * Minimum payment doesn't cover interest - balance will grow
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Monthly Summary */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Monthly Summary</h3>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(totals.surplus)}</p>
              <p className="text-sm text-gray-500">Net monthly surplus</p>
            </div>
            
            <div className="mt-4 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Income</span>
                <span className="font-medium text-green-600">+{formatCurrency(totals.totalIncome)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Living Expenses</span>
                <span className="font-medium text-red-600">-{formatCurrency(totals.totalExpensesExcludingDebt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Debt Payments</span>
                <span className="font-medium text-red-600">-{formatCurrency(totalMinimumPayments)}</span>
              </div>
              {totals.totalSavings > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Cash Savings</span>
                  <span className="font-medium text-cyan-600">-{formatCurrency(totals.totalSavings)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Investments</span>
                <span className="font-medium text-purple-600">-{formatCurrency(totals.totalInvestments)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-100 font-medium">
                <span>Net Surplus</span>
                <span className={totals.surplus >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatCurrency(totals.surplus)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Financial Goals */}
        <div className="w-96">
          <div className="bg-white border border-gray-200 rounded-lg p-6 h-fit">
            <div className="flex items-center justify-between cursor-pointer mb-4" onClick={() => toggleSection('goals')}>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Financial Goals</h3>
                <p className="text-sm text-gray-500">Based on savings + surplus</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-indigo-600">{financialData.goals?.length || 0}</span>
                {expandedSections.goals ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
              </div>
            </div>

            {financialData.goals && financialData.goals.length > 0 && (
              <div className="mb-4">
                {goalsData.slice(0, expandedSections.goals ? undefined : 3).map((goal, index) => (
                  <div key={index} className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getCategoryIcon(goal.category)}</span>
                        <div>
                          <h4 className="font-medium text-gray-900">{goal.title}</h4>
                          <div className="flex gap-2 mt-1">
                            <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(goal.priority)}`}>
                              {goal.priority} priority
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full border ${getFeasibilityColor(goal.feasibilityStatus)}`}>
                              {goal.feasibilityStatus === 'achievable' ? '✅' : goal.feasibilityStatus === 'overdue' ? '❌' : '⚠️'} {goal.feasibilityStatus}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{formatCurrency(goal.targetAmount)}</p>
                        <p className="text-xs text-gray-500">{new Date(goal.targetDate).toLocaleDateString('en-GB')}</p>
                      </div>
                    </div>

                    {expandedSections.goals && !goal.isOverdue && (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Current Available Cash:</span>
                          <span className="font-medium text-cyan-600">{formatCurrency(goal.currentAvailableCash || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Monthly Cash Growth:</span>
                          <span className="font-medium text-cyan-600">{formatCurrency(goal.monthlyCashAccumulation || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Months Until Target:</span>
                          <span className="font-medium">{goal.monthsUntilTarget}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Projected Cash at Target Date:</span>
                          <span className="font-medium text-blue-600">{formatCurrency(goal.projectedCashAtTarget || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Goal Cost:</span>
                          <span className="font-medium text-red-600">-{formatCurrency(goal.targetAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Cash After Goal:</span>
                          <span className={`font-medium ${goal.isAffordable ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(goal.projectedCashAfterGoal || 0)}
                          </span>
                        </div>
                        {!goal.isAffordable && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Cash Shortfall:</span>
                            <span className="font-medium text-red-600">{formatCurrency(goal.cashShortfall)}</span>
                          </div>
                        )}
                        <div className={`text-xs p-2 rounded mt-3 ${
                          goal.isAffordable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {goal.isAffordable 
                            ? `✅ Affordable! You'll have ${formatCurrency(goal.projectedCashAfterGoal || 0)} left after this goal.` 
                            : `⚠️ Need ${formatCurrency(goal.cashShortfall)} more cash by ${new Date(goal.targetDate).toLocaleDateString('en-GB')}`}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {!expandedSections.goals && financialData.goals && financialData.goals.length > 3 && (
                  <p className="text-sm text-gray-500 text-center">+{financialData.goals.length - 3} more goals</p>
                )}
              </div>
            )}

            {/* Available Cash Section */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="text-center p-3 bg-cyan-50 rounded-lg">
                <h4 className="text-sm font-medium text-cyan-900 mb-1">Available Cash</h4>
                <p className="text-lg font-bold text-cyan-900">
                  {formatCurrency(chartData.length > 0 ? chartData[chartData.length - 1].availableCash : 0)}
                </p>
                <p className="text-xs text-cyan-700 mt-1">
                  Current accumulated cash balance
                </p>
                <div className="mt-2 text-xs text-cyan-600">
                  <p>Monthly accumulation: {formatCurrency(totals.totalSavings + Math.max(0, totals.surplus))}</p>
                  <p className="text-cyan-500">
                    (Savings: {formatCurrency(totals.totalSavings)} + 
                    {totals.surplus > 0 ? ` Surplus: ${formatCurrency(totals.surplus)}` : ' No surplus'})
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialDashboard;