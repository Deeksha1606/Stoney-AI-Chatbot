import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, Loader2, Cookie } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatWindowProps {
  orderId: string | null;
  conversationId: string | null;
  onOrderCreated: (orderId: string) => void;
  onConversationCreated: (conversationId: string) => void;
}

export const ChatWindow = ({ 
  orderId, 
  conversationId, 
  onOrderCreated, 
  onConversationCreated 
}: ChatWindowProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load conversation from localStorage
  useEffect(() => {
    const savedMessages = localStorage.getItem("chatMessages");
    const savedConversationId = localStorage.getItem("conversationId");
    const savedOrderId = localStorage.getItem("orderId");
    const savedCustomerId = localStorage.getItem("customerId");

    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    } else {
      setMessages([{
        role: "assistant",
        content: "Welcome to Stoney Cravings! 🍪 I'm SweetBuddy, your AI bakery assistant. Before we start, may I have your name, phone number, and delivery address?"
      }]);
    }

    if (savedConversationId) onConversationCreated(savedConversationId);
    if (savedOrderId) onOrderCreated(savedOrderId);
    if (savedCustomerId) setCustomerId(savedCustomerId);
  }, []);

  // Save conversation to localStorage whenever it changes
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("chatMessages", JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    if (conversationId) {
      localStorage.setItem("conversationId", conversationId);
    }
  }, [conversationId]);

  useEffect(() => {
    if (orderId) {
      localStorage.setItem("orderId", orderId);
    }
  }, [orderId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleIntent = async (intent: string, entities: any, responseMessage: string) => {
    switch (intent) {
      case "new_order":
        // Create new order
        const { data: newOrder, error: orderError } = await supabase
          .from("orders")
          .insert({ status: "pending" })
          .select()
          .single();

        if (newOrder && !orderError) {
          onOrderCreated(newOrder.id);
          
          // Create conversation
          const { data: conv } = await supabase
            .from("conversations")
            .insert({ order_id: newOrder.id })
            .select()
            .single();
          
          if (conv) onConversationCreated(conv.id);
        }
        break;

      case "add_item":
        if (!orderId) {
          toast({
            title: "No Active Order",
            description: "Please create a new order first!",
            variant: "destructive",
          });
          return;
        }

        if (entities.item_name && entities.quantity) {
          // Get item price from menu
          const { data: menuItem } = await supabase
            .from("menu_items")
            .select("price")
            .ilike("name", entities.item_name)
            .single();

          if (menuItem) {
            await supabase.from("order_items").insert({
              order_id: orderId,
              item_name: entities.item_name,
              quantity: entities.quantity,
              price: menuItem.price,
            });

            toast({
              title: "Item Added! ✓",
              description: `${entities.quantity}x ${entities.item_name} added to your order`,
            });
          }
        }
        break;

      case "delete_item":
        if (orderId && entities.item_name) {
          await supabase
            .from("order_items")
            .delete()
            .eq("order_id", orderId)
            .ilike("item_name", entities.item_name);

          toast({
            title: "Item Removed",
            description: `${entities.item_name} removed from order`,
          });
        }
        break;

      case "update_item":
        if (orderId && entities.item_name && entities.quantity) {
          await supabase
            .from("order_items")
            .update({ quantity: entities.quantity })
            .eq("order_id", orderId)
            .ilike("item_name", entities.item_name);

          toast({
            title: "Item Updated",
            description: `${entities.item_name} quantity updated to ${entities.quantity}`,
          });
        }
        break;

      case "save_customer":
        if (entities.customer_name || entities.phone || entities.address) {
          const { data: customer } = await supabase
            .from("customers")
            .insert({
              name: entities.customer_name || "Guest",
              phone: entities.phone || "",
              address: entities.address || "",
            })
            .select()
            .single();

          if (customer) {
            setCustomerId(customer.id);
            localStorage.setItem("customerId", customer.id);

            // Update conversation with customer
            if (conversationId) {
              await supabase
                .from("conversations")
                .update({ customer_id: customer.id })
                .eq("id", conversationId);
            }

            // Link to order if exists
            if (orderId) {
              await supabase
                .from("orders")
                .update({ customer_id: customer.id })
                .eq("id", orderId);
            }

            toast({
              title: "Details Saved! ✓",
              description: "Your information has been saved",
            });
          }
        }
        break;

      case "track_order":
        if (entities.order_number) {
          const { data: trackedOrder } = await supabase
            .from("orders")
            .select("*")
            .eq("order_number", entities.order_number)
            .single();

          if (!trackedOrder) {
            toast({
              title: "Order Not Found",
              description: `No order found with ID #${entities.order_number}`,
              variant: "destructive",
            });
          }
        }
        break;
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("chat", {
        body: {
          message: userMessage,
          conversationId,
          orderId,
        },
      });

      if (error) throw error;

      const response = data;
      
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.message },
      ]);

      // Handle intents
      if (response.intent && response.entities) {
        await handleIntent(response.intent, response.entities, response.message);
      }

      // Handle rate limits
      if (error && (error as any).status === 429) {
        toast({
          title: "Rate Limit",
          description: "Too many requests. Please wait a moment.",
          variant: "destructive",
        });
      }

      if (error && (error as any).status === 402) {
        toast({
          title: "Service Unavailable",
          description: "AI service is temporarily unavailable.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
      
      setMessages((prev) => [
        ...prev,
        { 
          role: "assistant", 
          content: "Sorry, I'm having trouble right now. Please try again!" 
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="flex flex-col h-[600px] shadow-soft">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-3 ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                <Cookie className="w-4 h-4 text-accent-foreground" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              <p className="text-sm leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
              <Cookie className="w-4 h-4 text-accent-foreground" />
            </div>
            <div className="bg-secondary rounded-2xl px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            size="icon"
            className="bg-accent hover:bg-accent/90"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};
