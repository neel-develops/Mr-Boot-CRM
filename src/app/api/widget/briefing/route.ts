import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function istDayBounds(now: Date): { start: Date; end: Date } {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const startUtc =
    Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - IST_OFFSET_MS;
  return { start: new Date(startUtc), end: new Date(startUtc + 24 * 60 * 60 * 1000) };
}

// Data + AI one-liner for the "Daily Briefing" home-screen widget.
export async function GET() {
  try {
    const now = new Date();
    const { start, end } = istDayBounds(now);

    const [overdueCount, dueTodayCount, readyCount, inProgressCount, inventory, revenueToday] =
      await Promise.all([
        prisma.order.count({
          where: { status: { not: 'DELIVERED' }, dueDate: { lt: now } }
        }),
        prisma.order.count({
          where: { status: { not: 'DELIVERED' }, dueDate: { gte: now, lt: end } }
        }),
        prisma.order.count({ where: { status: 'READY' } }),
        prisma.order.count({ where: { status: 'IN_PROGRESS' } }),
        prisma.inventory.findMany(),
        prisma.invoice.aggregate({
          _sum: { amount: true },
          where: { createdAt: { gte: start, lt: end } }
        })
      ]);

    const lowStock = inventory.filter((i) => i.stockQty <= i.reorderThreshold);
    const stats = {
      overdueCount,
      dueTodayCount,
      readyCount,
      inProgressCount,
      lowStockCount: lowStock.length,
      lowStockNames: lowStock.slice(0, 3).map((i) => i.itemName),
      revenueToday: Number(revenueToday._sum.amount || 0)
    };

    // Fallback briefing (used when Groq is unavailable) — still useful.
    let briefing = buildFallbackBriefing(stats);
    let source: 'ai' | 'fallback' = 'fallback';

    const apiKey = process.env.GROQ_API_KEY || '';
    if (apiKey) {
      try {
        const groq = new Groq({ apiKey });
        const response = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.7,
          max_tokens: 90,
          messages: [
            {
              role: 'system',
              content:
                'You write the morning briefing line for the owner of Mr. Boot, a luxury shoe-care workshop in India. ' +
                'Given todays stats, write ONE punchy, personality-filled sentence (max 28 words). ' +
                'Priority order: overdue orders, orders due today, ready-for-pickup, low stock, revenue. ' +
                'Skip anything at zero. Use ₹ for money. No emojis, no preamble, no quotes — just the sentence.'
            },
            { role: 'user', content: JSON.stringify(stats) }
          ]
        });
        const aiText = response.choices?.[0]?.message?.content?.trim();
        if (aiText) {
          briefing = aiText.replace(/^["']|["']$/g, '');
          source = 'ai';
        }
      } catch (aiError) {
        console.error('Groq briefing failed, using fallback:', aiError);
      }
    }

    return NextResponse.json(
      {
        briefing,
        source,
        stats: {
          dueToday: dueTodayCount,
          overdue: overdueCount,
          ready: readyCount,
          lowStock: stats.lowStockCount
        },
        generatedAt: now.toISOString()
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error) {
    console.error('Error fetching briefing widget data:', error);
    return NextResponse.json({ error: 'Failed to fetch briefing' }, { status: 500 });
  }
}

function buildFallbackBriefing(stats: {
  overdueCount: number;
  dueTodayCount: number;
  readyCount: number;
  lowStockCount: number;
  lowStockNames: string[];
  revenueToday: number;
}): string {
  const parts: string[] = [];
  if (stats.overdueCount > 0) parts.push(`${stats.overdueCount} overdue`);
  if (stats.dueTodayCount > 0) parts.push(`${stats.dueTodayCount} due today`);
  if (stats.readyCount > 0) parts.push(`${stats.readyCount} ready for pickup`);
  if (stats.lowStockCount > 0)
    parts.push(`${stats.lowStockCount} item${stats.lowStockCount > 1 ? 's' : ''} low on stock`);
  if (parts.length === 0) return 'All clear today — the workshop is fully under control.';
  return `On deck: ${parts.join(', ')}.`;
}
