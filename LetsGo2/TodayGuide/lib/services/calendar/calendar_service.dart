import '../../models/schedule_event.dart';

/// 하루치 일정을 읽어오는 공통 인터페이스.
/// 온보딩에서 선택한 제공자(Google Calendar / TimeTree)에 따라 구현체가 바뀐다.
abstract class CalendarService {
  Future<List<ScheduleEvent>> fetchEventsForDate(DateTime date);
}
