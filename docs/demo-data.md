# بيانات المطابخ التجريبية / Demo kitchen data

السكربت يضيف مطبخ بيتي واحد لكل حي **نشط** موجود في جدول `Region`، ومعاه ٣ أصناف. المطابخ تظهر للعملاء كمطابخ عادية: اسم عربي، وصف، عنوان، هاتف، صور، حالة معتمدة ومفتوحة، وأصناف معتمدة. مفيش كلمة «تجريبي» في أي نص ظاهر.

العلامة الداخلية هي العمود `isDemo` (القيمة الافتراضية `false`) على `User` و `Kitchen` و `MenuItem`. السكربت ما يلمسش أي صف `isDemo = false`.

This seed inserts one home kitchen for every **active** district already stored in `Region`, plus three menu items. Customers see ordinary kitchens: Arabic name, description, address, phone, photos, approved and open. No public string says “demo”.

The hidden marker is `isDemo` (default `false`) on `User`, `Kitchen`, and `MenuItem`. Rows with `isDemo = false` are never updated or deleted.

## إيه اللي بيتزرع / What gets created

- كل حي `isActive = true` ما عدا الأسماء الجامعة: `حي آخر`، وأي اسم يبدأ بـ `حي آخر`، و `other`.
- الأحياء المعطّلة (الأسماء القديمة بعد الدمج) ما تتزرعش، عشان متظهرش نسخة تانية في استعراض المطابخ.
- لو حي من كتالوج المدينة الافتراضي لسه مش في القاعدة، السكربت يضيف صف الحي فقط (`skipDuplicates`). ما يعدّلش الأحياء الموجودة وما ينقلش مطابخ حقيقية.
- كل مطبخ: اسم مختلف، وصف فيه ميعاد التسليم (مفيش موديل ساعات شغل في القاعدة)، عنوان من غير اسم مدينة، هاتف بالشكل `01` ومكوّن من ١١ رقم، لوجو وغلاف ومعرض صور، إحداثيات لو حدود الحي معروفة، `approvalStatus = APPROVED`، `availabilityStatus = OPEN`.
- ٣ أصناف: اسم ووصف وسعر بالجنيه (٦٠–٣٥٠) وفئة وصورة و`isAvailable` و`approvalStatus = APPROVED`. بعض الأصناف ليها أحجام. طبق اليوم وخصم بسيط بيتوزعوا على المنيو.
- مالك وهمي لكل مطبخ: `isDemo = true`، `isActive = false`، من غير `clerkUserId` ومن غير بريد ومن غير هاتف على حساب المستخدم. مفيش حساب Clerk، فمش هيسجّل دخول ومش هتوصله إشعارات أو إيميل أو واتساب أو FCM أو Pusher. السكربت نفسه ما بيستدعيش القنوات دي.
- الصور روابط HTTPS مباشرة من Pexels و Unsplash.
- تشغيل السكربت تاني ما يكرّرش الصفوف. بيحدّث الوصف والصور والمنيو والمعرض، ويرجّع المطبخ التجريبي لمعتمد ومفتوح. الاسم والرابط والهاتف يفضلوا زي أول مرة. لو المالك اتربط بـ Clerk، أو فيه صنف `isDemo = false`، المطبخ ده ما يتعدلش.

Active districts only. Catch-all names (`حي آخر` and anything that starts with it, plus `other`) are skipped. Inactive legacy districts are skipped so old merged names do not show up as a second kitchen in city-wide browse.

Missing default catalog districts are inserted with `skipDuplicates`. Existing district rows and real kitchens are left as they are.

There is no working-hours model. The handover window is written in the kitchen description. Placeholder mobiles look like `01` numbers of 11 digits and are not monitored. Do not accept real payments on these kitchens: the seed does not create an InstaPay account.

Re-running updates the same demo kitchen in each district (same row, refreshed description, photos, menu, and gallery) and does not insert a second one. It also sets that kitchen back to approved and open. The kitchen name, slug, and phone stay as they were on the first run. A kitchen is left untouched if its owner has a Clerk id or if it contains a menu item with `isDemo = false`.

## قبل التشغيل على Render / Before production

العمود `isDemo` لازم يكون موجود. بناء خدمة الويب على Render بيشغّل `prisma db push` جوه `npm run build`، وده يضيف العمود بالقيمة `false` من غير ما يمسح بيانات.

قاعدة Render الحالية اتبنت بـ `db push` ومن غير سجل Prisma Migrate. أمر `npx prisma migrate deploy` عليها هيقف بخطأ `P3005` لحد ما القاعدة تتأسس (baseline). متستخدمهوش على القاعدة الحالية. المايجريشن `admin/prisma/migrations/20261116120000_add_is_demo` موجود للتاريخ ولقواعد فاضية، والـ SQL فيه `IF NOT EXISTS`.

لتطبيق العمود من غير ما تستنى النشر:

```bash
cd admin
npm install
export DATABASE_URL='postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require'
npx prisma db push
```

The existing Render database was created with `db push` and has no Prisma Migrate history. `npx prisma migrate deploy` stops with `P3005` until that database is baselined, so do not use it there. The migration folder is the historical record (and works on an empty database). Its SQL uses `IF NOT EXISTS`. On Render, `npm run build` already runs `prisma db push`, which adds the column.

من جهازك، برابط **External Database URL** من لوحة Postgres على Render (متحطّوش في git). بعد ما العمود يبقى موجود، إما بالنشر أو بـ `db push`:

```bash
cd admin
npm install
export DATABASE_URL='postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require'
npm run seed:demo
```

من Shell بتاع خدمة الويب على Render (جذر الخدمة هو `admin`، و `DATABASE_URL` موجود)، بعد النشر:

```bash
npm run seed:demo
```

لو العمود ناقص، السكربت يوقف برسالة واضحة ومش بيكتب حاجة.

## المسح / Removal

```bash
cd admin
export DATABASE_URL='postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require'
npm run seed:demo:remove
```

على Render Shell:

```bash
npm run seed:demo:remove
```

يمسح مطابخ `isDemo = true` وأصنافها وصورها وملاكها الوهميين. طلبات العملاء اللي اتطلبت من المطبخ التجريبي بتتمسح معاها لأن الطلب مربوط بالمطبخ. حسابات العملاء نفسها ما تتمسحش. أي مطبخ تجريبي مالكه بقى مربوط بـ Clerk، أو فيه صنف `isDemo = false`، يتساب في مكانه والسكربت يخرّج بكود خطأ عشان تشوفه.

This deletes `isDemo` kitchens, their items, gallery, and placeholder owners. Customer orders placed on those kitchens are deleted with them, because the order belongs to the kitchen. Customer accounts are kept. A demo kitchen whose owner has a Clerk id, or that has a non-demo menu item, is left in place and the command exits non-zero.

## ملاحظات لصاحب المشروع / What you need to do

1. افتح الـ PR وادمجها لما تراجعها. الدمج مش جزء من الشغل ده.
2. بعد النشر، شغّل `npm run seed:demo` مرة على قاعدة Render. البناء ما بيشغّلش الزرع لوحده.
3. متقبلّش عربوناً على المطابخ دي: مفيش حساب InstaPay، وأرقام الهاتف مش متراقبة.
4. لما تخلّص العرض، شغّل `npm run seed:demo:remove` قبل ما العملاء يطلبوا من المطابخ دي، أو اعرف إن المسح هيمسح الطلبات المرتبطة بيها.
5. ساعات الشغل مش عمود في القاعدة. الجملة مكتوبة في وصف المطبخ.
6. لو صورة بعيدة وقفت، غيّر الرابط في `admin/src/lib/demo-data.ts` وشغّل الزرع تاني. التشغيل التاني بيحدّث نفس الصفوف.

Merge when you are ready; this change does not merge itself. Run the seed once against Render after deploy. The build does not seed. Remove the demo rows before real customers order from them if you do not want those orders deleted later.
