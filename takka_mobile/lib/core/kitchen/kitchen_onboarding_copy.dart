// Shared Arabic copy for kitchen onboarding — keep in sync with
// `admin/src/lib/kitchen-onboarding-copy.ts`.

class KitchenOnboardingStepCopy {
  const KitchenOnboardingStepCopy({
    required this.id,
    required this.title,
  });

  final int id;
  final String title;
}

const kitchenOnboardingSteps = <KitchenOnboardingStepCopy>[
  KitchenOnboardingStepCopy(id: 1, title: 'بيانات المطبخ والحي'),
  KitchenOnboardingStepCopy(id: 2, title: 'الصور'),
  KitchenOnboardingStepCopy(id: 3, title: 'الدفع والهوية'),
  KitchenOnboardingStepCopy(id: 4, title: 'مراجعة وإرسال'),
];

const kitchenUploadCriteriaLogo =
    'صورة مربعة واضحة لشعار المطبخ، خلفية بسيطة، وحجم مناسب للعرض.';

const kitchenUploadCriteriaCover =
    'صورة أفقية واضحة تعبر عن المطبخ أو أشهر الأصناف، بدون نصوص كثيرة.';

const kitchenUploadCriteriaNationalId =
    'صورة واضحة لوجه البطاقة بالكامل بدون قص، بإضاءة جيدة. للاعتماد فقط ولا تظهر للعملاء.';

const kitchenOnboardingDraftKey = 'takka_kitchen_onboarding_draft';

/// Shown when kitchen GPS coords are missing (required for customer map).
const kitchenCoordsRequired =
    'حدّد موقع المطبخ على الخريطة بزر «تحديد موقعي الحالي». الموقع إلزامي ويظهر للعملاء قبل الطلب ليقرروا التوصيل أو الاستلام.';

const kitchenLocationHint =
    'اختر الحي، ثم حدّد موقع المطبخ على الخريطة. العملاء يرونه ضمن «مطابخ قريبة» في نفس الحي، ويفتحون موقعه على الخريطة قبل الطلب.';

const kitchenOnboardingScreenTitle = 'إعداد المطبخ';
const kitchenOnboardingSaveDraft = 'حفظ المسودة';
const kitchenOnboardingNext = 'التالي';
const kitchenOnboardingBack = 'السابق';
const kitchenOnboardingSubmit = 'حفظ وإرسال للاعتماد';
const kitchenOnboardingReturn = 'العودة';
const kitchenOnboardingEditResubmit = 'عدّل وأعد الإرسال';
const kitchenStatusPending = 'قيد المراجعة';
const kitchenStatusApproved = 'معتمد';
const kitchenStatusRejected = 'مرفوض';
const kitchenStatusPendingBody =
    'المطبخ قيد مراجعة الإدارة. بعد الاعتماد يمكنك إضافة الأصناف.';
const kitchenStatusApprovedBody =
    'تم اعتماد مطبخك. يمكنك العودة لإدارة الأصناف والطلبات.';
const kitchenMenuAwaitApprovalTitle = 'انتظر اعتماد المطبخ أولًا';
const kitchenMenuAwaitApprovalBody =
    'يجب انتظار اعتماد المطبخ من الإدارة قبل إضافة الأصناف.';
const kitchenMenuGoToOnboarding = 'الذهاب إلى إعداد المطبخ';
