# Modules and APIs - تطبيق تكة

## 1. الهدف من الوثيقة
هذه الوثيقة تحدد:

- الوحدات الرئيسية في النظام
- مسؤولية كل وحدة
- العلاقة بين الوحدات
- واجهات `API` المطلوبة
- الأحداث اللحظية `Realtime`
- صلاحيات الوصول بين الأدوار

---

## 2. الأدوار التي يخدمها النظام
- `customer`
- `kitchen_owner`
- `admin`

---

## 3. التطبيقات والواجهات

### 3.1 التطبيق الموحد
يُستخدم من أجل:
- الدخول أو إنشاء الحساب من نفس التطبيق
- اختيار الدور: `customer` أو `kitchen_owner`
- توجيه المستخدم إلى مساره المناسب بعد المصادقة

### 3.2 مسار العميل
يستخدمه العميل من أجل:
- التسجيل والدخول
- تحديد الموقع
- إدارة العناوين
- تصفح المطابخ
- إنشاء الطلب
- دفع العربون ورفع الإثبات
- المحادثة
- التقييم

### 3.3 مسار المطبخ
يستخدمه صاحب المطبخ من أجل:
- التسجيل
- استكمال الملف
- رفع المستندات
- إدارة المنيو
- فتح وغلق المطبخ
- إدارة الطلبات
- تحديد رسوم التوصيل
- مراجعة إثبات العربون
- تحديث الحالة
- المحادثة

### 3.3 لوحة الإدارة
تستخدم من أجل:
- اعتماد المطابخ
- إدارة المناطق
- متابعة الطلبات
- متابعة المستخدمين
- مراجعة التقييمات
- التدخل عند النزاعات

---

## 4. الوحدات الرئيسية

1. `Auth Module`
2. `Users Module`
3. `Regions Module`
4. `Addresses Module`
5. `Kitchen Onboarding Module`
6. `Kitchen Profile Module`
7. `Menu Module`
8. `Discovery Module`
9. `Cart Module`
10. `Orders Module`
11. `Deposit Module`
12. `Chat Module`
13. `Reviews Module`
14. `Admin Module`
15. `Notifications Module`
16. `Media Storage Module`

---

## 5. الوحدات بالتفصيل

### 5.1 Auth Module
#### المسؤولية
- إنشاء الحساب
- تسجيل الدخول
- تسجيل الخروج
- إدارة الجلسة
- التحقق من الدور

#### المستخدمون
- العميل
- المطبخ
- الإدارة

#### العمليات
- `selectAppRole`
- `login`
- `logout`
- `getCurrentSession`

---

### 5.2 Users Module
#### المسؤولية
- إدارة بيانات المستخدم الأساسية
- قراءة الملف الشخصي
- تعديل البيانات الأساسية

#### العمليات
- `getMyProfile`
- `updateMyProfile`

---

### 5.3 Regions Module
#### المسؤولية
- إدارة المدن والأحياء والمناطق
- تحديد المناطق النشطة

#### المستخدمون
- الإدارة
- العميل للقراءة فقط
- المطبخ للقراءة فقط

#### العمليات
- `listRegions`
- `createRegion`
- `updateRegion`
- `deactivateRegion`

---

### 5.4 Addresses Module
#### المسؤولية
- إدارة عناوين العميل
- تحديد العنوان الافتراضي

#### المستخدم
- العميل فقط

#### العمليات
- `listMyAddresses`
- `createAddress`
- `updateAddress`
- `deleteAddress`
- `setDefaultAddress`

---

### 5.5 Kitchen Onboarding Module
#### المسؤولية
- تسجيل المطبخ
- استكمال بياناته
- رفع مستنداته
- إدخال بيانات الدفع
- إرسال الملف للاعتماد

#### المستخدم
- المطبخ

#### العمليات
- `createKitchenProfile`
- `uploadKitchenDocument`
- `saveKitchenPaymentMethod`
- `submitKitchenForApproval`

---

### 5.6 Kitchen Profile Module
#### المسؤولية
- قراءة ملف المطبخ
- تعديل البيانات بعد الاعتماد
- إدارة حالة `open / closed`

#### المستخدم
- المطبخ
- العميل للقراءة

#### العمليات
- `getKitchenProfile`
- `updateKitchenProfile`
- `toggleKitchenAvailability`
- `listKitchenGallery`
- `addKitchenGalleryImage`
- `removeKitchenGalleryImage`

---

### 5.7 Menu Module
#### المسؤولية
- إدارة المنيو
- إضافة أصناف
- تعديل الأصناف
- خيارات الأحجام
- إتاحة أو إيقاف الصنف

#### المستخدم
- المطبخ
- العميل للقراءة

#### العمليات
- `listKitchenMenu`
- `createMenuItem`
- `updateMenuItem`
- `deleteMenuItem`
- `toggleMenuItemAvailability`
- `createMenuItemSize`
- `updateMenuItemSize`
- `deleteMenuItemSize`

---

### 5.8 Discovery Module
#### المسؤولية
- إظهار المطابخ المتاحة حسب المنطقة
- البحث والتصفح

#### المستخدم
- العميل

#### العمليات
- `listAvailableKitchens`
- `searchKitchens`
- `getKitchenDetails`

#### قواعد العمل
- لا يظهر إلا المطبخ:
  - المعتمد
  - المفتوح
  - الواقع داخل منطقة مدعومة

---

### 5.9 Cart Module
#### المسؤولية
- حفظ السلة محليًا أو في طبقة تطبيق
- إدارة الأصناف قبل إرسال الطلب

#### المستخدم
- العميل

#### العمليات
- `addItemToCart`
- `updateCartItem`
- `removeCartItem`
- `clearCart`
- `getCartSummary`

#### ملاحظة
- هذه الوحدة غالبًا تكون منطق تطبيق أكثر من كونها `API` كاملة، لكن يمكن دعمها سيرفريًا لاحقًا.

---

### 5.10 Orders Module
#### المسؤولية
- إنشاء الطلب
- قراءة الطلبات
- قبول ورفض الطلبات
- تحديد رسوم التوصيل
- تحديث الحالات
- الإلغاء

#### المستخدمون
- العميل
- المطبخ
- الإدارة للمتابعة

#### العمليات

##### للعميل
- `createOrder`
- `listMyOrders`
- `getMyOrderDetails`
- `cancelMyOrder`
- `confirmOrderReceived`

##### للمطبخ
- `listKitchenOrders`
- `getKitchenOrderDetails`
- `acceptOrder`
- `rejectOrder`
- `setDeliveryFeeAndAcceptOrder`
- `updateOrderStatus`

##### للإدارة
- `listAllOrders`
- `getAdminOrderDetails`
- `adminCloseOrderIfNeeded`

---

### 5.11 Deposit Module
#### المسؤولية
- عرض بيانات `InstaPay`
- رفع إثبات العربون
- مراجعة الإثبات
- اعتماد أو رفض الإثبات

#### المستخدمون
- العميل
- المطبخ

#### العمليات
- `getOrderDepositInstructions`
- `uploadDepositProof`
- `listDepositProofsForOrder`
- `approveDepositProof`
- `rejectDepositProof`

#### قواعد العمل
- لا يبدأ التحضير قبل اعتماد الإثبات
- يمكن إعادة الرفع في حالة الرفض

---

### 5.12 Chat Module
#### المسؤولية
- التواصل بين العميل والمطبخ داخل الطلب
- تبادل الرسائل والصور

#### المستخدمون
- العميل
- المطبخ

#### العمليات
- `listOrderMessages`
- `sendTextMessage`
- `sendImageMessage`

#### قواعد العمل
- لا تفتح المحادثة إلا بعد قبول الطلب
- المحادثة مرتبطة بطلب واحد

---

### 5.13 Reviews Module
#### المسؤولية
- إنشاء تقييم بعد اكتمال الطلب
- عرض تقييمات المطبخ

#### المستخدمون
- العميل
- المطبخ للقراءة
- الإدارة للمراجعة

#### العمليات
- `createReview`
- `listKitchenReviews`
- `hideReview`
- `showReview`

#### قواعد العمل
- التقييم متاح فقط بعد `completed`
- تقييم واحد لكل طلب

---

### 5.14 Admin Module
#### المسؤولية
- اعتماد المطابخ
- إدارة المناطق
- إدارة المستخدمين
- متابعة الطلبات
- التعامل مع النزاعات

#### المستخدم
- الإدارة فقط

#### العمليات
- `listPendingKitchens`
- `getKitchenApprovalDetails`
- `approveKitchen`
- `rejectKitchen`
- `listUsers`
- `suspendKitchenIfNeeded`
- `listOperationalReports`

---

### 5.15 Notifications Module
#### المسؤولية
- الإشعارات داخل التطبيق
- شارات التحديث
- تنبيه المستخدم بتغير الحالات أو الرسائل

#### المستخدمون
- العميل
- المطبخ

#### العمليات
- `listMyNotifications`
- `markNotificationAsRead`
- `markAllNotificationsAsRead`

#### مصادر الإشعار
- طلب جديد للمطبخ
- قبول أو رفض الطلب
- رفع أو مراجعة إثبات العربون
- رسالة جديدة
- تغيير حالة الطلب

---

### 5.16 Media Storage Module
#### المسؤولية
- رفع الصور
- تخزين الملفات
- إرجاع روابط الاستخدام

#### أنواع الملفات
- لوجو المطبخ
- صور المطبخ
- صور الأصناف
- البطاقة الشخصية
- إثبات العربون
- صور المحادثة

#### العمليات
- `uploadKitchenLogo`
- `uploadKitchenGalleryImage`
- `uploadMenuItemImage`
- `uploadKitchenDocumentFile`
- `uploadDepositProofFile`
- `uploadChatImage`

---

## 6. واجهات API المقترحة

### 6.1 Auth APIs
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /api/mobile/me`
- `POST /api/mobile/role`

### 6.2 Address APIs
- `GET /customer/addresses`
- `POST /customer/addresses`
- `PUT /customer/addresses/{id}`
- `DELETE /customer/addresses/{id}`
- `PATCH /customer/addresses/{id}/default`

### 6.3 Kitchen APIs
- `POST /kitchens`
- `GET /kitchens/{id}`
- `PUT /kitchens/{id}`
- `PATCH /kitchens/{id}/availability`
- `POST /kitchens/{id}/submit-approval`

### 6.4 Menu APIs
- `GET /kitchens/{id}/menu`
- `POST /kitchen/menu-items`
- `PUT /kitchen/menu-items/{id}`
- `DELETE /kitchen/menu-items/{id}`
- `PATCH /kitchen/menu-items/{id}/availability`

### 6.5 Discovery APIs
- `GET /discovery/kitchens`
- `GET /discovery/kitchens/{id}`

### 6.6 Order APIs
- `POST /orders`
- `GET /orders/my`
- `GET /orders/{id}`
- `POST /orders/{id}/cancel`
- `POST /orders/{id}/confirm-received`
- `POST /kitchen/orders/{id}/accept`
- `POST /kitchen/orders/{id}/reject`
- `POST /kitchen/orders/{id}/set-delivery-fee`
- `POST /kitchen/orders/{id}/status`

### 6.7 Deposit APIs
- `GET /orders/{id}/deposit`
- `POST /orders/{id}/deposit-proof`
- `POST /kitchen/orders/{id}/deposit/approve`
- `POST /kitchen/orders/{id}/deposit/reject`

### 6.8 Chat APIs
- `GET /orders/{id}/messages`
- `POST /orders/{id}/messages/text`
- `POST /orders/{id}/messages/image`

### 6.9 Review APIs
- `POST /orders/{id}/review`
- `GET /kitchens/{id}/reviews`

### 6.10 Admin APIs
- `GET /admin/kitchens/pending`
- `GET /admin/kitchens/{id}`
- `POST /admin/kitchens/{id}/approve`
- `POST /admin/kitchens/{id}/reject`
- `GET /admin/orders`
- `GET /admin/users`
- `GET /admin/regions`
- `POST /admin/regions`
- `PUT /admin/regions/{id}`

---

## 7. تدفقات Realtime المقترحة

### 7.1 تحديثات الطلب
عند تغير حالة الطلب:
- العميل يرى التحديث فورًا
- المطبخ يرى التحديث فورًا

### 7.2 رسائل المحادثة
عند إرسال رسالة:
- تظهر فورًا للطرف الآخر

### 7.3 تنبيهات داخل التطبيق
يتم إنشاء حدث عند:
- وصول طلب جديد
- قبول الطلب
- رفض الطلب
- إرسال إثبات العربون
- قبول أو رفض الإثبات
- وصول رسالة جديدة
- تحديث حالة الطلب

---

## 8. الصلاحيات حسب الدور

### العميل
يمكنه:
- إدارة حسابه
- إدارة عناوينه
- رؤية المطابخ
- إنشاء الطلبات
- إلغاء طلباته
- رفع إثبات العربون
- التحدث في طلباته فقط
- تقييم الطلبات المكتملة الخاصة به

### المطبخ
يمكنه:
- إدارة ملف مطبخه
- إدارة منيو مطبخه
- رؤية طلبات مطبخه فقط
- قبول أو رفض الطلبات
- تحديد رسوم التوصيل
- مراجعة إثباتات العربون
- تحديث حالات طلباته
- المحادثة داخل طلباته فقط

### الإدارة
يمكنها:
- مراجعة جميع المطابخ
- مراجعة جميع الطلبات
- إدارة جميع المناطق
- مراجعة المستخدمين
- التدخل تشغيليًا

---

## 9. ترتيب البناء المقترح للوحدات

### المرحلة الأولى
- `Auth Module`
- `Users Module`
- `Regions Module`
- `Addresses Module`
- `Kitchen Onboarding Module`
- `Kitchen Profile Module`

### المرحلة الثانية
- `Menu Module`
- `Discovery Module`
- `Cart Module`
- `Orders Module`

### المرحلة الثالثة
- `Deposit Module`
- `Chat Module`
- `Notifications Module`

### المرحلة الرابعة
- `Reviews Module`
- `Admin Module`

---

## 10. ملاحظات معمارية
- `Cart Module` يمكن أن يبدأ محليًا داخل التطبيق لتقليل التعقيد
- `Orders`, `Deposit`, `Chat` هي أهم 3 وحدات تشغيلية في المشروع
- يفضل أن تكون حالة الطلب مصدر الحقيقة الرئيسي لبقية الوحدات
- كل عملية حساسة مثل قبول الطلب أو قبول إثبات العربون يجب أن تسجل زمنيًا

---

## 11. الخطوة التالية المقترحة
أنسب وثيقة بعد هذه المرحلة هي واحدة من:

- `Roadmap.MD`
- `Implementation-Order.MD`

حتى ننتقل من التخطيط الهيكلي إلى خطة التنفيذ الفعلية.
