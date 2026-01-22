# 📕 PIXY PRODUCT BIBLE - MASTER EDITION
**Ecosistema Universal de Gestión Empresarial: Especificación Completa y Definitiva**

> **Fuente de Verdad Única**: Este documento fusiona todas las versiones previas de la documentación de Pixy sin omitir un solo detalle técnico o funcional. Es la referencia absoluta para cualquier desarrollo, integración o decisión estratégica del producto.

---

## 1. Definición Esencial & Visión Arquitectónica

### A. Concepto Fundamental
Pixy no es un CRM genérico ni una herramienta de automatización visual. Es un **Gerente de Operaciones Virtual** (Virtual Operations Manager) para PYMES y Agencias.

**Filosofía Central**: "Cero Configuración Técnica". Pixy asume el contexto del negocio (Space) para pre-configurar flujos operativos automáticamente.

**Metáfora Operativa**: Un empleado perfecto que vigila, verifica y actúa por ti las 24/7, liberando al dueño del negocio de tareas operativas repetitivas.

### B. Arquitectura de Capas (Core vs. Spaces)
Pixy es un **Ecosistema Universal** diseñado para escalar horizontalmente a múltiples industrias mediante una arquitectura de capas lógicas que separan la infraestructura compartida de la lógica operativa vertical.

**El Modelo de Capas Estratégico:**
- **Capa 0: Infraestructura & ADN Universal**: El motor base que reside en el núcleo de todo el ecosistema (Seguridad, IA, Marca Blanca, Comunicaciones, Onboarding, Metraje).
- **Capa 1: CRM & Finanzas Core (Shared Heart)**: La capa de negocio compartida por todos los Spaces. Cualquier empresa en Pixy necesita clientes, facturas y cobros.
- **Capa 2: Dashboard Adaptativo**: El centro neurálgico que muta su interfaz y métricas en tiempo real basándose en el tipo de organización y el Space activo.
- **Capa 3: Spaces Especializados**: Módulos verticales con lógica operativa exclusiva.
    - **Space Agency**: Enfoque en creatividad, briefings y gestión de portales.
    - **Space Service Ops**: Enfoque en logística de campo, órdenes de trabajo y nómina.

---

## 2. Stack Tecnológico & Infraestructura

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS 4 + Shadcn UI (Radix Primitives)
- **Animations**: Framer Motion / Motion
- **Flow Visualization**: XYFlow / React Flow (usado en el "Rail Editor")

### Backend & Datos
- **Base de Datos**: PostgreSQL alojado en **Supabase**
- **Auth**: Supabase Auth + WebAuthn (Passkeys)
- **Serverless**: Vercel Edge/Serverless Functions
- **ORM / Querying**: `postgres` (lean client) + Supabase SSR

### Infraestructura de Servicios
- **Automatización**: Inngest (Runner de flujos)
- **Comunicaciones**: Resend (Email), Twilio/API Cloud (WhatsApp/SMS)
- **Almacenamiento**: AWS S3 + Supabase Storage
- **AI Docs**: Google Generative AI / OpenAI SDKs

---

## 3. CAPA 0: Infraestructura & ADN Universal

Esta capa contiene los sistemas fundamentales que sostienen todo el ecosistema Pixy, independientemente del Space o vertical que utilice el usuario.

### A. Seguridad y Aislamiento (Security DNA)

El ADN de Pixy está construido sobre pilares de seguridad bancaria y aislamiento total de datos.

#### 1. Aislamiento Multi-Tenant (Row Level Security)
- **Implementación**: Cada registro en PostgreSQL está protegido por *Row Level Security* (RLS) a nivel de base de datos.
- **Mecanismo**: El filtrado ocurre en el motor de DB mediante el campo `organization_id`, NO en la capa de aplicación.
- **Beneficio**: Impide fugas de datos incluso ante fallos críticos en la lógica del frontend o backend. Los datos de una organización son literalmente invisibles para cualquier otra, incluso si un atacante compromete la sesión.

#### 2. Cifrado de Credenciales (Data Vault)
- **Almacenamiento Seguro**: Las llaves API y credenciales sensibles (Stripe, WhatsApp, Resend, OpenAI) se almacenan encriptadas en un *Data Vault* desacoplado de la base de datos principal.
- **Encriptación**: Se utiliza `encryptObject` para cifrar las credenciales antes de guardarlas.
- **Proceso de Uso**: El descifrado solo ocurre en memoria segura durante el tiempo de ejecución de una acción específica, nunca se persisten en texto plano.
- **Separación de Responsabilidades**: El vault está aislado para que un compromiso en la DB principal no exponga las credenciales.

#### 3. Autenticación Biométrica & Passkeys (WebAuthn)
- **Soporte Nativo**: Implementación completa de **WebAuthn** para autenticación sin contraseñas.
- **Métodos Soportados**: Huella dactilar (TouchID), reconocimiento facial (FaceID), llaves de seguridad física (YubiKey).
- **Ventaja de Seguridad**: Elimina completamente el vector de ataque de phishing y robo de contraseñas, ya que la autenticación se basa en criptografía de clave pública.

### B. Sistema de Marca Blanca (White Label Engine)

Pixy permite que agencias y empresas operen con su propia identidad visual de forma transparente y programática.

#### 1. Branding Tiers (Niveles de Personalización)
El White Label no es un simple interruptor, sino un sistema de **Branding Tiers** con permisos granulares:

- **Basic (Heredado)**: Muestra la marca Pixy global (Logos, colores e isotipos predeterminados de la plataforma).
- **Pro Branding**: Permite configurar `custom_logo` y `custom_colors` (paleta primaria/secundaria).
- **Full Agency (Marca Blanca Total)**: 
    - Activa `remove_pixy_branding`, eliminando watermarks en documentos PDF y referencias en el footer de la UI.
    - El cliente final jamás ve la marca Pixy.
- **Enterprise**: 
    - Activa `custom_domain` para que el panel admin y el portal operen bajo el dominio del cliente (ej: `app.tuempresa.com`).
    - Incluye certificados SSL automáticos y DNS personalizado.

#### 2. Resolución de Estilos (Cascada de Branding)
El motor `getEffectiveBranding` resuelve la identidad visual en tiempo de ejecución siguiendo esta jerarquía:
1. **Tenant Paid Tier**: Si la organización tiene un tier pagado, aplica sus configuraciones personalizadas.
2. **Tenant Settings**: Si no hay tier pero existen settings de branding, intenta aplicarlas (sujeto a restricciones del plan).
3. **Queen Brand (Pixy)**: Fallback final a la identidad de la plataforma madre si no hay configuración específica.

#### 3. Branding Provider (Inyección Dinámica de CSS)
- **Mecanismo**: Componente "Guardian" que escucha los cambios en la configuración del tenant.
- **Inyección en Tiempo Real**: Sobrescribe las **CSS Custom Properties** raíz (`--brand-pink`, `--brand-cyan`, `--primary`, `--sidebar-primary`) directamente en `document.documentElement.style`.
- **Reactividad Total**: Cuando el administrador cambia los colores de marca, TODA la UI muta instantáneamente (botones, bordes, sombras, gráficas, loaders) sin necesidad de recargar la página.
- **Cascada de Estilos**: Los componentes no tienen colores hardcodeados; todos consumen las variables CSS, garantizando consistencia total.

#### 4. Sistema de Temas Inmersivos (Light/Dark Mode)
- **Light Mode**: Diseño enfocado en productividad máxima con fondos puros y altos contrastes.
- **Dark Mode**: Basado en un **gradiente radial** inmersivo (`radial-gradient(circle at 50% 0%, #1a0b1e 0%, #000000 60%)`) que proporciona profundidad espacial y una estética premium.
- **Orquestación**: Gestión mediante `next-themes`, permitiendo cambios instantáneos con persistencia de preferencia del usuario.

#### 5. Experiencia de Carga (Holographic Loaders)
Los tiempos de carga se aprovechan para reforzar la identidad visual mediante el componente `GlobalLoader`:

**Liquid Wave Fill (Modo SVG)**:
- Si la organización tiene un **isotipo SVG**, el loader aplica un efecto de "llenado líquido" con ondas sinusoidales.
- **Física Simulada**: Una onda animada (`@keyframes wave`) que se mueve horizontalmente mientras el contenedor crece verticalmente, creando la ilusión de un líquido ascendente.
- **Color de Marca**: El líquido adopta el color exacto del `--brand-pink` mediante `style={{ backgroundColor: 'var(--brand-pink)' }}`.

**Bitmap Pulse (Modo Imagen)**:
- Para logos tradicionales (PNG/JPG), se aplica una **pulsación ambiental** con un aura del color corporativo.
- Un `<motion.div>` detrás de la imagen pulsa suavemente en opacidad y escala, dando vida al logo estático.

**Narrativa de Carga**:
- Sistema de **textos dinámicos rotativos** que se alternan cada 2 segundos:
    - "Cargando recursos..."
    - "Conectando base de datos..."
    - "Sincronizando assets..."
    - "Iniciando Pixy CRM..."
    - "Optimizando experiencia..."
- **Propósito**: Humanizar la espera y dar feedback transparente sobre los procesos internos del sistema.

#### 6. Dominios Personalizados
- **Soporte Enterprise**: Las organizaciones con tier Enterprise pueden configurar un dominio completamente personalizado.
- **Proceso**: Configuración de DNS (CNAME) apuntando al servidor de Pixy + emisión automática de certificado SSL vía Let's Encrypt.
- **Aislamiento Total**: El cliente final opera en `app.suempresa.com` sin jamás ver referencias a Pixy.

### C. Sistema de Metraje y Límites (Usage Metering)

Pixy utiliza un motor de metraje proactivo para evitar sobrecostos y garantizar un crecimiento predecible.

#### 1. Motores de Consumo
Control granular de cuatro categorías de uso:
- **`whatsapp`**: Mensajes salientes vía WhatsApp (Meta Official o Evolution).
- **`ai_messages`**: Inferencias de IA (llamadas al modelo de lenguaje).
- **`ai_tokens`**: Procesamiento RAG (embeddings, búsquedas vectoriales).
- **`emails`**: Envíos de correo electrónico vía Resend.

#### 2. Mecánica de Control (UsageLimiter)
- **Verificación en Tiempo Real**: Antes de ejecutar cualquier acción costosa, el sistema llama a `assertUsageAllowed(orgId, engineKey)`.
- **Consulta Atómica**: Compara el consumo acumulado en `usage_counters` contra los topes definidos en `usage_limits`.
- **Bloqueo Preventivo**: Si el límite se ha alcanzado, la acción se aborta y se notifica al usuario para que actualice su plan.

#### 3. Incremento Atómico (Concurrency-Safe)
- **RPC `increment_usage_counter`**: Función de base de datos que incrementa el contador de forma atómica.
- **Garantía de Precisión**: Evita race conditions en entornos de alta concurrencia (múltiples workers ejecutando acciones simultáneamente).

#### 4. Planes y Suscripciones (Tiers)
La arquitectura soporta planes pre-configurados con límites variables:
- **Starter**: Límites básicos para comenzar (ej: 1,000 mensajes WA/mes).
- **Professional**: Límites intermedios para agencias en crecimiento.
- **Business**: Límites expandidos para operaciones a escala.
- **Scale (Unlimited)**: Sin límites hard, facturación por consumo real (pay-as-you-go).

#### 5. Escalamiento Inteligente
- **RPC `upgrade_org_plan`**: Al cambiar de plan, los límites se ajustan automáticamente en la tabla `usage_limits`.
- **Transición Instantánea**: El nuevo límite surte efecto de inmediato, sin necesidad de reiniciar servicios.
- **Frecuencia**: Soporte para facturación mensual y anual, con descuentos automáticos aplicados por tier y duración de compromiso.

---

### D. Asistente IA Contextual (Contextual Action Assistant - CAA)

El sistema de ayuda de Pixy no es estático; es un asistente proactivo que entiende el contexto del usuario en tiempo real.

#### 1. El Orbe Holográfico (Interfaz Flotante)
- **Visuales**: Botón flotante animado con efectos de resplandor ambiente y orbitales, estilo "orbe hologr

fico futurista".
- **Interactividad**:
    - **Draggable**: El usuario puede **arrastrar y reposicionar** el orbe en cualquier lugar de la pantalla usando Framer Motion.
    - **Haptic-Feedback**: Micro-animaciones al pasar el mouse (hover) y al abrir el asistente (launch).
    - **Keyboard Shortcut**: Acceso instantáneo mediante `Cmd+K` o `Ctrl+K` (atajo universal).

#### 2. Inteligencia de Contexto (ViewContext)
- **Conciencia del Entorno**: Mediante el `ViewContextProvider`, el orbe sabe **exactamente** en qué página o módulo está el usuario.
- **Sugerencias Inteligentes**: Al abrirse, muestra artículos de ayuda y acciones rápidas filtradas por la vista actual usando `getByView`.
- **Ejemplo**: Si el usuario está en "Dashboard", le sugiere "Ver Reportes" o "Nuevo Cliente". Si está en "Inbox", le sugiere "Smart Replies" o "Refinar con IA".

#### 3. El Motor de Conocimiento (Registries)
El CAA se alimenta de dos fuentes de datos estructuradas:

**ActionRegistry** (Funciones Ejecutables):
- Catálogo de acciones que la IA puede disparar directamente.
- Ejemplos: "Crear Nueva Factura", "Exportar Contactos", "Abrir Chat con Cliente".
- Cada acción tiene un `id`, `label`, `type` ('function' o 'route'), `target` y un ícono de Lucide React.

**HelpRegistry** (Base de Conocimientos):
- Biblioteca de artículos enriquecidos con texto, imágenes y "Smart Links".
- Los Smart Links son enlaces internos que, al ser clicados, **ejecutan acciones** dentro de la app (ej: "Haz clic aquí para crear un lead" → dispara el modal de creación).
- Categorización por tópicos (getting-started, metrics, automation, etc.).

#### 4. IA Generativa (Pixy AI Chat)
- **Integración con LLM**: El orbe incluye un chat inteligente que consume el contexto de la vista actual y los artículos registrados.
- **Respuestas Contextuales**: El usuario puede preguntar "¿Cómo configuro WhatsApp?" y el asistente responde usando la base de conocimientos, sin que el usuario tenga que navegar por manuales.
- **Modo Copiloto**: En ciertas vistas, el asistente puede sugerir acciones proactivas ("Tienes 3 facturas vencidas, ¿quieres enviar recordatorios?").

### E. Comunicaciones & Notificaciones

Pixy gestiona múltiples capas de comunicación tanto internas (notificaciones in-app) como externas (email, WhatsApp).

#### 1. Motor de Email (Resend)
- **Identidad Dinámica**: Cada organización puede configurar su propio remitente (ej: `Acme <notifications@acme.com>`).
- **Templates Brandeados**: Los correos adoptan los colores y logo del tenant mediante variables dinámicas inyectadas en los templates HTML.
- **Auditoría Total**: Registro de todos los envíos con estados (delivered, bounced, opened) para trazabilidad completa.

#### 2. Sistema Multi-Capa de Notificaciones

**Notification Center** (Panel In-App):
- **Categorías**: Messages, Leads, Tasks, Deals, System.
- **Agrupación Inteligente**: Las notificaciones se agrupan por tipo y edad para evitar saturación.
- **Mark as Read**: El usuario puede marcar como leídas o archivar notificaciones obsoletas.

**System Alert Banners** (Comunicación Global):
- **Banners de Plataforma**: Pixy Platform Admin puede enviar alertas globales que aparecen como banners en TODOS los tenants.
- **Tipos**: Maintenance (mantenimiento programado), New Features (nuevas funcionalidades), Security Alerts (alertas de seguridad).
- **Visibilidad Controlada**: Los banners se pueden configurar para mostrarse solo a ciertos tipos de organizaciones (ej: solo Resellers).

**Sonner Toasts** (Feedback Reactivo):
- **Retroalimentación Inmediata**: Notificaciones toast efímeras que aparecen tras acciones del usuario.
- **Variantes**: Success (✓), Error (✗), Warning (!), Info (i).
- **Auto-dismiss**: Se desvanecen automáticamente tras 3-5 segundos para no interrumpir el flujo.

**Smart Alerts (Dashboard)**:
- **Detección de Anomalías**: El dashboard analiza automáticamente condiciones críticas (cartera vencida, jobs sin asignar, límites de uso cercanos).
- **Visualización Prioritaria**: Las alertas más críticas se destacan en una tarjeta especial con CTA (Call-to-Action) directo.

### F. Viaje del Usuario: Auth & Onboarding

El proceso de entrada a Pixy está diseñado para eliminar la fricción técnica y configurar el entorno operativo en segundos.

#### 1. Autenticación "Passwordless"
- **Identity Provider**: Basado en **Supabase Auth** como capa de autenticación.
- **Métodos Modernos**:
    - **Passkeys (WebAuthn)**: Autenticación biométrica sin contraseñas.
    - **Magic Links**: Enlaces únicos enviados por Email o WhatsApp que inician sesión automáticamente al ser clicados.
- **Multi-Org Context**: Un mismo usuario puede pertenecer a múltiples organizaciones.
    - **Context Switcher**: Componente que permite alternar entre organizaciones sin cerrar sesión.
    - **Persistencia**: La organización activa se guarda en una cookie segura (`cookieStore`).

#### 2. El Setup Wizard (Onboarding)

El `OnboardingWizard` es un flujo de 3 pasos que guía al nuevo usuario:

**Paso 1: Identidad del Negocio**
- Registro del nombre de la organización.
- Generación automática del `slug` (subdominio) a partir del nombre, sanitizando caracteres especiales.

**Paso 2: Selección de Vertical (The Space Selection)**
- El usuario elige su industria/vertical (Agency, Real Estate, Limpieza, Restaurante, etc.).
- Cada vertical tiene una descripción y un set de módulos pre-configurados.

**Paso 3: Aprovisionamiento Automático (Vertical Packs)**
- **Ejecución RPC**: Pixy ejecuta automáticamente el RPC `assign_app_to_organization`.
- **Instalación de Módulos**: Se activan los módulos específicos de la vertical seleccionada.
    - Ejemplo: Si selecciona "Agency OS", se activan: Contactos, Pipeline, Marketing, Inbox, Briefings, Catálogo.
- **Configuración de Nomenclaturas**: Se pre-configuran las "Industrias" y términos de vocabulario específicos del vertical.
- **Seed Inicial**: Se crean roles estándar (`Owner`, `Admin`, `Member`) y se asigna el usuario creador como `Owner`.

#### 3. Capa de Contexto: "Spaces"

Los **Spaces** son el cerebro contextual de la aplicación. Representan la industria o vertical del usuario.

**Inyección de Vocabulario**:
- Cambia términos dinámicamente según el Space.
- Ejemplo: En un Space de salud, "Cliente" se convierte en "Paciente". En uno legal, "Deal" se convierte en "Caso".

**Packs de Activación**:
- Al crear un Space, se instalan automáticamente las rutas estándar de esa industria.
- Esto evita que el usuario tenga que configurar manualmente módulos, formularios o flujos de trabajo.

---

## 4. Modelo Multi-Tenant & Jerarquías

Pixy está diseñado para escalar mediante un modelo de **Jerarquía de Organizaciones** que permite la operación de "Plataforma sobre Plataforma", habilitando el modelo de negocio B2B2B (Resellers que venden a clientes finales).

### A. Tipos de Organización

Pixy trabaja con tres arquetipos organizacionales que determinan capacidades, permisos y vistas:

#### 1. Platform (Pixy Global)
- **Nivel Raíz**: Control total de la plataforma.
- **Capacidades**:
    - Gestión de TODAS las organizaciones (suspensión, borrado, auditoría).
    - Configuración de reglas de negocio globales (planes, límites,pricing).
    - Acceso a logs de auditoría de todas las organizaciones para soporte técnico de nivel 3.
    - **System Broadcasts**: Capacidad de enviar alertas globales (Maintenance, New Features) que aparecen como banners en todos los inquilinos.

#### 2. Reseller (Agencias/Partners)
- **Función**: Adquieren Pixy para revenderlo o gestionarlo en nombre de terceros.
- **Dashboard Especializado**: Tienen su propio panel de gestión de sub-cuentas.
- **Capacidades**:
    - **Sub-account Provisioning**: Flujo automatizado para crear clientes finales e invitarlos por email con branding personalizado de la agencia.
    - **Usage Enforcement**: Control granular de límites (`usage_limits`) por motor (Automation, Messaging, AI) para cada sub-cuenta.
    - **Revenue Sharing**: Seguimiento automatizado de la cadena de adquisición y comisiones generadas por cada cliente (ver sección de Revenue Sharing).
    - **White Label**: Capacidad de aplicar su propia marca sobre Pixy para ofrecerlo como producto propio.

#### 3. Client (Inquilino Final)
- **Usuario Final**: PYME o negocio que utiliza las herramientas operativas de Pixy.
- **Acceso Restringido**: Solo ve su propia organización, sin visibilidad de la jerarquía superior.
- **Enfoque**: Herramientas de gestión diaria (CRM, Facturación, Automatización).

### B. Capa Administrativa (The Ops Tower)

Pixy cuenta con dashboards especializados según el nivel de privilegios administrativos:

#### 1. Platform Admin (PIXY Global)

**Control Central**:
- Gestión de todas las organizaciones registradas en la plataforma.
- **Suspensión por Impago**: Capacidad de marcar organizaciones como `suspended` con razón (`suspended_reason`), desactivando temporalmente su acceso.
- **Borrado Preventivo**: Antes de eliminar una organización, se marca como `pending_deletion` y se ejecuta un job para limpiar dependencias.

**Auditoría Global**:
- Acceso total a la tabla `audit_logs` para investigar incidentes o brindar soporte.
- **Visibilidad Cross-Tenant**: Puede ver métricas agregadas de uso, ingresos y salud de toda la red.

**System Broadcasts**:
- **Alertas de Mantenimiento**: Enviar notificaciones globales sobre ventanas de mantenimiento programadas.
- **Lanzamientos**: Anunciar nuevas funcionalidades a todos los usuarios activos.
- **Seguridad**: Comunicar vulnerabilidades parcheadas o requerimientos de actualización.

#### 2. Reseller Admin (The Agency Dashboard)

**Sub-account Provisioning**:
- Flujo de creación de nuevo cliente final en 3 pasos:
    1. Información básica (nombre, industry, demo/paid).
    2. Configuración de límites de uso (cuántos mensajes, cuánta IA pueden consumir).
    3. Invitación por email con branding personalizado del reseller.

**Usage Enforcement**:
- Control granular de `usage_limits` por CADA motor para cada sub-cuenta.
- Vista de consumo en tiempo real de todos sus clientes.
- Alertas cuando un cliente está cerca del límite (para ofrecer upgrade proactivamente).

**Revenue Sharing**:
- Dashboard de comisiones ganadas.
- Segregación por fases (Activation, Retention, Stable).
- Historial de liquidaciones pagadas vía Stripe Connect.

#### 3. IAM & Roles (Identity Access Management)

**RBAC (Role Based Access Control)**:
- Sistema de roles granulares definidos a nivel de servidor:
    - **Owner**: Control total, puede eliminar la organización.
    - **Admin**: Gestión completa excepto borrado de organización.
    - **Member**: Uso de herramientas operativas sin capacidad de configuración.
    - **Staff**: Rol limitado para colaboradores externos (solo acceso a jobs asignados).

**Seeding Automático**:
- Al crear una organización, Pixy ejecuta automáticamente un seed que:
    1. Crea los 4 roles estándar en la tabla `organization_roles`.
    2. Asigna el usuario creador como `Owner` en `organization_members`.
    3. Garantiza que la organización esté operativa de inmediato sin configuración manual.

**Permisos por Módulo**:
- Los permisos son verificados a nivel de servidor antes de ejecutar acciones críticas.
- Ejemplo: Solo `Owner` o `Admin` pueden modificar `usage_limits` o cambiar el plan de suscripción.

### C. Gobernanza & Protección de Datos

#### 1. Trash Bin (Papelera de Reciclaje)
- **Red de Protección**: Implementación de `soft-delete` en entidades críticas mediante el campo `deleted_at`.
- **Entidades Protegidas**: Clientes, Servicios, Facturas, Cotizaciones.
- **Interfaz de Restauración**:
    - Vista unificada de todos los elementos eliminados de la organización.
    - Función `restoreItem(id, type)` que setea `deleted_at = null`, devolviendo el registro al estado activo.
    - Eliminación permanente: `permanentlyDeleteItem(id, type)` ejecuta un `DELETE` real de la base de datos (acción irreversible).

---

## 5. CAPA 1: CRM & Finanzas Core (The Shared Heart)

Esta capa constituye el motor de ventas y dinero que comparten TODOS los Spaces de Pixy. Cualquier empresa, sea una agencia creativa o una lavandería, necesita gestionar clientes, emitir cotizaciones y facturar.

### A. Gestión de Clientes & Contactos (Profiles 360°)

#### 1. Directorio Central
- **Tabla `clients`**: Almacén maestro de todos los contactos/clientes de la organización.
- **Campos Core**:
    - Información personal: `first_name`, `last_name`, `email`, `phone`.
    - Información empresarial: `company_name`, `tax_id`, `address`.
    - Metadatos visuales: `avatar_url`, `logo_url`.
- **Custom Fields**: Capacidad de extender campos de cliente según necesidades de la organización mediante JSON en `metadata`.

#### 2. Historial 360°
- **Vista Unificada**: Desde la ficha del cliente se puede ver:
    - Todas las conversaciones (Inbox timeline).
    - Deals activos y cerrados (Pipeline).
    - Servicios contratados (Contratos).
    - Facturas emitidas con estados de pago.
    - Cotizaciones enviadas y su seguimiento.
    - Documentos adjuntos y notas internas.

#### 3. Segmentación & Etiquetas
- **Sistema de Tags**: Los clientes pueden tener múltiples etiquetas (VIP, Moroso, Lead Caliente, etc.).
- **Uso**: Filtrado en campañas de marketing, alertas automáticas y segmentación de audiencias.

### B. Pipeline de Ventas (Gestión Visual de Oportunidades)

#### 1. Estructura Kanban
- **Tabla `pipeline_deals`**: Registros de oportunidades de venta.
- **Campos Clave**:
    - `title`: Nombre del deal (ej: "Rediseño Web - Acme Corp").
    - `stage`: Etapa actual (Lead, Propuesta Enviada, Negociación, Ganado, Perdido).
    - `value`: Valor estimado del deal en moneda local.
    - `probability`: Probabilidad de cierre (0-100%).
    - `client_id`: Vinculación al cliente.

#### 2. Strict Mode (Control de Flujo)
- **Regla**: En modo estricto, los deals NO pueden retroceder de etapa sin justificación.
- **Propósito**: Evita que los vendedores "reciclen" deals perdidos para inflar métricas.
- **Auditoría**: Cada cambio de etapa queda registrado en `pipeline_stage_history` con timestamp y responsable.

#### 3. Valor Acumulado por Etapa
- **Dashboard KPI**: El sistema calcula automáticamente el valor total de deals en cada etapa.
- **Forecasting**: Multiplicar el valor por la probabilidad promedio de la etapa da el ingreso proyectado.

### C. CRM Inbox (Centro de Mando Omnicanal)

El Inbox no es solo un chat; es una consola de ventas de alta velocidad que centraliza TODAS las conversaciones de la organización.

#### 1. Ubicuidad (Inbox Everywhere)
- **Floating Overlay**: Implementado como `InboxOverlay`, un componente accesible desde CUALQUIER lugar de la plataforma.
- **Global Listener**: Escucha eventos de teclado (`Cmd+I`) para abrir el inbox sin importar en qué página esté el usuario.
- **Persistencia de Contexto**: Al abrir el inbox, mantiene el contexto de la página actual (ej: si estás viendo un cliente, el inbox se abre con ese cliente seleccionado).

#### 2. Omnicanalidad Unificada
- **Canales Soportados**:
    - WhatsApp (Meta Official + Evolution API).
    - Instagram Direct Messages.
    - Facebook Messenger.
    - Email (próximamente).
- **Conversación Unificada**: Todas las interacciones con un mismo cliente, sin importar el canal, se unifican en un solo thread.

#### 3. AI-Powered Inbox

**Smart Replies (Sugerencias Contextuales)**:
- El sistema analiza el historial de la conversación y sugiere 3 tipos de respuestas:
    - **Short**: Respuesta breve y directa.
    - **Medium**: Respuesta equilibrada con detalle moderado.
    - **Detailed**: Respuesta exhaustiva con referencias a la base de conocimientos.
- **Integración RAG**: Las respuestas se enriquecen con información de la Knowledge Base si el tema lo requiere.

**Refine with AI (Varita Mágica)**:
- **Función**: El usuario escribe un borrador informal y presiona el botón de IA.
- **Resultado**: El texto se profesionaliza, corrige ortografía, mejora tono y adapta el registro según el contexto del cliente.
- **Ejemplo**: "hola si te puedo cotizar eso" → "Hola, con gusto. Estaré encantado de prepararte una cotización detallada para este servicio."

**Internal Note Mode** (Notas Amarillas):
- **Propósito**: Espacio de colaboración interna que NO se envía al cliente.
- **Uso**: Coordinar acciones entre miembros del equipo ("Cliente pidió descuento, ¿aprobamos?").
- **Visual**: Las notas internas aparecen con fondo amarillo para diferenciarlas de los mensajes reales.

#### 4. Context Deck (Sidebar Derecho)
Panel que aparece a la derecha del chat mostrando:
- **Perfil del Lead**: Nombre, empresa, foto, tags.
- **Historial de Valor**: Cuánto ha gastado, cuántos servicios tiene activos, LTV calculado.
- **Deal Builder**: Crear o vincular deals directamente desde el inbox.
- **Quick Actions**: Botones rápidos (Crear Factura, Enviar Cotización, Agendar Tarea).

### D. Quote Designer 2.0 (Venta en Chat)

Sistema de generación de cotizaciones diseñado para minimizar la fricción en el proceso de venta.

#### 1. Diseño por Industria
- **Templates Pre-configurados**: Plantillas optimizadas por vertical (Real Estate, Legal, Tech, Marketing, etc.).
- **Encabezados Personalizados**: Logo del negocio, dirección, datos fiscales.
- **Pies de Página**: Términos y condiciones específicos del sector.

#### 2. IA Persuasiva
- **Generación de Copy**: Usa modelos de lenguaje para redactar descripciones de servicios que maximicen la conversión.
- **Ejemplo**: En lugar de "Desarrollo Web", genera "Transformación Digital: Desarrollaremos una plataforma web que elevará tu presencia online y convertirá visitas en clientes reales".

#### 3. Inyección Directa desde Inbox
- **Flujo**: El vendedor está chateando con un lead → Cliente pregunta por un servicio → Vendedor abre Quote Designer SIN salir del chat → Diseña la cotización en tiempo real → La envía directamente por WhatsApp con un botón "Ver Cotización".
- **Tracking**: El sistema registra cuándo el cliente abre la cotización en el portal.

#### 4. Rechazo Inteligente
- **Configuración de Razones**: El sistema permite pre-configurar razones comunes de rechazo (Precio, Timing, Competencia).
- **Mensajes de Salvamento**: Al rechazar una cotización, se puede activar un mensaje automático de "segunda oportunidad" con descuento o condiciones mejoradas.

### E. Centro de Facturación (Invoicing Engine)

#### 1. Generación Masiva
- **Invoice Builder**: Interfaz para crear facturas individuales o masivas.
- **Auto-population**: Si la factura está vinculada a un servicio recurrente, los items se llenan automáticamente.
- **Campos**:
    - Items: Descripción, cantidad, precio unitario, subtotal.
    - Impuestos: IVA, retenciones (configurables por país).
    - Descuentos: Porcentuales o fijos.
    - Total: Cálculo automático.

#### 2. Estados de Pago en Tiempo Real
- **Máquina de Estados**:
    - `draft`: Borrador, no enviado.
    - `sent`: Enviada al cliente, pendiente de pago.
    - `paid`: Pagada (total).
    - `partial`: Pago parcial recibido.
    - `overdue`: Vencida (pasó la fecha límite sin pago completo).
    - `cancelled`: Cancelada.
- **Transiciones Automáticas**: Si recibe un pago via pasarela, el estado cambia automáticamente a `paid`.

#### 3. Recordatorios Automatizados
- **Flujo "Cobrador Amable"**: Rutina de Pixy Flows que monitorea `invoice.overdue`.
    - **Día 1 de vencimiento**: Email cortés de recordatorio.
    - **Día 7**: WhatsApp con link directo de pago.
    - **Día 15**: Notificación al admin para gestión manual.

#### 4. Integración con Pasarelas
- **Wompi (Colombia)**: Generación de links de pago con QR.
- **Stripe (Global)**: Payment Intents para cobros con tarjeta.
- **Conciliación Automática**: Los webhooks de la pasarela actualizan el estado de la factura en tiempo real.

### F. Gestión de Pagos & Cartera

#### 1. Historial Transaccional
- **Tabla `payments`**: Registro de TODOS los pagos recibidos.
- **Campos**: Monto, método (tarjeta, transferencia, efectivo), fecha, referencia bancaria, invoice vinculada.

#### 2. Cuentas por Cobrar (Ageing Report)
- **Vista Consolidada**: Dashboard que muestra:
    - Total por cobrar.
    - Desglose por antigüedad (0-30 días, 31-60, 61-90, +90).
    - Clientes morosos destacados.
- **Smart Alert**: Si la cartera vencida supera un umbral, aparece una alerta crítica en el dashboard.

---

## 6. Integraciones & Capa de Conectividad (The Core Registry)

Pixy utiliza una arquitectura modular de **Registry & Adapters** para desacoplar los proveedores externos de la lógica de negocio, garantizando extensibilidad y mantenibilidad.

### A. Arquitectura de Adaptadores (`IntegrationAdapter`)

#### 1. Registro Central (`IntegrationRegistry`)
- **Patrón**: Cada proveedor externo (Meta, OpenAI, Stripe, Google Drive, etc.) implementa una interfaz estándar.
- **Interfaz Base**:
    ```typescript
    interface IntegrationAdapter {
        key: string
        verifyCredentials(credentials): Promise<VerificationResult>
        send?(message, credentials): Promise<SendResult> // Opcional
        storage?: StorageProvider // Opcional
    }
    ```
- **Beneficio**: Agregar un nuevo proveedor solo requiere implementar la interfaz, sin tocar el core de la app.

#### 2. Seguridad y Cifrado
- **Almacenamiento**: Todas las credenciales (API Keys, Tokens) se almacenan encriptadas usando `encryptObject`.
- **Proceso**:
    1. Usuario ingresa credenciales en UI.
    2. Antes de guardar en `integrations`, se cifran.
    3. Al usar la integración, se descifran en memoria.
    4. La credencial en texto plano NUNCA toca la DB.

#### 3. Health System (Monitorización)
- **Estados de Conexión**:
    - `active`: Funcionando correctamente.
    - `disconnected`: Sin conexión (ej: token expirado).
    - `error`: Error crítico que requiere reconfiguración.
- **Re-autenticación Automática**: Si un token de OAuth expira, el sistema intenta renovarlo automáticamente usando el refresh token.

### B. Omnicanalidad Unificada (Meta Unified Connector)

#### 1. Proveedor `meta_business`
- **Centralización**: UN SOLO adaptador gestiona WhatsApp, Messenger e Instagram.
- **Meta Graph API**: Comunicación directa con los endpoints de Meta para mensajería.

#### 2. Composite IDs (`connectionId:assetId`)
- **Problema**: Una empresa puede tener múltiples páginas de FB o números de WA bajo un mismo Business Manager.
- **Solución**: Pixy usa direccionamiento compuesto.
    - `connectionId`: ID de la conexión global (el Business Manager).
    - `assetId`: ID del activo específico (Página de FB, Cuenta de IG, Número de WA).
- **Ejemplo**: `conn_123:page_456` identifica únicamente la Página 456 bajo la Conexión 123.

#### 3. Asset Mapping (Mapeo Automático)
- **Proceso**:
    1. Usuario conecta su cuenta de Meta Business.
    2. Pixy consulta automáticamente la Graph API para obtener todos los activos disponibles.
    3. Lista las Páginas de FB, Cuentas de IG y Números de WA.
    4. Usuario selecciona cuáles "líneas" quiere activar como canales en Pixy.
- **Tabla `channels`**: Almacena cada canal activado con su `composite_id`.

### C. Motor de WhatsApp (Official & Unofficial)

#### 1. Meta Official API
- **Uso**: Para organizaciones que tienen un número verificado en Meta Business.
- **Ventajas**:
    - Envíos masivos garantizados (miles x minuto).
    - Templates pre-aprobados por Meta.
    - Webhook oficial para recibir mensajes entrantes.

**Limitaciones**:
    - Requiere verificación empresarial (proceso de días/semanas).
    - Costo por conversación (facturado por Meta).

#### 2. Evolution API (Unofficial/Self-hosted)
- **Uso**: Para operaciones pequeñas oque necesitan activar WhatsApp en minutos sin esperar aprobaciones.
- **Motor de Aprovisionamiento**: Pixy tiene un endpoint `createWhatsAppChannel` que:
    1. Llama a Evolution API para crear una nueva instancia.
    2. Recibe un QR code dinámico.
    3. Configura el webhook automáticamente para que los mensajes lleguen a Pixy.
    4. El usuario escanea el QR con su WhatsApp personal/business.
    5. Canal activo en <2 minutos.

**Advertencia**:
    - No oficial, puede tener restricciones de Meta.
    - Ideal para testing o volúmenes bajos.

#### 3. Gestión de Templates (Meta Official)
- **Templates de Mensajes**: Meta requiere pre-aprobar los textos que se enviarán en campañas.
- **Flujo en Pixy**:
    1. Usuario crea un template en Pixy ("Hola {{1}}, tu pedido {{2}} está listo").
    2. Pixy lo envía a Meta para aprobación.
    3. Una vez aprobado, puede usarse en broadcasts masivos.
    4. Los mensajes fuera de template solo funcionan dentro de la ventana de 24h tras un mensaje del cliente.

### D. Integraciones Adicionales

#### 1. Email (Resend)
- Ver sección de Comunicaciones (Capa 0).

#### 2. Almacenamiento (AWS S3 / Supabase Storage)
- **Uso**: Almacenar archivos adjuntos, imágenes de productos, logos.
- **Adaptador**: `StorageProvider` con método `uploadFile(path, content, contentType)`.

#### 3. Google Drive (Backup)
- **Uso**: "Bring Your Own Storage" para backups automáticos de la organización.
- **Autenticación**: Service Account con permisos de escritura en una carpeta específica.

#### 4. Stripe (Pagos)
- **Funciones**:
    - Generación de Payment Intents para cobros con tarjeta.
    - Stripe Connect para pagar comisiones a Resellers.
    - Webhooks para conciliación automática de pagos.

---

## 7. CAPA 2: Dashboard Adaptativo & Marketing Center

El Dashboard de Pixy es una interfaz fluida que muta su inteligencia para mostrar lo que realmente importa según el rol de la organización y el Space activo.

### A. Visualización de Datos por Vertical

El dashboard detecta automáticamente el tipo de organización y el Space para adaptar sus widgets y métricas.

#### 1. Para Platform/Reseller
**Enfoque**: Salud de la red de clientes SaaS.
- **KPIs Principales**:
    - **Tenants Activos**: Número de organizaciones gestionadas.
    - **ARPU (Average Revenue Per User)**: Ingreso promedio por tenant.
    - **Churn Rate**: Tasa de cancelación mensual.
    - **MRR de Red**: Suma de todos los ingresos recurrentes de los sub-tenants.
- **Alertas Específicas**:
    - Tenants con suscripción próxima a vencer.
    - Clientes que alcanzaron 90% de sus límites de uso.
    - Oportunidades de upselling detectadas por IA.

#### 2. Para Agencias (Agency Space)
**Enfoque**: Ingresos recurrentes y retención de clientes clave.
- **KPIs Principales**:
    - **MRR (Monthly Recurring Revenue)**: Ingresos recurrentes mensuales totales.
    - **Active Subscriptions**: Servicios recurrentes activos.
    - **Client Retention**: Tasa de retención de clientes mes a mes.
    - **Pipeline Value**: Valor total de deals en pipeline.
- **Revenue Hero**: Widget destacado mostrando el MRR con gráfica de tendencia y tips de IA para incrementarlo.
- **Alertas Específicas**:
    - Clientes con cuentas vencidas.
    - Briefings pendientes de respuesta.
    - Servicios recurrentes próximos a renovación.

#### 3. Para Empresas de Servicio (Service Ops Space)
**Enfoque**: Logística operativa del día.
- **KPIs Principales**:
    - **Jobs de Hoy**: Total de trabajos programados para hoy.
    - **En Curso**: Servicios que el staff está ejecutando en este momento.
    - **Pendientes**: Trabajos sin asignar o por iniciar.
    - **Completados**: Servicios finalizados hoy.
- **Staff Metrics**: Visualización del personal activo y su carga de trabajo.
- **Alertas Específicas**:
    - Jobs sin staff asignado.
    - Retrasos en la entrega de servicio.
    - Personal con sobrecarga de trabajo.

### B. Componentes Maestro del Dashboard

#### 1. Smart Cards & Stats
- **Conteo Animado**: Uso de `react-countup` para animar los números al actualizar.
- **Micro-gráficas de Tendencia**: Indicadores visuales (↑↓) mostrando si la métrica mejoró o empeoró vs. período anterior.
- **Color Coding**: Verde para métricas positivas, rojo para alertas, amarillo para advertencias.

#### 2. Revenue Hero Widget
- **Visualización Destacada**: Card principal que muestra el ingreso clave del negocio.
- **Para Agency**: MRR con desglose de servicios recurrentes.
- **Para Service Ops**: Ingresos últimos 7 días.
- **Tips de IA**: Sugerencias contextuales generadas por IA para mejorar la métrica:
    - "Ofrece planes anuales para mejorar el flujo de caja"
    - "3 clientes históricos están inactivos, reactívalos con una oferta especial"

#### 3. Social Connect Widget
- **Integración de Métricas Sociales**: Seguimiento de crecimiento en canales externos.
- **Plataformas**: Facebook, Instagram, Twitter.
- **Datos**: Followers, engagement rate, posts recientes.

#### 4. Smart Alerts (Detección Proactiva de Anomal

ías)
- **Sistema Inteligente**: Analiza automáticamente condiciones críticas.
- **Tipos de Alertas**:
    - **Cartera Vencida**: "Tienes X clientes con cuentas vencidas por $Y total"
    - **Cuello de Botella Operativo**: "5 jobs para hoy sin staff asignado"
    - **Límites de Uso**: "Organización cerca del límite de mensajes WhatsApp (85% usado)"
- **CTA Directo**: Cada alerta tiene un botón de acción rápida (ej: "Ver Facturas Vencidas" abre directamente la vista filtrada).

### C. Marketing Center (Campaign Runner)

#### 1. Broadcast Engine
- **Difusiones Masivas**: Envío de mensajes a múltiples contactos simultáneamente.
- **Canales Soportados**: WhatsApp, Email, SMS.
- **Segmentación**: Selección de audiencia mediante filtros (tags, última interacción, valor del cliente).

#### 2. Dynamic Audience Engine
- **Filtros Complejos**:
    - Clientes que compraron en los últimos 30 días.
    - Leads sin conversación en +60 días.
    - Clientes con saldo vencido > $X.
- **Guardado de Audiencias**: Las combinaciones de filtros pueden guardarse como "Segmentos" reutilizables.

#### 3. Sequence Runner (Campañas Multi-Step)
- **Flujo**:
    1. Definir una secuencia de mensajes (Día 0: Bienvenida, Día 3: Tip, Día 7: Oferta).
    2. Configurar delays entre pasos.
    3. Condicionales: "Si abre el link, enviar mensaje B; si no, mensaje C".
- **Motor**: Cada secuencia se ejecuta como un Pixy Flow (ver sección de Automatización).

#### 4. Meta Ads Insights Integration
- **Sincronización**: Pixy puede conectarse a Meta Business para traer métricas de campañas publicitarias.
- **Dashboard Unificado**: Ver ROI de ads, leads generados y conversiones sin salir de Pixy.

### D. Base de Conocimiento (Knowledge Base)

Sistema de gestión centralizada de información de la organización para alimentar IA y soporte.

#### 1. Repositorio Central
- **Tabla `knowledge_base`**: Almacén de preguntas frecuentes, respuestas, documentación y procedimientos internos.
- **Campos**:
    - `question`: Pregunta o tema.
    - `answer`: Respuesta detallada o procedimiento.
    - `category`: Clasificación (Ventas, Soporte, Producto, etc.).
    - `source`: Origen del conocimiento (`manual`, `ai_extracted`, `file`).
    - `tags`: Etiquetas para búsqueda y filtrado.
    - `embedding`: Vector de embedding para búsqueda semántica (RAG).

#### 2. Extracción Híbrida de Conocimiento

**Manual**:
- El administrador crea entradas manualmente mediante formularios.
- Ideal para documentar políticas, precios, términos de servicio.

**Por Archivos**:
- Upload de documentos (PDF, DOCX, TXT).
- El sistema extrae el texto y lo procesa para crear entradas automáticamente.

**IA Extractiva**:
- Análisis de conversaciones históricas del Inbox para identificar patrones de preguntas frecuentes.
- Generación automática de respuestas basadas en cómo respondió el equipo previamente.

#### 3. Búsqueda Semántica (RAG Integration)
- **Proceso**:
    1. Cada entrada genera un embedding vectorial al crearse/actualizarse.
    2. Cuando un usuario pregunta algo (CAA o Smart Replies), se genera un embedding del query.
    3. Se buscan los vectores más similares en la base.
    4. Los documentos relevantes se inyectan como contexto en el prompt del LLM.
    5. La IA responde con información precisa y actualizada de la organización.
- **Ventaja**: Respuestas contextuales sin entrenar modelos personalizados costosos.

#### 4. Categorización & Gestión
- **Categorías Dinámicas**: Los administradores pueden crear categorías personalizadas según su operación.
- **Búsqueda por Texto**: Filtrado rápido por keywords en pregunta o respuesta.
- **Auditoría de Uso**: Tracking de qué entradas se consultaron más para optimizar la base.

---

## 8. CAPA 3: Spaces Especializados

Los Spaces son módulos verticales con lógica operativa exclusiva. Si bien comparten el CRM y las finanzas (Capa 1), cada Space agrega funcionalidades específicas de su industria.

### A. Agency Space: Operación Creativa & Gestión de Valor Intelectual

Este Space está diseñado para agencias de marketing, diseño, development y consultoría.

#### 1. Briefing Center (Formularios de Captura)
- **Propósito**: Recolectar información estructurada de proyectos desde el cliente.
- **Tabla `briefings`**: Almacena las respuestas del cliente.
- **Estructura**:
    - Cada briefing está basado en un `briefing_template` (plantilla).
    - Las plantillas tienen un `schema` JSON que define las preguntas y tipos de campo.
    - Ejemplo de campos: texto, selección múltiple, subida de archivos, referencias visuales.
- **Submission Wizard**: El cliente llena el briefing paso a paso en el portal, con validación en tiempo real.

#### 2. Service Catalog (Portfolio Dinámico)
- **Tabla `service_catalog`**: Almacén de servicios "producto" que la agencia vende.
- **Campos Clave**:
    - `name`, `description`, `category` (Design, Development, Marketing).
    - `pricing_model`: (`fixed`, `hourly`, `recurring`).
    - `base_price`: Precio base del servicio.
    - `is_visible_in_portal`: Si aparece en la pestaña "Explorar" del portal de cliente.
- **Metadata Extendida**: JSON con información adicional (duración estimada, entregables, requisitos).

#### 3. Client Portal (Token-Based Access)

**Acceso sin Password**:
- **Magic Links**: El cliente recibe una URL única por Email o WhatsApp.
- **Token Efímero**: La URL contiene un token que expira en X días.
- **Sin Registro**: El cliente NO necesita crear cuenta ni recordar contraseñas.

**Módulos Disponibles**:
- **Mis Servicios**: Lista de contratos activos, fechas de renovación, estados.
- **Facturas**: Historial de facturas con opción de pago online mediante Wompi/Stripe.
- **Cotizaciones**: Ver/Aceptar/Rechazar cotizaciones enviadas por la agencia.
- **Briefings**: Llenar formularios de proyectos nuevos.
- **Explorar**: Catálogo de servicios adicionales que el cliente puede solicitar (genera un lead automático al hacer clic en "Me interesa").

**Branding Dinámico**:
- **Colores**: Primario/Secundario configurados por la agencia.
- **Logo**: Logo de la agencia en el header.
- **Tipografía**: Font personalizada (opcional).
- **Login Background**: Imagen de fondo personalizable.

**Log de Acceso**:
- Pixy registra cada vez que el cliente accede al portal, qué documentos visualiza y cuánto tiempo permanece.

#### 4. Gestión de Portales & Staff

**Portal de Staff** (Colaboradores Externos):
- Versión del portal optimizada para freelancers/staff que trabajan para la agencia.
- **Gestión de Jobs**: Visualización de tareas asignadas, subida de entregables.
- **Acceso Restringido**: Solo ven información necesaria para su trabajo (sin datos financieros de la agencia).

### B. Service Ops Space: Logística de Campo & Ejecución

Este Space está diseñado para empresas de servicios físicos (limpieza, mantenimiento, logística).

#### 1. Work Orders (Gestión de Operaciones)

**Tabla `work_orders`**:
- **Campos Core**:
    - `client_id`: Cliente para el cual se ejecuta el servicio.
    - `service_id`: Referencia al catálogo de servicios.
    - `assigned_staff_id`: Personal asignado.
    - `start_time`, `end_time`: Ventana de ejecución.
    - `status`: `scheduled`, `in_progress`, `completed`, `cancelled`.
    - `vertical`: Tipo de servicio (cleaning, maintenance, delivery).

**Ciclo de Vida**:
1. **Scheduled**: Work order creada y programada.
2. **In Progress**: Staff inicia la ejecución (check-in).
3. **Completed**: Staff finaliza el trabajo (check-out).
4. **Auto-logging**: Al completarse, se crea automáticamente un registro en `staff_work_logs` para el cálculo de nómina.

**Asignación Inteligente**:
- El sistema puede sugerir el mejor staff según disponibilidad, ubicación y especialidades.

#### 2. Staff Profiles (Gestión de Personal)

**Tabla `cleaning_staff_profiles`** (o genérico `staff_profiles`):
- **Campos**:
    - `first_name`, `last_name`, `email`, `phone`.
    - `hourly_rate`: Tasa horaria del colaborador.
    - `specialties`: JSON con habilidades (ej: ["Deep Cleaning", "Window Washing"]).
    - `availability`: Horarios disponibles.

**Tracking de Disponibilidad**:
- Vista de calendario que muestra qué staff está libre en qué momentos.

#### 3. Motor de Nómina (Payroll & Settlements)

**Staff Work Logs** (Registro de Horas):
- **Auto-creación**: Cuando un work order se marca como `completed`, se genera automáticamente un `staff_work_log`.
- **Campos**: Staff, inicio, fin, horas totales, tasa horaria, monto calculado.
- **Manual Override**: El admin puede crear logs manuales para horas extras o trabajos especiales.

**Payroll Periods** (Períodos de Pago):
- **Creación**: El admin define períodos (semanal, quincenal, mensual).
- **Procesamiento**: Al cerrar un período, el sistema:
    1. Agrupa todos los work logs del período.
    2. Calcula el total de horas y monto por cada staff.
    3. Genera `staff_payroll_settlements` (liquidaciones).

**Settlements** (Liquidaciones):
- **Campos**:
    - `staff_id`, `payroll_period_id`.
    - `total_hours`: Horas trabajadas en el período.
    - `base_amount`: Horas × tasa horaria.
    - `bonuses`: Bonificaciones adicionales.
    - `deductions`: Deducciones (adelantos, multas).
    - `final_amount`: `base_amount + bonuses - deductions`.
    - `payment_status`: `pending`, `partial`, `paid`.

**Registro de Pagos**:
- **Tabla `staff_payments`**: Cada pago realizado al staff.
- **Dispersión**: El sistema registra método de pago (transferencia, efectivo), fecha y referencia bancaria.
- **Conciliación**: Al registrar un pago, el `payment_status` del settlement se actualiza automáticamente.

**Reportes de Nómina**:
- **Vista por Staff**: Historial de pagos de un colaborador específico.
- **Vista por Período**: Resumen de toda la nómina de un período (cuánto se pagó en total, cuántos staff, etc.).

---

## 9. Motor de Automatización: "Pixy Flows"

Pixy Flows es el motor de automatización narrativa diseñado para ser lineal, intuitivo y "blindado" contra errores de lógica del usuario.

### A. Filosofía: Ciclo Operativo

**VIGILAR → VERIFICAR → ACTUAR**:
- **` VIGILAR (Trigger)`**: Pixy espera que suceda un evento específico (ej: factura vencida, nuevo cliente, cotización rechazada).
- **VERIFICAR (Filter/Rule)**: Antes de actuar, Pixy verifica condiciones (ej: ¿El cliente es VIP? ¿El monto supera $X?).
- **ACTUAR (Action)**: Ejecuta la acción configurada (enviar WhatsApp, crear tarea, actualizar CRM).

### B. Rail Editor (The Automation Interface)

#### 1. Timeline Vertical
- **Diseño**: Interfaz de secuencia vertical que elimina la complejidad de diagramas de flujo 2D.
- **Sin Cables**: No hay líneas ni conexiones visuales. Solo una secuencia lineal de pasos que se ejecutan de arriba hacia abajo.
 **Ventaja**: Elimina el caos visual de herramientas como Zapier o Make.

#### 2. Tipos de Nodos (`FlowStep`)

**Trigger (Momento)**:
- Evento que inicia la rutina.
- Ejemplos: `invoice.overdue`, `client.created`, `quote.sent`, `service.renewed`.
- **Payload**: Cada trigger trae consigo un `triggerPayload` con información del evento (ej: ID de la factura, datos del cliente).

**Wait (Espera)**:
- Pausa la ejecución por un tiempo específico.
-  Configuración: Días, horas, minutos.
- Uso: "Espera 2 días después de enviar cotización → Envía follow-up".

**Rule (Regla/Condición)**:
- Evalúa una condición booleana.
- Ejemplos: "Si cliente.tag incluye 'VIP'", "Si invoice.total > 1000".
- **Bifurcación**: Puede tener un camino "true" y otro "false" (aunque el Rail Editor favorece la linealidad, las condiciones pueden saltar pasos).

**Action (Tarea)**:
- La acción concreta a ejecutar.
- Tipos:
    - **Enviar Mensaje**: WhatsApp, Email, SMS.
    - **Crear Tarea**: Asignar tarea a un miembro del equipo.
    - **Actualizar CRM**: Cambiar tag de cliente, mover deal de etapa.
    - **Webhook**: Llamar un endpoint externo.
    - **Crear Registro**: Generar factura, cotización, etc.

#### 3. Contexto de Ejecución

**Memory (Memoria de la Rutina)**:
- Cada ejecución de la rutina mantiene un objeto `memory` donde se pueden guardar datos temporales.
- Uso: "Guardar nombre del cliente en memoria → Usarlo en mensaje personalizado".

**Trigger Payload**:
- Información del evento que disparó la rutina, vinculada a entidades de negocio (`invoice`, `client`, `lead`, `service`).
- Acceso directo a campos: `{{trigger.client.name}}`, `{{trigger.invoice.total}}`.

#### 4. Mad Libs Wizard (Configuración Tipo "Rellenar Huecos")
- **Interfaz**: Para usuarios no técnicos.
- **Ejemplo**: "Cuando [EVENTO] suceda, esperar [TIEMPO] y luego enviar [MENSAJE] a [DESTINATARIO]".
- **Auto-completado**: Campos con sugerencias inteligentes basadas en el contexto.

### C. Runtime: Inngest

#### 1. ¿Por Qué Inngest?
- **Colas Gestionadas**: No es necesario configurar infraestructura de workers.
- **Delays Nativos**: Soporte para retrasos de días o semanas sin mantener conexiones abiertas.
- **Reintentos Automáticos**: Si un paso falla (ej: API de WhatsApp caída), Inngest re-intenta automáticamente con backoff exponencial.

#### 2. Event Bus
- Pixy emite eventos internos cada vez que sucede algo significativo.
- Ejemplos: `invoice.created`, `invoice.paid`, `invoice.overdue`, `client.inactive_60d`.
- **Listeners**: Los Flows están suscritos a estos eventos y se disparan automáticamente.

#### 3. Ejecución de Pasos
- **Secuencial**: Los pasos se ejecutan uno tras otro.
- **Estado Persistente**: Si un paso requiere esperar 7 días, Inngest pausa la ejecución y la reanuda automáticamente en 7 días.
- **Debugging**: Panel de Inngest muestra el estado de cada ejecución en tiempo real.

### D. Narrative Logs (Registro Humano)

- **Propósito**: Registrar en lenguaje natural lo que la IA "hizo" durante cada ejecución.
- **Ejemplos**:
    - "✓ Factura #INV-123 detectada como vencida"
    - "⏳ Esperando 2 días antes de enviar recordatorio"
    - "📤 WhatsApp enviado a +57 300 123 4567: 'Hola Juan, te recordamos...'"
    - "✓ Tarea creada y asignada a María (Admin)"
- **Vista de Usuario**: El admin puede ver el historial completo de acciones de cada rutina en un timeline legible.

### E. AI Engine (Copilot Mode)

#### 1. Análisis Inteligente de Leads
- **Detección de Riesgos**: La IA analiza leads en tiempo real para detectar:
    - Estancamiento (sin actividad en X días).
    - Riesgo de impago (historial de pagos atrasados).
    - Patrones de comportamiento anómalo.
- **Acción Proactiva**: Genera alertas o ejecuta flujos automáticos de recuperación.

#### 2. RAG (Retrieval-Augmented Generation)
- **Motor Semántico**: Utiliza embeddings vectoriales para consultar la base de conocimiento.
- **Uso**: Cuando un usuario pregunta algo en el inbox o CAA, el sistema:
    1. Genera un embedding del query.
    2. Busca en la base vectorial los documentos más relevantes.
    3. Inyecta ese contexto en el prompt del LLM.
    4. Devuelve una respuesta enriquecida y precisa.

---

## 10. Economía de Ecosistema & Producto Final

### A. El Motor de Revenue & Resellers (B2B2B)

Para incentivar el crecimiento, Pixy incluye un motor de **Revenue Sharing** quirúrgico diseñado para Resellers que traen nuevos clientes.

#### 1. Reseller Chain (Cadena de Atribución)
- **Tracking Automático**: Cuando un Reseller crea un cliente final (sub-tenant), Pixy registra la relación en `organizations.acquired_by_reseller_id`.
- **Cadena Multi-Nivel** (Futuro): Soporte para cadenas de hasta 3 niveles (Reseller → Sub-Reseller → Cliente Final).

#### 2. Fases de Comisión por Antigüedad del Cliente

El sistema ajusta el porcentaje de comisión según la "edad" del cliente, incentivando tanto el cierre como la retención:

**Tabla `revenue_share_rules`**:
- **Activation (0-6 meses)**: Comisión alta (ej: 30-40%) para incentivar el cierre inicial.
- **Retention (6-12 meses)**: Comisión media (ej: 20-25%) para premiar el mantenimiento de la cuenta.
- **Stable (>12 meses)**: Comisión residual (ej: 10-15%) como ingreso pasivo de largo plazo.

**Campos de Regla**:
- `phase_name`: Nombre de la fase.
- `phase_start_month`, `phase_end_month`: Rango de meses.
- `commission_percent`: Porcentaje de comisión.
- `eligible_event_types`: Qué tipo de eventos generan comisión (subscription, addon, overage, one_time).
- `requires_reseller_activity`: Si se requiere que el reseller haya gestionado activamente al cliente.

#### 3. Billable Events (Eventos Monetizables)

**Tabla `billable_events`**:
- **Registro Atómico**: Cada centavo que entra al sistema genera un evento.
- **Campos Clave**:
    - `organization_id`: Cliente que generó el ingreso.
    - `event_type`: `subscription_base`, `subscription_addon`, `addon`, `overage`, `upsell`, `one_time`.
    - `amount`: Monto del evento.
    - `client_age_months`: Antigüedad del cliente en meses (para determinar la fase).
    - `reseller_chain`: JSON con la cadena de resellers (ej: `[{org_id: "ABC", level: 1}]`).
    - `commission_calculated`: Comisión calculada según la regla activa.
    - `settled`: Si ya fue liquidado al reseller.

#### 4. Settlements (Liquidaciones)

**Tabla `settlements`** (para resellers):
- **Período**: Inicio y fin del período de liquidación (ej: mes de enero 2026).
- **Métricas**:
    - `gross_revenue`: Ingresos brutos generados por los clientes del reseller.
    - `total_commission`: Suma de todas las comisiones.
    - `platform_fee`: Tarifa que retiene Pixy Platform.
    - `net_payout`: Lo que finalmente se paga al reseller.
- **Breakdown**: JSON con detalle por tipo de evento y fase.
- **Estado**: `pending`, `approved`, `processing`, `completed`, `failed`, `cancelled`.

#### 5. Pago via Stripe Connect
- **Stripe Connect Account**: Cada reseller conecta su cuenta de Stripe.
- **Payout Automático**: Una vez aprobado un settlement, Pixy ejecuta un payout via Stripe al reseller.
- **Webhook Confirmation**: Stripe notifica el estado del pago (`paid`, `failed`) y actualiza el settlement.

#### 6. Log de Actividad (Auditoría de Valor)
- **Registro**: Seguimiento de las gestiones del reseller (soporte brindado, training, auditorías).
- **Propósito**: Validar que el reseller está agregando valor real, no solo "revendiendo sin servicio".

### B. Nomenclatura & Diccionario Unificado

| Término Técnico (DB) | Término UI Admin | Término UI Portal Cliente | Definición de Negocio |
| :--- | :--- | :--- | :--- |
| `organizations` | **Tenants** | N/A | El "Dueño" de la instancia de Pixy. |
| `clients` | **Clientes/Contactos** | N/A | Personas/empresas a las que se vende. |
| `service_catalog` | **Catálogo/Portfolio** | **Explorar** | El menú de lo que se vende (plantillas). |
| `services` | **Contratos** | **Mis Servicios** | Instancias de servicios que generan valor periódico. |
| `work_orders` | **Trabajos/Jobs** | N/A | Tareas físicas o digitales vinculadas a un servicio. |
| `workflows / routines` | **Rutinas/Flows** | N/A | Automatizaciones activas delegadas a Pixy. |
| `triggers` | **Momentos** | N/A | El evento que despierta a Pixy para ejecutar una rutina. |
| `settlements` | **Liquidaciones** | N/A | Pagos finales a Staff o Resellers. |
| `briefings` | **Briefings** | **Nuevo Proyecto** | Formularios de recolección de requerimientos. |
| `pipeline_deals` | **Pipeline/Deals** | N/A | Oportunidades de venta en gestión. |

### C. Modelo de Negocio

- **Tipo**: B2B SaaS (Software as a Service) con modelo B2B2B para Resellers.
- **Target Primario**: Dueños de agencias y negocios de servicios que sufren de "caos operativo".
- **Estrategia de Pricing**: 
    - **Freemium**: Plan gratuito limitado para testing.
    - **Tiered Pricing**: Planes (Starter, Pro, Business, Scale) basados en consumo de motores (WhatsApp, IA, Email) y cantidad de usuarios.
    - **Usage-Based**: Facturación adicional por consumo excedente.

### D. Features & Alcance MVP ("The Magic 5")

Pixy Flows v1 se centra en 5 rutinas quirúrgicas pre-construidas que resuelven dolores inmediatos:

1. **💰 Cobrador Amable**:
   - **Trigger**: `invoice.overdue`
   - **Flujo**: Espera n días → Envía recordatorio por WhatsApp con link de pago directo.
   
2. **📝 Seguimiento de Presupuesto**:
   - **Trigger**: `quote.sent`
   - **Flujo**: Espera 48h sin respuesta → Email de seguimiento "¿Tienes dudas sobre la propuesta?".
   
3. **🤝 Reactivación de Clientes**:
   - **Trigger**: `client.inactive_60d`
   - **Flujo**: Oferta especial de retorno con descuento exclusivo.
   
4. **⭐ Pedido de Reseña**:
   - **Trigger**: `project.completed`
   - **Flujo**: Esperar 2 días → Enviar link de Google Maps/Trustpilot para review.
   
5. **🚀 Onboarding de Cliente**:
   - **Trigger**: `client.created`
   - **Flujo**: Crear carpeta en Google Drive + Email de bienvenida con recursos útiles.

### E. Mapa de Datos (Entidades Core Resumidas)

- **Organization**: Dueño de la cuenta Pixy (Tenant).
- **Client**: Persona/Empresa a la que se le presta el servicio.
- **Service (Contrato)**: La unión de un cliente con un ítem del catálogo y un ciclo de facturación.
- **Routine (Rutina)**: La definición lógica de un flujo de trabajo automatizado.
- **Execution**: El registro histórico de cada vez que una rutina se ejecutó y qué acciones tomó.
- **Work Order**: Orden de trabajo para ejecución operativa (Service Ops Space).
- **Settlement**: Liquidación financiera (para Staff o Resellers).

---

## 🎯 Conclusión & Próximos Pasos

Este documento constituye la **Fuente de Verdad Absoluta** sobre Pixy. Ha sido construido mediante la síntesis exhaustiva de:
- Documentación técnica original
- Análisis de código fuente
- Mapeo de arquitectura de base de datos
- Especificaciones funcionales de producto

**Uso Recomendado**:
- Como contexto maestro para modelos de IA trabajando en el desarrollo de Pixy.
- Como guía de onboarding para nuevos desarrolladores.
- Como referencia arquitectónica para decisiones de escalabilidad.
- Como documento de producto para stakeholders y partners.

**Escalabilidad Futura**:
El modelo de "Capas y Spaces" garantiza que Pixy puede expandirse infinitamente a nuevas industrias (Legal, Health, Real Estate, Logistics) simplemente construyendo la Capa 3 sobre los cimientos universales ya consolidados en las Capas 0, 1 y 2.

---

> [!IMPORTANT]
> Este documento debe ser actualizado tras cada cambio estructural significativo en el esquema de base de datos, arquitectura de la aplicación o lógica de negocio fundamental.

**Versión**: MASTER EDITION (Fusión Total V0 + V4)  
**Última Actualización**: 2026-01-21  
**Mantenedor**: Equipo Core de Pixy

---

**FIN DEL DOCUMENTO**
