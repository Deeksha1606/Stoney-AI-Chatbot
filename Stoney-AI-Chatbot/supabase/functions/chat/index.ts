import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatMessage {
  role: string;
  content: string;
}

interface MenuItem {
  name: string;
  category: string;
  price: number;
  description: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationId, orderId } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch menu items
    const { data: menuItems } = await supabase
      .from("menu_items")
      .select("*")
      .order("category");

    // Get conversation history if conversationId exists
    let conversationHistory: ChatMessage[] = [];
    if (conversationId) {
      const { data: messages } = await supabase
        .from("messages")
        .select("role, content")
        .eq("conversation_id", conversationId)
        .order("created_at");
      
      conversationHistory = messages || [];
    }

    // Get current order info if orderId exists
    let orderInfo = "";
    if (orderId) {
      const { data: order } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (*)
        `)
        .eq("id", orderId)
        .single();

      if (order) {
        orderInfo = `\n\nCurrent Order #${order.order_number}:
Status: ${order.status}
Total: ₹${order.total}
Items: ${order.order_items.map((item: any) => `${item.quantity}x ${item.item_name} (₹${item.price})`).join(", ")}`;
      }
    }

    // Get customer info if conversationId exists
    let customerInfo = "";
    if (conversationId) {
      const { data: conversation } = await supabase
        .from("conversations")
        .select("customer_id, customers(*)")
        .eq("id", conversationId)
        .maybeSingle();

      if (conversation?.customer_id) {
        const { data: customer } = await supabase
          .from("customers")
          .select("*")
          .eq("id", conversation.customer_id)
          .single();

        if (customer) {
          customerInfo = `\n\nCustomer Info:
Name: ${customer.name}
Phone: ${customer.phone}
Address: ${customer.address || "Not provided"}`;
        }
      }
    }

    // Build system prompt
    const systemPrompt = `You are SweetBuddy, an AI assistant for "Stoney Cravings" - a premium bakery specializing in cookies, brownies, cakes, and cupcakes.

PERSONALITY: Friendly, warm, and helpful. Use bakery-related language naturally. Be concise but enthusiastic.

MENU (All prices in ₹):
${(menuItems as MenuItem[])?.map(item => 
  `- ${item.name} (${item.category}): ₹${item.price} - ${item.description}`
).join("\n")}

FIRST-TIME FLOW:
- If this is a new conversation and you don't have customer info, ALWAYS ask for their name, phone number, and delivery address BEFORE taking orders
- Use the save_customer intent to store this information
- Be friendly and explain you need these details for order delivery

YOUR CAPABILITIES:
1. NEW ORDER: Create a new order when customer wants to start ordering
2. ADD ITEM: Add items to current order (extract item name & quantity)
3. UPDATE ITEM: Modify quantity of existing items
4. DELETE ITEM: Remove items from order
5. SHOW SUMMARY: Display current order details
6. TRACK ORDER: Check order status by numeric Order ID (e.g., 1001, 1002)
7. MENU: Show available items and prices
8. CUSTOMER INFO: Collect/update name, phone, address

INTENT DETECTION:
- Detect what the customer wants to do
- Extract item names and quantities from natural language
- Validate items against the menu
- Ask for missing information (quantity, address, etc.)
- Order IDs are NUMERIC ONLY (e.g., 1001, not UUIDs)

RESPONSE FORMAT:
Return JSON with this structure:
{
  "intent": "new_order|add_item|update_item|delete_item|show_summary|track_order|show_menu|save_customer|general",
  "message": "Your friendly response to the customer",
  "entities": {
    "item_name": "extracted item name",
    "quantity": extracted_number,
    "customer_name": "name",
    "phone": "phone",
    "address": "address",
    "order_number": numeric_order_id
  }
}

VALIDATION RULES:
- Item names must match menu items (case-insensitive, handle variations)
- Quantities must be positive integers
- For updates/deletes, item must exist in current order
- Always confirm actions with order summary
- Order IDs are numeric (1001, 1002, etc.)

${customerInfo}
${orderInfo}

EXAMPLES:
User: "I want 2 choco chip cookies"
Response: {"intent": "add_item", "message": "Great choice! Adding 2 Chocochip Cookies (₹150 each) to your order. That's ₹300 total for these cookies. Would you like anything else?", "entities": {"item_name": "Chocochip Cookies", "quantity": 2}}

User: "Show me the menu"
Response: {"intent": "show_menu", "message": "Here's our delicious menu! We have Cookies (Chocochip ₹150, Ganache Filled ₹200...), Brownies, Cakes, and Cupcakes. What would you like to order?", "entities": {}}

User: "Track order 1001"
Response: {"intent": "track_order", "message": "Let me check order #1001 for you!", "entities": {"order_number": 1001}}`;

    // Call Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationHistory,
          { role: "user", content: message }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway Error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service unavailable. Please contact support." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI Gateway error: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices[0].message.content;

    // Try to parse JSON response
    let parsedResponse;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = assistantMessage.match(/```json\s*([\s\S]*?)\s*```/) || 
                       assistantMessage.match(/```\s*([\s\S]*?)\s*```/) ||
                       [null, assistantMessage];
      parsedResponse = JSON.parse(jsonMatch[1] || assistantMessage);
    } catch (e) {
      // If not JSON, wrap in general intent
      parsedResponse = {
        intent: "general",
        message: assistantMessage,
        entities: {}
      };
    }

    // Save messages to conversation
    if (conversationId) {
      await supabase.from("messages").insert([
        { conversation_id: conversationId, role: "user", content: message },
        { 
          conversation_id: conversationId, 
          role: "assistant", 
          content: parsedResponse.message,
          metadata: { intent: parsedResponse.intent, entities: parsedResponse.entities }
        }
      ]);
    }

    return new Response(
      JSON.stringify(parsedResponse),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Chat Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        intent: "error",
        message: "I'm having trouble processing that. Could you try again?"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
