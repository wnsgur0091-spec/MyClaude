import 'package:flutter/material.dart';

import '../../../models/event_attendee_role.dart';
import '../../../models/today_guide_result.dart';
import '../../../theme/app_theme.dart';
import 'transport_card.dart';

class ScheduleTimelineCard extends StatelessWidget {
  const ScheduleTimelineCard({super.key, required this.guide, required this.now, this.onAddLocation});

  final EventGuide guide;

  /// 지침서를 계산한 시각. 이 시각이 일정 시작~종료 사이에 있으면
  /// "일정 소화중" 배지를 보여준다.
  final DateTime now;

  /// 장소가 없는 일정에서 "장소 입력" 버튼을 눌렀을 때 호출된다.
  final VoidCallback? onAddLocation;

  bool get _isOngoing => !now.isBefore(guide.event.start) && now.isBefore(guide.event.end);

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
              if (_isOngoing) ...[
                const SizedBox(width: 8),
                const _OngoingTag(),
              ],
              if (event.attendeeRole != EventAttendeeRole.unknown) ...[
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
                if (guide.carPlan != null) TransportChip(plan: guide.carPlan!, destinationName: event.title),
                if (guide.transitPlan != null) TransportChip(plan: guide.transitPlan!, destinationName: event.title),
              ],
            ),
          ],
          if (guide.missingLocation) ...[
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: onAddLocation,
              icon: const Icon(Icons.add_location_alt_outlined, size: 16),
              label: const Text('장소 입력하고 이동경로 계산하기'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.warning,
                side: const BorderSide(color: AppColors.warning),
              ),
            ),
          ],
        ],
      ),
    );
  }

  static const _weekdayLabels = ['월', '화', '수', '목', '금', '토', '일'];

  String _formatRange(DateTime start, DateTime end) {
    String fmt(DateTime d) => '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
    final weekday = _weekdayLabels[start.weekday - 1];
    return '${start.month}월 ${start.day}일($weekday) ${fmt(start)} - ${fmt(end)}';
  }
}

class _OngoingTag extends StatelessWidget {
  const _OngoingTag();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: AppColors.neonCyan.withOpacity(0.15),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.neonCyan.withOpacity(0.6)),
      ),
      child: const Text('일정 소화중', style: TextStyle(color: AppColors.neonCyan, fontSize: 10, fontWeight: FontWeight.bold)),
    );
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
