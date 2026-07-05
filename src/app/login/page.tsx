"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Redirect to dashboard if session already exists
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push("/");
      }
    });
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMessage(error.message);
      } else if (data.session) {
        router.push("/");
      }
    } catch (err: any) {
      setErrorMessage("An unexpected error occurred. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background min-h-screen font-body-md text-on-surface antialiased overflow-hidden">
      <main className="flex w-full h-screen">
        {/* Left Side: Hero Image & Branding (60%) */}
        <section className="hidden lg:flex lg:w-3/5 relative h-full bg-surface-container-highest">
          {/* Background Image */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAek_y2tN9pIvNmt594LyhRbJcm0P9V_vQuNl6RSGL26EqWGNQkP82g0ilWknJUZzaJn-Wkp-ewy1uNvfIXnThJxH1x997SXjmQ5LdBU1k5WYD-ab5MohAkVVdhzAUfvkefEjVpFEKE1aOGwZIavihjUqnTwr5rKHeS8bMbrU8M7puwBKfZmPLlMlMwsxBs8nV4QcHf0jvnAUjtqVur1sr1zXKGnwJuWZBGRxSIOLBACT5A9XdXRsW2VNW6EN_2accDqZ8Ug2iCFvc')",
            }}
          ></div>
          {/* Glassmorphism Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-transparent flex flex-col justify-end p-12">
            <div className="bg-white/60 backdrop-blur-xl border border-white/20 shadow-md rounded-xl p-8 max-w-xl mb-12 transform transition-transform duration-500 hover:-translate-y-2">
              <h1 className="font-display-lg text-[40px] leading-[48px] font-bold text-primary mb-4 drop-shadow-md">
                Preserving Heritage, One Stitch at a Time.
              </h1>
              <p className="font-body-md text-body-md text-primary/80 max-w-md font-medium">
                The definitive artisan CRM for master cobblers and craftsmen.
              </p>
            </div>
          </div>
        </section>

        {/* Right Side: Login Portal (40%) */}
        <section className="w-full lg:w-2/5 flex flex-col justify-center items-center bg-surface-container px-6 sm:px-12 lg:px-24 h-full relative z-10 shadow-2xl">
          <div className="w-full max-w-md space-y-8">
            {/* Logo & Header */}
            <div className="flex flex-col items-center text-center space-y-6">
              <img
                alt="Mr. Boot Logo"
                className="h-32 w-32 object-contain drop-shadow-lg"
                src="/logo.png"
              />
              <div>
                <h2 className="font-headline-lg text-headline-lg text-primary tracking-tight font-bold">
                  Welcome Back
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant mt-2 font-medium">
                  Sign in to your Artisan workspace.
                </p>
              </div>
            </div>

            {/* Error Alert */}
            {errorMessage && (
              <div className="p-4 bg-error-container/20 border border-error/20 rounded-xl flex gap-3 text-error text-xs leading-relaxed animate-pulse">
                <span className="material-symbols-outlined text-[16px] text-error flex-shrink-0">
                  error
                </span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form className="space-y-6 mt-8" onSubmit={handleLogin}>
              <div className="space-y-4">
                {/* Input Group: Email */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-outline group-focus-within:text-tertiary transition-colors">
                      person
                    </span>
                  </div>
                  <input
                    className="appearance-none rounded-lg relative block w-full px-3 py-3 pl-10 border border-outline-variant bg-surface placeholder-on-surface-variant text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary focus:z-10 font-body-md text-body-md transition-shadow dark:bg-zinc-800 dark:border-zinc-700"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Artisan Email (e.g. sarah@mrboot.com)"
                  />
                </div>

                {/* Input Group: Password */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-outline group-focus-within:text-tertiary transition-colors">
                      lock
                    </span>
                  </div>
                  <input
                    className="appearance-none rounded-lg relative block w-full px-3 py-3 pl-10 border border-outline-variant bg-surface placeholder-on-surface-variant text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary focus:z-10 font-body-md text-body-md transition-shadow dark:bg-zinc-800 dark:border-zinc-700"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                  />
                </div>
              </div>

              <div>
                <button
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent font-semibold text-sm rounded-lg text-white bg-primary hover:opacity-90 active:scale-[0.98] transition-all shadow-md"
                  type="submit"
                  disabled={loading}
                >
                  <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                    <span className="material-symbols-outlined text-white/80 group-hover:text-white transition-colors">
                      login
                    </span>
                  </span>
                  {loading ? "Signing in..." : "Sign In"}
                </button>
              </div>
            </form>

            {/* Footer Links */}
            <div className="mt-8 text-center">
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                Need help?
                <a
                  className="font-bold text-primary hover:underline ml-1"
                  href="mailto:support@mrboot.com"
                >
                  Contact Workshop Admin
                </a>
              </p>
            </div>
          </div>

          {/* Global Footer */}
          <div className="absolute bottom-6 w-full text-center">
            <p className="font-label-sm text-label-sm text-secondary">
              © {new Date().getFullYear()} Mr. Boot Artisan CRM. All rights reserved.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
