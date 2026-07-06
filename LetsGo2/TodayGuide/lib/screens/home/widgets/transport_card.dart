import 'package:flutter/material.dart';

import '../../../models/route_plan.dart';
import '../../../services/external_link_launcher.dart';
import '../../../theme/app_theme.dart';

/// 자차/대중교통 이동 계획 하나를 보여주는 작은 칩.
/// 탭하면 출발/도착 좌표로 네이버 지도 앱에서 상세 경로를 보여준다.
class TransportChip extends StatelessWidget {
  const TransportChip({super.key, required this.plan, this.destinationName});

  final RoutePlan plan;

  /// 네이버 지도에 도착지 이름으로 보여줄 값(보통 일정 제목).
  final String? destinationName;

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

  /// 네이버 지도 앱의 길찾기 URL Scheme(nmap://route/car, nmap://route/public).
  /// 네이버 지도 앱이 설치되어 있어야 열리고, 없으면 실패 안내를 보여준다.
  Future<void> _openDetailedRoute(BuildContext context) async {
    final routeType = plan.mode == TransportMode.car ? 'car' : 'public';
    final uri = Uri(
      scheme: 'nmap',
      host: 'route',
      path: routeType,
      queryParameters: {
        'slat': '${plan.originLat}',
        'slng': '${plan.originLng}',
        'sname': '출발지',
        'dlat': '${plan.destinationLat}',
        'dlng': '${plan.destinationLng}',
        'dname': destinationName ?? '도착지',
        'appname': 'com.letsgo2.todayguide',
      },
    );
    final opened = await ExternalLinkLauncher.openUrl(uri.toString());
    if (!opened && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('네이버 지도 앱이 없어서 상세 경로를 열지 못했어요.')),
      );
    }
  }

  String _formatTime(DateTime dt) {
    final h = dt.hour.toString().padLeft(2, '0');
    final m = dt.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }
}
