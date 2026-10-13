# Hibernación del pet

La ventana activa predeterminada es de cinco minutos desde el montaje o la última entrada del cursor sobre el robot. Mover el cursor por otros elementos no renueva el plazo. Un nuevo hover, foco de teclado sobre el acceso de ayuda o toque despierta el robot y concede otra ventana completa. El robot decorativo del compositor también acepta hover/toque en el espacio lateral reservado; no tapa input ni envío.

Al caducar se muestra `sleeping` cuando no hay un estado real de mayor prioridad. El renderer recibe `hibernating` y queda pausado, incluyendo animación continua: no sigue el cursor ni mantiene su suscripción al ticker. Trabajo, espera, éxito y error conservan sus rostros/estados en una pose estática durante la hibernación; los eventos de negocio no renuevan el reloj.

Super Admin dispone de interruptor y tiempo de 1–30 minutos, por defecto activado y cinco minutos. Las configuraciones JSON anteriores reciben esos valores al leerlas; no requiere migración SQL. El contador es interno: un timeout por ciclo, sin intervalos, polling, persistencia o llamadas de IA. La revisión de visibilidad impide regalar otra ventana activa al volver de una pestaña con timers suspendidos. Cambiar la configuración reinicia un ciclo, y desmontar cancela el timer/listener.

El trabajo se realizó en `G:/Pixy/agency-manager/tmp/pet-workspace`, checkout aislado de `pixyrobotpet`, porque el checkout principal está en `NUEVO-MODULO-CARTERA` con cambios en curso. Se reutilizaron dependencias existentes, manteniendo compilación y archivos de esta rama separados de Cartera.

Verificación de código: pruebas con reloj simulado para caducidad exacta, renovación por hover, movimiento ajeno, apagado/reactivación, pestaña oculta, limpieza y prioridad de señales; comprobación de renderer pausado incluso en modo continuo y compatibilidad del esquema. La revisión visual y de rendimiento real en navegador sigue a cargo del usuario.

Resultado: 68 pruebas en 9 archivos aprobadas, ESLint sin errores en los archivos modificados y build de producción completado, incluyendo TypeScript. La instancia 3005 se actualizó desde este checkout; no se aplicaron migraciones ni se editó la configuración de base de datos.
