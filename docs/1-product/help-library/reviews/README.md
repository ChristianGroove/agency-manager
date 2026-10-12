# Publicación de la biblioteca

Reparto acordado el 2026-10-12: Gemini realiza la revisión editorial y la lectura/verificación de código. Puede entregar `drafts/publication-review.json` con su identidad de revisor y los filtros comprobados. Codex valida contratos, hashes, permisos canónicos y pruebas de integración, sin repetir la auditoría documental completa. Las revisiones anteriores identificadas como Codex corresponden a los lotes que sí revisó; no deben reutilizarse para afirmar que revisó entregas futuras de Gemini.

`drafts/` pertenece al trabajo de Gemini. El runtime nunca lee esa carpeta. Los artículos publicados residen en `src/modules/features/caa/library/published.json`, un artefacto del build, inicialmente vacío.

1. Ejecutar `npm run help:validate`. Se validan artículos, evidencia/rutas, inventario y referencias del conjunto de preguntas cuando existen. Esta comprobación no confirma que un procedimiento funcione en navegador ni que una afirmación sea correcta.
2. Revisar el lote contra el código y los requisitos reales. Confirmar con el usuario los pasos pendientes de prueba visual. Separar requisitos editoriales de filtros reales de módulos, permisos y verticales.
3. Crear un JSON de aprobación en esta carpeta con formato como el siguiente. Los hashes son SHA-256 del texto del borrador leído en UTF-8 (incluyendo frontmatter y notas, preservando saltos de línea); los de evidencia usan el texto completo UTF-8 de cada archivo. No rellenar hashes ni permisos automáticamente para simular una revisión.

```json
{
  "schema_version": 1,
  "articles": [
    {
      "id": "dashboard.overview",
      "draft_sha256": "HASH DEL BORRADOR REVISADO",
      "reviewed_by": "Responsable de la revisión",
      "reviewed_on": "2026-10-12",
      "evidence_sha256": { "src/app/(dashboard)/dashboard/page.tsx": "HASH DE LA EVIDENCIA REVISADA" },
      "required_modules": [],
      "required_permissions": [],
      "verticals": [],
      "link_route": null
    }
  ]
}
```

4. Ejecutar `npm run help:publish -- docs/1-product/help-library/reviews/<lote>.json`. Solo se publican IDs aprobados; la revisión representa una instantánea completa de la biblioteca deseada, no un append. Cada evidencia declarada debe estar revisada y conservar su hash. Si cambia la fuente o el artículo, se rechaza la publicación. Las notas internas, frontmatter y rutas de evidencia no se incluyen en el contenido publicado. Conservar la revisión anterior en Git para revertir.
5. Compilar y activar el piloto en el entorno deseado con `PIXY_HELP_V2_ENABLED=true` y `PIXY_HELP_V2_TENANTS=<UUID del tenant>`. Sin ambas variables la versión nueva permanece apagada. `*` permite un despliegue global explícito y no se recomienda para el primer piloto. Reiniciar el runtime después de cambiar variables. Apagar el master switch restaura el comportamiento legacy.

El control del asistente es independiente de la mascota. La publicación requiere un nuevo build: editar un borrador no modifica una conversación activa. Esta primera entrega no añade panel editorial de super admin, índice semántico, consultas a estados de negocio ni streaming.
