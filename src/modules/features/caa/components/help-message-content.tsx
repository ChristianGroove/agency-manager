"use client"

import Markdown from 'react-markdown'

/** Hide the legacy automatic footer without rewriting stored conversations. */
export function cleanHelpMessage(text: string): string {
    return text.replace(/\n{2,}Guías consultadas:[^\n]*(?:\n)?$/u, '').trim()
}

export function HelpMessageContent({ text }: { text: string }) {
    return <div className="space-y-3 whitespace-normal text-sm leading-7 [&_strong]:font-semibold [&_strong]:text-zinc-900 dark:[&_strong]:text-zinc-100 [&_em]:italic [&_p]:my-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:pl-1 [&_li+li]:mt-1 [&_blockquote]:border-l-2 [&_blockquote]:border-zinc-300 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-zinc-950/5 [&_pre]:p-3 dark:[&_pre]:bg-white/5 [&_code]:rounded [&_code]:bg-zinc-500/10 [&_code]:px-1 [&_code]:font-mono [&_code]:text-xs">
        <Markdown skipHtml unwrapDisallowed
            allowedElements={['p', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'br', 'h1', 'h2', 'h3', 'h4', 'hr']}
            components={{
                h1: ({ children }) => <p className="font-semibold text-base text-zinc-900 dark:text-zinc-100">{children}</p>,
                h2: ({ children }) => <p className="font-semibold text-zinc-900 dark:text-zinc-100">{children}</p>,
                h3: ({ children }) => <p className="font-semibold text-zinc-900 dark:text-zinc-100">{children}</p>,
                h4: ({ children }) => <p className="font-semibold">{children}</p>,
            }}>
            {cleanHelpMessage(text)}
        </Markdown>
    </div>
}
