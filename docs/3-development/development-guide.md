# Guía de Desarrollo Seguro y Flujo de Trabajo (Pixy)

Este manual establece el estándar para desarrollar de forma segura y eficiente en el entorno local de Pixy.

## 1. Puesta en Marcha Diaria
Para comenzar a trabajar, asegúrate de que los servicios locales estén activos:
```powershell
# Iniciar infraestructura local (Docker)
npx supabase start

# Iniciar servidor de desarrollo
npm run dev
```

## 2. Flujo de Trabajo para Nuevas Funcionalidades
A partir de ahora, **el Baseline Maestro es la fuente de verdad**. El ciclo de vida de un cambio debe ser:

### Paso 1: Desarrollo Local (Playground Seguro)
Realiza tus cambios (nuevas tablas, columnas, RLS) directamente en tu **Dashboard Local** (`http://127.0.0.1:54323`). Prueba que la aplicación funcione correctamente.

### Paso 2: Generar la Migración Atómica
Una vez que el cambio es exitoso, debes "capturarlo" en un archivo SQL:
```powershell
npx supabase db diff -f nombre_de_la_mejora
```
Esto generará un archivo en `supabase/migrations/XXXXXXXX_nombre_de_la_mejora.sql`. **Este archivo es la receta de tu cambio.**

### Paso 3: Commit de Código + Base de Datos
En Git, cualquier funcionalidad que altere la DB debe ir en el mismo commit que el código que la usa.
- **Archivos a incluir**: `src/...` (código) Y `supabase/migrations/...` (migración).
- **Ejemplo de mensaje**: `feat: soporte para firmas digitales en contratos`

## 3. Despliegue a Producción
**NUNCA** edites la base de datos de producción desde el dashboard de Supabase Cloud. El despliegue de la base de datos ahora sigue al código:
1. Al unir tu código a la rama principal (Main/Master), las migraciones se aplicarán solas (si tienes CI/CD).
2. Si lo haces manual, usa `npx supabase db push` desde la terminal apuntando a producción (solo personal autorizado).

## 4. Seguridad de Datos: Reglas de Oro
- **Snapshot Local**: Tu base de datos local es un clon privado. Si la corrompes o quieres "limpiar", solo ejecuta `npx supabase db reset`.
- **Identidad**: Usa siempre tu correo real de producción pero con la contraseña **`admin123`** en local.
- **Variables de Enorno**: El archivo `.env.local` nunca debe ser subido al repositorio (está en el `.gitignore`).

---
*Pixy - Engineering Standards v1.1*
