import '../../models/schedule_event.dart';

/// 하루치 일정 조회 결과 + 조회 시점 기준 가장 가까운 다음 일정.
class CalendarFetchResult {
  const CalendarFetchResult({
    required this.todayEvents,
    required this.nextUpcomingEvent,
    required this.nextOwnUpcomingEvent,
    required this.upcomingDayEvents,
  });

  /// 조회한 날짜(자정~다음날 자정) 동안 진행되는 일정. 역할과 무관하게 전부 포함한다
  /// (배우자 단독 일정도 포함돼야 오늘의 동선에서 확인할 수 있다).
  final List<ScheduleEvent> todayEvents;

  /// 조회 시점 이후 시작하는 일정 중 가장 빠른 것(역할 무관, 배우자 단독 일정
  /// 포함). "다음 일정" 미리보기(D+N 탭, 인사말 문구)에 쓴다. 오늘 이후의
  /// 날짜여도 상관없다. 없으면 null.
  final ScheduleEvent? nextUpcomingEvent;

  /// 조회 시점 이후 시작하는 일정 중 본인 또는 같이 하는 일정만 골라 가장
  /// 빠른 것. 실제로 알림(3시간 전)이 울리는 대상이라 알림 안내 배너에는
  /// 이걸 써야 한다(배우자 단독 일정은 알림이 안 울리므로 [nextUpcomingEvent]를
  /// 쓰면 안 울릴 알림을 울린다고 안내하게 된다). 없으면 null.
  final ScheduleEvent? nextOwnUpcomingEvent;

  /// [nextUpcomingEvent]가 속한 날짜(오늘이 아닌 미래 날짜) 동안 진행되는
  /// 일정 전체(역할 무관). "다음 일정" 미리보기는 그날 가장 빠른 일정 하나만
  /// 보여주면 같은 날 뒤에 있는 배우자 단독 일정이 가려지는 문제가 있어서,
  /// 오늘의 동선과 동일하게 그날 전체를 보여주는 데 쓴다. nextUpcomingEvent가
  /// 없으면 빈 리스트.
  final List<ScheduleEvent> upcomingDayEvents;
}

/// 하루치 일정을 읽어오는 공통 인터페이스.
abstract class CalendarService {
  /// [now]가 속한 하루치 일정과, [now] 이후 가장 가까운 다음 일정을 함께 가져온다.
  /// 앱을 열거나 새로고침할 때마다 매번 새로 호출된다(당일 캐시 없음).
  Future<CalendarFetchResult> fetchTodayAndNext(DateTime now);
}
