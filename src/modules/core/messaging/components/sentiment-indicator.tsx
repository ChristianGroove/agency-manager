"use client"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Smile, Meh, Frown, AlertCircle } from "lucide-react"

interface SentimentBadgeProps {
    sentiment: 'positive' | 'neutral' | 'negative' | 'urgent' | null
    score?: number | null
    size?: 'sm' | 'md' | 'lg'
    showIcon?: boolean
    showLabel?: boolean
}

export function SentimentBadge({
    sentiment,
    score,
    size = 'md',
    showIcon = true,
    showLabel = true
}: SentimentBadgeProps) {
    if (!sentiment) return null

    const config = {
        positive: {
            label: 'Happy',
            icon: Smile,
            color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
            emoji: '😊',
            borderColor: 'border-green-500'
        },
        neutral: {
            label: 'Neutral',
            icon: Meh,
            color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
            emoji: '😐',
            borderColor: 'border-gray-500'
        },
        negative: {
            label: 'Frustrated',
            icon: Frown,
            color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
            emoji: '😟',
            borderColor: 'border-yellow-500'
        },
        urgent: {
            label: 'URGENT',
            icon: AlertTriangle,
            color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 font-bold',
            emoji: '🔴',
            borderColor: 'border-red-500'
        }
    }

    const current = config[sentiment]
    const Icon = current.icon

    const sizeClasses = {
        sm: 'text-xs h-5 px-1.5',
        md: 'text-sm h-6 px-2',
        lg: 'text-base h-7 px-3'
    }

    return (
        <Badge
            variant="outline"
            className={cn(
                current.color,
                sizeClasses[size],
                'flex items-center gap-1 border-2',
                current.borderColor
            )}
        >
            {showIcon && <Icon className={cn(
                size === 'sm' && 'h-3 w-3',
                size === 'md' && 'h-3.5 w-3.5',
                size === 'lg' && 'h-4 w-4'
            )} />}
            {showLabel && (
                <span>{current.label}</span>
            )}
            {score !== null && score !== undefined && (
                <span className="text-[10px] opacity-70 ml-1">
                    ({score > 0 ? '+' : ''}{score.toFixed(2)})
                </span>
            )}
        </Badge>
    )
}

interface SentimentIndicatorProps {
    sentiment: 'positive' | 'neutral' | 'negative' | 'urgent' | null
    emotions?: string[]
    className?: string
}

export function SentimentIndicator({ sentiment, emotions, className }: SentimentIndicatorProps) {
    if (!sentiment) return null

    const emojiMap: Record<string, string> = {
        happy: '😊',
        satisfied: '😌',
        grateful: '🙏',
        neutral: '😐',
        curious: '🤔',
        confused: '😕',
        frustrated: '😤',
        disappointed: '😞',
        angry: '😠',
        threatening: '😡',
        urgent: '🚨'
    }

    return (
        <div className={cn("flex items-center gap-2", className)}>
            <SentimentBadge sentiment={sentiment} size="sm" />
            {emotions && emotions.length > 0 && (
                <div className="flex gap-1 text-sm">
                    {emotions.slice(0, 3).map((emotion, idx) => (
                        <span key={idx} title={emotion}>
                            {emojiMap[emotion.toLowerCase()] || '•'}
                        </span>
                    ))}
                </div>
            )}
        </div>
    )
}

interface SentimentAlertProps {
    alertType: 'negative_spike' | 'urgent_keywords' | 'escalation_needed'
    severity: 'low' | 'medium' | 'high' | 'critical'
    detectedKeywords?: string[]
    onAcknowledge?: () => void
}

export function SentimentAlert({
    alertType,
    severity,
    detectedKeywords,
    onAcknowledge
}: SentimentAlertProps) {
    const severityConfig = {
        low: 'border-blue-500 bg-blue-50 dark:bg-blue-950',
        medium: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950',
        high: 'border-orange-500 bg-orange-50 dark:bg-orange-950',
        critical: 'border-red-500 bg-red-50 dark:bg-red-950 animate-pulse'
    }

    const alertMessages = {
        negative_spike: 'Customer sentiment has turned negative',
        urgent_keywords: 'Urgent keywords detected - immediate attention needed',
        escalation_needed: 'This conversation should be escalated'
    }

    return (
        <div className={cn(
            "border-l-4 p-3 rounded-r-lg space-y-2",
            severityConfig[severity]
        )}>
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm font-medium">
                        {alertMessages[alertType]}
                    </span>
                </div>
                {onAcknowledge && (
                    <button
                        onClick={onAcknowledge}
                        className="text-xs underline hover:no-underline"
                    >
                        Acknowledge
                    </button>
                )}
            </div>

            {detectedKeywords && detectedKeywords.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    <span className="text-xs text-muted-foreground">Keywords:</span>
                    {detectedKeywords.map((kw, idx) => (
                        <Badge key={idx} variant="destructive" className="text-xs px-1 py-0">
                            {kw}
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    )
}
