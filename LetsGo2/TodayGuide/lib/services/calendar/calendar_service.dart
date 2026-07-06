import '../../models/schedule_event.dart';

/// 하루치 일정 조회 결과 + 조회 시점 기준 가장 가까운 다음 일정.
class CalendarFetchResult {
  const CalendarFetchResult({required this.todayEvents, required this.nextUpcomingEvent});

  /// 조회한 날짜(자정~다음날 자정) 동안 진행되는 일정.
  final List<ScheduleEvent> todayEvents;

  /// 조회 시점 이후 시작하는 일정 중 가장 빠른 것(본인 또는 같이 하는 일정만).
  /// 오늘 이후의 날짜여도 상관없다. 없으면 null.
  final ScheduleEvent? nextUpcomingEvent;
}

/// 하루치 일정을 읽어오는 공통 인터페이스.
abstract class CalendarService {
  /// [now]가 속한 하루치 일정과, [now] 이후 가장 가까운 다음 일정을 함께 가져온다.
  /// 앱을 열거나 새로고침할 때마다 매번 새로 호출된다(당일 캐시 없음).
  Future<CalendarFetchResult> fetchTodayAndNext(DateTime now);
}
