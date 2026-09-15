import Link from "next/link";
import { UserRole } from "@prisma/client";

import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRoleLabel, type AppRole } from "@/lib/roles";

import { CreateUserForm, UpdateUserForm } from "./user-forms";
import { UserRowActions } from "./user-row-actions";

function dbRoleToAppRole(role: UserRole): AppRole {
  switch (role) {
    case UserRole.ADMIN:
      return "admin";
    case UserRole.KITCHEN_OWNER:
      return "kitchen_owner";
    case UserRole.CUSTOMER:
    default:
      return "customer";
  }
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const admin = await requireRole(["admin"]);
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const users = await db.user.findMany({
    where: query
      ? {
          OR: [
            { fullName: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { phoneNumber: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: {
      kitchens: {
        select: { kitchenName: true, approvalStatus: true },
        take: 1,
      },
      _count: {
        select: { customerOrders: true, kitchens: true },
      },
    },
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
  });

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-[var(--brand-secondary)]">
            إدارة المستخدمين
          </p>
          <h1 className="mt-2 text-3xl font-bold">المستخدمون</h1>
          <p className="mt-3 text-sm leading-7 text-zinc-600">
            عرض الحسابات، إضافة مستخدم، تعديل الدور والبيانات، تعطيل أو حذف.
            الحساب المرتبط بمطبخ أو طلبات يُعطَّل عند الحذف بدل المسح النهائي.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/dashboard/admin"
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              لوحة الإدارة
            </Link>
          </div>
        </header>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">إضافة مستخدم</h2>
          <CreateUserForm />
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">قائمة المستخدمين</h2>
              <p className="mt-1 text-sm text-zinc-600">
                العدد: {users.length}
                {query ? ` · نتائج «${query}»` : ""}
              </p>
            </div>
            <form className="flex gap-2">
              <input
                name="q"
                defaultValue={query}
                placeholder="بحث بالاسم / الإيميل / الهاتف"
                className="min-w-[220px] rounded-full border border-zinc-300 px-4 py-2 text-sm outline-none"
              />
              <button
                type="submit"
                className="rounded-full bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white"
              >
                بحث
              </button>
            </form>
          </div>

          <div className="mt-5 space-y-4">
            {users.length === 0 ? (
              <div className="rounded-2xl bg-zinc-50 px-4 py-5 text-sm text-zinc-600">
                لا يوجد مستخدمون مطابقون.
              </div>
            ) : (
              users.map((user) => {
                const kitchen = user.kitchens[0];
                const isSelf = user.id === admin.appUserId;
                const hasLinkedData =
                  user._count.kitchens > 0 || user._count.customerOrders > 0;
                return (
                  <article
                    key={user.id}
                    className="rounded-2xl border border-zinc-200 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{user.fullName}</h3>
                      <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs">
                        {getRoleLabel(dbRoleToAppRole(user.role))}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs ${
                          user.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {user.isActive ? "نشط" : "معطّل"}
                      </span>
                      {isSelf ? (
                        <span className="rounded-full bg-sky-50 px-3 py-1 text-xs text-sky-800">
                          حسابك
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-zinc-600">
                      {user.email || "—"} · {user.phoneNumber || "بدون هاتف"}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      طلبات: {user._count.customerOrders} · مطابخ:{" "}
                      {user._count.kitchens}
                      {kitchen
                        ? ` · ${kitchen.kitchenName} (${kitchen.approvalStatus})`
                        : ""}
                    </p>

                    <UpdateUserForm
                      userId={user.id}
                      fullName={user.fullName}
                      phoneNumber={user.phoneNumber ?? ""}
                      role={user.role}
                    />

                    <UserRowActions
                      userId={user.id}
                      isActive={user.isActive}
                      isSelf={isSelf}
                      hasLinkedData={hasLinkedData}
                    />
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
