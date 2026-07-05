import React from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { OrderDetailWorkspace } from "@/components/orders/order-detail-workspace";

interface OrderDetailPageProps {
  params: {
    id: string;
  };
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const orderId = params.id;

  // 1. Fetch Order details
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: true,
      items: true,
      invoices: true,
      publicOrderLinks: true,
      addons: { orderBy: { createdAt: "asc" } },
      activityLogs: {
        orderBy: { timestamp: "desc" },
      },
    },
  });

  if (!order) {
    notFound();
  }

  // 2. Fetch staff members
  const staff = await prisma.staff.findMany({
    orderBy: { name: "asc" },
  });

  // 3. Fetch settings singleton
  let settings = await prisma.settings.findUnique({
    where: { id: "singleton" },
  });

  if (!settings) {
    settings = {
      id: "singleton",
      orgName: "Mr. Boot",
      orgPhone: "",
      orgEmail: "",
      orgAddress: "",
      billReadyTemplate: "Hi {{customer_first_name}}, Neel Sonawane here from Mr Boot. Your bill is ready: {{invoice_pdf_or_track_link}}",
      reviewRequestTemplate: "Hi {{customer_first_name}}, hope you're loving your {{item_type}}! Would mean a lot if you could leave us a quick review: {{google_review_link}}",
      googleReviewLink: "https://g.page/r/your-google-review-link",
      darkMode: false,
      updatedAt: new Date(),
    };
  }

  // 4. Fetch inventory items for addons picker
  const inventoryItems = await prisma.inventory.findMany({
    orderBy: { itemName: "asc" },
    select: { id: true, itemName: true, unitCost: true },
  });

  // Attach inventory items to order object for workspace
  const orderWithExtras = { ...order, inventoryItems };

  return (
    <div className="w-full max-w-[1200px] px-4 md:px-gutter mx-auto py-4">
      {/* Page Header */}
      <header className="mb-6">
        <h2 className="text-headline-lg font-headline-lg text-primary dark:text-primary-fixed">Order Fulfill Workspace</h2>
        <p className="text-on-surface-variant font-body-md text-body-md">
          Track service intake logs, upload proof photos, and message customer.
        </p>
      </header>

      {/* Interactive detail workspace */}
      <OrderDetailWorkspace order={orderWithExtras} staff={staff} settings={settings} />
    </div>
  );
}
export const dynamic = 'force-dynamic';
