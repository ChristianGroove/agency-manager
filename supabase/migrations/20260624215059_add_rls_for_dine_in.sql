-- Permitir lectura anónima de las sesiones de mesa (necesario para Supabase Realtime y para que los clientes vean su cuenta)
CREATE POLICY "Allow public read access to table sessions"
ON resto_table_sessions
FOR SELECT
TO public
USING (true);

-- Permitir creación de sesiones de mesa (cuando un cliente escanea un código QR disponible)
CREATE POLICY "Allow public insert to table sessions"
ON resto_table_sessions
FOR INSERT
TO public
WITH CHECK (true);

-- Permitir lectura anónima de las rondas de pedidos (necesario para que los clientes vean qué han pedido)
CREATE POLICY "Allow public read access to resto orders"
ON resto_orders
FOR SELECT
TO public
USING (true);
