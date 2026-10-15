'use client'

import { createContext, useContext, type ReactNode } from 'react'
import * as campaigns from './marketing-actions'
import * as workspace from './marketing-workspace-actions'
import * as setup from './marketing-preflight-actions'
import * as email from './marketing-email-actions'
import * as reviews from './marketing-review-actions'
import * as history from './marketing-history-actions'
import * as health from './marketing-health-actions'

const liveApi = { ...campaigns, ...workspace, ...setup, ...email, ...reviews, ...history, ...health }
export type MarketingClientApi = typeof liveApi
const MarketingApiContext = createContext<{ api: MarketingClientApi; example: boolean } | null>(null)

/** Local examples supply a complete, isolated adapter; production uses server actions. */
export function MarketingExampleProvider({ api, children }: { api: MarketingClientApi; children: ReactNode }) {
    return <MarketingApiContext.Provider value={{ api, example: true }}>{children}</MarketingApiContext.Provider>
}

export function useMarketingApi() { return useContext(MarketingApiContext)?.api ?? liveApi }
export function useMarketingExample() { return useContext(MarketingApiContext)?.example ?? false }
