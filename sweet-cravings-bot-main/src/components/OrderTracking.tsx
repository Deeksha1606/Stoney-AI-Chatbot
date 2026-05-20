import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Search, Package, Clock, CheckCircle, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Order {
  id: string;
  order_number: number;
  status: string;
  total: number;
  created_at: string;
  order_items: Array<{
    item_name: string;
    quantity: number;
    price: number;
  }>;
  customers: {
    name: string;
    phone: string;
    address: string;
  } | null;
}

export const OrderTracking = () => {
  const [orderNumber, setOrderNumber] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const trackOrder = async () => {
    if (!orderNumber.trim()) {
      toast({
        title: "Enter Order Number",
        description: "Please enter an order number to track",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (*),
          customers (*)
        `)
        .eq("order_number", parseInt(orderNumber))
        .maybeSingle();

      if (error || !data) {
        toast({
          title: "Order Not Found",
          description: "No order found with this number",
          variant: "destructive",
        });
        setOrder(null);
        return;
      }

      setOrder(data as Order);
    } catch (error) {
      console.error("Error tracking order:", error);
      toast({
        title: "Error",
        description: "Failed to track order",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return <Clock className="w-5 h-5" />;
      case "preparing":
        return <Package className="w-5 h-5" />;
      case "out for delivery":
        return <Truck className="w-5 h-5" />;
      case "delivered":
        return <CheckCircle className="w-5 h-5" />;
      default:
        return <Package className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "secondary";
      case "preparing":
        return "default";
      case "out for delivery":
        return "default";
      case "delivered":
        return "default";
      default:
        return "secondary";
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Track Your Order</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Enter Order Number (e.g., 1001)"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && trackOrder()}
            />
            <Button onClick={trackOrder} disabled={loading} className="gap-2">
              <Search className="w-4 h-4" />
              Track
            </Button>
          </div>
        </CardContent>
      </Card>

      {order && (
        <Card className="shadow-soft">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Order #{order.order_number}</CardTitle>
              <Badge variant={getStatusColor(order.status)} className="gap-1">
                {getStatusIcon(order.status)}
                {order.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Order Timeline */}
            <div className="space-y-3">
              <h3 className="font-semibold">Order Status</h3>
              <div className="flex items-center justify-between px-4">
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    order.status === "pending" || order.status === "preparing" || 
                    order.status === "out for delivery" || order.status === "delivered"
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted"
                  }`}>
                    <Clock className="w-5 h-5" />
                  </div>
                  <span className="text-xs">Pending</span>
                </div>
                
                <div className="flex-1 h-1 mx-2 bg-border">
                  <div className={`h-full ${
                    order.status === "preparing" || order.status === "out for delivery" || 
                    order.status === "delivered" ? "bg-accent" : ""
                  }`} />
                </div>
                
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    order.status === "preparing" || order.status === "out for delivery" || 
                    order.status === "delivered"
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted"
                  }`}>
                    <Package className="w-5 h-5" />
                  </div>
                  <span className="text-xs">Preparing</span>
                </div>
                
                <div className="flex-1 h-1 mx-2 bg-border">
                  <div className={`h-full ${
                    order.status === "out for delivery" || order.status === "delivered" 
                      ? "bg-accent" : ""
                  }`} />
                </div>
                
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    order.status === "out for delivery" || order.status === "delivered"
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted"
                  }`}>
                    <Truck className="w-5 h-5" />
                  </div>
                  <span className="text-xs">Delivery</span>
                </div>
                
                <div className="flex-1 h-1 mx-2 bg-border">
                  <div className={`h-full ${order.status === "delivered" ? "bg-accent" : ""}`} />
                </div>
                
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    order.status === "delivered"
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted"
                  }`}>
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <span className="text-xs">Delivered</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Order Items */}
            <div className="space-y-2">
              <h3 className="font-semibold">Items</h3>
              {order.order_items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span>{item.quantity}x {item.item_name}</span>
                  <span className="font-medium">₹{(item.quantity * item.price).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <Separator />

            {/* Customer Info */}
            {order.customers && (
              <div className="space-y-2">
                <h3 className="font-semibold">Delivery Details</h3>
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Name:</span> {order.customers.name}</p>
                  <p><span className="text-muted-foreground">Phone:</span> {order.customers.phone}</p>
                  {order.customers.address && (
                    <p><span className="text-muted-foreground">Address:</span> {order.customers.address}</p>
                  )}
                </div>
              </div>
            )}

            <Separator />

            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total</span>
              <span className="text-accent">₹{order.total}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
