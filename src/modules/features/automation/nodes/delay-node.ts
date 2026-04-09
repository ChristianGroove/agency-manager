
export interface DelayNodeData {
    duration: string; // "5m", "2h", "1d"
}

export interface DelayResult {
    suspended: boolean;
    resumeAt?: Date;
}

export class DelayNode {
    execute(data: DelayNodeData): DelayResult {
        const duration = String(data.duration || '1m');
        console.log(`[DelayNode] Calculating delay: ${duration}`);

        let minutes = 1;
        if (duration.endsWith('m')) minutes = parseInt(duration);
        else if (duration.endsWith('h')) minutes = parseInt(duration) * 60;
        else if (duration.endsWith('d')) minutes = parseInt(duration) * 60 * 24;
        else minutes = parseInt(duration) || 1;

        const resumeAt = new Date();
        resumeAt.setMinutes(resumeAt.getMinutes() + minutes);

        console.log(`[DelayNode] Suspending until: ${resumeAt.toISOString()}`);

        return {
            suspended: true,
            resumeAt
        };
    }
}
