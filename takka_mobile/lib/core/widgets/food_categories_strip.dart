import 'package:flutter/material.dart';

import '../location/food_categories.dart';
import '../theme/app_theme.dart';

class FoodCategoriesStrip extends StatelessWidget {
  const FoodCategoriesStrip({
    super.key,
    required this.selectedLabel,
    required this.onSelect,
  });

  final String? selectedLabel;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'تاكل ايه؟',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w800,
              ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 56,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: foodCategories.length,
            separatorBuilder: (_, _) => const SizedBox(width: 10),
            itemBuilder: (context, index) {
              final category = foodCategories[index];
              final selected = selectedLabel == category.label;

              return Material(
                color: selected
                    ? TakkaColors.primary.withValues(alpha: 0.12)
                    : Colors.white,
                borderRadius: BorderRadius.circular(18),
                child: InkWell(
                  borderRadius: BorderRadius.circular(18),
                  onTap: () => onSelect(category.label),
                  child: Container(
                    padding: const EdgeInsetsDirectional.only(
                      start: 8,
                      end: 14,
                      top: 8,
                      bottom: 8,
                    ),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(
                        color: selected
                            ? TakkaColors.primary
                            : TakkaColors.softLine,
                      ),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 36,
                          height: 36,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFF4EA),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            category.thumb,
                            style: const TextStyle(fontSize: 18),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          category.label,
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
