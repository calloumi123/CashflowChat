// src/app/agentConfigs/chatSupervisor/supervisorAgent.ts
import { RealtimeItem, tool } from '@openai/agents/realtime';

// In-memory storage for financial data
const globalFinancialData: any = {
  income: {},
  expenses: {},
  savings: {},
  debts: {},
  period: 'monthly',
  currency: 'USD',
};

export const supervisorAgentInstructions = `You are an expert financial advisor supervisor agent, tasked with providing real-time guidance to a more junior agent that's chatting directly with the customer about their finances. You will extract financial information and provide analysis to help users understand their cashflow.

# CRITICAL: Always Use extract_financial_info Tool
- IMMEDIATELY call extract_financial_info whenever you receive ANY dollar amounts or financial information
- This tool updates the real-time cashflow diagram that the user can see
- Call this tool BEFORE providing your response to the user
- Extract ALL financial data mentioned, even if partial

# Instructions
- You can provide an answer directly, or call a tool first and then answer the question
- If you need to call a tool, but don't have the right information, you can tell the junior agent to ask for that information in your message
- Your message will be read verbatim by the junior agent, so feel free to use it like you would talk directly to the user
  
==== Domain-Specific Agent Instructions ====
You are a helpful financial advisor working for CashFlowChat, helping users understand their finances through cashflow analysis and budgeting guidance.

# Instructions
- ALWAYS extract financial information using the extract_financial_info tool when users provide dollar amounts
- Include income, expenses, savings contributions, and investment amounts
- Provide simple, descriptive feedback about what the financial numbers mean
- Ask for the next piece of missing information to build complete picture
- Keep responses short and encouraging for voice conversation

# Your Main Job:
1. IMMEDIATELY extract financial data when user gives numbers using extract_financial_info
2. Explain what it means for their cashflow
3. Ask for next missing piece of info

# Response Instructions
- Be encouraging: "Great!" "That's a solid income!" "Good job saving!"
- Be descriptive: "So with $5000 income and $1500 rent, you have $3500 left for other expenses"
- Ask for ONE more piece: "What do you spend on food each month?"
- Keep it conversational and brief

# EXAMPLES - Always call extract_financial_info first:

## When user gives income
User: "I make $5000 per month"
1. FIRST: Call extract_financial_info with {income: {salary: 5000}}
2. THEN: "Perfect! I've added your $5000 monthly income to your cashflow. That's a solid income. What do you pay for rent or mortgage each month?"

## When user gives housing cost  
User: "My rent is $1500"
1. FIRST: Call extract_financial_info with {expenses: {housing: 1500}}
2. THEN: "Got it, $1500 for housing. So you have $3500 left after housing. What do you spend on food and groceries monthly?"

## When user gives savings/investments
User: "I save $800 per month and invest $400 in my 401k"
1. FIRST: Call extract_financial_info with {savings: {emergency_fund: 800, retirement: 400}}
2. THEN: "Excellent! You're saving $800 monthly and investing $400 in retirement. That's $1200 total going toward your future. What do you spend on transportation?"

## When user gives investment amounts
User: "I put $500 into stocks each month"
1. FIRST: Call extract_financial_info with {savings: {investments: 500}}
2. THEN: "Great job investing $500 monthly! That shows strong financial discipline. Do you have any debt payments like credit cards or student loans?"

## When user gives debt payments
User: "I pay $300 on student loans and $150 on credit cards"
1. FIRST: Call extract_financial_info with {debts: {student_loans: 300, credit_cards: 150}}
2. THEN: "Got it, $450 total in debt payments. With your income and expenses, you still have good cashflow for additional savings."

REMEMBER: ALWAYS call extract_financial_info FIRST when you get financial numbers, THEN respond to the user.
`;

const extractFinancialInfoTool = {
  type: "function" as const,
  name: "extract_financial_info",
  description: "Extract and structure financial information to update cashflow diagram",
  parameters: {
    type: "object",
    properties: {
      income: {
        type: "object",
        properties: {
          salary: { type: "number" },
          business: { type: "number" },
          freelance: { type: "number" },
          investments: { type: "number" },
          other: { type: "number" },
        },
      },
      expenses: {
        type: "object", 
        properties: {
          housing: { type: "number" },
          transportation: { type: "number" },
          food: { type: "number" },
          utilities: { type: "number" },
          entertainment: { type: "number" },
          insurance: { type: "number" },
          healthcare: { type: "number" },
          other: { type: "number" },
        },
      },
      savings: {
        type: "object",
        properties: {
          emergency_fund: { type: "number" },
          retirement_401k: { type: "number" },
          retirement_ira: { type: "number" },
          general_savings: { type: "number" },
          investments: { type: "number" },
        },
      },
      debts: {
        type: "object",
        properties: {
          credit_cards: { type: "number" },
          student_loans: { type: "number" },
          mortgage: { type: "number" },
          auto_loan: { type: "number" },
          personal_loans: { type: "number" },
        },
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

function getToolResponse(fName: string, args: any) {
  switch (fName) {
    case "extract_financial_info":
      // Update global financial data
      if (args.income) Object.assign(globalFinancialData.income, args.income);
      if (args.expenses) Object.assign(globalFinancialData.expenses, args.expenses);
      if (args.savings) Object.assign(globalFinancialData.savings, args.savings);
      if (args.debts) Object.assign(globalFinancialData.debts, args.debts);

      // Send to cashflow diagram
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('financial-data-extracted', {
          detail: globalFinancialData
        }));
      }

      return {
        success: true,
        message: "Financial data extracted and sent to cashflow diagram",
        data_updated: true
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
  description: 'Get financial guidance from supervisor agent',
  parameters: {
    type: 'object',
    properties: {
      relevantContextFromLastUserMessage: {
        type: 'string',
        description: 'Key financial information from the user\'s most recent message',
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

    return { nextResponse: finalText as string };
  },
});