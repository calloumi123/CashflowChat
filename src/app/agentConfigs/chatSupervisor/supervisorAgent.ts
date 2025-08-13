// src/app/agentConfigs/chatSupervisor/supervisorAgent.ts
import { RealtimeItem, tool } from '@openai/agents/realtime';

// Enhanced in-memory storage for financial data matching the dashboard structure
const globalFinancialData: any = {
  income: {},
  expenses: {},
  savings: {},
  investments: {},
  debts: [], // Array of debt accounts
  lumpSums: [], 
  goals: [], // Array of financial goals
  period: 'monthly',
  currency: 'GBP',
  riskTolerance: 'medium',
};

export const supervisorAgentInstructions = `You are an expert UK financial advisor supervisor agent, tasked with providing real-time guidance to a more junior agent that's chatting directly with customers about their UK finances. You will extract financial information and provide analysis to help users understand their cashflow using UK financial products and terminology.

# UK FINANCIAL CONTEXT
- You operate exclusively in the UK financial environment
- Use UK investment products: ISAs, SIPPs, workplace pensions, premium bonds
- NEVER mention US products like 401k, Roth IRA, or US-specific terms
- Use UK terminology: "workplace pension" not "401k", "Stocks & Shares ISA" not "Roth IRA"
- Consider UK tax implications, ISA allowances, and pension contribution limits
- Default currency is GBP (British Pounds)

# CRITICAL CLARIFICATION REQUIREMENTS

## Investment Information - ALWAYS Ask About Overall Risk Tolerance
When users mention ANY investments, ALWAYS ask about their overarching investment risk tolerance:
- "What's your overall investment risk tolerance? This affects all your investment projections:
  - LOW RISK: You prefer steady, predictable returns (3-4% annually) - cash ISAs, government bonds, conservative funds
  - MEDIUM RISK: You're comfortable with some volatility for better growth (6-7% annually) - balanced funds, index trackers
  - HIGH RISK: You can handle significant swings for higher potential returns (8-10% annually) - growth stocks, emerging markets"

## Debt Information - Ensure Complete Data
When users mention debt, ensure you have ALL required information:
- Total balance owed
- Interest rate (APR)
- Monthly payment amount
- If monthly payment is missing but you have balance and rate, you can estimate it

ALWAYS confirm: "Just to make sure I have this right - that's £[amount] total balance at [rate]% APR, paying £[payment] monthly. Is that correct?"

# CRITICAL: Always Use extract_financial_info Tool
- IMMEDIATELY call extract_financial_info whenever you receive ANY pound amounts or financial information
- This tool updates the real-time cashflow diagram that the user can see
- Call this tool BEFORE providing your response to the user
- Extract ALL financial data mentioned, even if partial
- Include one-time events like bonuses, tax refunds, large purchases
- Include debt information with balances, interest rates, and minimum payments
- Include financial goals with target amounts and dates
- Include investment contributions and risk tolerance

# Instructions
- You can provide an answer directly, or call a tool first and then answer the question
- If you need to call a tool, but don't have the right information, you can tell the junior agent to ask for that information in your message
- Your message will be read verbatim by the junior agent, so feel free to use it like you would talk directly to the user
  
==== Domain-Specific Agent Instructions ====
You are a helpful UK financial advisor working for CashFlowChat, helping users understand their finances through cashflow analysis and budgeting guidance using UK financial products and regulations.

# Instructions
- ALWAYS extract financial information using the extract_financial_info tool when users provide pound amounts
- CLEARLY DISTINGUISH between cash savings (immediate access, no risk) and investments (can grow/decline in value)
- Include income, expenses, savings, investments, debts, goals, AND one-time events
- Provide simple, descriptive feedback about what the financial numbers mean in UK context
- Ask for the next piece of missing information to build complete picture
- Keep responses short and encouraging for voice conversation
- Focus on UK financial products: ISAs, SIPPs, workplace pensions, premium bonds

# Your Main Job:
1. IMMEDIATELY extract financial data when user gives numbers using extract_financial_info
2. Explain what it means for their UK cashflow and tax position
3. Ask for next missing piece of info

# Response Instructions
- Be encouraging: "Brilliant!" "That's a solid income!" "Great saving!"
- Be descriptive: "So with £4000 income and £1200 rent, you have £2800 left for other expenses"
- Ask for ONE more piece: "What do you spend on food each month?"
- Use UK financial terminology and consider UK tax implications
- Keep it conversational and brief

# UK-SPECIFIC EXAMPLES - Always call extract_financial_info first:

## When user gives income
User: "I earn £4000 per month"
1. FIRST: Call extract_financial_info with {income: {salary: 4000}}
2. THEN: "Brilliant! I've added your £4000 monthly income to your cashflow. That's a solid income. What do you pay for rent or mortgage each month?"

## When user gives housing cost  
User: "My rent is £1200"
1. FIRST: Call extract_financial_info with {expenses: {rent: 1200}}
2. THEN: "Got it, £1200 for housing. So you have £2800 left after housing. What do you spend on food and groceries monthly?"

## When user gives ANY investment information WITHOUT risk tolerance
User: "I put £400 into a Stocks & Shares ISA monthly"
1. FIRST: Call extract_financial_info with {investments: {stocks_shares_isa: 400}}
2. THEN: "Excellent! £400 monthly into your Stocks & Shares ISA is brilliant for tax-free growth. 

Before I can show accurate projections on your dashboard, what's your overall investment risk tolerance?
- LOW RISK: You prefer steady, predictable returns even if smaller (cash ISAs, government bonds, conservative funds)
- MEDIUM RISK: You're comfortable with some ups and downs for better long-term growth (balanced funds, diversified index trackers)  
- HIGH RISK: You can handle significant swings for potentially higher returns (individual stocks, growth funds, emerging markets)

This affects how your dashboard projects investment growth over time."

## When user gives investment information WITH risk tolerance  
User: "I put £300 into my Stocks & Shares ISA and £500 into workplace pension monthly. I'm quite conservative with investments"
1. FIRST: Call extract_financial_info with {investments: {stocks_shares_isa: 300, workplace_pension: 500}, riskTolerance: "low"}
2. THEN: "Perfect! £800 monthly into investments with a low risk approach. Your dashboard will use conservative growth projections (around 3-4% annually) which is realistic for your risk level. Do you get employer matching on that pension?"

## When user clarifies risk tolerance separately
User: "I'd say I'm moderate risk - okay with some volatility for better returns"
1. FIRST: Call extract_financial_info with {riskTolerance: "medium"}
2. THEN: "Got it! Medium risk tolerance means your dashboard will project around 6-7% annual returns with some variance. This gives a good balance of growth potential while being realistic about market ups and downs."

## When user indicates high risk tolerance
User: "I'm quite aggressive with investments, happy to take big risks for higher returns"
1. FIRST: Call extract_financial_info with {riskTolerance: "high"}
2. THEN: "Understood! High risk tolerance means your dashboard will show higher growth projections (8-10% annually) but with more volatility. This reflects the potential for better long-term returns with individual stocks and growth investments."

## When user gives workplace pension WITHOUT risk context
User: "I contribute 5% to my workplace pension and my employer matches 3%"
1. FIRST: Call extract_financial_info with {investments: {workplace_pension: 200, employer_match: 120}}
2. THEN: "Brilliant! Your workplace pension with employer matching is excellent - that's free money from your employer. 

To show accurate growth projections on your dashboard, what's your overall investment risk tolerance?
- LOW RISK: Prefer steady, predictable growth (3-4% annually) - choose safer pension funds
- MEDIUM RISK: Comfortable with some volatility for better returns (6-7% annually) - balanced/lifestyle funds
- HIGH RISK: Can handle significant ups and downs for higher potential (8-10% annually) - growth/equity funds

This setting will affect how your pension and any other investments are projected to grow."

## When user gives INCOMPLETE debt information
User: "I have a credit card with £3000 balance at 19% APR"
1. FIRST: Call extract_financial_info with estimated payment: {debts: [{name: "Credit Card", totalBalance: 3000, interestRate: 19, minimumPayment: 75, type: "credit_card"}]}
2. THEN: "I've added your credit card debt. At 19% APR on £3000, you're paying about £47 monthly just in interest. What's your actual monthly payment on this card? I estimated around £75 but want to get the exact amount."

## When user gives COMPLETE debt information
User: "I have a credit card with £2500 balance at 22% APR, paying £120 minimum"
1. FIRST: Call extract_financial_info with {debts: [{name: "Credit Card", totalBalance: 2500, interestRate: 22, minimumPayment: 120, type: "credit_card"}]}
2. THEN: "Perfect! Just to confirm - that's £2500 total balance at 22% APR, paying £120 monthly. That high rate is costing you about £45 per month just in interest charges. Do you have any other debts or store cards?"

## When user gives financial goals
User: "I want to save £15000 for a house deposit by next summer"
1. FIRST: Call extract_financial_info with {goals: [{title: "House Deposit", targetAmount: 15000, targetDate: "2025-08-01", category: "major_purchase", priority: "high"}]}
2. THEN: "Excellent goal! I've added your £15K house deposit target for summer 2025. That's about £1250 per month to save. Are you using a Help to Buy ISA or Lifetime ISA for this?"

## When user gives one-time events/lump sums
User: "I get a £8000 bonus in December and expect a £2500 tax refund in April"
1. FIRST: Call extract_financial_info with {lumpSums: [{amount: 8000, description: "Year-end bonus", date: "2025-12-15", type: "income"}, {amount: 2500, description: "Tax refund", date: "2026-04-15", type: "income"}]}
2. THEN: "Brilliant! I've added your £8K December bonus and £2.5K April tax refund to your projection. These will give your savings a nice boost. Any large expenses planned?"

## When user gives SIPP or additional investments
User: "I also put £200 monthly into a SIPP for extra pension saving"
1. FIRST: Call extract_financial_info with {investments: {sipp: 200}}
2. THEN: "Excellent forward thinking! Your SIPP contributions get tax relief too. Between your workplace pension and SIPP, you're building a strong retirement fund. Do you have any ISAs as well?"

## When user gives multiple financial items
User: "My rent is £1800, I spend about £600 on groceries, and I'm saving £500 monthly for emergencies"
1. FIRST: Call extract_financial_info with {expenses: {rent: 1800, groceries: 600}, savings: {emergency_fund: 500}}
2. THEN: "Got it! £1800 rent, £600 groceries, and £500 emergency savings. That's smart emergency planning! What do you spend on utilities and transportation?"

REMEMBER: ALWAYS call extract_financial_info FIRST when you get financial numbers, THEN respond to the user.
`;

const extractFinancialInfoTool = {
  type: "function" as const,
  name: "extract_financial_info",
  description: "Extract and structure comprehensive financial information including debts, goals, and investments to update cashflow diagram",
  parameters: {
    type: "object",
    properties: {
      income: {
        type: "object",
        properties: {
          salary: { type: "number", description: "Base salary/wages" },
          freelance: { type: "number", description: "Freelance/contract income" },
          business: { type: "number", description: "Business income" },
          investment_dividends: { type: "number", description: "Dividend income" },
          rental_income: { type: "number", description: "Rental property income" },
          pension: { type: "number", description: "State/private pension income" },
          other: { type: "number", description: "Other income sources" },
        },
      },
      expenses: {
        type: "object", 
        properties: {
          rent: { type: "number", description: "Monthly rent" },
          mortgage: { type: "number", description: "Mortgage payment" },
          groceries: { type: "number", description: "Food/grocery expenses" },
          utilities: { type: "number", description: "Gas, electric, water, internet" },
          transportation: { type: "number", description: "Car, fuel, public transport" },
          insurance: { type: "number", description: "All insurance (car, home, life, etc.)" },
          entertainment: { type: "number", description: "Entertainment and recreation" },
          healthcare: { type: "number", description: "Private healthcare, prescriptions" },
          dining_out: { type: "number", description: "Restaurants and takeaways" },
          subscriptions: { type: "number", description: "Netflix, Spotify, gym, etc." },
          childcare: { type: "number", description: "Childcare and education costs" },
          personal_care: { type: "number", description: "Haircuts, toiletries, clothing" },
          other: { type: "number", description: "Other miscellaneous expenses" },
        },
      },
      savings: {
        type: "object",
        properties: {
          emergency_fund: { type: "number", description: "REGULAR MONTHLY cash emergency fund contributions" },
          vacation_fund: { type: "number", description: "REGULAR MONTHLY cash holiday savings" },
          general_savings: { type: "number", description: "REGULAR MONTHLY general cash savings" },
          house_fund: { type: "number", description: "REGULAR MONTHLY cash saved for house deposit" },
          car_fund: { type: "number", description: "REGULAR MONTHLY cash saved for car purchase" },
        },
      },
      investments: {
        type: "object",
        properties: {
          workplace_pension: { type: "number", description: "Workplace/company pension contributions - long-term growth" },
          employer_match: { type: "number", description: "Employer pension matching contributions" },
          stocks_shares_isa: { type: "number", description: "Stocks & Shares ISA contributions - can fluctuate in value" },
          cash_isa: { type: "number", description: "Cash ISA contributions - fixed interest, no risk" },
          sipp: { type: "number", description: "Self-Invested Personal Pension contributions - long-term growth" },
          lifetime_isa: { type: "number", description: "Lifetime ISA contributions - can be cash or stocks" },
          help_to_buy_isa: { type: "number", description: "Help to Buy ISA contributions - usually cash based" },
          premium_bonds: { type: "number", description: "Premium Bonds purchases - no interest but prize chance" },
          general_investment: { type: "number", description: "General investment account - can fluctuate" },
          crypto: { type: "number", description: "Cryptocurrency investments - high risk" },
        },
      },
      debts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Debt account name" },
            totalBalance: { type: "number", description: "Current total balance owed" },
            interestRate: { type: "number", description: "Annual percentage rate (APR)" },
            minimumPayment: { type: "number", description: "Required monthly minimum payment" },
            type: { 
              type: "string", 
              enum: ["credit_card", "student_loan", "mortgage", "personal_loan", "car_loan", "other"],
              description: "Type of debt"
            },
          },
          required: ["name", "totalBalance", "interestRate", "minimumPayment", "type"],
        },
      },
      goals: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Goal name/description" },
            targetAmount: { type: "number", description: "Target amount needed" },
            targetDate: { type: "string", format: "date", description: "Target date (YYYY-MM-DD)" },
            category: { 
              type: "string", 
              enum: ["emergency_fund", "retirement", "major_purchase", "debt_payoff", "vacation", "other"],
              description: "Goal category"
            },
            priority: { 
              type: "string", 
              enum: ["high", "medium", "low"],
              description: "Priority level"
            },
          },
          required: ["title", "targetAmount", "targetDate", "category", "priority"],
        },
      },
      lumpSums: {
        type: "array",
        items: {
          type: "object",
          properties: {
            amount: { type: "number", description: "Amount of one-time event (including bonuses going to savings)" },
            description: { type: "string", description: "Description (bonus, tax refund, inheritance, large expense, etc.)" },
            date: { type: "string", format: "date", description: "Date when event occurs (YYYY-MM-DD)" },
            type: { type: "string", enum: ["income", "expense"], description: "Income (bonus, refund) or expense (holiday, car)" },
            category: { type: "string", description: "Category (bonus, tax_refund, holiday, emergency_expense, etc.)" },
          },
          required: ["amount", "description", "date", "type"],
        },
      },
      riskTolerance: {
        type: "string",
        enum: ["low", "medium", "high"],
        description: "Investment risk tolerance for return projections"
      },
      currency: {
        type: "string",
        description: "Currency code - defaults to GBP for UK users",
        default: "GBP"
      },
    },
    required: [],
    additionalProperties: false,
  },
};

export const supervisorAgentTools = [extractFinancialInfoTool];

async function fetchResponsesMessage(body: any) {
  const response = await fetch('/api/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...body, parallel_tool_calls: false }),
  });

  if (!response.ok) {
    console.warn('Server returned an error:', response);
    return { error: 'Something went wrong.' };
  }

  const completion = await response.json();
  return completion;
}

// Helper function to generate unique IDs
function generateUniqueId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getToolResponse(fName: string, args: any) {
  switch (fName) {
    case "extract_financial_info":
      // Update basic financial data
      if (args.income) Object.assign(globalFinancialData.income, args.income);
      if (args.expenses) Object.assign(globalFinancialData.expenses, args.expenses);
      if (args.savings) Object.assign(globalFinancialData.savings, args.savings);
      if (args.investments) Object.assign(globalFinancialData.investments, args.investments);
      
      // Update risk tolerance and currency if provided
      if (args.riskTolerance) globalFinancialData.riskTolerance = args.riskTolerance;
      if (args.currency) globalFinancialData.currency = args.currency;
      
      // Handle debts - add IDs and append to existing array
      // Estimate minimum payment if not provided
      if (args.debts && Array.isArray(args.debts)) {
        const newDebts = args.debts.map((debt: any) => {
          let estimatedPayment = debt.minimumPayment;
          
          // If no payment provided, estimate based on balance and rate
          if (!debt.minimumPayment && debt.totalBalance && debt.interestRate) {
            // Simple estimation: 2-3% of balance or minimum interest + small principal
            const monthlyInterest = (debt.totalBalance * debt.interestRate / 100) / 12;
            const principalPayment = debt.totalBalance * 0.02; // 2% of balance
            estimatedPayment = Math.round(monthlyInterest + principalPayment);
          }
          
          return {
            ...debt,
            id: generateUniqueId('debt'),
            minimumPayment: estimatedPayment
          };
        });
        globalFinancialData.debts.push(...newDebts);
      }
      
      // Handle goals - add IDs and append to existing array
      if (args.goals && Array.isArray(args.goals)) {
        const newGoals = args.goals.map((goal: any) => ({
          ...goal,
          id: generateUniqueId('goal'),
        }));
        globalFinancialData.goals.push(...newGoals);
      }

      // Handle lump sums - add IDs and append to existing array
      if (args.lumpSums && Array.isArray(args.lumpSums)) {
        const newLumpSums = args.lumpSums.map((lumpSum: any) => ({
          ...lumpSum,
          id: generateUniqueId('lump'),
        }));
        globalFinancialData.lumpSums.push(...newLumpSums);
      }

      // Send to cashflow diagram with proper event structure
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('financial-data-extracted', {
          detail: globalFinancialData
        }));
      }

      return {
        success: true,
        message: "Financial data extracted and sent to cashflow diagram",
        data_updated: true,
        items_added: {
          debts: args.debts ? args.debts.length : 0,
          goals: args.goals ? args.goals.length : 0,
          lump_sums: args.lumpSums ? args.lumpSums.length : 0
        }
      };

    default:
      return { result: true };
  }
}

async function handleToolCalls(
  body: any,
  response: any,
  addBreadcrumb?: (title: string, data?: any) => void,
) {
  let currentResponse = response;

  while (true) {
    if (currentResponse?.error) {
      return { error: 'Something went wrong.' } as any;
    }

    const outputItems: any[] = currentResponse.output ?? [];
    const functionCalls = outputItems.filter((item) => item.type === 'function_call');

    if (functionCalls.length === 0) {
      const assistantMessages = outputItems.filter((item) => item.type === 'message');

      const finalText = assistantMessages
        .map((msg: any) => {
          const contentArr = msg.content ?? [];
          return contentArr
            .filter((c: any) => c.type === 'output_text')
            .map((c: any) => c.text)
            .join('');
        })
        .join('\n');

      return finalText;
    }

    for (const toolCall of functionCalls) {
      const fName = toolCall.name;
      const args = JSON.parse(toolCall.arguments || '{}');
      const toolRes = getToolResponse(fName, args);

      if (addBreadcrumb) {
        addBreadcrumb(`[supervisorAgent] function call: ${fName}`, args);
      }
      if (addBreadcrumb) {
        addBreadcrumb(`[supervisorAgent] function call result: ${fName}`, toolRes);
      }

      body.input.push(
        {
          type: 'function_call',
          call_id: toolCall.call_id,
          name: toolCall.name,
          arguments: toolCall.arguments,
        },
        {
          type: 'function_call_output',
          call_id: toolCall.call_id,
          output: JSON.stringify(toolRes),
        },
      );
    }

    currentResponse = await fetchResponsesMessage(body);
  }
}

// This is the main export that the chat agent needs
export const getNextResponseFromSupervisor = tool({
  name: 'getNextResponseFromSupervisor',
  description: 'Get comprehensive financial guidance from supervisor agent including debt analysis and goal planning',
  parameters: {
    type: 'object',
    properties: {
      relevantContextFromLastUserMessage: {
        type: 'string',
        description: 'Key financial information from the user\'s most recent message, including income, expenses, debts, goals, investments, and any one-time events',
      },
    },
    required: ['relevantContextFromLastUserMessage'],
    additionalProperties: false,
  },
  execute: async (input, details) => {
    const { relevantContextFromLastUserMessage } = input as {
      relevantContextFromLastUserMessage: string;
    };

    const addBreadcrumb = (details?.context as any)?.addTranscriptBreadcrumb as
      | ((title: string, data?: any) => void)
      | undefined;

    const history: RealtimeItem[] = (details?.context as any)?.history ?? [];
    const filteredLogs = history.filter((log) => log.type === 'message');

    const body: any = {
      model: 'gpt-4.1',
      input: [
        {
          type: 'message',
          role: 'system',
          content: supervisorAgentInstructions,
        },
        {
          type: 'message',
          role: 'user',
          content: `==== Conversation History ====
          ${JSON.stringify(filteredLogs, null, 2)}
          
          ==== Relevant Financial Context From Last User Message ====
          ${relevantContextFromLastUserMessage}
          
          ==== Current Complete Financial Data State ====
          ${JSON.stringify(globalFinancialData, null, 2)}
          `,
        },
      ],
      tools: supervisorAgentTools,
    };

    const response = await fetchResponsesMessage(body);
    if (response.error) {
      return { error: 'Something went wrong.' };
    }

    const finalText = await handleToolCalls(body, response, addBreadcrumb);
    if ((finalText as any)?.error) {
      return { error: 'Something went wrong.' };
    }

    return finalText;
  },
});