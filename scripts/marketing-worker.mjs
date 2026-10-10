import { setTimeout as wait } from 'node:timers/promises'
import { pathToFileURL } from 'node:url'

/** @param {Record<string, string | undefined>} env */
export async function marketingTick(env = process.env, fetcher = fetch) {
    if (env.MARKETING_EXECUTION_ENABLED !== 'true') return { disabled: true }
    if (!env.CRON_SECRET) throw new Error('CRON_SECRET is required')
    const port = Number(env.PORT || 3000)
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid application port')
    const response = await fetcher(`http://127.0.0.1:${port}/api/marketing/run`, {
        method: 'POST', headers: { Authorization: `Bearer ${env.CRON_SECRET}` }, signal: AbortSignal.timeout(55000),
    })
    if (!response.ok) throw new Error('Marketing cycle request failed')
    const data = await response.json()
    if (data.disabled === true) return { disabled: true }
    if (data.success !== true) throw new Error('Marketing cycle failed')
    const result = {}
    for (const key of ['processed', 'failed', 'deferred', 'finalized']) {
        if (!Number.isSafeInteger(data[key]) || data[key] < 0) throw new Error('Invalid marketing cycle response')
        result[key] = data[key]
    }
    return result
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const deadline = Date.now() + 45000
    try {
        do {
            const tickStart = Date.now()
            const result = await marketingTick()
            console.log(JSON.stringify(result))
            if (result.disabled) break
            if (result.failed) process.exitCode = 1
            const pause = Math.min(Math.max(0, 5000 - (Date.now() - tickStart)), deadline - Date.now())
            if (pause > 0) await wait(pause)
        } while (Date.now() < deadline)
    } catch {
        // Never print responses, request headers, configuration values or provider errors.
        console.error('Marketing worker failed; inspect campaign results and scheduler configuration.')
        process.exitCode = 1
    }
}
