"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { FormEvent, useState } from "react";

import { PasswordField } from "@/components/auth/password-field";

type View = "signin" | "forgot" | "reset";

export function AppSignInForm() {
  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();
  const [view, setView] = useState<View>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetMessages() {
    setError(null);
    setInfo(null);
  }

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLoaded || !signIn) {
      return;
    }

    setIsSubmitting(true);
    resetMessages();

    try {
      const result = await signIn.create({
        identifier: email.trim(),
        password,
      });

      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
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

  async function handleSendResetCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLoaded || !signIn) {
      return;
    }

    setIsSubmitting(true);
    resetMessages();

    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email.trim(),
      });
      setInfo("أرسلنا رمز إعادة التعيين إلى بريدك الإلكتروني.");
      setView("reset");
      setCode("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(extractClerkError(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLoaded || !signIn) {
      return;
    }

    if (newPassword.length < 15) {
      setError("كلمة المرور يجب أن تكون 15 حرفًا على الأقل.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("تأكيد كلمة المرور غير متطابق.");
      return;
    }

    setIsSubmitting(true);
    resetMessages();

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: code.trim(),
        password: newPassword,
      });

      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        router.push("/dashboard");
        router.refresh();
        return;
      }

      setError("تم التحقق لكن تعذر إكمال إعادة التعيين. حاول تسجيل الدخول.");
      setView("signin");
      setPassword("");
    } catch (err) {
      setError(extractClerkError(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (view === "forgot") {
    return (
      <form onSubmit={handleSendResetCode} className="space-y-4">
        <p className="text-sm leading-7 text-[#6b4a3a]">
          أدخل بريدك الإلكتروني وسنرسل رمزًا لإعادة تعيين كلمة المرور.
        </p>
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
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {info ? <p className="text-sm text-emerald-700">{info}</p> : null}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[var(--brand-primary)] px-4 py-3 font-semibold text-white transition hover:bg-[var(--brand-secondary)] disabled:opacity-60"
        >
          {isSubmitting ? "جارٍ الإرسال..." : "إرسال رمز إعادة التعيين"}
        </button>
        <p className="text-center text-sm text-[#6b4a3a]">
          <button
            type="button"
            className="font-semibold text-[var(--brand-secondary)]"
            onClick={() => {
              setView("signin");
              resetMessages();
            }}
          >
            العودة لتسجيل الدخول
          </button>
        </p>
      </form>
    );
  }

  if (view === "reset") {
    return (
      <form onSubmit={handleResetPassword} className="space-y-4">
        <p className="text-sm leading-7 text-[#6b4a3a]">
          أدخل الرمز المرسل إلى <span className="font-semibold">{email}</span> ثم
          اختر كلمة مرور جديدة.
        </p>
        <label className="block space-y-2 text-sm font-medium">
          <span>رمز التأكيد</span>
          <input
            type="text"
            inputMode="numeric"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="w-full rounded-2xl border border-[#ead9c8] bg-white px-4 py-3"
            placeholder="123456"
            required
          />
        </label>
        <PasswordField
          label="كلمة المرور الجديدة"
          value={newPassword}
          onChange={setNewPassword}
          placeholder="15 حرفًا على الأقل"
          autoComplete="new-password"
        />
        <PasswordField
          label="تأكيد كلمة المرور"
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {info ? <p className="text-sm text-emerald-700">{info}</p> : null}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[var(--brand-primary)] px-4 py-3 font-semibold text-white transition hover:bg-[var(--brand-secondary)] disabled:opacity-60"
        >
          {isSubmitting ? "جارٍ التعيين..." : "تعيين كلمة المرور"}
        </button>
        <p className="text-center text-sm text-[#6b4a3a]">
          <button
            type="button"
            className="font-semibold text-[var(--brand-secondary)]"
            disabled={isSubmitting}
            onClick={() => {
              setView("forgot");
              resetMessages();
            }}
          >
            إعادة إرسال الرمز
          </button>
          {" · "}
          <button
            type="button"
            className="font-semibold text-[var(--brand-secondary)]"
            onClick={() => {
              setView("signin");
              resetMessages();
            }}
          >
            تسجيل الدخول
          </button>
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={handleSignIn} className="space-y-4">
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
      <PasswordField
        label="كلمة المرور"
        value={password}
        onChange={setPassword}
        labelExtra={
          <button
            type="button"
            className="text-xs font-semibold text-[var(--brand-secondary)]"
            onClick={() => {
              setView("forgot");
              resetMessages();
              setPassword("");
            }}
          >
            نسيت كلمة المرور؟
          </button>
        }
      />
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
    Array.isArray((error as { errors: Array<{ message?: string; longMessage?: string }> }).errors)
  ) {
    const first = (error as { errors: Array<{ message?: string; longMessage?: string }> })
      .errors[0];
    return first?.longMessage || first?.message || "تعذر تنفيذ العملية.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "تعذر تنفيذ العملية.";
}
