// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'passkey_user.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

PasskeyUser _$PasskeyUserFromJson(Map<String, dynamic> json) => PasskeyUser(
      // WebAuthn user.id may arrive as a base64 string or byte list.
      id: _passkeyUserId(json['id']),
      name: (json['name'] ?? json['displayName'] ?? json['display_name'] ?? '')
          .toString(),
      // Clerk / WebAuthn use camelCase `displayName`; generated code expected snake_case.
      displayName: (json['display_name'] ??
              json['displayName'] ??
              json['name'] ??
              '')
          .toString(),
    );

String _passkeyUserId(dynamic value) {
  if (value is String && value.isNotEmpty) return value;
  if (value is List) {
    return value.map((e) => (e as num).toInt().toRadixString(16).padLeft(2, '0')).join();
  }
  return value?.toString() ?? '';
}

Map<String, dynamic> _$PasskeyUserToJson(PasskeyUser instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'display_name': instance.displayName,
    };
