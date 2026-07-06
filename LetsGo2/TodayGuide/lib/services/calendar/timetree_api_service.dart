import '../../models/event_attendee_role.dart';
import '../../models/schedule_event.dart';
import 'calendar_service.dart';
import 'timetree_client.dart';
import 'timetree_credential_store.dart';

/// TimeTree 비공식 API(이메일/비밀번호 로그인) 기반 일정 조회.
class TimeTreeApiService implements CalendarService {
  TimeTreeApiService({
    required this.calendarId,
    this.labelRoles = const {},
    this.isSpouseDevice = false,
    TimeTreeClient? client,
    TimeTreeCredentialStore? credentialStore,
  })  : _client = client ?? TimeTreeClient(),
        _credentialStore = credentialStore ?? TimeTreeCredentialStore();

  final String calendarId;

  /// TimeTree label id -> 이 라벨이 "배우자 기기가 아닌 쪽" 기준으로 누구 일정인지.
  final Map<int, EventAttendeeRole> labelRoles;

  /// 이 기기가 배우자 기기면 labelRoles의 me/partner 해석을 뒤집는다.
  final bool isSpouseDevice;

  final TimeTreeClient _client;
  final TimeTreeCredentialStore _credentialStore;

  Future<String> _ensureSession({bool forceRelogin = false}) async {
    if (!forceRelogin) {
      final cached = await _credentialStore.readSession();
      if (cached != null) return cached;
    }

    final creds = await _credentialStore.readCredentials();
    if (creds == null) {
      throw StateError('TimeTree 계정이 연결되어 있지 않습니다. 설정에서 로그인해주세요.');
    }
    final sessionId = await _client.login(email: creds.email, password: creds.password);
    await _credentialStore.saveSession(sessionId);
    return sessionId;
  }

  Future<List<Map<String, dynamic>>> _fetchRawEvents() async {
    final sessionId = await _ensureSession();
    try {
      return await _client.getEvents(sessionId, calendarId);
    } on TimeTreeSessionExpiredException {
      final freshSessionId = await _ensureSession(forceRelogin: true);
      return await _client.getEvents(freshSessionId, calendarId);
    }
  }

  @override
  Future<CalendarFetchResult> fetchTodayAndNext(DateTime now) async {
    final raw = await _fetchRawEvents();
    // 타임스탬프 파싱이 잘못됐거나 TimeTree 쪽 데이터가 이상해서 연도가
    // 터무니없는(예: 서기 5만년대) 일정이 섞여 들어오면, 그걸 "가장 가까운
    // 다음 일정"으로 잘못 고르지 않도록 여기서 걸러낸다.
    final all = raw.map(_toScheduleEvent).where(_isSane).toList()..sort((a, b) => a.start.compareTo(b.start));

    final dayStart = DateTime(now.year, now.month, now.day);
    final dayEnd = dayStart.add(const Duration(days: 1));
    final todayEvents = all.where((e) => e.start.isBefore(dayEnd) && e.end.isAfter(dayStart)).toList();

    ScheduleEvent? nextUpcoming;
    for (final e in all) {
      if (e.start.isAfter(now) &&
          (e.attendeeRole == EventAttendeeRole.me || e.attendeeRole == EventAttendeeRole.both)) {
        nextUpcoming = e;
        break;
      }
    }

    return CalendarFetchResult(todayEvents: todayEvents, nextUpcomingEvent: nextUpcoming);
  }

  /// 파싱된 일정 시각이 상식적인 범위(2000~2100년)인지 확인한다.
  bool _isSane(ScheduleEvent event) {
    return event.start.year >= 2000 && event.start.year <= 2100;
  }

  ScheduleEvent _toScheduleEvent(Map<String, dynamic> raw) {
    final id = '${raw['uuid']}';
    final title = (raw['title'] as String?) ?? '(제목 없음)';
    final location = raw['location'] as String?;
    final isAllDay = raw['all_day'] == true;
    final labelId = raw['label_id'] as int?;
    final rawRole = labelId == null ? EventAttendeeRole.unknown : (labelRoles[labelId] ?? EventAttendeeRole.unknown);
    final role = rawRole.perspectiveFor(isSpouseDevice: isSpouseDevice);

    // TimeTree API의 start_at/end_at은 이미 밀리초 단위 유닉스 타임스탬프다
    // (초 단위가 아니다). 여기에 다시 *1000을 곱하면 날짜가 1000배 부풀려져
    // 서기 5만년대 같은 값이 나오고, 그걸 그대로 알림 예약에 넘기면
    // 플랫폼 쪽 날짜 파서가 예외를 던져 앱이 에러 화면을 띄운다.
    final startAt = (raw['start_at'] as num).toInt();

    if (isAllDay) {
      return ScheduleEvent.allDay(
        id: id,
        title: title,
        date: DateTime.fromMillisecondsSinceEpoch(startAt, isUtc: true).toLocal(),
        location: location,
        attendeeRole: role,
      );
    }

    final endAt = (raw['end_at'] as num).toInt();
    return ScheduleEvent(
      id: id,
      title: title,
      start: DateTime.fromMillisecondsSinceEpoch(startAt, isUtc: true).toLocal(),
      end: DateTime.fromMillisecondsSinceEpoch(endAt, isUtc: true).toLocal(),
      location: location,
      attendeeRole: role,
    );
  }
}
