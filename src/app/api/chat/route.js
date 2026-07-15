import { NextResponse } from 'next/server';
import { financialAdvisorAgent } from '../../../lib/chatbot/deep-agent';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';

export const dynamic = 'force-dynamic';

/**
 * Handle POST request for the chatbot API route.
 * Why: Next.js API handler must parse raw message history and ticker from the request,
 * format them into appropriate LangChain Message classes, invoke the financial advisor graph agent,
 * and serialize the updated message list back to JSON.
 *
 * @param {Request} request The incoming Next.js API request.
 * @returns {Promise<NextResponse>} The API JSON response containing updated message history.
 */
export async function POST(request) {
  try {
    const { messages, ticker } = await request.json();
    
    // Why: Ensure the request parameters are present before proceeding with agent execution.
    if (!messages || !ticker) {
      return NextResponse.json({ error: 'Messages and ticker are required' }, { status: 400 });
    }

    // Why: Map the custom JSON message objects to LangChain message classes required by the state graph.
    const formattedMessages = messages.map(msg => {
      if (msg.role === 'user') return new HumanMessage(msg.content);
      if (msg.role === 'system') return new SystemMessage(msg.content);
      return new AIMessage(msg.content);
    });

    // Why: Invoke the financial advisor state graph using the formatted messages and supply the ticker context.
    const response = await financialAdvisorAgent.invoke(
      { messages: formattedMessages },
      { configurable: { currentTicker: ticker } }
    );

    // Why: Serialize the resulting LangChain Message instances back to a simple role/content JSON structure.
    const serializableMessages = response.messages.map(msg => {
      let role = 'assistant';
      if (msg instanceof HumanMessage) role = 'user';
      if (msg instanceof SystemMessage) role = 'system';
      return {
        role,
        content: msg.content
      };
    });

    return NextResponse.json({ messages: serializableMessages });
  } catch (err) {
    // Why: Log the raw error on the server side for troubleshooting, but return a localized user-friendly message to prevent exposing internal stack traces or details to the end-user.
    console.error('Chatbot API Route Error:', err);
    return NextResponse.json({ error: '抱歉，我目前無法連線到 AI 服務。請稍後再試。' }, { status: 500 });
  }
}
