import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
}

export const MenuDisplay = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const { data, error } = await supabase
          .from("menu_items")
          .select("*")
          .order("category")
          .order("name");

        if (error) throw error;

        setMenuItems(data || []);
        const uniqueCategories = [...new Set(data?.map((item) => item.category) || [])];
        setCategories(uniqueCategories);
      } catch (error) {
        console.error("Error fetching menu:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-primary mb-2">Our Delicious Menu</h2>
        <p className="text-muted-foreground">Freshly baked with love, every single day</p>
      </div>

      {categories.map((category) => (
        <div key={category} className="space-y-4">
          <div className="flex items-center gap-3">
            <h3 className="text-2xl font-semibold text-primary">{category}</h3>
            <Badge variant="secondary">{menuItems.filter(item => item.category === category).length} items</Badge>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {menuItems
              .filter((item) => item.category === category)
              .map((item) => (
                <Card key={item.id} className="hover:shadow-glow transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <CardDescription className="text-sm">{item.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-accent">₹{item.price}</span>
                      <Badge className="bg-primary">{category}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
};
