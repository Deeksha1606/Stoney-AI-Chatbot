-- Create menu_items table for bakery products
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create customers table
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id),
  status TEXT NOT NULL DEFAULT 'pending',
  total DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create order_items table
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create conversations table for chat history
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id),
  order_id UUID REFERENCES public.orders(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create messages table for storing chat messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for menu_items (public read access)
CREATE POLICY "Anyone can view menu items"
  ON public.menu_items FOR SELECT
  USING (true);

-- RLS Policies for customers (users can only see their own data)
CREATE POLICY "Users can view their own customer data"
  ON public.customers FOR SELECT
  USING (true);

CREATE POLICY "Users can insert customer data"
  ON public.customers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own customer data"
  ON public.customers FOR UPDATE
  USING (true);

-- RLS Policies for orders
CREATE POLICY "Users can view orders"
  ON public.orders FOR SELECT
  USING (true);

CREATE POLICY "Users can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update orders"
  ON public.orders FOR UPDATE
  USING (true);

-- RLS Policies for order_items
CREATE POLICY "Users can view order items"
  ON public.order_items FOR SELECT
  USING (true);

CREATE POLICY "Users can create order items"
  ON public.order_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update order items"
  ON public.order_items FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete order items"
  ON public.order_items FOR DELETE
  USING (true);

-- RLS Policies for conversations
CREATE POLICY "Users can view conversations"
  ON public.conversations FOR SELECT
  USING (true);

CREATE POLICY "Users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (true);

-- RLS Policies for messages
CREATE POLICY "Users can view messages"
  ON public.messages FOR SELECT
  USING (true);

CREATE POLICY "Users can create messages"
  ON public.messages FOR INSERT
  WITH CHECK (true);

-- Create function to update order total
CREATE OR REPLACE FUNCTION public.update_order_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.orders
  SET total = (
    SELECT COALESCE(SUM(quantity * price), 0)
    FROM public.order_items
    WHERE order_id = NEW.order_id
  ),
  updated_at = now()
  WHERE id = NEW.order_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for order total updates
CREATE TRIGGER update_order_total_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.update_order_total();

-- Insert menu items for Stoney Cravings
INSERT INTO public.menu_items (name, category, price, description) VALUES
('Chocochip Cookies', 'Cookies', 150.00, 'Classic chocolate chip cookies with rich chocolate chunks'),
('Ganache Filled Cookies', 'Cookies', 200.00, 'Premium cookies filled with smooth chocolate ganache'),
('Oats Cookies', 'Cookies', 120.00, 'Healthy oatmeal cookies with a perfect crunch'),
('Butter Cookies', 'Cookies', 130.00, 'Traditional butter cookies that melt in your mouth'),
('Gourmet Cookies', 'Cookies', 250.00, 'Artisan gourmet cookies with premium ingredients'),
('Banana Cookies', 'Cookies', 140.00, 'Soft banana-flavored cookies with natural sweetness'),
('NYC Cookies', 'Cookies', 220.00, 'New York style cookies - large, thick and indulgent'),
('Chocolate Brownies', 'Brownies', 180.00, 'Fudgy chocolate brownies with a crispy top'),
('Walnut Brownies', 'Brownies', 200.00, 'Rich chocolate brownies with crunchy walnuts'),
('Banana Walnut Cake', 'Cakes', 450.00, 'Moist banana cake with walnuts - perfect for sharing'),
('Vanilla Cupcakes', 'Cupcakes', 80.00, 'Light and fluffy vanilla cupcakes with buttercream'),
('Chocolate Cupcakes', 'Cupcakes', 90.00, 'Rich chocolate cupcakes with chocolate frosting'),
('Red Velvet Cupcakes', 'Cupcakes', 100.00, 'Classic red velvet with cream cheese frosting');