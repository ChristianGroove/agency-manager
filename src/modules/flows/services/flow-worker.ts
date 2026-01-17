import { ExecutionIntent, ExecutionResult } from '../types';

/**
 * FLOW WORKER (The Hands)
 * Responsibilities:
 * 1. Receive Execution Intents from the Engine.
 * 2. Perform the actual dirty work (API calls, Emails, DB updates).
 * 3. Report back success/failure with a NARRATIVE log.
 */
export class FlowWorker {

    static async execute(intent: ExecutionIntent): Promise<ExecutionResult> {
        const { stepToExecute, context } = intent;
        const { key, config } = stepToExecute;

        console.log(`[Worker] Executing step: ${stepToExecute.label} (${key})`);

        try {
            // HANDLER ROUTING
            switch (key) {
                case 'send_welcome_kit':
                    return await this.handleSendEmail(context, config, 'Welcome Kit');

                case 'create_drive_folder':
                    return await this.handleCreateDriveFolder(context, config);

                case 'notify_team':
                    return await this.handleSlackNotify(context, config);

                default:
                    throw new Error(`Unknown action key: ${key}`);
            }
        } catch (error: any) {
            return {
                success: false,
                status: 'failed',
                narrativeLog: `Falló al ejecutar "${stepToExecute.label}": ${error.message}`,
                shouldCreateNextIntent: false
            };
        }
    }

    // --- SPECIFIC HANDLERS (Simulated for Happy Path) ---

    private static async handleSendEmail(context: any, config: any, subject: string): Promise<ExecutionResult> {
        // SIMULATION: In real life, convert to Resend/SendGrid call
        const clientEmail = context.triggerPayload.clientEmail || 'demo@example.com';

        // Pretend async work
        await new Promise(r => setTimeout(r, 100));

        return {
            success: true,
            status: 'completed',
            narrativeLog: `Enviado email "${subject}" a ${clientEmail} (vía ${config.channel || 'email'})`,
            outputData: { messageId: 'msg_123' },
            shouldCreateNextIntent: true
        };
    }

    private static async handleCreateDriveFolder(context: any, config: any): Promise<ExecutionResult> {
        const clientName = context.triggerPayload.clientName || 'Cliente Nuevo';

        return {
            success: true,
            status: 'completed',
            narrativeLog: `Carpeta "Clientes/${clientName}" creada en Google Drive`,
            outputData: { folderUrl: 'https://drive.google.com/...' },
            shouldCreateNextIntent: true
        };
    }

    private static async handleSlackNotify(context: any, config: any): Promise<ExecutionResult> {
        return {
            success: true,
            status: 'completed',
            narrativeLog: `Equipo notificado en canal #${config.channel || 'general'}`,
            shouldCreateNextIntent: true
        };
    }
}
