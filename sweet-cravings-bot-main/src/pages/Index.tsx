import { useState } from "react";
import { ChatWindow } from "@/components/ChatWindow";
import { OrderSummary } from "@/components/OrderSummary";
import { MenuDisplay } from "@/components/MenuDisplay";
import { OrderTracking } from "@/components/OrderTracking";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Cookie, ShoppingBag, Menu, PackageSearch } from "lucide-react";

const Index = () => {
  const [activeTab, setActiveTab] = useState("chat");
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-bakery-cream via-background to-bakery-warm">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm shadow-soft">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center shadow-glow">
                <Cookie className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-primary">Stoney Cravings</h1>
                <p className="text-sm text-muted-foreground">Your AI-Powered Bakery Assistant</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setActiveTab("menu")}
                className="gap-2"
              >
                <Menu className="w-4 h-4" />
                Menu
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setActiveTab("track")}
                className="gap-2"
              >
                <PackageSearch className="w-4 h-4" />
                Track Order
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-4 mb-8">
            <TabsTrigger value="chat" className="gap-2">
              <Cookie className="w-4 h-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="order" className="gap-2">
              <ShoppingBag className="w-4 h-4" />
              Order
            </TabsTrigger>
            <TabsTrigger value="menu" className="gap-2">
              <Menu className="w-4 h-4" />
              Menu
            </TabsTrigger>
            <TabsTrigger value="track" className="gap-2">
              <PackageSearch className="w-4 h-4" />
              Track
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ChatWindow 
                  orderId={currentOrderId}
                  conversationId={conversationId}
                  onOrderCreated={setCurrentOrderId}
                  onConversationCreated={setConversationId}
                />
              </div>
              <div className="lg:col-span-1">
                <OrderSummary orderId={currentOrderId} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="order">
            <OrderSummary orderId={currentOrderId} showFull />
          </TabsContent>

          <TabsContent value="menu">
            <MenuDisplay />
          </TabsContent>

          <TabsContent value="track">
            <OrderTracking />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/80 backdrop-blur-sm mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>© 2024 Stoney Cravings. Powered by AI | Fresh Baked Daily</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
