import 'package:flutter/material.dart';

import '../../../models/route_plan.dart';
import '../../../theme/app_theme.dart';

/// 자차/대중교통 이동 계획 하나를 보여주는 작은 칩.
class TransportChip extends StatelessWidget {
  const TransportChip({super.key, required this.plan});

  final RoutePlan plan;

  @override
  Widget build(BuildContext context) {
    final icon = plan.mode == TransportMode.car ? Icons.directions_car : Icons.directions_bus;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.spacePanelAlt,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: AppColors.neonCyan),
          const SizedBox(width: 6),
          Text(
            '${plan.mode.label} ${plan.durationMinutes}분 · ${_formatTime(plan.departBy)} 출발',
            style: const TextStyle(color: AppColors.textPrimary, fontSize: 12),
          ),
        ],
      ),
    );
  }

  String _formatTime(DateTime dt) {
    final h = dt.hour.toString().padLeft(2, '0');
    final m = dt.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }
}
