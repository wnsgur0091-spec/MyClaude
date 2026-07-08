import '../../models/event_attendee_role.dart';
import '../../models/schedule_event.dart';
import '../diagnostic_log.dart';
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
    final dayStart = DateTime(now.year, now.month, now.day);
    // TimeTree sync API는 페이지네이션 커서가 시간순이 아니라서 요청 단계에서
    // 기간을 제한할 수 없다(전체를 받아와야 함). 대신 오늘 이전에 완전히
    // 끝난 과거 일정은 이후 계산(dedup/정렬/다음 일정 탐색)에서 전혀 쓰이지
    // 않으므로, 파싱 직후에 걸러내서 뒤쪽 처리량을 줄인다.
    final converted = raw.map(_toScheduleEvent).where(_isSane).where((e) => e.end.isAfter(dayStart)).toList();

    // TimeTree의 sync API가 같은 일정을 두 번 내려주는 경우(페이지네이션
    // 겹침, 반복 일정의 원본+수정 인스턴스가 같이 오는 경우 등)가 있어서,
    // id가 달라도 제목+시작+종료 시각이 같으면 같은 일정으로 보고 하나만
    // 남긴다(마지막 것이 가장 최신 상태이므로 그걸 남김).
    final dedup = <String, ScheduleEvent>{};
    for (final e in converted) {
      dedup['${e.title}|${e.start.millisecondsSinceEpoch}|${e.end.millisecondsSinceEpoch}'] = e;
    }
    final all = dedup.values.toList()..sort((a, b) => a.start.compareTo(b.start));

    final dayEnd = dayStart.add(const Duration(days: 1));
    final todayEvents = all.where((e) => e.start.isBefore(dayEnd) && e.end.isAfter(dayStart)).toList();

    // nextUpcoming(역할 무관, D+N 미리보기용)과 nextOwnUpcoming(본인/같이만,
    // 실제 알림 대상)을 한 번의 순회로 함께 찾는다. all이 시작시각 오름차순
    // 정렬돼 있어서 각각 처음 만나는 조건 일치 일정이 곧 "가장 빠른 것"이다.
    ScheduleEvent? nextUpcoming;
    ScheduleEvent? nextOwnUpcoming;
    for (final e in all) {
      if (!e.start.isAfter(now)) continue;
      nextUpcoming ??= e;
      if (nextOwnUpcoming == null &&
          (e.attendeeRole == EventAttendeeRole.me || e.attendeeRole == EventAttendeeRole.both)) {
        nextOwnUpcoming = e;
      }
      if (nextOwnUpcoming != null) break;
    }

    // nextUpcoming이 속한 날짜의 일정 전체(역할 무관). "다음 일정" 미리보기가
    // 그날 가장 빠른 일정 하나만 보여주면, 같은 날 뒤에 있는 배우자 단독
    // 일정이 가려져서 안 보이는 문제가 있었다 — 오늘의 동선과 같은 방식으로
    // 그날 전체를 노출한다.
    List<ScheduleEvent> upcomingDayEvents = const [];
    if (nextUpcoming != null) {
      final upcomingDayStart = DateTime(nextUpcoming.start.year, nextUpcoming.start.month, nextUpcoming.start.day);
      final upcomingDayEnd = upcomingDayStart.add(const Duration(days: 1));
      upcomingDayEvents =
          all.where((e) => e.start.isBefore(upcomingDayEnd) && e.end.isAfter(upcomingDayStart)).toList();
    }

    await DiagnosticLog.log(
        'TimeTree 조회: 전체 ${all.length}건, 오늘 ${todayEvents.length}건, 다음 일정 날짜 일정 ${upcomingDayEvents.length}건'
        '${upcomingDayEvents.isNotEmpty ? ' (${upcomingDayEvents.map((e) => '"${e.title}"/${e.attendeeRole.label}').join(', ')})' : ''}');

    return CalendarFetchResult(
      todayEvents: todayEvents,
      nextUpcomingEvent: nextUpcoming,
      nextOwnUpcomingEvent: nextOwnUpcoming,
      upcomingDayEvents: upcomingDayEvents,
    );
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
    final start = DateTime.fromMillisecondsSinceEpoch(startAt, isUtc: true).toLocal();
    var end = DateTime.fromMillisecondsSinceEpoch(endAt, isUtc: true).toLocal();
    // end_at만 이상한 값으로 내려오는 경우(연도가 상식 밖이거나 start보다
    // 이전)를 대비한 방어 코드. _isSane은 start만 검사하기 때문에 이런
    // 일정을 걸러내지 못하고, 그 상태로 시간대별 날씨 계산(hourlyBreakdown)에
    // 넘기면 두 시각 사이를 1시간씩 순회하다 사실상 무한 반복에 빠져 앱이
    // 멈춘다. 일정 자체를 지우는 대신 1시간짜리로 보정해서 계속 보여준다.
    if (end.year < 2000 || end.year > 2100 || end.isBefore(start)) {
      end = start.add(const Duration(hours: 1));
    }
    return ScheduleEvent(
      id: id,
      title: title,
      start: start,
      end: end,
      location: location,
      attendeeRole: role,
    );
  }
}
