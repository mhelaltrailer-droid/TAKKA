"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/submit-button";

import {
  createAdminManagedUser,
  updateAdminManagedUser,
  type AdminUserActionResult,
} from "./actions";

const initial: AdminUserActionResult = { ok: true };

export function CreateUserForm() {
  const [state, action] = useActionState(
    async (_prev: AdminUserActionResult, formData: FormData) =>
      createAdminManagedUser(formData),
    initial,
  );

  return (
    <form action={action} className="mt-4 grid gap-3 md:grid-cols-2">
      <input
        name="fullName"
        required
        placeholder="الاسم الكامل"
        className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
      />
      <input
        name="email"
        type="email"
        required
        placeholder="البريد الإلكتروني"
        className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
      />
      <input
        name="phoneNumber"
        placeholder="رقم الهاتف (01xxxxxxxxx)"
        className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
      />
      <input
        name="password"
        type="password"
        required
        minLength={8}
        placeholder="كلمة المرور (8 أحرف على الأقل)"
        className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
      />
      <select
        name="role"
        required
        defaultValue="CUSTOMER"
        className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 outline-none"
      >
        <option value="CUSTOMER">عميل</option>
        <option value="KITCHEN_OWNER">صاحب مطبخ</option>
        <option value="ADMIN">إدارة</option>
      </select>
      <div className="flex flex-col justify-center gap-2">
        <SubmitButton label="إنشاء الحساب" pendingLabel="جارٍ الإنشاء..." />
        {state.error ? (
          <p className="text-sm text-red-600">{state.error}</p>
        ) : null}
        {state.ok && !state.error && state !== initial ? (
          <p className="text-sm text-emerald-700">تم إنشاء الحساب.</p>
        ) : null}
      </div>
    </form>
  );
}

export function UpdateUserForm({
  userId,
  fullName,
  phoneNumber,
  role,
}: {
  userId: string;
  fullName: string;
  phoneNumber: string;
  role: string;
}) {
  const [state, action] = useActionState(
    async (_prev: AdminUserActionResult, formData: FormData) =>
      updateAdminManagedUser(formData),
    initial,
  );

  return (
    <form action={action} className="mt-4 grid gap-3 md:grid-cols-4">
      <input type="hidden" name="userId" value={userId} />
      <input
        name="fullName"
        required
        defaultValue={fullName}
        className="rounded-2xl border border-zinc-300 px-3 py-2 text-sm outline-none"
      />
      <input
        name="phoneNumber"
        defaultValue={phoneNumber}
        placeholder="الهاتف"
        className="rounded-2xl border border-zinc-300 px-3 py-2 text-sm outline-none"
      />
      <select
        name="role"
        defaultValue={role}
        className="rounded-2xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none"
      >
        <option value="CUSTOMER">عميل</option>
        <option value="KITCHEN_OWNER">صاحب مطبخ</option>
        <option value="ADMIN">إدارة</option>
      </select>
      <div className="flex flex-col gap-1">
        <SubmitButton label="حفظ التعديل" pendingLabel="جارٍ الحفظ..." />
        {state.error ? (
          <p className="text-xs text-red-600">{state.error}</p>
        ) : null}
      </div>
    </form>
  );
}
