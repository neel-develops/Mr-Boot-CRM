import React from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";
import { PhotoCarousel } from "./photo-carousel";

interface PublicTrackingPageProps {
  params: {
    token: string;
  };
}

export default async function PublicTrackingPage({ params }: PublicTrackingPageProps) {
  const token = params.token;

  const publicLink = await prisma.publicOrderLink.findUnique({
    where: { token },
    include: {
      order: {
        include: {
          customer: true,
          items: true,
          invoices: true,
          activityLogs: {
            orderBy: { timestamp: "desc" },
          },
        },
      },
    },
  });

  if (!publicLink) {
    notFound();
  }

  const order = publicLink.order;
  const status = order.status;
  const statusSteps = [OrderStatus.RECEIVED, OrderStatus.IN_PROGRESS, OrderStatus.READY, OrderStatus.DELIVERED];
  const currentStepIndex = statusSteps.indexOf(status);

  // Collect all photos: main photo + additionalPhotos from all items
  const allPhotos: string[] = [];
  order.items.forEach((item: any) => {
    if (item.photoUrl) allPhotos.push(item.photoUrl);
    if (Array.isArray(item.additionalPhotos)) {
      allPhotos.push(...item.additionalPhotos.filter(Boolean));
    }
  });

  const shopWa = process.env.NEXT_PUBLIC_CONCIERGE_WA || "919028983659";

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-[#fdf8f5] to-[#f5ede8] flex flex-col font-body-md antialiased pb-20">
      {/* Top Header with Mr Boot Logo */}
      <header className="w-full bg-white/80 backdrop-blur-xl border-b border-black/5 py-4 shadow-sm">
        <div className="max-w-3xl mx-auto px-6 flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Mr. Boot Logo"
            className="w-10 h-10 rounded-full object-cover border border-black/5"
          />
          <div>
            <span className="font-bold text-[#4e342e] text-lg block leading-none">Mr. Boot</span>
            <span className="text-xs text-zinc-400 font-medium tracking-widest uppercase">Luxury Shoe Care</span>
          </div>
        </div>
      </header>

      {/* Main Panel */}
      <main className="flex-grow max-w-3xl mx-auto w-full px-4 pt-8">
        <div className="w-full bg-white/70 backdrop-blur-xl border border-white/30 shadow-lg rounded-3xl p-6 md:p-8 flex flex-col gap-8 relative overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute -right-24 -top-24 w-72 h-72 bg-[#4e342e]/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-24 -bottom-24 w-72 h-72 bg-amber-200/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="text-center space-y-2 relative z-10">
            <h1 className="text-3xl font-bold text-[#4e342e]">
              Welcome, {order.customer.firstName} 👋
            </h1>
            <p className="text-zinc-500 text-base">
              Order{" "}
              <span className="font-bold text-[#4e342e]">
                #{order.invoices[0]?.invoiceNumber || `MB-${order.id.slice(-6).toUpperCase()}`}
              </span>{" "}
              is being tracked in real time.
            </p>
          </div>

          {/* Progress Tracker */}
          <div className="relative w-full pt-4 pb-2">
            <div className="absolute top-[22px] left-[calc(1/6*100%)] right-[calc(1/6*100%)] h-[2px] bg-black/5" />
            <div
              className="absolute top-[22px] left-[calc(1/6*100%)] h-[2px] bg-[#4e342e] transition-all duration-1000"
              style={{
                width: currentStepIndex === 0 ? "0%" : currentStepIndex === 1 ? "33%" : currentStepIndex >= 2 ? "66%" : "100%",
              }}
            />
            <div className="flex justify-around items-start w-full">
              {[
                { label: "Received", icon: "inventory_2", step: 0 },
                { label: "Workshop", icon: "construction", step: 1 },
                { label: "Ready", icon: "check_circle", step: 2 },
                { label: "Delivered", icon: "local_shipping", step: 3 },
              ].map(({ label, icon, step }) => (
                <div key={step} className="flex flex-col items-center gap-2 flex-1">
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center shadow-md transition-all duration-500 ${
                      currentStepIndex >= step
                        ? "bg-[#4e342e] text-white scale-105"
                        : "bg-white text-zinc-400 border border-zinc-200"
                    } ${currentStepIndex === step ? "ring-4 ring-[#4e342e]/20" : ""}`}
                  >
                    <span className="material-symbols-outlined text-[18px]">{icon}</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold text-center leading-tight ${
                      currentStepIndex >= step ? "text-[#4e342e]" : "text-zinc-400"
                    }`}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Status pill */}
          <div className="flex justify-center -mt-4">
            <span className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase border ${
              status === OrderStatus.DELIVERED
                ? "bg-zinc-100 text-zinc-500 border-zinc-200"
                : status === OrderStatus.READY
                ? "bg-green-50 text-green-700 border-green-200 animate-pulse"
                : status === OrderStatus.IN_PROGRESS
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-blue-50 text-blue-700 border-blue-200"
            }`}>
              {status.replace(/_/g, " ")}
            </span>
          </div>

          {order.isPorter && (
            <div className="flex items-center gap-3 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
              <span className="material-symbols-outlined text-amber-600 text-[24px]">local_shipping</span>
              <div>
                <p className="text-sm font-bold text-[#4e342e]">Pick & Drop Service Active</p>
                <p className="text-xs text-zinc-500">Your order is scheduled for Pick & Drop via Porter courier.</p>
              </div>
            </div>
          )}

          <hr className="border-black/5 w-full" />

          {/* Service Details */}
          <div>
            <h2 className="text-[#4e342e] font-bold text-lg mb-4">Service Details</h2>
            <div className="flex flex-col gap-4">
              {order.items.map((item: any) => (
                <div
                  key={item.id}
                  className="flex flex-col md:flex-row gap-4 p-4 rounded-2xl bg-white/60 border border-black/5 hover:-translate-y-0.5 transition-all shadow-sm"
                >
                  {item.photoUrl && (
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-zinc-100 shrink-0 border border-black/5">
                      <img src={item.photoUrl} alt="Item photo" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex flex-col flex-grow justify-center gap-1.5">
                    <h3 className="font-bold text-[#4e342e] text-base">
                      {item.brand ? `${item.brand} ${item.model}` : item.category}
                    </h3>
                    {Array.isArray(item.services) && item.services.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.services.map((srv: string, i: number) => (
                          <span key={i} className="text-[10px] font-semibold bg-[#4e342e]/10 text-[#4e342e] px-2 py-0.5 rounded-full">
                            {srv}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center md:items-end justify-start md:justify-end shrink-0">
                    <span className={`px-3 py-1 rounded-full font-bold text-xs ${
                      status === OrderStatus.DELIVERED ? "bg-zinc-100 text-zinc-600" : "bg-[#4e342e]/10 text-[#4e342e]"
                    }`}>
                      {status === OrderStatus.DELIVERED ? "Completed ✓" : "In Progress"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Photo Carousel — only if photos exist */}
          {allPhotos.length > 0 && <PhotoCarousel photos={allPhotos} />}

          {/* Activity Timeline */}
          {order.activityLogs && order.activityLogs.length > 0 && (
            <div>
              <h2 className="text-[#4e342e] font-bold text-base mb-4 uppercase tracking-wider text-sm">Activity Timeline</h2>
              <div className="relative pl-6 space-y-4 before:absolute before:inset-y-0 before:left-2 before:w-px before:bg-black/5">
                {order.activityLogs.slice(0, 5).map((log: any, idx: number) => (
                  <div key={log.id || idx} className="relative flex gap-3">
                    <div className="absolute -left-6 w-3 h-3 rounded-full bg-[#4e342e] border-2 border-white top-1 z-10" />
                    <div>
                      <p className="text-sm font-semibold text-zinc-800">{log.event}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {new Date(log.timestamp).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contact Support */}
          <div className="flex justify-center pt-2">
            <a
              href={`https://wa.me/${shopWa}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#4e342e] text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-[#3b2720] transition-all shadow-md flex items-center gap-2 text-sm"
            >
              <span className="material-symbols-outlined text-[18px]">support_agent</span>
              Contact Mr. Boot Concierge
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

export const dynamic = "force-dynamic";