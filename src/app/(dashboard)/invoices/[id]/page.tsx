import React from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ReceiptView } from "@/components/invoices/receipt-view";
import QRCode from "qrcode";

interface InvoicePageProps {
  params: {
    id: string;
  };
}

interface ServiceItem {
  type: "item" | "addon";
  title: string;
  price: number;
  description?: string;
  services?: string[];
}

export default async function InvoicePage({ params }: InvoicePageProps) {
  const orderId = params.id;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: true,
      items: true,
      invoices: true,
      publicOrderLinks: true,
      addons: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!order || order.invoices.length === 0) {
    notFound();
    return null;
  }

  const invoice = order.invoices[0];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mr-boot-crm.vercel.app";
  const token = order.publicOrderLinks[0]?.token || "";
  const trackingUrl = `${appUrl}/track/${token}`;

  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });

  const phone = order.customer.phone.replace(/[^0-9]/g, "");
  const baseMessage =
    settings?.billReadyTemplate ||
    "Hi {{customer_first_name}}, Neel Sonawane here from Mr Boot. Your bill is ready: {{invoice_pdf_or_track_link}}";
  const message = baseMessage
    .replace("{{customer_first_name}}", order.customer.firstName)
    .replace("{{invoice_pdf_or_track_link}}", trackingUrl);
  const waShareUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  // Main photo from first item that has one
  const mainPhotoUrl = order.items.find((item) => item.photoUrl)?.photoUrl ?? null;

  const formattedOrderDate = new Date(order.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const balanceDue = Number(invoice.balanceDue);
  const paymentStatus = balanceDue <= 0 ? "Paid" : "Pending";

  // Addons typed properly by double-casting to bypass TS2352
  const addons = (order.addons as any) as Array<{
    id: string;
    itemName: string;
    qty: number;
    unitCost: number | string;
    totalCost: number | string;
  }>;

  // Generate QR code server side
  let qrCodeDataUrl = "";
  try {
    qrCodeDataUrl = await QRCode.toDataURL(trackingUrl, {
      margin: 1,
      width: 150,
      errorCorrectionLevel: "H",
    });
  } catch (err) {
    console.error("Failed to generate QR code:", err);
    qrCodeDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(trackingUrl)}`;
  }

  // Group items and addons into a single list of service rows
  const itemsList: ServiceItem[] = order.items.map((item) => {
    // Order stores total price. We divide total price equally among items.
    const itemPrice = Number(order.price) / (order.items.length || 1);
    return {
      type: "item" as const,
      title: item.brand
        ? `${item.brand} ${item.model || item.category}`
        : item.model || item.category,
      price: itemPrice,
      description: item.description || undefined,
      services: item.services,
    };
  });

  const addonsList: ServiceItem[] = addons.map((addon) => ({
    type: "addon" as const,
    title: addon.itemName,
    price: Number(addon.totalCost),
    description: `Qty: ${addon.qty} @ ₹${Number(addon.unitCost)} each`,
  }));

  const allServices = [...itemsList, ...addonsList];

  // Pricing calculations
  const subtotal = allServices.reduce((sum, item) => sum + item.price, 0);
  const total = Number(invoice.amount);

  return (
    <div className="w-full min-h-screen bg-[#faf9f6] flex flex-col items-center justify-start py-8 px-4 font-sans">
      <ReceiptView
        order={order}
        invoice={invoice}
        trackingUrl={trackingUrl}
        waShareUrl={waShareUrl}
        mainPhotoUrl={mainPhotoUrl}
        formattedOrderDate={formattedOrderDate}
        paymentStatus={paymentStatus}
        balanceDue={balanceDue}
        subtotal={subtotal}
        total={total}
        qrCodeDataUrl={qrCodeDataUrl}
        allServices={allServices}
      />
    </div>
  );
}

export const dynamic = "force-dynamic";
