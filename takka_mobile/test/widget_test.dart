import 'package:flutter_test/flutter_test.dart';

import 'package:takka_mobile/app.dart';

void main() {
  testWidgets('Shows missing Clerk config state by default', (WidgetTester tester) async {
    await tester.pumpWidget(const TakkaApp());

    expect(find.text('مفتاح Clerk غير مضبوط'), findsOneWidget);
  });
}
