import { NextResponse } from 'next/server';
import chatbotService from '../../../services/chatbot.service';
import logger from '../../../lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Handle POST request for the chatbot API route.
 * Why: Next.js API handler delegates request parameter extraction and validation,
 * passing execution to the Chatbot Service layer, keeping API entrypoint focused.
 *
 * @param {Request} request The incoming Next.js API request.
 * @returns {Promise<NextResponse>} The API JSON response containing updated message history.
 */
export async function POST(request) {
  let tickerContext = 'N/A';
  try {
    const { messages, ticker } = await request.json();
    tickerContext = ticker || 'N/A';
    
    logger.info('API_CHAT', `Received chat request for ticker: ${tickerContext}`, { messagesCount: messages ? messages.length : 0 });

    // Why: Ensure the request parameters are present before proceeding with service execution.
    if (!messages || !ticker) {
      logger.warn('API_CHAT', 'Request validation failed: missing messages or ticker');
      return NextResponse.json({ error: 'Messages and ticker are required' }, { status: 400 });
    }

    // Why: Strictly delegate LLM interaction and serialization tasks to the chatbot service layer.
    const serializableMessages = await chatbotService.handleChatResponse(messages, ticker);

    logger.info('API_CHAT', `Returning ${serializableMessages.length} serialized messages for ${tickerContext}`);
    return NextResponse.json({ messages: serializableMessages });
  } catch (err) {
    // Why: Log the raw error on the server side for troubleshooting, but return a localized user-friendly message.
    logger.error('API_CHAT', `Chatbot API Route Error for ticker: ${tickerContext}`, err);
    return NextResponse.json({ error: '抱歉，我目前無法連線到 AI 服務。請稍後再試。' }, { status: 500 });
  }
}
