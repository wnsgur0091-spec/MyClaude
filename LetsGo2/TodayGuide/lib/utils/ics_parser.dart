import '../models/schedule_event.dart';

/// RFC5545 iCalendar에서 VEVENT만 최소 파싱한다.
/// (반복 규칙 RRULE, 타임존 VTIMEZONE 등은 다루지 않는다 — TimeTree 공유
/// 캘린더 링크를 단순 조회하는 용도로 필요한 범위만 지원한다.)
class IcsParser {
  static List<ScheduleEvent> parseEvents(String icsText) {
    final unfolded = _unfold(icsText);
    final lines = unfolded.split('\n').map((l) => l.trimRight()).toList();

    final events = <ScheduleEvent>[];
    Map<String, String>? current;

    for (final line in lines) {
      if (line == 'BEGIN:VEVENT') {
        current = {};
        continue;
      }
      if (line == 'END:VEVENT') {
        if (current != null) {
          final event = _toEvent(current);
          if (event != null) events.add(event);
        }
        current = null;
        continue;
      }
      if (current == null) continue;

      final separatorIndex = line.indexOf(':');
      if (separatorIndex == -1) continue;
      final rawKey = line.substring(0, separatorIndex);
      final value = line.substring(separatorIndex + 1);
      final key = rawKey.split(';').first.toUpperCase();
      current[key] = value;
    }

    return events;
  }

  static String _unfold(String text) {
    return text.replaceAll('\r\n', '\n').replaceAll(RegExp(r'\n[ \t]'), '');
  }

  static ScheduleEvent? _toEvent(Map<String, String> fields) {
    final uid = fields['UID'];
    final summary = fields['SUMMARY'] ?? '(제목 없음)';
    final dtStart = fields['DTSTART'];
    if (uid == null || dtStart == null) return null;

    final start = _parseDate(dtStart);
    if (start == null) return null;

    final isAllDay = dtStart.length == 8;
    if (isAllDay) {
      return ScheduleEvent.allDay(id: uid, title: summary, date: start, location: fields['LOCATION']);
    }

    final dtEnd = fields['DTEND'];
    final end = dtEnd != null ? _parseDate(dtEnd) : null;
    return ScheduleEvent(
      id: uid,
      title: summary,
      start: start,
      end: end ?? start.add(const Duration(hours: 1)),
      location: fields['LOCATION'],
    );
  }

  static DateTime? _parseDate(String value) {
    final cleaned = value.trim();
    try {
      if (cleaned.length == 8) {
        return DateTime(
          int.parse(cleaned.substring(0, 4)),
          int.parse(cleaned.substring(4, 6)),
          int.parse(cleaned.substring(6, 8)),
        );
      }
      final isUtc = cleaned.endsWith('Z');
      final digits = isUtc ? cleaned.substring(0, cleaned.length - 1) : cleaned;
      final year = int.parse(digits.substring(0, 4));
      final month = int.parse(digits.substring(4, 6));
      final day = int.parse(digits.substring(6, 8));
      final hour = int.parse(digits.substring(9, 11));
      final minute = int.parse(digits.substring(11, 13));
      final second = digits.length >= 15 ? int.parse(digits.substring(13, 15)) : 0;
      if (isUtc) {
        return DateTime.utc(year, month, day, hour, minute, second).toLocal();
      }
      return DateTime(year, month, day, hour, minute, second);
    } catch (_) {
      return null;
    }
  }
}
