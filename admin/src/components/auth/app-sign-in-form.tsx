"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { FormEvent, useState } from "react";

export function AppSignInForm() {
  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLoaded || !signIn) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await signIn.create({
        identifier: email.trim(),
        password,
      });

      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        // /dashboard redirects to role-setup when role is not chosen yet.
        router.push("/dashboard");
        router.refresh();
        return;
      }

      setError("تعذر إكمال تسجيل الدخول.");
    } catch (err) {
      setError(extractClerkError(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block space-y-2 text-sm font-medium">
        <span>البريد الإلكتروني</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-2xl border border-[#ead9c8] bg-white px-4 py-3"
          placeholder="name@email.com"
          required
        />
      </label>
      <label className="block space-y-2 text-sm font-medium">
        <span>كلمة المرور</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-2xl border border-[#ead9c8] bg-white px-4 py-3"
          required
        />
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-[var(--brand-primary)] px-4 py-3 font-semibold text-white transition hover:bg-[var(--brand-secondary)] disabled:opacity-60"
      >
        {isSubmitting ? "جارٍ الدخول..." : "تسجيل الدخول"}
      </button>
      <p className="text-center text-sm text-[#6b4a3a]">
        ليس لديك حساب؟{" "}
        <Link href="/sign-up" className="font-semibold text-[var(--brand-secondary)]">
          إنشاء حساب
        </Link>
      </p>
    </form>
  );
}

function extractClerkError(error: unknown): string {
  if (
    typeof error === "object" &&
    error &&
    "errors" in error &&
    Array.isArray((error as { errors: Array<{ message?: string }> }).errors)
  ) {
    return (
      (error as { errors: Array<{ message?: string }> }).errors[0]?.message ||
      "تعذر تسجيل الدخول."
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "تعذر تسجيل الدخول.";
}
