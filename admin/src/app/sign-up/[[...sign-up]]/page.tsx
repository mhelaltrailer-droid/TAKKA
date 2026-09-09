import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AppSignUpForm } from "@/components/auth/app-sign-up-form";
import { isClerkConfigured } from "@/lib/clerk";
import { getTakkaSurface } from "@/lib/surface";

export default async function SignUpPage() {
  const headerStore = await headers();
  const surface = getTakkaSurface(headerStore.get("host"));

  if (surface === "admin") {
    redirect("/sign-in");
  }

  if (!isClerkConfigured) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6 py-16">
        <div className="w-full max-w-md border border-[#ead9c8] bg-white p-6 text-center">
          <h1 className="text-2xl font-bold">Clerk غير مفعّل بعد</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6 py-16">
      <div className="w-full max-w-md border border-[#ead9c8] bg-white p-6 shadow-sm">
        <div className="mb-6 space-y-2 text-center">
          <h1 className="text-2xl font-bold">إنشاء حساب</h1>
          <p className="text-sm leading-7 text-[#6b4a3a]">
            أدخل رقم هاتفك المصري والاسم والإيميل. رمز التأكيد سيصل على البريد
            الإلكتروني.
          </p>
        </div>
        <AppSignUpForm />
      </div>
    </main>
  );
}
