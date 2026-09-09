"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSignUp } from "@clerk/nextjs";
import { FormEvent, useState } from "react";

import {
  normalizeEgyptianPhone,
  phoneValidationMessage,
} from "@/lib/phone";

type Step = "details" | "verify";

export function AppSignUpForm() {
  const router = useRouter();
  const { isLoaded, signUp, setActive } = useSignUp();
  const [step, setStep] = useState<Step>("details");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleDetailsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLoaded || !signUp) {
      return;
    }

    const phoneError = phoneValidationMessage(phone);
    if (phoneError) {
      setError(phoneError);
      return;
    }

    if (fullName.trim().length < 3) {
      setError("الاسم مطلوب بالكامل.");
      return;
    }

    if (password.length < 15) {
      setError("كلمة المرور يجب أن تكون 15 حرفًا على الأقل.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const localPhone = normalizeEgyptianPhone(phone);
      const [firstName, ...rest] = fullName.trim().split(/\s+/);
      const lastName = rest.join(" ") || "-";

      await signUp.create({
        emailAddress: email.trim(),
        password,
        firstName,
        lastName,
        unsafeMetadata: {
          egyptianPhone: localPhone,
        },
      });

      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });

      setStep("verify");
    } catch (err) {
      setError(extractClerkError(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLoaded || !signUp) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: code.trim(),
      });

      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        router.push("/role-setup");
        router.refresh();
        return;
      }

      setError("لم يكتمل التحقق بعد. تأكد من الرمز وحاول مجددًا.");
    } catch (err) {
      setError(extractClerkError(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (step === "verify") {
    return (
      <form onSubmit={handleVerifySubmit} className="space-y-4">
        <p className="text-sm leading-7 text-[#6b4a3a]">
          أرسلنا رمز التأكيد إلى بريدك الإلكتروني. أدخله لإكمال إنشاء الحساب.
        </p>
        <label className="block space-y-2 text-sm font-medium">
          <span>رمز التأكيد</span>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="w-full rounded-2xl border border-[#ead9c8] bg-white px-4 py-3"
            placeholder="123456"
            required
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[var(--brand-primary)] px-4 py-3 font-semibold text-white transition hover:bg-[var(--brand-secondary)] disabled:opacity-60"
        >
          {isSubmitting ? "جارٍ التحقق..." : "تأكيد الحساب"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleDetailsSubmit} className="space-y-4">
      <label className="block space-y-2 text-sm font-medium">
        <span>الاسم الكامل</span>
        <input
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          className="w-full rounded-2xl border border-[#ead9c8] bg-white px-4 py-3"
          placeholder="محمد حسن"
          required
        />
      </label>
      <label className="block space-y-2 text-sm font-medium">
        <span>رقم الهاتف المصري</span>
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className="w-full rounded-2xl border border-[#ead9c8] bg-white px-4 py-3"
          placeholder="01111989094"
          inputMode="numeric"
          required
        />
      </label>
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
          placeholder="15 حرفًا على الأقل"
          required
        />
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-[var(--brand-primary)] px-4 py-3 font-semibold text-white transition hover:bg-[var(--brand-secondary)] disabled:opacity-60"
      >
        {isSubmitting ? "جارٍ إنشاء الحساب..." : "متابعة"}
      </button>
      <p className="text-center text-sm text-[#6b4a3a]">
        لديك حساب بالفعل؟{" "}
        <Link href="/sign-in" className="font-semibold text-[var(--brand-secondary)]">
          تسجيل الدخول
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
      "تعذر إنشاء الحساب."
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "تعذر إنشاء الحساب.";
}
