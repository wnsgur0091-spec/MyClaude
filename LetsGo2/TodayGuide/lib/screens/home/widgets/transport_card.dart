import 'package:flutter/material.dart';

import '../../../models/route_plan.dart';
import '../../../services/external_link_launcher.dart';
import '../../../theme/app_theme.dart';

/// 자차/대중교통 이동 계획 하나를 보여주는 작은 칩.
/// 탭하면 출발/도착 좌표로 외부 지도 앱(구글 지도)에서 상세 경로를 보여준다.
class TransportChip extends StatelessWidget {
  const TransportChip({super.key, required this.plan});

  final RoutePlan plan;

  @override
  Widget build(BuildContext context) {
    final icon = plan.mode == TransportMode.car ? Icons.directions_car : Icons.directions_bus;
    return InkWell(
      borderRadius: BorderRadius.circular(10),
      onTap: () => _openDetailedRoute(context),
      child: Container(
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
            const SizedBox(width: 4),
            const Icon(Icons.chevron_right, size: 16, color: AppColors.textSecondary),
          ],
        ),
      ),
    );
  }

  Future<void> _openDetailedRoute(BuildContext context) async {
    final travelMode = plan.mode == TransportMode.car ? 'driving' : 'transit';
    final url = 'https://www.google.com/maps/dir/?api=1'
        '&origin=${plan.originLat},${plan.originLng}'
        '&destination=${plan.destinationLat},${plan.destinationLng}'
        '&travelmode=$travelMode';
    final opened = await ExternalLinkLauncher.openUrl(url);
    if (!opened && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('지도 앱을 열지 못했어요.')),
      );
    }
  }

  String _formatTime(DateTime dt) {
    final h = dt.hour.toString().padLeft(2, '0');
    final m = dt.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }
}
