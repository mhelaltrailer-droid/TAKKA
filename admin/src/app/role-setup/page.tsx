import { RoleSetupForm } from "@/components/auth/role-setup-form";
import { requireAppAccount } from "@/lib/app-gate";

export default async function RoleSetupPage() {
  const user = await requireAppAccount({ allowWithoutRole: true });

  const initialRole =
    user.role === "kitchen_owner" ? "kitchen_owner" : "customer";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6 py-16">
      <div className="w-full max-w-md border border-[#ead9c8] bg-white p-6 shadow-sm">
        <div className="mb-6 space-y-2 text-center">
          <h1 className="text-2xl font-bold">اختيار نوع الحساب</h1>
          <p className="text-sm leading-7 text-[#6b4a3a]">
            اختر المسار الذي تريد متابعته داخل تكة — عميل أو مطبخ.
          </p>
        </div>
        <RoleSetupForm initialRole={initialRole} />
      </div>
    </main>
  );
}
