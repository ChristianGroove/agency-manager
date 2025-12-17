-- SEED DATA FOR CLIENTS MODULE

-- INSTRUCCIONES:
-- Reemplaza 'TU_ID_DE_USUARIO_AQUI' por tu UID real de Supabase (Authentication > Users).
-- Ejemplo: '550e8400-e29b-41d4-a716-446655440000'

-- 1. Insert Clients
INSERT INTO public.clients (id, user_id, name, company_name, nit, email, phone, address) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'TU_ID_DE_USUARIO_AQUI', 'Carlos Rodriguez', 'Tech Solutions SAS', '900.111.222-3', 'carlos@techsolutions.com', '573001112233', 'Calle 100 # 15-20, Bogotá'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'TU_ID_DE_USUARIO_AQUI', 'Ana Maria Garcia', 'Moda & Estilo', '900.333.444-5', 'ana@modaestilo.com', '573102223344', 'Carrera 15 # 85-30, Bogotá'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'TU_ID_DE_USUARIO_AQUI', 'Jorge Martinez', 'Constructora JM', '900.555.666-7', 'jorge@constructorajm.com', '573203334455', 'Av. El Dorado # 68-90, Bogotá'),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'TU_ID_DE_USUARIO_AQUI', 'Luisa Fernanda', 'Consultoría Legal', '900.777.888-9', 'luisa@legal.com', '573004445566', 'Calle 72 # 7-80, Bogotá'),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'TU_ID_DE_USUARIO_AQUI', 'Restaurante El Sabor', 'Gastronomía Local', '900.999.000-1', 'contacto@elsabor.com', '573105556677', 'Zona T, Bogotá');

-- 2. Insert Hosting Accounts (Some active, some expired)
INSERT INTO public.hosting_accounts (client_id, domain, provider, start_date, renewal_date, cost, status) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'techsolutions.com', 'Hostinger', '2024-01-15', '2025-01-15', 120.00, 'active'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'modaestilo.com', 'Hostinger', '2023-11-20', '2024-11-20', 90.00, 'expired'), -- Vencido
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'constructorajm.com', 'GoDaddy', '2024-06-01', '2025-06-01', 150.00, 'active');

-- 3. Insert Invoices (Some pending to show debt)
INSERT INTO public.invoices (client_id, number, date, due_date, total, status) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'CC-2024-001', '2024-12-01', '2024-12-15', 500000, 'pending'), -- Debe
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'CC-2024-002', '2024-11-20', '2024-11-30', 350000, 'overdue'), -- Debe (Vencida)
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'CC-2024-003', '2024-12-10', '2024-12-20', 1200000, 'paid'); -- Pagado
