# Pixy Flows v1: Especificación de MVP y Arquitectura Operativa

## 1. Alcance Definido del MVP (Strict Scope)

### ✅ Qué SÍ incluye (The "Magic 5")
Este MVP se limita exclusivamente a resolver **5 problemas de negocio** universales, ejecutados con profundidad perfecta en lugar de amplitud mediocre.

1.  **Entry Point**: "Galería de Resultados" (No dashboard vacío).
2.  **Constructor**: Wizard "Mad Libs" (Fill-in-the-blanks).
3.  **Editor**: "Rail Editor" (Vertical, lineal, sin drag-and-drop libre).
4.  **Motor**: Ejecución secuencial básica con lógica condicional simple (If/Else binario).
5.  **Las 5 Rutinas Maestras**:
    *   💰 **Cobrador Amable** (Factura vencida → WhatsApp suave).
    *   📝 **Seguimiento de Presupuesto** (Presupuesto enviado → Email de seguimiento).
    *   🤝 **Reactivación de Clientes** (Inactividad 60d → Oferta retorno).
    *   ⭐ **Pedido de Reseña** (Servicio finalizado → Link reseña).
    *   🚀 **Onboarding de Cliente** (Nuevo cliente → Email bienvenida + Drive compartido).

### ❌ Qué NO incluye (Explicitly Out of Scope)
*   Canvas 2D, Drag & Drop libre, cables visibles.
*   Creación de rutinas desde cero absoluto (siempre se empieza de plantilla).
*   Lógica compleja (Bucles, Switch case, Code nodes).
*   Integraciones externas "Custom" (HTTP Request genérico).
*   IA Generativa (Pixy no "inventa" flujos todavía, solo recomienda los probados).
*   Marketplace público.

---

## 2. Experiencia de Usuario (UX Flow Detallado)

### Fase 1: Descubrimiento (The Menu)
El usuario entra a "Operaciones" (o "Flows") y no ve una tabla técnica. Ve un menú de restaurante.

*   **Título**: *"¿Qué te gustaría delegar hoy?"*
*   **Subtítulo**: *"Selecciona una tarea y Pixy se encargará de ella automáticamente."*
*   **Cards (Las 5 Rutinas)**:
    *   Icono grande descriptivo (ej: 💸 para Cobranza).
    *   Título de Beneficio: *"Recuperar pagos atrasados"*.
    *   Descripción humana: *"Avisa amablemente a los clientes cuando su factura vence."*

### Fase 2: Configuración (The Mad Libs Wizard)
Al hacer clic en "Recuperar pagos", se abre un modal limpio. No hay nodos. Solo una frase para completar.

**Header**: *"Configurando a tu Asistente de Cobranzas"*

**Cuerpo (Formulario Narrativo)**:
> "Cuando una factura venza por más de **[ 3 ]** días,
> si el monto es mayor a **[ $50 ]**,
> enviar el mensaje **[ Recordatorio Suave de Pago ]**
> por **[ WhatsApp ]**."

*   **[ 3 ]**: Input numérico simple.
*   **[ $50 ]**: Input de moneda.
*   **[ Recordatorio Suave... ]**: Dropdown con plantillas de texto pre-escritas (Amable, Firme, Urgente). El usuario puede ver el texto pero no necesita escribirlo desde cero.
*   **[ WhatsApp ]**: Switch entre Email / WhatsApp / SMS (según integraciones activas).

**Footer**: Botón principal **"Activar Rutina"**. (Nada de "Guardar", "Deploy", "Publicar").

### Fase 3: El Riel (The Rail Editor) - *Solo si "Editan"*
Si el usuario hace clic en "Personalizar", vira al **Rail Editor**.
*   **Visual**: Una línea vertical gris suave al centro.
*   **Pasos**: Tarjetas blancas con sombra suave, conectadas por la línea.
*   **Interacción**:
    *   Clic en un paso → Abre panel lateral derecho con detalles (simple).
    *   Clic en "+" entre pasos → Solo permite "Esperar" o "Regla simple". No permite bifurcaciones locas.
*   **Reglas**: Se muestran como una pequeña indentación en el riel.
    *   *"Si es VIP"* → (Línea se desvía levemente a la derecha) → *"Enviar Regalo"*.
    *   (Línea vuelve al centro).

---

## 3. Arquitectura Lógica (Data Model Conceptual)

El modelo interno *jamás* se expone como JSON. Es una estructura de **Objetos de Negocio**.

```typescript
// Concepto: Rutina (La "Misión")
type Routine = {
  id: string;
  name: "Cobrador Amable";
  intent: "recover_payment"; // Outcome-first
  status: "active" | "paused";
  spaceId: string; // Vinculación crítica con el Space
  trigger: TriggerDefinition; // El "Momento"
  steps: Step[]; // La secuencia
};

// Concepto: El "Momento" (Trigger)
type TriggerDefinition = {
  entity: "invoice"; // Objeto de negocio, no "webhook"
  event: "status_changed";
  conditions: { // Filtros pre-trigger (invisible al usuario a veces)
    field: "status";
    operator: "equals";
    value: "overdue";
  };
};

// Concepto: Paso (Task/Rule/Wait)
type Step = 
  | { type: "action"; task: "send_whatsapp"; params: { templateId: "soft_reminder" } }
  | { type: "wait"; duration: { value: 3; unit: "days" } }
  | { type: "rule"; condition: { field: "amount"; operator: "gt"; value: 50 }; branches: Step[][] };
```

### Ejecución y Logs Narrativos
Cuando una rutina corre, el log no es técnico (`Status: 200 OK`). Es una historia.
*   ✅ *Detectada factura #F-102 vencida.*
*   ✅ *Esperé 3 días.*
*   ✅ *Verifiqué que el monto ($150) es mayor a $50.*
*   ✅ *Envié WhatsApp al cliente (Leído ✅).*

---

## 4. Integración con Pixy Spaces

El **Space** es el cerebro que pre-llena los huecos.

### A. Vocabulario Dinámico
El motor de renderizado de la UI consulta el `SpaceContext`:
*   Si `Space == Agency`: "Nuevo **Cliente**", "Proyecto Finalizado".
*   Si `Space == RealEstate`: "Nuevo **Prospecto**", "Operación Cerrada".
*   Si `Space == Clinic`: "Nuevo **Paciente**", "Consulta Terminada".

### B. Auto-Activación (Magic Onboarding)
Cuando el usuario crea un Space (ej: "Agencia de Marketing"):
1.  Pixy detecta el tipo de negocio.
2.  Pixy **instala silenciosamente** las 5 Rutinas Maestras en modo "Pausado" o "Sugerido".
3.  Al entrar a Flows, el usuario ve: *"Hemos preparado 3 rutinas estándar para Agencias. ¿Quieres revisarlas?"*

### C. Momentos (Triggers) Exclusivos
El Space define qué eventos existen.
*   Un `RestaurantSpace` inyecta el evento `trigger.reservation_no_show`.
*   Un `AgencySpace` inyecta el evento `trigger.contract_signed`.
La arquitectura permite que módulos externos registren sus propios Triggers en el motor de Flows.

---

## 5. Checklist de Implementación (Next 30 Days)

### Semana 1: Core Engine & Data Model
- [ ] Implementar esquemas de BD (Supabase) para `Routines`, `Steps`, `Executions`.
- [ ] Crear el "Runner" básico (Procesador secuencial de pasos).
- [ ] Definir la interfaz de abstracción para los "Momentos" (Event Bus).

### Semana 2: The Rail Editor (Frontend)
- [ ] Crear componente `Rail` vertical en React.
- [ ] Implementar renderizado de Tarjetas de Paso (ActionCard, WaitCard).
- [ ] Construir panel lateral de configuración de paso.

### Semana 3: The Wizard & Templates
- [ ] Codificar las 5 "Rutinas Maestras" como JSON templates fijos.
- [ ] Implementar la UI de "Mad Libs" (Wizard narrativo).
- [ ] Conectar Wizard → Generación de Rutina en BD.

### Semana 4: Integration & Space Context
- [ ] Conectar `SpaceContext` para inyección de vocabulario.
- [ ] Implementar los Triggers reales (Webhooks internos desde Invoice/CRM).
- [ ] Pruebas E2E con usuarios no técnicos (Feedback loop).
