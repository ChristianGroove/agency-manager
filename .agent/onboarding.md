# Protocolo de Sincronización entre Equipos 🔄

Para mantener el contexto entre tu PC y tu Portátil, hemos movido los archivos de "cerebro" dentro del repositorio, en la carpeta `.agent/`.

## Flujo de Trabajo

### 1. Al terminar en un equipo (PC):
Siempre asegúrate de subir tus cambios:
```bash
git add .
git commit -m "update: progress save"
git push
```

### 2. Al empezar en el otro equipo (Portátil):
Siempre baja los cambios antes de empezar:
```bash
git pull
```

### 3. Prompt de "Reconexión"
Cuando inicies el agente en el nuevo equipo, pégale este prompt para que lea el contexto actualizado desde los archivos del repo:

```text
Continuamos el trabajo en "Agency Manager".
He hecho `git pull` y el contexto actualizado está en la carpeta `.agent/`.

Por favor:
1. Lee `.agent/task.md` para ver en qué fase estamos.
2. Lee `.agent/walkthrough.md` para ver los últimos cambios técnicos.
3. Dame un resumen de lo último que se hizo y dime cuál es el siguiente paso pendiente.
```

---

## Setup Inicial (Solo primera vez)

1.  **Clonar**: `git clone ...`
2.  **Secretos**: Copiar contenido de `.env.local` manualmente. (Ver abajo)
3.  **Instalar**: `npm install`
4.  **Dev**: `npm run dev`

### Llaves Secretas Requeridas (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
WOMPI_EVENTS_SECRET=...
```
*(Copia estas claves de tu equipo principal)*
