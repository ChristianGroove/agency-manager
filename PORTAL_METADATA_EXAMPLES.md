# Ejemplos de Metadata para Portal Card

Este documento muestra cómo configurar la metadata `portal_card` para diferentes verticales/industrias.

## Estructura Base

```typescript
{
  metadata: {
    portal_card: {
      detailed_description: string,    // Descripción extensa
      features: string[],              // Lista de características
      highlights: string[],            // Lista de destacados
      custom_fields: Record<string, any> // Campos personalizados por vertical
    }
  }
}
```

---

## Ejemplos por Vertical

### 🎨 Marketing Digital / Agencia Creativa

```json
{
  "metadata": {
    "portal_card": {
      "detailed_description": "Servicio completo de gestión de redes sociales que incluye estrategia de contenido, diseño gráfico, community management y reportes mensuales de rendimiento. Ideal para marcas que quieren mantener una presencia activa y profesional en redes.",
      "features": [
        "30 publicaciones mensuales diseñadas",
        "Respuesta a comentarios y mensajes en 24h",
        "Reporte mensual de métricas",
        "Estrategia de contenido personalizada",
        "Diseño de historias e IGTV"
      ],
      "highlights": [
        "Más vendido",
        "Incluye diseño gráfico",
        "Reporte en tiempo real"
      ],
      "custom_fields": {
        "plataformas": "Instagram, Facebook, TikTok",
        "tiempo_respuesta": "24 horas",
        "incluye_publicidad": false
      }
    }
  }
}
```

### 🏠 Limpieza / Servicios del Hogar

```json
{
  "metadata": {
    "portal_card": {
      "detailed_description": "Servicio de limpieza profesional para espacios residenciales. Nuestro equipo utiliza productos ecológicos y equipos de alta calidad para dejarte tu hogar impecable. Incluye limpieza de pisos, baños, cocina, habitaciones y áreas comunes.",
      "features": [
        "Equipo de 2 personas capacitadas",
        "Productos de limpieza ecológicos incluidos",
        "Seguro de daños y accidentes",
        "Flexibilidad de horarios",
        "Limpieza profunda de baños y cocina"
      ],
      "highlights": [
        "Productos ecológicos",
        "Personal verificado",
        "Garantía de satisfacción"
      ],
      "custom_fields": {
        "duracion_estimada": "4 horas",
        "area_maxima": "120m²",
        "personal_asignado": 2,
        "frecuencia_recomendada": "Quincenal"
      }
    }
  }
}
```

### 💻 Software / SaaS

```json
{
  "metadata": {
    "portal_card": {
      "detailed_description": "Plan profesional de nuestra plataforma CRM con todas las funcionalidades necesarias para gestionar tu pipeline de ventas, automatizar seguimientos y generar reportes avanzados. Incluye onboarding personalizado y soporte prioritario.",
      "features": [
        "Hasta 10 usuarios incluidos",
        "Almacenamiento ilimitado de contactos",
        "Automatizaciones y workflows",
        "API y integraciones",
        "Reportes avanzados y dashboards",
        "Soporte prioritario 24/7"
      ],
      "highlights": [
        "Más popular",
        "Onboarding incluido",
        "Sin límite de contactos"
      ],
      "custom_fields": {
        "usuarios_incluidos": 10,
        "almacenamiento": "100GB",
        "integraciones": ["Zapier", "Slack", "Google Workspace"],
        "sla_soporte": "< 2 horas"
      }
    }
  }
}
```

### 🏋️ Fitness / Gimnasio

```json
{
  "metadata": {
    "portal_card": {
      "detailed_description": "Membresía premium con acceso ilimitado a todas nuestras instalaciones: gimnasio equipado, clases grupales, área de cardio, pesas libres y zona funcional. Incluye plan de entrenamiento personalizado y evaluación física inicial.",
      "features": [
        "Acceso 24/7 a todas las áreas",
        "Clases grupales ilimitadas (Yoga, Spinning, CrossFit)",
        "Plan de entrenamiento personalizado",
        "Evaluación física mensual",
        "Estacionamiento incluido",
        "Casillero personal"
      ],
      "highlights": [
        "Acceso 24/7",
        "Evaluación gratuita",
        "Sin permanencia mínima"
      ],
      "custom_fields": {
        "clases_incluidas": "Ilimitadas",
        "invitados_mes": 2,
        "congelamiento_año": "1 mes",
        "nutricionista": "Disponible con costo adicional"
      }
    }
  }
}
```

### 🍕 Restaurante / Food Service

```json
{
  "metadata": {
    "portal_card": {
      "detailed_description": "Plan de catering corporativo mensual ideal para empresas que buscan ofrecer alimentos de calidad a su equipo. Incluye menú rotativo semanal, entrega puntual y opciones vegetarianas/veganas. Mínimo 20 personas.",
      "features": [
        "Menú rotativo semanal (4 opciones diarias)",
        "Entrega de lunes a viernes",
        "Opciones vegetarianas y veganas",
        "Empaques biodegradables",
        "Nutricionista para diseño de menú",
        "Facturación mensual"
      ],
      "highlights": [
        "Menú saludable",
        "Empaque eco-friendly",
        "Descuento por volumen"
      ],
      "custom_fields": {
        "personas_minimo": 20,
        "horario_entrega": "12:00 - 14:00",
        "dias_servicio": "Lunes a Viernes",
        "anticipacion_pedido": "24 horas"
      }
    }
  }
}
```

### 🚗 Transporte / Logística

```json
{
  "metadata": {
    "portal_card": {
      "detailed_description": "Servicio de mensajería express para envíos dentro de la ciudad. Ideal para e-commerce y negocios que necesitan entregas rápidas y confiables. Incluye tracking en tiempo real y seguro de mercancía.",
      "features": [
        "Recogida en tu ubicación",
        "Entrega el mismo día",
        "Tracking en tiempo real",
        "Seguro de mercancía incluido",
        "Foto de entrega como prueba",
        "Soporte telefónico directo"
      ],
      "highlights": [
        "Entrega mismo día",
        "Tracking en vivo",
        "Seguro incluido"
      ],
      "custom_fields": {
        "peso_maximo": "15kg",
        "cobertura": "Área metropolitana",
        "tiempo_entrega": "4-6 horas",
        "intentos_entrega": 2
      }
    }
  }
}
```

---

## Campos Personalizados Comunes por Industria

### Marketing/Agencia
- `plataformas`, `publicaciones_mes`, `incluye_publicidad`, `tiempo_respuesta`

### Limpieza/Hogar
- `duracion_estimada`, `area_maxima`, `personal_asignado`, `frecuencia_recomendada`

### SaaS/Software
- `usuarios_incluidos`, `almacenamiento`, `integraciones`, `sla_soporte`

### Fitness
- `acceso_horario`, `clases_incluidas`, `invitados_mes`, `congelamiento_año`

### Restaurante/Food
- `personas_minimo`, `horario_entrega`, `dias_servicio`, `anticipacion_pedido`

### Transporte/Logística
- `peso_maximo`, `cobertura`, `tiempo_entrega`, `intentos_entrega`

---

## Notas de Implementación

1. **Flexible por diseño**: El campo `custom_fields` permite agregar cualquier dato específico del vertical
2. **Arrays vacíos son válidos**: Si no hay features/highlights, simplemente usar `[]`
3. **Todos los campos son opcionales**: El componente maneja graciosamente la ausencia de datos
4. **Filtrado automático**: El sistema filtra strings vacíos de features/highlights al guardar
