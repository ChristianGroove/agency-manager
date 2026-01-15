/**
 * Context Guard: Validates and sanitizes user prompts before AI processing.
 * Prevents abuse, prompt injection, and off-topic requests.
 */

// Temas permitidos (keywords que indican relevancia)
const ALLOWED_TOPICS = [
    'automatización', 'automatizacion', 'workflow', 'flujo', 'bot',
    'mensaje', 'whatsapp', 'instagram', 'email', 'sms',
    'lead', 'cliente', 'contacto', 'crm', 'pipeline',
    'factura', 'cotización', 'cotizacion', 'invoice', 'quote',
    'notificación', 'notificacion', 'alerta', 'aviso',
    'espera', 'delay', 'wait', 'tiempo', 'minutos', 'horas',
    'condición', 'condicion', 'si', 'entonces', 'if', 'when',
    'trigger', 'disparador', 'evento', 'respuesta', 'reply',
    'bienvenida', 'welcome', 'saludo', 'onboarding',
    'seguimiento', 'follow', 'recordatorio', 'reminder',
    'etiqueta', 'tag', 'segmentar', 'clasificar',
    'variable', 'dato', 'guardar', 'calcular',
    'ia', 'ai', 'inteligencia', 'gpt', 'chatgpt',
    'enviar', 'send', 'crear', 'create', 'generar'
];

// Patrones bloqueados (prompt injection y off-topic)
const BLOCKED_PATTERNS = [
    // Prompt injection attempts
    /ignore previous|ignora lo anterior/i,
    /forget instructions|olvida las instrucciones/i,
    /actúa como|pretend to be|you are now/i,
    /new instructions|nuevas instrucciones/i,
    /system prompt|prompt del sistema/i,

    // Code generation attempts
    /genera código|generate code|write code|escribe código/i,
    /javascript|python|sql|html|css/i,

    // Security probes
    /hack|exploit|inyección|injection|xss|csrf/i,
    /password|contraseña|token|api.?key|secret/i,

    // Off-topic requests
    /cuéntame un chiste|tell me a joke/i,
    /escribe un poema|write a poem/i,
    /qué opinas de|what do you think about/i,
    /ayúdame con mi tarea|help with homework/i,
];

export interface ContextValidationResult {
    valid: boolean;
    reason?: string;
    sanitizedPrompt?: string;
}

/**
 * Validates user prompt for context relevance and security.
 */
export function validatePromptContext(prompt: string): ContextValidationResult {
    // 1. Basic sanitization
    const sanitized = prompt
        .trim()
        .replace(/\s+/g, ' ') // Normalize whitespace
        .slice(0, 1000); // Max length

    // 2. Length checks
    if (sanitized.length < 10) {
        return {
            valid: false,
            reason: 'Tu mensaje es muy corto. Describe qué tipo de flujo de trabajo necesitas.'
        };
    }

    if (sanitized.length > 800) {
        return {
            valid: false,
            reason: 'Tu mensaje es muy largo. Intenta resumir la descripción del flujo.'
        };
    }

    // 3. Check for blocked patterns (security)
    for (const pattern of BLOCKED_PATTERNS) {
        if (pattern.test(sanitized)) {
            console.warn('[ContextGuard] Blocked pattern detected:', pattern);
            return {
                valid: false,
                reason: 'Tu mensaje contiene contenido que no puedo procesar. Por favor, describe solo el flujo de trabajo que necesitas.'
            };
        }
    }

    // 4. Check topic relevance
    const promptLower = sanitized.toLowerCase();
    const hasRelevantTopic = ALLOWED_TOPICS.some(topic =>
        promptLower.includes(topic.toLowerCase())
    );

    if (!hasRelevantTopic) {
        return {
            valid: false,
            reason: 'No detecto que estés describiendo un flujo de automatización. Incluye palabras como "cuando", "mensaje", "lead", "flujo", etc.'
        };
    }

    // 5. All checks passed
    return {
        valid: true,
        sanitizedPrompt: sanitized
    };
}

/**
 * Rate limit state (in-memory, should be Redis in production)
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetInSeconds: number;
}

/**
 * Check rate limit for orchestrator usage.
 * Limits: 10 requests per hour, 30 per day.
 */
export function checkOrchestratorRateLimit(organizationId: string): RateLimitResult {
    const now = Date.now();
    const hourWindow = 60 * 60 * 1000; // 1 hour in ms
    const maxPerHour = 10;

    const key = `orchestrator:${organizationId}`;
    const current = rateLimitMap.get(key);

    // Reset if window expired
    if (!current || now > current.resetAt) {
        rateLimitMap.set(key, { count: 1, resetAt: now + hourWindow });
        return { allowed: true, remaining: maxPerHour - 1, resetInSeconds: 3600 };
    }

    // Check limit
    if (current.count >= maxPerHour) {
        const resetInSeconds = Math.ceil((current.resetAt - now) / 1000);
        return { allowed: false, remaining: 0, resetInSeconds };
    }

    // Increment and allow
    current.count++;
    rateLimitMap.set(key, current);

    return {
        allowed: true,
        remaining: maxPerHour - current.count,
        resetInSeconds: Math.ceil((current.resetAt - now) / 1000)
    };
}
