import 'package:flutter/material.dart';

import '../../../models/event_attendee_role.dart';
import '../../../models/today_guide_result.dart';
import '../../../theme/app_theme.dart';
import 'transport_card.dart';

class ScheduleTimelineCard extends StatelessWidget {
  const ScheduleTimelineCard({super.key, required this.guide});

  final EventGuide guide;

  @override
  Widget build(BuildContext context) {
    final event = guide.event;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.spacePanel,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.starDim),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: const BoxDecoration(color: AppColors.neonCyan, shape: BoxShape.circle),
              ),
              const SizedBox(width: 10),
              Text(_formatRange(event.start, event.end),
                  style: const TextStyle(color: AppColors.neonCyan, fontWeight: FontWeight.bold, fontSize: 13)),
              if (event.isAllDay) ...[
                const SizedBox(width: 8),
                const Text('종일', style: TextStyle(color: AppColors.textSecondary, fontSize: 11)),
              ],
              if (event.attendeeRole == EventAttendeeRole.partner ||
                  event.attendeeRole == EventAttendeeRole.both) ...[
                const SizedBox(width: 8),
                _RoleTag(role: event.attendeeRole),
              ],
            ],
          ),
          const SizedBox(height: 8),
          Text(event.title,
              style: const TextStyle(color: AppColors.textPrimary, fontSize: 16, fontWeight: FontWeight.w600)),
          if (event.location != null) ...[
            const SizedBox(height: 4),
            Row(
              children: [
                const Icon(Icons.place_outlined, size: 14, color: AppColors.textSecondary),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    event.location!,
                    style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ],
          if (guide.carPlan != null || guide.transitPlan != null) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (guide.carPlan != null) TransportChip(plan: guide.carPlan!),
                if (guide.transitPlan != null) TransportChip(plan: guide.transitPlan!),
              ],
            ),
          ],
          if (guide.weather != null) ...[
            const SizedBox(height: 8),
            Text(
              '예상 기온 ${guide.weather!.tempC.round()}℃ · 강수확률 ${guide.weather!.precipitationProbability}%',
              style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
            ),
          ],
        ],
      ),
    );
  }

  String _formatRange(DateTime start, DateTime end) {
    String fmt(DateTime d) => '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
    return '${fmt(start)} - ${fmt(end)}';
  }
}

class _RoleTag extends StatelessWidget {
  const _RoleTag({required this.role});

  final EventAttendeeRole role;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: AppColors.spacePanelAlt,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.neonPurple.withOpacity(0.5)),
      ),
      child: Text(role.label, style: const TextStyle(color: AppColors.neonPurple, fontSize: 10)),
    );
  }
}
