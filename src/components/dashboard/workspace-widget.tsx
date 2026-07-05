import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';

export default async function WorkspaceWidget() {
  const pendingCount = await prisma.order.count({
    where: {
      status: { in: ['RECEIVED', 'IN_PROGRESS'] }
    }
  });

  const upcomingOrders = await prisma.order.findMany({
    where: {
      status: { not: 'DELIVERED' }
    },
    orderBy: {
      dueDate: 'asc'
    },
    take: 2,
    include: { customer: true }
  });

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-IN', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    }).format(date);
  };

  const getDayLabel = (date: Date) => {
    const today = new Date();
    // Convert current time to IST for accurate today/tomorrow matching
    const todayISTStr = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short' }).format(today);
    const dateISTStr = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short' }).format(date);
    
    if (dateISTStr === todayISTStr) return "Today";
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowISTStr = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short' }).format(tomorrow);
    
    if (dateISTStr === tomorrowISTStr) return "Tomorrow";
    
    return new Intl.DateTimeFormat('en-IN', { weekday: 'long', timeZone: 'Asia/Kolkata' }).format(date);
  };

  return (
    <div className="bg-[#F8F6F2] rounded-3xl p-6 shadow-sm flex flex-col gap-6 relative border border-black/5 w-full max-w-sm mx-auto overflow-hidden text-[#361f1a]">
      {/* Background grain/texture effect if desired, but flat is also fine */}
      
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-full border border-black/10 overflow-hidden flex items-center justify-center relative p-1 shadow-sm">
            <Image 
              src="/logo.png" 
              alt="Mr. Boot Logo" 
              fill
              className="object-contain p-1"
            />
          </div>
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold leading-none tracking-tight">Mr. Boot</h2>
            <span className="text-[11px] font-semibold tracking-widest text-[#7D6B63] mt-1">WORKSPACE</span>
          </div>
        </div>
        <button className="text-[#361f1a] opacity-60 hover:opacity-100 transition-opacity p-2">
          <span className="material-symbols-outlined text-[20px]">refresh</span>
        </button>
      </div>

      {/* Pending Orders */}
      <div className="flex flex-col gap-2 mt-2">
        <div className="flex items-center gap-2 text-[#6D5D55]">
          <span className="material-symbols-outlined text-[#C89B3C] text-[20px]">inventory_2</span>
          <span className="text-[12px] font-bold tracking-wider">PENDING ORDERS</span>
        </div>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-5xl font-black tracking-tight">{pendingCount}</span>
          <span className="text-[#6D5D55] text-lg font-medium">in workshop</span>
        </div>
      </div>

      {/* Upcoming Deliveries */}
      <div className="flex flex-col gap-4 mt-2 relative z-10">
        <div className="flex items-center gap-2 text-[#6D5D55]">
          <span className="material-symbols-outlined text-[18px]">schedule</span>
          <span className="text-[12px] font-bold tracking-wider">UPCOMING DELIVERIES</span>
        </div>

        <div className="flex flex-col gap-4 relative">
          {/* Vertical line connecting nodes */}
          <div className="absolute left-[11px] top-4 bottom-4 w-[1px] bg-[#E0D8CC] -z-10"></div>
          
          {upcomingOrders.length === 0 ? (
            <p className="text-sm text-[#7D6B63] pl-8">No upcoming deliveries.</p>
          ) : (
            upcomingOrders.map((order, idx) => (
              <div key={order.id} className="flex gap-4">
                {/* Node marker */}
                <div className="mt-1 relative">
                  <div className={`w-[23px] h-[23px] rounded-full flex items-center justify-center border-2 border-[#F8F6F2] ${idx === 0 ? 'bg-[#D6F0E0]' : 'bg-[#FFF3D6]'}`}>
                    <div className={`w-[7px] h-[7px] rounded-full ${idx === 0 ? 'bg-[#299854]' : 'bg-[#E5B53A]'}`}></div>
                  </div>
                </div>

                {/* Card */}
                <div className="flex-1 bg-[#F1EBE0] rounded-xl p-4 flex flex-col gap-1.5 shadow-sm border border-white/40">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-[#361f1a]">
                      {getDayLabel(order.dueDate)}, {formatTime(order.dueDate)}
                    </span>
                    <span className="text-sm font-medium text-[#6D5D55]">
                      ₹{Number(order.price).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-base text-[#361f1a]">{order.customer.firstName} {order.customer.lastName}</span>
                    <span className="text-[13px] text-[#6D5D55]">{order.serviceType} {order.itemType ? `(${order.itemType})` : ''}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* CTA Button */}
      <Link href="/orders/new" className="mt-4 w-full bg-[#4A332D] text-white rounded-xl py-4 px-6 flex items-center justify-center gap-2 hover:bg-[#361f1a] transition-colors shadow-md">
        <span className="material-symbols-outlined text-[22px]">add_circle</span>
        <span className="font-semibold tracking-wide text-sm">NEW ORDER</span>
      </Link>
    </div>
  );
}
