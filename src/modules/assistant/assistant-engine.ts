
import { resolveAssistantContext } from "./context-resolver";
import { getActionForIntent } from "./action-registry";
import { PermissionGuard } from "./permission-guard";
import { AssistantInput, AssistantResult, AssistantIntent } from "./types";
import { SYSTEM_INTENTS } from "./intent-registry";
import { ConversationStore } from "./conversation/store";
import { IntentResolver } from "./conversation/intent-resolver";
import { ConversationState } from "./conversation/types";
import { InputNormalizer } from "./voice/input-normalizer";
import { VoiceContextManager } from "./voice/voice-context";

// ~~~ Phase 3.5 Imports ~~~
import { getModel } from "./models/model-registry";
import { AssistantModelInput } from "./models/assistant-model.interface";
import { AiConfigService, AiAnalyticsService } from "./services";

// --- CORE ENGINE (Phase 3.5 Pipeline) ---

export async function processAssistantRequest(input: AssistantInput): Promise<AssistantResult> {

    try {
        // 1. Context Security
        const resolution = await resolveAssistantContext();
        if (!resolution || !resolution.context) {
            return { success: false, narrative_log: "⚠️ Sesión inválida." };
        }
        const { context } = resolution;

        // ~~~ PHASE 9: KILLSWITCH CHECK ~~~
        const settings = await AiConfigService.getEffectiveSettings(context.tenant_id, context.space_id);

        // Global Voice/AI Check
        const isVoiceInput = input.input_mode === 'voice';
        const isServiceEnabled = isVoiceInput ? settings.is_voice_enabled : settings.is_clawdbot_enabled;

        if (!isServiceEnabled) {
            // Log the blocked attempt
            await AiAnalyticsService.logInteraction({
                tenant_id: context.tenant_id,
                space_id: context.space_id,
                user_id: context.user_id,
                interaction_type: isVoiceInput ? 'voice_command' : 'chat_text',
                model_id: 'system',
                status: 'rate_limited',
                error_message: `Killswitch Active (Voice: ${settings.is_voice_enabled}, Text: ${settings.is_clawdbot_enabled})`
            });

            return { success: false, narrative_log: "🔒 El servicio de IA está desactivado temporalmente por el administrador." };
        }

        // 2. Normalization
        const normalizedText = InputNormalizer.normalize(input.text);
        console.log(`[Assistant] Turn: Raw="${input.text}" -> Normalized="${normalizedText}"`);

        // 3. Interaction Logic (Interrupts check)
        const state = await ConversationStore.get(context.user_id, context.space_id);

        // INTERRUPT HANDLING (Same as Phase 3)
        if (state && state.status === 'waiting_confirmation') {
            if (['sí', 'si', 'confirmar', 'hazlo', 'ok', 'dale', 'simón', 'adelante'].includes(normalizedText.toLowerCase())) {
                return executeIntent(state, context);
            }
            if (['no', 'cancelar', 'cancela', 'olvídalo', 'déjalo', 'abortar', 'basta'].includes(normalizedText.toLowerCase())) {
                await ConversationStore.delete(context.user_id, context.space_id);
                return { success: true, narrative_log: "🚫 Operación cancelada." };
            }

            // CORRECTION / NEW INTENT OVERRIDE
            console.log("[Assistant] Detected potential interruption/correction.");
            state.status = 'collecting_params';
        }

        // 4. Handle Cancellation (Global Check)
        if (state && ['cancelar', 'cancela', 'olvídalo'].includes(normalizedText.toLowerCase())) {
            await ConversationStore.delete(context.user_id, context.space_id);
            return { success: true, narrative_log: "🚫 Cancelado." };
        }

        // 5. Handle Active State (Multi-turn parameter collection)
        if (state) {
            return handleActiveConversation(state, normalizedText, context);
        }

        // 6. NEW INTENT DETECTION (Via Model Adapter)
        let modelId = 'mock'; // Default fallback

        if (input.input_mode === 'voice') {
            modelId = settings.is_personaplex_enabled ? 'personaplex' : 'mock';
        } else {
            modelId = settings.is_clawdbot_enabled ? 'clawdbot' : 'mock';
        }

        const model = getModel(modelId, context.space_id);

        const modelInput: AssistantModelInput = {
            message: normalizedText,
            space_id: context.space_id,
            organization_id: context.tenant_id,
            context: {
                allowedActions: context.allowed_actions,
                userIntent: VoiceContextManager.get(context.user_id, context.space_id)?.last_intent
            }
        };

        console.log(`[Assistant] Asking Model (${model.id}) [Mode: ${input.input_mode || 'text'}]...`);
        const modelOutput = await model.generateResponse(modelInput);

        // If Model suggests an action, we treat it as a Detected Intent
        if (modelOutput.suggestedAction) {
            const action = modelOutput.suggestedAction;
            const intentName = action.type;
            const params = action.payload;

            console.log(`[Assistant] Model suggested: ${intentName}`);

            // Initialize State
            const newState: ConversationState = {
                space_id: context.space_id,
                user_id: context.user_id,
                active_intent: intentName,
                pending_parameters: params || {},
                missing_parameters: [],
                status: 'collecting_params',
                expires_at: Date.now() + 300000,
                last_interaction_at: Date.now()
            };

            VoiceContextManager.set(context.user_id, context.space_id, { last_intent: intentName });

            return processStateTransition(newState, context);
        }

        // Fallback if model says nothing actionable
        return { success: false, narrative_log: modelOutput.text || "🤔 No entendí." };
    } catch (e: any) {
        console.error("[AssistantEngine] Fatal Error:", e);
        return { success: false, narrative_log: "⚠️ Error interno del asistente." };
    }
}

// Internal State Handler (Unchanged from Phase 3)
async function handleActiveConversation(state: ConversationState, input: string, context: any): Promise<AssistantResult> {
    if (state.status === 'collecting_params') {
        const resolution = IntentResolver.resolve(state);
        if (resolution.missing_parameter) {
            state.pending_parameters[resolution.missing_parameter] = input;
            return processStateTransition(state, context);
        } else {
            return processStateTransition(state, context);
        }
    }
    // Fallback
    await ConversationStore.delete(context.user_id, context.space_id);
    return { success: false, narrative_log: "Error de estado. Reiniciando." };
}

// State Transition Logic (Unchanged)
async function processStateTransition(state: ConversationState, context: any): Promise<AssistantResult> {
    const resolution = IntentResolver.resolve(state);

    if (resolution.missing_parameter) {
        state.status = 'collecting_params';
        state.missing_parameters = [resolution.missing_parameter];
        await ConversationStore.save(state);
        return { success: true, narrative_log: resolution.narrative_question || "¿Dato?" };
    }

    if (resolution.should_confirm_now) {
        state.status = 'waiting_confirmation';
        state.missing_parameters = [];
        await ConversationStore.save(state);
        return { success: true, narrative_log: resolution.narrative_question || "¿Confirmas?" };
    }

    if (resolution.is_ready) {
        return executeIntent(state, context);
    }
    return { success: false, narrative_log: "Estado indefinido." };
}

// Execution Wrapper (Same logic, slightly cleaned up)
async function executeIntent(state: ConversationState, context: any): Promise<AssistantResult> {
    const action = getActionForIntent(state.active_intent!);
    if (!action) return { success: false, narrative_log: "Error de acción." };

    const guard = PermissionGuard.check(context, action, state.active_intent);
    if (!guard.allowed) {
        await ConversationStore.delete(context.user_id, context.space_id);
        return { success: false, narrative_log: `🔒 ${guard.reason}` };
    }

    try {
        const result = await action.execute(context, state.pending_parameters);
        await ConversationStore.delete(context.user_id, context.space_id);
        VoiceContextManager.set(context.user_id, context.space_id, { last_action: action.name });
        return result;
    } catch (e: any) {
        await ConversationStore.delete(context.user_id, context.space_id);
        return { success: false, narrative_log: `Error: ${e.message}` };
    }
}
