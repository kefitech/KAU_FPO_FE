import Link from "next/link";

import { Leaf } from "lucide-react";

import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";

import { LoginForm } from "../../_components/login-form";

export default function LoginV1() {
  return (
    <div className="relative flex h-svh items-center justify-center overflow-hidden bg-background p-4">
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>
      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl shadow-lg lg:grid-cols-2">
        {/* Left — Form */}
        <div className="flex flex-col gap-6 bg-card p-8">
          <Link href="/" className="flex items-center gap-2 font-medium">
            <div className="flex size-6 items-center justify-center rounded-md bg-green-600 text-white">
              <Leaf className="size-4" />
            </div>
            KAU-FPO Platform
          </Link>

          <div className="flex flex-col gap-1">
            <h1 className="font-bold text-2xl">Login to your account</h1>
            <p className="text-muted-foreground text-sm">Enter your email below to login to your account</p>
          </div>

          <LoginForm />

          <p className="text-center text-muted-foreground text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="underline underline-offset-4 hover:text-foreground">
              Sign up
            </Link>
          </p>
        </div>

        {/* Right — Branding panel */}
        <div className="hidden flex-col items-center justify-center gap-6 bg-green-700 p-10 text-white lg:flex">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
            <Leaf className="h-7 w-7 text-white" />
          </div>
          <div className="text-center">
            <h2 className="font-bold text-2xl leading-snug">
              Empowering Farmers,
              <br />
              Growing Together
            </h2>
            <p className="mt-3 max-w-xs text-green-100 text-sm">
              Connect with Kerala Agricultural University's digital ecosystem for smarter farming decisions across all
              14 districts.
            </p>
          </div>
          <div className="grid w-full grid-cols-2 gap-3 text-center">
            <div className="rounded-xl bg-white/10 p-3">
              <p className="font-bold text-xl">120+</p>
              <p className="text-green-100 text-xs">FPOs Registered</p>
            </div>
            <div className="rounded-xl bg-white/10 p-3">
              <p className="font-bold text-xl">18,000+</p>
              <p className="text-green-100 text-xs">Farmers Connected</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
