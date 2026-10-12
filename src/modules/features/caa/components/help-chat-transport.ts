import type { HelpChatMessage, HelpChatResponse } from '../actions/ask-help-assistant'
import type { HelpThread, StoredHelpMessage } from '../actions/help-history'
export interface HelpChatTransport {
    listThreads(offset?: number): Promise<{ threads: HelpThread[]; hasMore: boolean; error?: string }>
    loadThread(id: string): Promise<{ messages: StoredHelpMessage[]; error?: string }>
    ask(question: string, history: HelpChatMessage[], threadId?: string, route?: string): Promise<HelpChatResponse>
}
