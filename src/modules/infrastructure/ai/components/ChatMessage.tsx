
"use client"

import React from 'react';
import { ConfirmationCard } from './ConfirmationCard';
import { Message } from '@/hooks/use-assistant';
import { Bot, User } from 'lucide-react';

interface ChatMessageProps {
    message: Message;
    onActionConfirm: (action: any) => void;
}

export function ChatMessage({ message, onActionConfirm }: ChatMessageProps) {
    const isUser = message.role === 'user';

    return (
        <div className={`flex gap-3 mb-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* Avatar */}
            <div className={`
                flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                ${isUser ? 'bg-indigo-100 text-indigo-600' : 'bg-pink-100 text-pink-600'}
            `}>
                {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
            </div>

            {/* Bubble */}
            <div className={`
                max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm
                ${isUser
                    ? 'bg-indigo-600 text-white rounded-tr-sm'
                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-tl-sm'}
            `}>
                <p className="leading-relaxed whitespace-pre-wrap">
                    {message.text}
                </p>

                {/* Embedded Action */}
                {!isUser && message.suggestedAction && (
                    <ConfirmationCard
                        action={message.suggestedAction}
                        onConfirm={() => onActionConfirm(message.suggestedAction)}
                        onCancel={() => { /* Handle cancel UI state */ }}
                    />
                )}
            </div>
        </div>
    );
}
