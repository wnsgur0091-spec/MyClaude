import 'package:http/http.dart' as http;

import '../../models/schedule_event.dart';
import '../../utils/ics_parser.dart';
import 'calendar_service.dart';

/// TimeTree는 서드파티 개발자에게 공식 REST 조회 API를 제공하지 않는다
/// (공개 API가 종료된 상태). 대신 캘린더 상세 화면의 "캘린더 내보내기"에서
/// 얻을 수 있는 webcal/ICS 공유 링크를 그대로 구독해서 일정을 읽어온다.
/// 이 URL은 온보딩에서 사용자가 직접 입력한다.
class TimeTreeIcsService implements CalendarService {
  TimeTreeIcsService({required this.icsUrl, http.Client? client}) : _client = client ?? http.Client();

  final String icsUrl;
  final http.Client _client;

  @override
  Future<List<ScheduleEvent>> fetchEventsForDate(DateTime date) async {
    final uri = Uri.parse(icsUrl.replaceFirst('webcal://', 'https://'));
    final response = await _client.get(uri);
    if (response.statusCode != 200) {
      throw StateError('TimeTree 캘린더(ICS) 조회 실패 (${response.statusCode})');
    }
    final allEvents = IcsParser.parseEvents(response.body);
    final dayStart = DateTime(date.year, date.month, date.day);
    final dayEnd = dayStart.add(const Duration(days: 1));
    return allEvents.where((e) => e.start.isBefore(dayEnd) && e.end.isAfter(dayStart)).toList();
  }
}
