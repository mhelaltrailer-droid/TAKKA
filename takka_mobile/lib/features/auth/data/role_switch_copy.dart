/// Shared Arabic copy for asymmetric customer ↔ kitchen role flows.
class RoleSwitchCopy {
  static const title = 'هذا الحساب حساب عميل';
  static const body =
      'لو عايز تنشئ حساب مطبخ بنفس الإيميل، أكمل نموذج انضمام المطبخ من هنا.';
  static const becomeKitchenCta = 'إنشاء حساب مطبخ';
  static const returnToKitchenCta = 'العودة لمسار المطبخ';
  static const switchToCustomerCta = 'التحوّل إلى مسار العميل';
  /// Web path; on mobile we open [KitchenOnboardingScreen] instead.
  static const kitchenOnboardingWebPath = '/dashboard/kitchen/onboarding';
}
