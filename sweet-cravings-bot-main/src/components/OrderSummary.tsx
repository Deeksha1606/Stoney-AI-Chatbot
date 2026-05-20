import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ShoppingBag, Trash2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OrderItem {
  id: string;
  item_name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  order_number: number;
  status: string;
  total: number;
  created_at: string;
  order_items: OrderItem[];
}

interface OrderSummaryProps {
  orderId: string | null;
  showFull?: boolean;
}

export const OrderSummary = ({ orderId, showFull = false }: OrderSummaryProps) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchOrder = async () => {
    if (!orderId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (*)
        `)
        .eq("id", orderId)
        .single();

      if (error) throw error;
      setOrder(data as Order);
    } catch (error) {
      console.error("Error fetching order:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();

    // Subscribe to realtime updates
    if (orderId) {
      const channel = supabase
        .channel(`order-${orderId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "order_items",
            filter: `order_id=eq.${orderId}`,
          },
          () => {
            fetchOrder();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [orderId]);

  const handleDeleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from("order_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      toast({
        title: "Item Removed",
        description: "Item has been removed from your order",
      });
    } catch (error) {
      console.error("Error deleting item:", error);
      toast({
        title: "Error",
        description: "Failed to remove item",
        variant: "destructive",
      });
    }
  };

  if (!orderId) {
    return (
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-accent" />
            Order Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No active order</p>
            <p className="text-sm mt-1">Start chatting to create an order!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-accent" />
            Order Summary
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            onClick={fetchOrder}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {order && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Order #{order.order_number}
              </span>
              <Badge variant={order.status === "pending" ? "secondary" : "default"}>
                {order.status}
              </Badge>
            </div>

            <Separator />

            {order.order_items && order.order_items.length > 0 ? (
              <div className="space-y-3">
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between group">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.item_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} × ₹{item.price}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        ₹{(item.quantity * item.price).toFixed(2)}
                      </span>
                      {showFull && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No items in order yet
              </div>
            )}

            <Separator />

            <div className="flex items-center justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-accent">₹{order.total}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
