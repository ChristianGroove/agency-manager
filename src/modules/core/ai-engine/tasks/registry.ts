import { AIMessage } from '../types';

export interface AITaskDefinition {
  id: string;
  description: string;
  systemPrompt: (context: any) => string;
  userPrompt: (input: any) => string;
  temperature: number;
  maxTokens: number;
  schema?: any; // Zod schema for validation (optional for now)
  jsonMode?: boolean;
}

export const AI_TASK_REGISTRY: Record<string, AITaskDefinition> = {
  'inbox.smart_replies_v1': {
    id: 'inbox.smart_replies_v1',
    description: 'Generate 3 quick reply suggestions for customer service.',
    temperature: 0.7,
    maxTokens: 500,
    jsonMode: true,
    systemPrompt: (ctx: any) => `You are a helpful customer support assistant for ${ctx.businessContext || 'a professional agency'}.
Task: Generate 3 response suggestions (short, medium, detailed) for the last customer message.

# CRM Context (USE THIS DATA!)
- Customer Name: ${ctx.customerName || 'Unknown'}
- Tags: ${ctx.customerTags?.join(', ') || 'None'}
- Priority: ${ctx.priority || 'Normal'}
- Recent Order/Info: ${ctx.recentOrder || 'N/A'}

# Guidelines
- **LANGUAGE: Detect the language of the conversation and reply in the SAME language.** (e.g. if Spanish, reply in Spanish).
- Address customer by name when possible
- Reference recent orders or context if available
- Tone: Professional, warm, solution-oriented
- Short: Under 50 characters, fast acknowledgment
- Medium: 2-3 sentences, balanced
- Detailed: Comprehensive with next steps

Return JSON:
{
  "short": "Hi [Name], on it!",
  "medium": "Specific and helpful reply...",
  "detailed": "Full explanation with context..."
}`,
    userPrompt: (input: any) => JSON.stringify(input.history.slice(-5))
  },

  'inbox.sentiment_v1': {
    id: 'inbox.sentiment_v1',
    description: 'Analyze sentiment of a single message.',
    temperature: 0.3,
    maxTokens: 200,
    jsonMode: true,
    systemPrompt: () => `You are a sentiment analyzer.
Classify into: positive, neutral, negative, urgent.
Detect key emotions and urgent keywords (legal, emergency).

Return JSON:
{
  "sentiment": "positive|neutral|negative|urgent",
  "score": -1.0 to 1.0,
  "emotions": ["happy", "angry"],
  "needsEscalation": boolean
}`,
    userPrompt: (input: any) => `Analyze: "${input.message}"`
  },

  'inbox.intent_v1': {
    id: 'inbox.intent_v1',
    description: 'Classify customer intent and extract entities.',
    temperature: 0.3,
    maxTokens: 300,
    jsonMode: true,
    systemPrompt: () => `You are an intent classifier.
Intents: billing, technical_support, sales, complaint, order_status, other.

Return JSON:
{
  "intent": "string",
  "confidence": 0.0-1.0,
  "extractedEntities": { "order_id": "...", "email": "..." }
}`,
    userPrompt: (input: any) => `Classify: "${input.message}"`
  },

  'messaging.refine_draft_v1': {
    id: 'messaging.refine_draft_v1',
    description: 'Refine a message draft for professional tone.',
    temperature: 0.7,
    maxTokens: 500,
    jsonMode: false,
    systemPrompt: () => `You are a text refinement tool. 
Your ONLY task is to rewrite the user's draft to be more professional, polite, and clear.
    
CRITICAL RULES:
1. Do NOT reply to the message. (e.g. if input is "help", do NOT say "sure", instead rewrite it to "I need help").
2. Do NOT add conversational updates.
3. Keep the original meaning and intent.
4. Output ONLY the rewritten text.
5. Do NOT wrap the output in quotes.`,
    userPrompt: (input: any) => `Draft to Rewrite: "${input.content}"`
  },

  'automation.generate_template_v1': {
    id: 'automation.generate_template_v1',
    description: 'Generate an automation workflow from natural language.',
    temperature: 0.2,
    maxTokens: 1000,
    jsonMode: true,
    systemPrompt: () => `You are a Workflow Automation Architect.
Task: Convert the user's description into a valid JSON Automation Schema.

Available Nodes:
- Trigger: webhook (default)
- Action: send_whatsapp (requires message), condition (if/else), delay (time), assign_agent.

Return JSON Structure:
{
  "name": "derived from description",
  "trigger": "webhook",
  "nodes": [
    { "id": "1", "type": "trigger", "data": {} },
    { "id": "2", "type": "action", "actionType": "send_whatsapp", "data": { "message": "..." } }
  ],
  "edges": [
    { "source": "1", "target": "2" }
  ]
}
No markdown. JSON only.`,
    userPrompt: (input: any) => `Description: ${input.description}`
  },

  'automation.suggest_node_v1': {
    id: 'automation.suggest_node_v1',
    description: 'Suggest the next logical node for an automation workflow.',
    temperature: 0.3,
    maxTokens: 800,
    jsonMode: true,
    systemPrompt: () => `You are an expert Automation Architect.
Task: Analyze the current workflow context and suggest the 3 most logical next nodes.

Context Provided:
- Current Flow Structure
- Last Added Node
- Available Variables

Return JSON:
{
  "suggestions": [
    {
      "nodeType": "email",
      "confidence": 95,
      "reasoning": "Send welcome email after lead creation",
      "suggestedConfig": { "subject": "Welcome!" }
    }
  ]
}
No markdown.`,
    userPrompt: (input: any) => `Workflow Context:
Nodes: ${input.nodeCount}
Last Node: ${input.lastNodeType} (${input.lastNodeLabel})
Variables: ${input.variables.join(', ')}`
  },

  'media.transcribe_v1': {
    id: 'media.transcribe_v1',
    description: 'Transcribe audio/voice notes using Whisper.',
    temperature: 0,
    maxTokens: 0,
    jsonMode: false,
    systemPrompt: () => '',
    userPrompt: () => ''
  },

  'knowledge.extract_faq_v1': {
    id: 'knowledge.extract_faq_v1',
    description: 'Extract a clean Q&A pair from a conversation for knowledge base.',
    temperature: 0.3,
    maxTokens: 500,
    jsonMode: true,
    systemPrompt: () => `You are a Knowledge Base Curator.
Task: Extract ONE clean FAQ entry from the conversation.

Rules:
- Question: The customer's core inquiry (generalized, not too specific)
- Answer: The agent's best response (polished, ready to show other customers)
- Category: Suggest a category (Billing, Support, Product, Shipping, General)

Return JSON:
{
  "question": "How do I reset my password?",
  "answer": "You can reset your password by...",
  "category": "Support"
}`,
    userPrompt: (input: any) => `Conversation:\n${input.conversation}`
  },

  'analytics.agent_qa_v1': {
    id: 'analytics.agent_qa_v1',
    description: 'Generate a performance summary for an agent based on recent conversations.',
    temperature: 0.3,
    maxTokens: 800,
    jsonMode: true,
    systemPrompt: () => `You are a QA Analyst for customer support.
Task: Analyze the agent's messages and provide a performance report.

Criteria (1-10 scale):
- Empathy: Did they show understanding?
- Resolution: Did they solve the issue?
- Clarity: Were responses clear and professional?
- Speed: Response promptness (estimated)
- Grammar: Language quality

Also provide:
- strengths: Top 2 things done well
- improvements: Top 2 areas to improve
- overallScore: Average of criteria

Return JSON:
{
  "empathy": 8,
  "resolution": 7,
  "clarity": 9,
  "speed": 6,
  "grammar": 9,
  "overallScore": 7.8,
  "strengths": ["Clear explanations", "Professional tone"],
  "improvements": ["Faster responses", "More empathy phrases"]
}`,
    userPrompt: (input: any) => `Agent Messages:\n${input.agentMessages}`
  }
};

export function getTaskDefinition(taskId: string): AITaskDefinition {
  const task = AI_TASK_REGISTRY[taskId];
  if (!task) throw new Error(`AI Task '${taskId}' not found in registry.`);
  return task;
}
