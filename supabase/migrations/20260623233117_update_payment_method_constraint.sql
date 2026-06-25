-- Update the resto_orders_payment_method_check constraint to allow 'pending'
ALTER TABLE "public"."resto_orders" DROP CONSTRAINT IF EXISTS "resto_orders_payment_method_check";

ALTER TABLE "public"."resto_orders" ADD CONSTRAINT "resto_orders_payment_method_check" CHECK (payment_method IN ('cash', 'transfer', 'pending'));
