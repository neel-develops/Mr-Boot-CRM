"use server";

import Groq from "groq-sdk";
import { prisma } from "@/lib/prisma";

const apiKey = process.env.GROQ_API_KEY || "";

export async function askAssistant(chatHistory: Array<{ role: "user" | "assistant"; content: string }>) {
  try {
    if (!apiKey) {
      return {
        success: false,
        error: "GROQ_API_KEY is not configured in the environment variables.",
      };
    }

    const groq = new Groq({ apiKey });

    // 1. Fetch live grounding data from Neon Postgres
    const totalOrders = await prisma.order.count();
    const totalCustomers = await prisma.customer.count();
    const inventory = await prisma.inventory.findMany();
    const lowStockItems = inventory.filter((i) => i.stockQty <= i.reorderThreshold);

    const revenueAggregate = await prisma.invoice.aggregate({
      _sum: { amount: true },
    });
    const totalRevenue = Number(revenueAggregate._sum.amount || 0);

    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { customer: true },
    });

    // 2. Format live data context
    const dbContext = {
      timestamp: new Date().toISOString(),
      businessName: "Mr. Boot Luxury Shoe Care",
      metrics: {
        totalOrders,
        totalCustomers,
        totalRevenue: `₹${totalRevenue.toLocaleString("en-IN")}`,
        lowStockItemsCount: lowStockItems.length,
      },
      lowStockInventoryList: lowStockItems.map((i) => ({
        name: i.itemName,
        stock: i.stockQty,
        minThreshold: i.reorderThreshold,
      })),
      recentOrders: recentOrders.map((o) => ({
        id: o.id.slice(-6).toUpperCase(),
        item: o.itemType,
        service: o.serviceType,
        customerName: `${o.customer.firstName} ${o.customer.lastName}`,
        status: o.status,
        dueDate: o.dueDate.toLocaleDateString("en-IN"),
      })),
    };

    // 3. Construct Groq prompt
    const systemPrompt = `
You are Mr. Boot AI Intelligence Assistant, a helpful concierge and strategist.
You have access to live database metrics for the business. Ground all financial stats, stock queries, and customer metrics in the following JSON data.
NEVER make up or hallucinate any numbers. If you do not have data in the context to answer a specific query, state that you don't have access to that specific table.

Live Database Context:
${JSON.stringify(dbContext, null, 2)}

Provide clear, formatted Markdown answers. Keep suggestions actionable.
`;

    // 4. Send chat completion request
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        ...chatHistory.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      ],
      temperature: 0.2,
      max_tokens: 1024,
    });

    const reply = response.choices[0]?.message?.content || "I am sorry, I couldn't compute a response.";

    return { success: true, reply };
  } catch (error: any) {
    console.error("Groq assistant API error:", error);
    return { success: false, error: error.message };
  }
}
