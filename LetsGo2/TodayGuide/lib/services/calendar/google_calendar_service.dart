import 'dart:convert';

import 'package:google_sign_in/google_sign_in.dart';
import 'package:http/http.dart' as http;

import '../../models/schedule_event.dart';
import 'calendar_service.dart';

/// Google Calendar API v3(https://www.googleapis.com/calendar/v3) 연동.
/// 필요 OAuth 스코프: https://www.googleapis.com/auth/calendar.readonly
class GoogleCalendarService implements CalendarService {
  GoogleCalendarService({GoogleSignIn? googleSignIn})
      : _googleSignIn = googleSignIn ??
            GoogleSignIn(scopes: const ['https://www.googleapis.com/auth/calendar.readonly']);

  final GoogleSignIn _googleSignIn;

  Future<GoogleSignInAccount?> signIn() => _googleSignIn.signIn();

  Future<void> signOut() => _googleSignIn.signOut();

  GoogleSignInAccount? get currentUser => _googleSignIn.currentUser;

  @override
  Future<List<ScheduleEvent>> fetchEventsForDate(DateTime date) async {
    final account = _googleSignIn.currentUser ?? await _googleSignIn.signInSilently();
    if (account == null) {
      throw StateError('Google 계정으로 로그인되어 있지 않습니다.');
    }
    final authHeaders = await account.authHeaders;

    final dayStart = DateTime(date.year, date.month, date.day);
    final dayEnd = dayStart.add(const Duration(days: 1));
    final uri = Uri.https('www.googleapis.com', '/calendar/v3/calendars/primary/events', {
      'timeMin': dayStart.toUtc().toIso8601String(),
      'timeMax': dayEnd.toUtc().toIso8601String(),
      'singleEvents': 'true',
      'orderBy': 'startTime',
    });

    final response = await http.get(uri, headers: authHeaders);
    if (response.statusCode != 200) {
      throw StateError('Google Calendar 조회 실패 (${response.statusCode}): ${response.body}');
    }

    final body = jsonDecode(response.body) as Map<String, dynamic>;
    final items = body['items'] as List<dynamic>? ?? const [];

    return items.map((raw) {
      final item = raw as Map<String, dynamic>;
      final start = item['start'] as Map<String, dynamic>;
      final end = item['end'] as Map<String, dynamic>;
      final isAllDay = start['date'] != null;

      if (isAllDay) {
        return ScheduleEvent.allDay(
          id: item['id'] as String,
          title: (item['summary'] as String?) ?? '(제목 없음)',
          date: DateTime.parse(start['date'] as String),
          location: item['location'] as String?,
        );
      }

      return ScheduleEvent(
        id: item['id'] as String,
        title: (item['summary'] as String?) ?? '(제목 없음)',
        start: DateTime.parse(start['dateTime'] as String).toLocal(),
        end: DateTime.parse(end['dateTime'] as String).toLocal(),
        location: item['location'] as String?,
      );
    }).toList();
  }
}
