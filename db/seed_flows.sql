
-- 6. SEED DATA: The 5 Master Routines
-- Insert the strict MVP templates. These are the "Products" we sell in the gallery.

INSERT INTO public.flow_templates (key, name, description, icon, category, definition_json)
VALUES 
(
  'payment_recovery',
  'Cobrador Amable',
  'Avisa amablemente a los clientes cuando su factura vence. Escala el tono si no responden.',
  'Banknote',
  'sales',
  '{
    "steps": [
      {
        "id": "s1", "position": 1, "type": "trigger", "key": "invoice_overdue",
        "label": "Cuando la factura vence",
        "config": { "days_overdue": 1 }
      },
      {
        "id": "s2", "position": 2, "type": "wait", "key": "wait_grace_period",
        "label": "Esperar periodo de gracia",
        "config": { "days": "${days}" }
      },
      {
        "id": "s3", "position": 3, "type": "rule", "key": "check_min_amount",
        "label": "¿Monto mayor al mínimo?",
        "config": { "operator": "gt", "value": "${amount}" }
      },
      {
        "id": "s4", "position": 4, "type": "action", "key": "send_soft_reminder",
        "label": "Enviar Recordatorio Amable",
        "config": { "channel": "${channel}", "template": "soft_reminder" }
      }
    ]
  }'::jsonb
),
(
  'budget_followup',
  'Seguimiento de Presupuesto',
  'Envía un seguimiento automático 48h después de enviar una cotización si no hay respuesta.',
  'FileCheck',
  'sales',
  '{
    "steps": [
      {
        "id": "s1", "position": 1, "type": "trigger", "key": "proposal_sent",
        "label": "Cuando se envía presupuesto",
        "config": {}
      },
      {
        "id": "s2", "position": 2, "type": "wait", "key": "wait_response",
        "label": "Esperar respuesta del cliente",
        "config": { "hours": 48 }
      },
      {
        "id": "s3", "position": 3, "type": "rule", "key": "check_no_reply",
        "label": "¿Aún sin respuesta?",
        "config": { "status": "pending" }
      },
      {
        "id": "s4", "position": 4, "type": "action", "key": "send_check_in",
        "label": "Enviar Email: ¿Dudas?",
        "config": { "channel": "email", "template": "budget_checkup" }
      }
    ]
  }'::jsonb
),
(
  'client_reactivation',
  'Reactivación de Clientes',
  'Detecta inactividad de 60 días y envía una oferta especial de retorno.',
  'CalendarClock',
  'retention',
  '{
    "steps": [
      {
        "id": "s1", "position": 1, "type": "trigger", "key": "client_inactivity",
        "label": "Cliente inactivo detectado",
        "config": { "days_inactive": 60 }
      },
      {
        "id": "s2", "position": 2, "type": "action", "key": "create_discount_coupon",
        "label": "Generar cupón de retorno",
        "config": { "percentage": 15 }
      },
      {
        "id": "s3", "position": 3, "type": "action", "key": "send_we_miss_you",
        "label": "Enviar Mensaje: Te extrañamos",
        "config": { "channel": "email", "template": "resurrection_offer" }
      }
    ]
  }'::jsonb
),
(
  'review_request',
  'Pedido de Reseña',
  'Espera a que un servicio finalice con éxito y solicita una reseña en Google.',
  'MessageSquareHeart',
  'operations',
  '{
    "steps": [
      {
        "id": "s1", "position": 1, "type": "trigger", "key": "service_completed",
        "label": "Servicio/Proyecto completado",
        "config": {}
      },
      {
        "id": "s2", "position": 2, "type": "wait", "key": "wait_experience",
        "label": "Esperar días de cortesía",
        "config": { "days": 2 }
      },
      {
        "id": "s3", "position": 3, "type": "action", "key": "send_review_link",
        "label": "Solicitar Reseña 5 Estrellas",
        "config": { "channel": "${channel}", "template": "review_request_v1" }
      }
    ]
  }'::jsonb
),
(
  'client_onboarding',
  'Onboarding de Cliente',
  'Envía email de bienvenida, crea carpeta en Drive y avisa al equipo en Slack.',
  'UserPlus',
  'operations',
  '{
    "steps": [
      {
        "id": "s1", "position": 1, "type": "trigger", "key": "new_client_signed",
        "label": "Nuevo cliente creado",
        "config": {}
      },
      {
        "id": "s2", "position": 2, "type": "action", "key": "send_welcome_kit",
        "label": "Enviar Kit de Bienvenida",
        "config": { "channel": "email" }
      },
      {
        "id": "s3", "position": 3, "type": "action", "key": "create_drive_folder",
        "label": "Crear Carpeta Compartida",
        "config": { "provider": "google_drive" }
      },
      {
        "id": "s4", "position": 4, "type": "action", "key": "notify_team",
        "label": "Avisar al equipo interno",
        "config": { "channel": "slack", "message": "Nuevo cliente a bordo" }
      }
    ]
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;
