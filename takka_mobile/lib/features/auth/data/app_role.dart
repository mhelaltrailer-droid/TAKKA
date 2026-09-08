enum AppRole {
  customer,
  kitchenOwner,
}

extension AppRoleX on AppRole {
  static AppRole? fromApiValue(String? value) {
    switch (value) {
      case 'customer':
        return AppRole.customer;
      case 'kitchen_owner':
        return AppRole.kitchenOwner;
      default:
        return null;
    }
  }

  String get apiValue {
    switch (this) {
      case AppRole.customer:
        return 'customer';
      case AppRole.kitchenOwner:
        return 'kitchen_owner';
    }
  }

  String get label {
    switch (this) {
      case AppRole.customer:
        return 'عميل';
      case AppRole.kitchenOwner:
        return 'مطبخ';
    }
  }

  String get subtitle {
    switch (this) {
      case AppRole.customer:
        return 'استعرض المطابخ، اطلب الطعام، وتابع الطلب حتى الاستلام.';
      case AppRole.kitchenOwner:
        return 'أضف بيانات المطبخ، أدِر المنيو، واستقبل الطلبات من نفس التطبيق.';
    }
  }
}
