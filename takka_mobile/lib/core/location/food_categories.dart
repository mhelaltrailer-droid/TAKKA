import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';

/// Home "تاكل ايه؟" categories — defaults kept in sync with web `food-categories.ts`.
class FoodCategory {
  const FoodCategory({
    required this.id,
    required this.label,
    required this.thumb,
    required this.keywords,
  });

  final String id;
  final String label;
  final String thumb;
  final List<String> keywords;

  factory FoodCategory.fromJson(Map<String, dynamic> json) {
    return FoodCategory(
      id: json['id']?.toString() ?? '',
      label: json['label']?.toString() ?? '',
      thumb: json['thumb']?.toString() ?? '🍽️',
      keywords: (json['keywords'] as List<dynamic>? ?? const [])
          .map((item) => item.toString())
          .where((item) => item.isNotEmpty)
          .toList(),
    );
  }
}

const List<FoodCategory> defaultFoodCategories = [
  FoodCategory(id: 'bakery', label: 'مخبوزات', thumb: '🥖', keywords: ['مخبوزات', 'عيش', 'فطير']),
  FoodCategory(id: 'poultry', label: 'طيور', thumb: '🍗', keywords: ['طيور', 'فراخ', 'دجاج']),
  FoodCategory(id: 'soups', label: 'شوربات', thumb: '🍲', keywords: ['شوربة', 'شوربات']),
  FoodCategory(id: 'grills', label: 'مشويات', thumb: '🥩', keywords: ['مشويات', 'كفتة', 'شيش']),
  FoodCategory(id: 'mahshi', label: 'محاشي', thumb: '🫑', keywords: ['محاشي', 'محشي']),
  FoodCategory(id: 'seafood', label: 'أسماك', thumb: '🦐', keywords: ['أسماك', 'سمك', 'جمبري']),
  FoodCategory(id: 'musammat', label: 'مسمط', thumb: '🦴', keywords: ['مسمط']),
  FoodCategory(id: 'pasta', label: 'مكرونات', thumb: '🍝', keywords: ['مكرونة', 'مكرونات', 'باستا']),
  FoodCategory(id: 'stew', label: 'طبيخ', thumb: '🥘', keywords: ['طبيخ']),
  FoodCategory(id: 'breakfast', label: 'فطار', thumb: '🍳', keywords: ['فطار', 'فول', 'بيض']),
  FoodCategory(id: 'tagine', label: 'طواجن', thumb: '🫕', keywords: ['طاجن', 'طواجن']),
  FoodCategory(id: 'popular', label: 'شعبيات', thumb: '🥙', keywords: ['شعبيات', 'كشري']),
  FoodCategory(id: 'appetizers', label: 'مقبلات', thumb: '🥒', keywords: ['مقبلات']),
  FoodCategory(id: 'savory', label: 'مملحات', thumb: '🐟', keywords: ['مملحات']),
  FoodCategory(id: 'candy', label: 'حلويات', thumb: '🍯', keywords: ['حلويات', 'حلو']),
  FoodCategory(id: 'dairy', label: 'ألبان', thumb: '🧀', keywords: ['ألبان', 'جبن']),
  FoodCategory(id: 'dessert', label: 'تحلية', thumb: '🍮', keywords: ['تحلية', 'حلى']),
  FoodCategory(id: 'salads', label: 'سلطات', thumb: '🥗', keywords: ['سلطات', 'سلطة']),
  FoodCategory(id: 'drinks', label: 'مشروبات', thumb: '🥤', keywords: ['مشروبات', 'عصير']),
  FoodCategory(id: 'chocolate', label: 'شوكولاته', thumb: '🍩', keywords: ['شوكولاتة', 'شوكولاته']),
  FoodCategory(id: 'meals', label: 'وجبات', thumb: '🍱', keywords: ['وجبات', 'وجبة']),
  FoodCategory(id: 'healthy', label: 'هيلثي', thumb: '🥗', keywords: ['هيلثي', 'صحي']),
  FoodCategory(id: 'cake', label: 'كيك', thumb: '🎂', keywords: ['كيك', 'تورتة']),
];

/// Offline / legacy alias.
const List<FoodCategory> foodCategories = defaultFoodCategories;

Future<List<FoodCategory>> loadFoodCategories() async {
  try {
    final base = AppConfig.apiBaseUrl.endsWith('/')
        ? AppConfig.apiBaseUrl.substring(0, AppConfig.apiBaseUrl.length - 1)
        : AppConfig.apiBaseUrl;
    final response =
        await http.get(Uri.parse('$base/api/discovery/food-categories'));
    if (response.statusCode < 200 || response.statusCode >= 300) {
      return defaultFoodCategories;
    }

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    final categories = (json['categories'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(FoodCategory.fromJson)
        .where((category) => category.id.isNotEmpty && category.label.isNotEmpty)
        .toList();

    return categories.isEmpty ? defaultFoodCategories : categories;
  } catch (_) {
    return defaultFoodCategories;
  }
}
