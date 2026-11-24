import 'package:flutter_test/flutter_test.dart';
import 'package:takka_mobile/core/location/street_label.dart';

void main() {
  group('cleanStreetName', () {
    test('returns null for empty or blank', () {
      expect(cleanStreetName(null), isNull);
      expect(cleanStreetName(''), isNull);
      expect(cleanStreetName('   '), isNull);
    });

    test('rejects unnamed roads (en/ar)', () {
      expect(cleanStreetName('Unnamed Road'), isNull);
      expect(cleanStreetName('unnamed street'), isNull);
      expect(cleanStreetName('طريق بدون اسم'), isNull);
      expect(cleanStreetName('شارع غير مسمى'), isNull);
    });

    test('strips Plus Codes', () {
      expect(cleanStreetName('7FG8+2X Belbeis'), 'Belbeis');
      expect(cleanStreetName('بلبيس 8FW4V75V+8F'), 'بلبيس');
      expect(cleanStreetName('7FG8+2X'), isNull);
    });

    test('strips leading and trailing house numbers', () {
      expect(cleanStreetName('15 Belbeis Street'), 'Belbeis Street');
      expect(cleanStreetName('Belbeis Street 42'), 'Belbeis Street');
      expect(cleanStreetName('١٢ شارع بلبيس'), 'شارع بلبيس');
      expect(cleanStreetName('شارع بلبيس، 9'), 'شارع بلبيس');
    });

    test('keeps a clean street as-is', () {
      expect(cleanStreetName('بلبيس'), 'بلبيس');
      expect(cleanStreetName('Belbeis Road'), 'Belbeis Road');
    });
  });

  group('streetFromPlacemarkFields', () {
    test('prefers street over thoroughfare', () {
      expect(
        streetFromPlacemarkFields(
          street: 'بلبيس',
          thoroughfare: 'Other Road',
        ),
        'بلبيس',
      );
    });

    test('falls back to thoroughfare when street is empty or unnamed', () {
      expect(
        streetFromPlacemarkFields(
          street: '',
          thoroughfare: 'Belbeis',
        ),
        'Belbeis',
      );
      expect(
        streetFromPlacemarkFields(
          street: 'Unnamed Road',
          thoroughfare: 'شارع النصر',
        ),
        'شارع النصر',
      );
    });

    test('returns null when both are unusable', () {
      expect(
        streetFromPlacemarkFields(
          street: '7FG8+2X',
          thoroughfare: 'Unnamed Road',
        ),
        isNull,
      );
    });
  });

  group('formatDeliveryLocationTitle', () {
    test('district only when street missing', () {
      expect(
        formatDeliveryLocationTitle(district: 'الحي الثالث'),
        'الحي الثالث',
      );
      expect(
        formatDeliveryLocationTitle(district: 'Third District', street: ''),
        'Third District',
      );
      expect(
        formatDeliveryLocationTitle(
          district: 'الحي الثالث',
          street: 'Unnamed Road',
        ),
        'الحي الثالث',
      );
    });

    test('street (district) when street is usable', () {
      expect(
        formatDeliveryLocationTitle(
          district: 'الحي الثالث',
          street: 'بلبيس',
        ),
        'بلبيس (الحي الثالث)',
      );
      expect(
        formatDeliveryLocationTitle(
          district: 'Third District',
          street: 'Belbes',
        ),
        'Belbes (Third District)',
      );
    });

    test('cleans street before formatting', () {
      expect(
        formatDeliveryLocationTitle(
          district: 'الحي الثالث',
          street: '15 بلبيس',
        ),
        'بلبيس (الحي الثالث)',
      );
    });
  });
}
