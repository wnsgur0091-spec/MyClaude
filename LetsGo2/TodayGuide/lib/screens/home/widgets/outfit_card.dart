import 'package:flutter/material.dart';

import '../../../models/outfit_recommendation.dart';
import '../../../theme/app_theme.dart';

class OutfitCard extends StatelessWidget {
  const OutfitCard({super.key, required this.outfit});

  final OutfitRecommendation outfit;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.spacePanel, AppColors.spacePanelAlt],
        ),
        border: Border.all(color: AppColors.neonPurple.withOpacity(0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.checkroom, color: AppColors.neonPurple),
              SizedBox(width: 8),
              Text('오늘의 옷차림',
                  style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 16)),
            ],
          ),
          const SizedBox(height: 16),
          _OutfitRow(label: '상의', value: outfit.top),
          _OutfitRow(label: '하의', value: outfit.bottom),
          _OutfitRow(label: '신발', value: outfit.shoes),
          if (outfit.items.isNotEmpty) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: outfit.items
                  .map((item) => Chip(
                        label: Text(item),
                        backgroundColor: AppColors.neonCyan.withOpacity(0.15),
                        labelStyle: const TextStyle(color: AppColors.neonCyan),
                        side: BorderSide.none,
                      ))
                  .toList(),
            ),
          ],
          const SizedBox(height: 12),
          Text(outfit.reason, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
        ],
      ),
    );
  }
}

class _OutfitRow extends StatelessWidget {
  const _OutfitRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          SizedBox(width: 48, child: Text(label, style: const TextStyle(color: AppColors.textSecondary))),
          const SizedBox(width: 8),
          Expanded(child: Text(value, style: const TextStyle(color: AppColors.textPrimary))),
        ],
      ),
    );
  }
}
