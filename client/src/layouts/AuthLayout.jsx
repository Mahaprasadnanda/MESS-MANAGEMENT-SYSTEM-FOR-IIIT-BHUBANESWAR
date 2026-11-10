import { ShieldCheck, QrCode, CalendarClock, IndianRupee } from 'lucide-react';
import { BrandLogo } from '../components/common/BrandLogo';

export function AuthLayout({ children, heading, subheading }) {
  return (
    <div className="min-h-screen flex bg-[#F7F9F8]">
      {/* Left Branding & Campus Dining Panel */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-[48%] relative overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-emerald-800 p-10 xl:p-14 flex-col justify-between text-white">
        {/* Subtle Decorative Background Circles */}
        <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 -right-24 h-96 w-96 rounded-full bg-emerald-300/10 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <BrandLogo dark subtitle="Campus Dining & Meal Portal" />
        </div>

        <div className="relative z-10 space-y-8 max-w-lg">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-400/30 px-3.5 py-1 text-xs font-semibold text-emerald-200">
              Official IIIT Bhubaneswar Portal
            </span>
            <h1 className="mt-4 text-3xl xl:text-4xl font-extrabold tracking-tight leading-[1.15]">
              Smart, Transparent Campus Mess Management
            </h1>
            <p className="mt-3 text-sm xl:text-base text-emerald-100/80 leading-relaxed">
              Plan your upcoming Monday–Sunday meals, pay securely online, and scan instant digital QR meal coupons at the mess counter.
            </p>
          </div>

          {/* Curated Campus Meal Pricing & Feature Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-4">
              <div className="text-xs font-medium text-emerald-200">Breakfast</div>
              <div className="mt-1 text-2xl font-bold font-mono">₹20</div>
              <div className="mt-1 text-[11px] text-emerald-100/70">7:30 – 9:30 AM</div>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-4">
              <div className="text-xs font-medium text-emerald-200">Lunch</div>
              <div className="mt-1 text-2xl font-bold font-mono">₹55</div>
              <div className="mt-1 text-[11px] text-emerald-100/70">12:30 – 2:30 PM</div>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-4">
              <div className="text-xs font-medium text-emerald-200">Dinner</div>
              <div className="mt-1 text-2xl font-bold font-mono">₹45</div>
              <div className="mt-1 text-[11px] text-emerald-100/70">7:30 – 9:30 PM</div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 text-sm text-emerald-50/90">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                <CalendarClock className="h-4 w-4 text-emerald-300" />
              </div>
              <span>Book next week&apos;s meals anytime before Sunday 11:59 PM IST</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-emerald-50/90">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                <QrCode className="h-4 w-4 text-emerald-300" />
              </div>
              <span>Instant encrypted QR meal coupon generated for every booked meal</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-emerald-50/90">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                <IndianRupee className="h-4 w-4 text-emerald-300" />
              </div>
              <span>Pay only for the meals you select with verified digital receipts</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-emerald-200/70 border-t border-white/10 pt-5">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
            Institutional @iiit-bh.ac.in Access
          </span>
          <span>Gothapatna, Bhubaneswar</span>
        </div>
      </div>

      {/* Right Authentication Form Panel */}
      <div className="flex-1 flex flex-col justify-center px-5 py-10 sm:px-10 lg:px-14">
        <div className="mx-auto w-full max-w-md">
          <div className="lg:hidden mb-8 flex justify-center">
            <BrandLogo subtitle="IIIT Bhubaneswar Campus Dining" />
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card p-7 sm:p-9">
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">{heading}</h2>
              {subheading ? (
                <p className="mt-1.5 text-sm text-slate-500">{subheading}</p>
              ) : null}
            </div>
            {children}
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            IIIT Bhubaneswar Central Mess System · Asia/Kolkata (IST)
          </p>
        </div>
      </div>
    </div>
  );
}
