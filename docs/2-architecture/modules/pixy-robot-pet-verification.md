# Pixy Robot Pet: entrega inicial y verificación

Fecha: 11 de octubre de 2026, America/Bogota. Rama: `pixyrobotpet`.

Implementadas la base de la mascota, configuración super admin, herencia ADN y acceso al chat; también estados de ayuda y una integración inicial con errores del chat y avisos críticos. La extensión a otros módulos y a todos los toasts continúa como trabajo por fases.

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

## Activación pendiente

La migración `20261011000001_platform_robot_pet.sql` está preparada y no se aplicó a la base desplegada. Añade `platform_settings.pet_config`, inicialmente apagado, y no cambia permisos/RLS. Si falta esa columna, el dashboard conserva su ayuda actual y el panel comunica que la configuración no está disponible.

Para desplegar: revisar/aplicar la migración en el entorno seleccionado, desplegar la rama, identificar la organización Pixy en el panel y activar **Piloto: solo Pixy**. Verificar entonces guardado real, rechazo de usuarios no autorizados y branding de tenants con las políticas desplegadas. Abrir la disponibilidad general solo después de ese piloto.

La propagación inicial de cambios requiere recargar las sesiones abiertas. No se ofrece apagado instantáneo en todos los navegadores; un plazo de propagación máximo requerirá una fase adicional de revalidación/configuración compartida.

Reversión funcional: apagar el interruptor maestro y recargar. La ayuda se mantiene disponible. La reversión de código puede conservar la columna de configuración, que es aditiva y no altera operaciones.
