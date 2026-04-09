# Pixy Flows: Visión de Producto y Arquitectura

## 1. Visión y Filosofía
Pixy Flows es el **motor de operaciones** para negocios reales. No es una herramienta de "programación visual", sino un **gerente de operaciones virtual** que ejecuta procedimientos estándar.

### Los 4 Pilares
1.  **Invisible por defecto**: El mejor flujo es el que el usuario no sabe que existe hasta que ve el resultado.
2.  **Narrativo, no Lógico**: La interfaz cuenta una historia ("Cuando pase X, haz Y"), no un diagrama lógico.
3.  **Contexto sobre Configuración**: Pixy asume el 90% de la configuración basándose en el "Space" (Industria) del usuario.
4.  **Resultados Tangibles**: Cada flujo tiene un propósito de negocio (ej: "Recuperar dinero"), no técnico (ej: "Webhook handler").

---

## 2. Modelo Mental del Usuario
El usuario no "construye un circuito". El usuario **entrena a un empleado virtual**.

**Metáfora:** "Si tuvieras a una secretaria perfecta sentada a tu lado las 24 horas, ¿qué le pedirías que vigile y qué le pedirías que haga?"

### El ciclo "Vigilar → Verificar → Actuar"
Para el usuario, la estructura es siempre lineal y narrativa:
1.  **VIGILAR (El Detonante):** "¿A qué debo estar atento?" (Un nuevo pedido, una fecha, un cambio de estado).
2.  **VERIFICAR (El Filtro - Opcional):** "¿En qué casos te aviso o actúo?" (Solo si es VIP, solo si debe más de $100).
3.  **ACTUAR (La Tarea):** "¿Qué hago por ti?" (Mandar un WhatsApp, crear una factura, avisar al equipo).

---

## 3. Arquitectura de Conceptos (Diccionario)

| Concepto Técnico (PROHIBIDO) | Concepto Pixy (USUARIO) | Descripción para el Usuario |
| :--- | :--- | :--- |
| **Workflow / DAG** | **Rutina** (o Misión) | Un trabajo completo que Pixy hace por ti. |
| **Node** | **Paso** | Una parte de la rutina. |
| **Trigger / Webhook** | **Momento** | El evento que despierta a Pixy. "¿Cuándo ocurre?" |
| **Payload / JSON** | **Datos del Caso** | La información disponible (Cliente, Monto, Fecha). |
| **Condition / If-Else** | **Reglas** | Condiciones para continuar. "¿Aplican todos?" |
| **Action / Request** | **Tarea** | El trabajo real. "¿Qué hacemos?" |
| **Cron / Schedule** | **Agenda** | "Todos los lunes", "3 días después". |
| **Delay** | **Esperar** | "Dar un respiro". |

---

## 4. Estructura del Editor (UI/UX)

### Nivel 1: La Galería de Resultados (Entry Point)
Nunca mostrar un botón gigante "Crear Flujo". Mostrar "Galería de Soluciones".
*   "¿Qué quieres lograr hoy?"
    *   💰 Recuperar carritos abandonados
    *   ⭐ Conseguir más reseñas
    *   🤝 Reactivar clientes antiguos

### Nivel 2: El Configurador de "Fill-in-the-blanks" (Wizard)
Interfaz tipo formulario narrativo (Mad Libs):
> *"Cuando un cliente **[tenga una deuda]** mayor a **[$100]**, esperar **[3 días]** y enviar **[Recordatorio Amable por WhatsApp]**."*

### Nivel 3: El Editor de Rieles (The Rail Editor)
Si el usuario necesita editar, no ve un canvas infinito 2D. Ve un **Riel Vertical (Timeline)**.
*   Línea de tiempo vertical sencilla.
*   Los "Pasos" son tarjetas apiladas.
*   No hay cables ni conexiones complejas.
*   Las ramificaciones son indentaciones visuales simples (como carpetas anidadas), no líneas que se cruzan.

---

## 5. Sistema de Plantillas Iniciales (Top 10)

Estas plantillas están pre-configuradas y solo piden 1-2 datos al usuario.

### 💰 Cobranza y Ventas
1.  **El "Cobrador Amable"**:
    *   *Momento*: Factura vencida hace 24h.
    *   *Tarea*: Enviar WhatsApp recordatorio suave.
2.  **Recuperación de Presupuestos**:
    *   *Momento*: Presupuesto enviado sin respuesta en 48h.
    *   *Tarea*: Email automatizado "¿Tienes alguna duda?".
3.  **Cierre de Venta (High Ticket)**:
    *   *Momento*: Cliente firma contrato digital.
    *   *Tarea*: Crear proyecto en Pixy + Notificar al CEO.

### 🤝 Fidelización y Reactivación
4.  **Cumpleaños VIP**:
    *   *Momento*: Fecha de cumpleaños del contacto.
    *   *Regla*: Etiquetas incluye "VIP".
    *   *Tarea*: Enviar cupón de regalo (SMS/WhatsApp).
5.  **Reactivación "Te echamos de menos"**:
    *   *Momento*: Cliente sin actividad por 60 días.
    *   *Tarea*: Ofrecer descuento de retorno.
6.  **Pedido de Reseña Automático**:
    *   *Momento*: Proyecto marcado como "Finalizado".
    *   *Espera*: 2 días.
    *   *Tarea*: Enviar link de Google Reviews.

### ⚙️ Operaciones Internas (El "Office Manager")
7.  **Onboarding de Nuevo Cliente**:
    *   *Momento*: Nuevo cliente creado.
    *   *Tarea*: Crear carpeta en Drive + Enviar Email de Bienvenida con recursos.
8.  **Alerta de Cliente en Riesgo**:
    *   *Momento*: Cliente deja una valoración negativa (NPS < 7).
    *   *Tarea*: Crear ticket urgente "Llamar al cliente" asignado al Gerente.
9.  **Reporte Semanal**:
    *   *Momento*: Todos los viernes a las 9:00 AM.
    *   *Tarea*: Recopilar ventas de la semana y enviarlas por Slack al equipo.

### 📅 Citas y Agenda
10. **Recordatorio de "No-Show"**:
    *   *Momento*: 1 hora antes de la cita.
    *   *Tarea*: Enviar WhatsApp con ubicación y botón "Confirmar".

---

## 6. Integración con Pixy Spaces

Pixy Flows **hereda** la inteligencia del Space activo. Flows no es genérico, es específico por industria.

*   **Si el Space es "Restaurante"**:
    *   El "Momento" predeterminado sugiere "Nueva Reserva", "Pedido Online", "Mesa Cerrada".
    *   La plantilla #6 (Reseña) se activa sola por defecto.
    
*   **Si el Space es "Agencia Inmobiliaria"**:
    *   El "Momento" sugiere "Nueva Propiedad", "Contrato Vencido".
    *   La plantilla #2 (Seguimiento) usa lenguaje de "Visitas" en lugar de "Presupuestos".

El **Space** define:
1.  **El vocabulario**: (Paciente vs Cliente vs Comensal).
2.  **Los "Momentos" (Triggers) exclusivos**: Un abogado no tiene "Mesa Cerrada", un restaurante no tiene "Juicio Finalizado".
3.  **Los Packs de Activación**: Al crear un Space, el usuario ve: *"Hemos activado 3 automatizaciones estándar para Restaurantes por ti. ¿Quieres verlas?"* (Onboarding mágico).
