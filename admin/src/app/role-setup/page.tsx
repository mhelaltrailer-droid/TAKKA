import { RoleSetupForm } from "@/components/auth/role-setup-form";
import { requireAppAccount } from "@/lib/app-gate";
import { db } from "@/lib/db";

export default async function RoleSetupPage() {
  const user = await requireAppAccount({ allowWithoutRole: true });

  const kitchen = await db.kitchen.findUnique({
    where: { ownerUserId: user.appUserId },
    select: { id: true },
  });

  const initialRole =
    user.role === "kitchen_owner" ? "kitchen_owner" : "customer";
  const hasKitchen = Boolean(kitchen);
  const allowFirstTimeChoice = Boolean(user.needsRoleSetup);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6 py-16">
      <div className="w-full max-w-md border border-[#ead9c8] bg-white p-6 shadow-sm">
        <div className="mb-6 space-y-2 text-center">
          <h1 className="text-2xl font-bold">اختيار نوع الحساب</h1>
          <p className="text-sm leading-7 text-[#6b4a3a]">
            {allowFirstTimeChoice
              ? "اختر المسار الذي تريد متابعته داخل تكة — عميل أو مطبخ."
              : hasKitchen
                ? "يمكنك التبديل بين مسار العميل ومسار المطبخ لنفس الحساب."
                : "حسابك الحالي عميل. لإنشاء مطبخ أكمل نموذج الانضمام."}
          </p>
        </div>
        <RoleSetupForm
          initialRole={initialRole}
          hasKitchen={hasKitchen}
          allowFirstTimeChoice={allowFirstTimeChoice}
        />
      </div>
    </main>
  );
}
