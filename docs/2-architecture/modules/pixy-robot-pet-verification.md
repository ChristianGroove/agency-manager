# Pixy Robot Pet: entrega inicial y verificación

Fecha: 11 de octubre de 2026, America/Bogota. Rama: `pixyrobotpet`.

Implementadas la base de la mascota, configuración super admin, herencia ADN y acceso al chat; también estados de ayuda y una integración inicial con errores del chat y avisos críticos. La extensión a otros módulos y a todos los toasts continúa como trabajo por fases.

## Ajuste de seguimiento y chat (revisión visual manual)

Después del piloto local se retiró el marco/fondo del acceso flotante. El seguimiento ya no requiere hover ni tiene el corte de distancia de 700 px del renderer original: usa el cursor de toda la página. En animación contextual y estado disponible, un único listener pasivo compartido activa dibujo durante movimiento más 800 ms de asentamiento; no hay renders React por cada evento del cursor. La simulación original conserva límites de giro, por lo que el robot mira hacia el cursor sin desplazarse por el dashboard. Movimiento reducido, animación apagada, pestaña oculta, salida del viewport y dispositivos sin puntero fino siguen evitando seguimiento activo.

El chat no tiene header visible ni avatares por mensaje. Mantiene el título accesible del diálogo, cierre, identificación accesible de quién habla y texto de procesamiento/error. Un solo robot en posición absoluta ocupa el lateral derecho del compositor, con espacio reservado para no interceptar input/envío (`pointer-events:none`); mide 112 px en escritorio y 80 px en móvil, con canvas transparente. Sus estados proceden del mismo ciclo de la petición de ayuda. Al apagar la mascota, desaparece y el formulario recupera el ancho completo.

No se añadió migración, dependencia, petición de IA ni escritura de configuración. El robot más grande aumenta el trabajo por frame; se mantienen 30 FPS y reposo por demanda, pero estas medidas **no equivalen a una medición de rendimiento del nuevo tamaño**. Queda al usuario la revisión visual y de comportamiento en navegador, incluyendo vista móvil y teclado virtual; no se automatizó navegador para esta revisión. Las capturas y pruebas integradas detalladas más abajo documentan el diseño anterior, previo a este ajuste.

Validación de código de este ajuste: 47 pruebas en 6 archivos y TypeScript del código fuente pasaron. ESLint de los archivos modificados no mostró errores; se conservan las advertencias preexistentes del modal. Las pruebas adicionales cubren activación global por movimiento, reposo tras detenerse, convivencia con animaciones continuas, movimiento reducido/dispositivos táctiles y un único robot que cambia con espera/éxito/error.

El nuevo build de producción completó compilación, TypeScript, generación de páginas y trazas. Se reinició únicamente el proceso de prueba de `3005`, con conexión a Supabase local; la revisión de esta interfaz en navegador corresponde al usuario.

## Resultado funcional

| Flujo | Evidencia |
| --- | --- |
| Configuración y aislamiento | Pruebas de esquema estricto, rangos, organización por ID, piloto vs. todos, ausencia de contexto, master off y colores parciales. |
| Administración | Pruebas de autorización antes de acceso privilegiado, validación de organización y escritura acotada. Panel nativo comprobado en navegador con persistencia simulada. |
| Ayuda | Pruebas de apertura/cierre del mismo modal, espera, respuesta, error y recuperación del acceso anterior. Flujo comprobado en navegador con respuestas simuladas. |
| Renderer | Dibujo real en navegador; pruebas directas de inicialización de canvas fallida, aislamiento de errores en RAF y limpieza de listeners. |
| Movimiento | Pruebas de límite de 30 FPS, pausa contextual, visibilidad y cambios de movimiento reducido durante la sesión. |
| Branding y móvil | Cambio entre Pixy y marca verde/amarilla; controles de forma; viewport móvil, botón táctil y modal de ayuda. En la vista móvil inspeccionada no hubo overflow horizontal (`clientWidth == scrollWidth`). |
| Apagado | Guardado de configuración desactivada en el entorno simulado, recuperación de menú anterior y apertura de ayuda mediante teclado. |

43 pruebas locales en 6 archivos pasaron. Los servicios de datos/IA están simulados; esto no prueba las políticas realmente desplegadas ni las credenciales de una base remota.

El chequeo TypeScript del código fuente (`src/**/*.ts`, `src/**/*.tsx` y `next-env.d.ts`) pasó. El chequeo global inicial encontró referencias obsoletas en `.next/types` a `/api/marketing/campaigns/[campaignId]/export` y un fixture de Cartera sin `created_at`/`updated_at`. No se cambiaron esos archivos ajenos a la integración. ESLint de los componentes y módulos modificados no presentó errores; el modal de ayuda conserva advertencias de código preexistente sin uso.

El build de producción de Next.js 16.1.1 con webpack completó correctamente, incluyendo compilación, TypeScript y generación de páginas. Los controles flotantes mantienen también su recuperación por debajo de diálogos; mientras el modal de ayuda está abierto se retiran ambos accesos flotantes.

Tras el build, el chequeo global `tsc --noEmit --incremental false` conserva únicamente el error del fixture de Cartera mencionado; las referencias generadas obsoletas desaparecieron. Ese fixture permanece fuera del alcance de esta rama.

## Medición de rendimiento y decisión

En el navegador integrado, una prueba sintética del renderizador real a 64 px, DPR 2 y nueve estados registró 891 dibujos posteriores al primer frame: media **5,26 ms**, p95 **27,2 ms**, máximo de los primeros dibujos **24,8 ms**. Fue una prueba en desarrollo con dibujos consecutivos, no una medición de INP, batería ni rendimiento de producción en distintos equipos.

La medición mostró que no corresponde recomendar animación continua como default. Se implementó reposo estático, límite de 30 FPS y pausa de gestos contextuales. La vista previa también queda estática en idle. No se afirma haber alcanzado los presupuestos de bundle/INP del plan; faltan mediciones en un build real y dispositivos representativos.

## Verificación integrada en localhost

La migración se aplicó el 11 de octubre de 2026 exclusivamente al contenedor `supabase_db_agency-manager`, cuyo puerto publicado se verificó como **55322**. La API usada por la aplicación es `http://127.0.0.1:55321`. Se ejecutó solamente el archivo `20261011000001_platform_robot_pet.sql`, en una transacción con `ON_ERROR_STOP`, y se registró su versión en `supabase_migrations.schema_migrations`. No se ejecutó reset ni se aplicaron otras migraciones.

Pixy quedó ejecutándose en **http://127.0.0.1:3005**, con el build de producción ya validado (`next start`). El servidor de Cartera en 3000 continúa intacto; no se inició una segunda compilación de desarrollo sobre `.next/dev`. Las URLs de aplicación/sitio se sobrescribieron para el proceso de prueba; `.env.local` no se editó.

La contraseña genérica de la guía local fue rechazada. La sesión de prueba se autenticó mediante un enlace de un solo uso generado por la API administrativa de **Supabase local**, para la cuenta super admin ya existente. No se crearon usuarios, no se cambiaron contraseñas, no se enviaron correos ni se guardaron tokens en archivos versionados.

| Límite/flujo | Resultado con aplicación y datos reales locales |
| --- | --- |
| Migración → configuración | La fila singleton inicialmente devolvió `{"version":1,"enabled":false}` y la configuración dejó de mostrar el aviso de preparación pendiente. |
| Panel → server action → base → UI | Guardado desde Super Admin → SaaS Engine → Marca Global → Mascota Pixy; lectura SQL posterior confirmó los valores. La recarga del layout hizo aparecer el acceso directo. |
| Mascota → ayuda | El botón `Abrir ayuda` abrió el modal existente; ambos controles flotantes se retiraron durante el diálogo. |
| Consulta → estado de error | La pregunta real sobre colores del ADN pasó por `askHelpAssistant` y mostró procesamiento y error con avatar. El servidor identificó la causa: **los servicios IA están desactivados para Pixy en esta copia local**. No se habilitaron ni se cambiaron credenciales IA. No se verificó una respuesta exitosa del proveedor. |
| Apagado → recuperación | Guardado de `enabled:false`, vuelta de `Abrir herramientas y ayuda`, y apertura del mismo chat mediante `Centro de Ayuda`. |
| ADN → robot | Se habilitó temporalmente disponibilidad general local y se cambió a Dannicel Comunicaciones: el robot azul coincidió con sus colores efectivos `#3594f1` / `#0362ff`, leídos de `organization_settings` y del proveedor de branding en el navegador. No se editó el ADN. |
| Piloto → aislamiento | Después de volver a `audience:pixy`, Dannicel mostró el acceso anterior y cero botones `Abrir ayuda`; al regresar a Pixy reapareció la mascota. |
| Permisos de base | Las políticas existentes siguen siendo lectura pública y administración por `service_role`. Un intento `UPDATE` con rol `authenticated` y JWT sin privilegios devolvió **0 filas modificables**, dentro de una transacción revertida. La autorización de la server action conserva además sus pruebas unitarias; esta comprobación no equivale a una prueba HTTP de la action con otro usuario. |

Configuración final local: `enabled:true`, `audience:pixy`, organización `db9d1288-80ab-48df-b130-a0739881c6f2`, animación contextual, seguimiento del puntero apagado y reacciones a alertas encendidas. La ampliación a todos los tenants fue temporal y se revirtió desde el panel. La prueba integrada no modifica la base remota y no sustituye un piloto de producción ni mediciones en dispositivos móviles reales.

## Activación en otros entornos

La migración `20261011000001_platform_robot_pet.sql` ya se aplicó localmente y no se aplicó a una base remota. Añade `platform_settings.pet_config`, inicialmente apagado, y no cambia permisos/RLS. Si falta esa columna, el dashboard conserva su ayuda actual y el panel comunica que la configuración no está disponible.

Para desplegar: revisar/aplicar la migración en el entorno seleccionado, desplegar la rama, identificar la organización Pixy en el panel y activar **Piloto: solo Pixy**. Verificar entonces guardado real, rechazo de usuarios no autorizados y branding de tenants con las políticas desplegadas. Abrir la disponibilidad general solo después de ese piloto.

La propagación inicial de cambios requiere recargar las sesiones abiertas. No se ofrece apagado instantáneo en todos los navegadores; un plazo de propagación máximo requerirá una fase adicional de revalidación/configuración compartida.

Reversión funcional: apagar el interruptor maestro y recargar. La ayuda se mantiene disponible. La reversión de código puede conservar la columna de configuración, que es aditiva y no altera operaciones.
