import 'package:flutter/material.dart';

import '../../../models/nearby_event.dart';
import '../../../services/external_link_launcher.dart';
import '../../../theme/app_theme.dart';

/// 오늘 남은 일정이 없을 때 보여주는 근처 축제/행사 추천 목록.
/// 탭하면 네이버 지도에서 그 장소를 보여준다.
class NearbyEventsCard extends StatelessWidget {
  const NearbyEventsCard({super.key, required this.events});

  final List<NearbyEvent> events;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: events
          .map((e) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _NearbyEventTile(event: e),
              ))
          .toList(),
    );
  }
}

class _NearbyEventTile extends StatelessWidget {
  const _NearbyEventTile({required this.event});

  final NearbyEvent event;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: () => _openInMap(context),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.spacePanel,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.starDim),
        ),
        child: Row(
          children: [
            if (event.imageUrl != null) ...[
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: Image.network(
                  event.imageUrl!,
                  width: 56,
                  height: 56,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => const SizedBox(width: 56, height: 56),
                ),
              ),
              const SizedBox(width: 12),
            ] else
              const Icon(Icons.celebration_outlined, color: AppColors.neonPurple, size: 28),
            if (event.imageUrl == null) const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(event.title,
                      style: const TextStyle(color: AppColors.textPrimary, fontSize: 14, fontWeight: FontWeight.w600),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis),
                  if (event.address != null) ...[
                    const SizedBox(height: 2),
                    Text(event.address!,
                        style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis),
                  ],
                ],
              ),
            ),
            const Icon(Icons.chevron_right, size: 18, color: AppColors.textSecondary),
          ],
        ),
      ),
    );
  }

  Future<void> _openInMap(BuildContext context) async {
    final uri = Uri(
      scheme: 'nmap',
      host: 'search',
      queryParameters: {'query': event.title, 'appname': 'com.letsgo2.todayguide'},
    );
    final opened = await ExternalLinkLauncher.openUrl(uri.toString());
    if (!opened && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('네이버 지도 앱이 없어서 열지 못했어요.')),
      );
    }
  }
}
