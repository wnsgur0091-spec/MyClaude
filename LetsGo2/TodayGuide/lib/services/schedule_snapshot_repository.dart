import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/event_attendee_role.dart';
import '../models/schedule_event.dart';

/// 온보딩 고지사항("당일 추가/수정된 일정은 반영되지 않는다")을 지키기 위한 캐시.
///
/// 진짜 "전날 밤" 배치 수집은 OS 백그라운드 실행 제약이 커서(WorkManager 등
/// 별도 네이티브 작업 필요) 이번 버전에서는 하루 중 최초 조회 시점의 일정을
/// 그날의 스냅샷으로 고정해 재사용하는 방식으로 근사한다. 보통 최초 조회는
/// 오전 알람을 탭했을 때 일어나므로 실사용 흐름에서는 요구사항과 동일하게
/// 동작한다. 정식 야간 배치가 필요하면 android/ 쪽에 WorkManager 연동을
/// 추가해야 한다.
class ScheduleSnapshotRepository {
  static const _dateKey = 'today_guide.snapshot_date';
  static const _eventsKey = 'today_guide.snapshot_events';

  Future<List<ScheduleEvent>?> readTodaySnapshot(DateTime today) async {
    final prefs = await SharedPreferences.getInstance();
    final storedDate = prefs.getString(_dateKey);
    if (storedDate != _dateKeyFor(today)) return null;
    final raw = prefs.getString(_eventsKey);
    if (raw == null) return null;
    final list = jsonDecode(raw) as List<dynamic>;
    return list.map((e) => _fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> writeTodaySnapshot(DateTime today, List<ScheduleEvent> events) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_dateKey, _dateKeyFor(today));
    await prefs.setString(_eventsKey, jsonEncode(events.map(_toJson).toList()));
  }

  String _dateKeyFor(DateTime date) =>
      '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';

  Map<String, dynamic> _toJson(ScheduleEvent e) => {
        'id': e.id,
        'title': e.title,
        'start': e.start.toIso8601String(),
        'end': e.end.toIso8601String(),
        'location': e.location,
        'isAllDay': e.isAllDay,
        'attendeeRole': e.attendeeRole.name,
      };

  ScheduleEvent _fromJson(Map<String, dynamic> json) => ScheduleEvent(
        id: json['id'] as String,
        title: json['title'] as String,
        start: DateTime.parse(json['start'] as String),
        end: DateTime.parse(json['end'] as String),
        location: json['location'] as String?,
        isAllDay: json['isAllDay'] as bool? ?? false,
        attendeeRole: EventAttendeeRole.fromName(json['attendeeRole'] as String?),
      );
}
