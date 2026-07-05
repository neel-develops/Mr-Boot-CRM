import React from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";
import { GlassCard } from "@/components/ui/glass-card";

interface PublicTrackingPageProps {
  params: {
    token: string;
  };
}

export default async function PublicTrackingPage({ params }: PublicTrackingPageProps) {
  const token = params.token;

  // 1. Fetch public link from database
  const publicLink = await prisma.publicOrderLink.findUnique({
    where: { token },
    include: {
      order: {
        include: {
          customer: true,
          items: true,
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

  // Check progress step index
  const statusSteps = [OrderStatus.RECEIVED, OrderStatus.IN_PROGRESS, OrderStatus.READY, OrderStatus.DELIVERED];
  const currentStepIndex = statusSteps.indexOf(status);

  return (
    <div className="w-full min-h-screen bg-background flex flex-col font-body-md antialiased pb-20">
      {/* Top Header */}
      <header className="w-full bg-white/65 backdrop-blur-xl border-b border-black/5 py-4">
        <div className="max-w-3xl mx-auto px-6 flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold">MB</span>
          <span className="font-headline-lg text-lg font-bold text-primary">Mr. Boot Concierge</span>
        </div>
      </header>

      {/* Main Panel */}
      <main className="flex-grow max-w-3xl mx-auto w-full px-6 pt-12">
        <div className="w-full bg-white/65 backdrop-blur-xl border border-white/22 shadow-md rounded-2xl p-8 flex flex-col gap-8 relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary-container/5 rounded-full blur-3xl pointer-events-none"></div>

          {/* Header */}
          <div className="text-center space-y-2 relative z-10">
            <h1 className="font-display-lg text-display-lg text-primary">
              Welcome, {order.customer.firstName}
            </h1>
            <p className="text-on-surface-variant text-lg">
              Order ID: <span className="font-semibold text-primary">#MB-{order.id.slice(-6).toUpperCase()}</span>
            </p>
          </div>

          {/* Progress Tracker bar */}
          <div className="relative w-full pt-8 pb-4">
            <div className="absolute top-1/2 left-0 w-full h-[2px] bg-black/5 -z-10 translate-y-[-50%]"></div>
            <div
              className="absolute top-1/2 left-0 h-[2px] bg-primary -z-10 translate-y-[-50%] transition-all duration-1000"
              style={{
                width: `${currentStepIndex === 0 ? 15 : currentStepIndex === 1 ? 50 : 100}%`,
              }}
            ></div>
            <div className="flex justify-between items-center w-full">
              {/* Step 1: Intake */}
              <div className="flex flex-col items-center gap-2 w-1/3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-colors ${
                    currentStepIndex >= 0 ? "bg-primary text-white" : "bg-surface-container-high text-on-surface-variant border"
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                </div>
                <span className={`font-label-sm text-label-sm font-bold ${currentStepIndex >= 0 ? "text-primary" : "text-on-surface-variant"}`}>
                  Intake
                </span>
              </div>

              {/* Step 2: Workshop */}
              <div className="flex flex-col items-center gap-2 w-1/3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-colors ${
                    currentStepIndex >= 1 ? "bg-primary text-white" : "bg-surface-container-high text-on-surface-variant border"
                  } ${currentStepIndex === 1 ? "status-pulse" : ""}`}
                >
                  <span className="material-symbols-outlined text-[20px]">construction</span>
                </div>
                <span className={`font-label-sm text-label-sm font-bold ${currentStepIndex >= 1 ? "text-primary" : "text-on-surface-variant"}`}>
                  Workshop
                </span>
              </div>

              {/* Step 3: Ready */}
              <div className="flex flex-col items-center gap-2 w-1/3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-colors ${
                    currentStepIndex >= 2 ? "bg-primary text-white" : "bg-surface-container-high text-on-surface-variant border"
                  } ${currentStepIndex === 2 ? "status-pulse" : ""}`}
                >
                  <span className="material-symbols-outlined text-[20px]">check_circle</span>
                </div>
                <span className={`font-label-sm text-label-sm font-bold ${currentStepIndex >= 2 ? "text-primary" : "text-on-surface-variant"}`}>
                  Ready for Pickup
                </span>
              </div>
            </div>
          </div>

          <hr className="border-black/5 w-full" />

          {/* Service Details */}
          <div>
            <h2 className="font-headline-lg text-headline-lg text-primary mb-6">Service Details</h2>
            <div className="flex flex-col gap-4">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col md:flex-row gap-4 p-4 rounded-xl bg-white/40 border border-black/5 hover:-translate-y-0.5 transition-all"
                >
                  {item.photoUrl && (
                    <div className="w-24 h-24 rounded-lg overflow-hidden bg-surface-container-high shrink-0 shadow-inner">
                      <img src={item.photoUrl} alt="Item photo" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex flex-col flex-grow justify-center gap-1">
                    <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-primary">
                      {item.brand ? `${item.brand} ${item.model}` : item.category}
                    </h3>
                    <div className="flex items-center gap-2 text-on-surface-variant text-sm">
                      <span className="material-symbols-outlined text-[18px]">cleaning_services</span>
                      {item.services.join(" • ")}
                    </div>
                  </div>
                  <div className="flex items-center md:items-end justify-center md:justify-end">
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-label-sm text-label-sm">
                      {order.status === OrderStatus.DELIVERED ? "Completed" : "Restoring"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Support */}
          <div className="mt-4 flex justify-center">
            <a
              href={`https://wa.me/${process.env.NEXT_PUBLIC_CONCIERGE_WA || "+919876543210"}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-primary text-on-primary px-8 py-3.5 rounded-lg font-label-sm text-label-sm hover:opacity-95 transition-opacity shadow-md flex items-center gap-2"
            >
              <span className="material-symbols-outlined">support_agent</span>
              Contact Mr. Boot Concierge
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
export const dynamic = 'force-dynamic';
