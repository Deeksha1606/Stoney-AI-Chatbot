-- Add numeric order number field
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1001;

ALTER TABLE public.orders 
ADD COLUMN order_number INTEGER UNIQUE DEFAULT nextval('order_number_seq');

-- Create index for faster lookups
CREATE INDEX idx_orders_order_number ON public.orders(order_number);

-- Update RLS policies to work with order_number
DROP POLICY IF EXISTS "Users can view orders by order number" ON public.orders;
CREATE POLICY "Users can view orders by order number" 
ON public.orders 
FOR SELECT 
USING (true);