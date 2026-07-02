/// 캘린더에서 읽어온 오늘의 일정 하나.
///
/// '종일' 일정은 온보딩에서 고지한 규칙대로 09:00~18:00 구간으로 정규화해서 담는다.
class ScheduleEvent {
  final String id;
  final String title;
  final DateTime start;
  final DateTime end;
  final String? location;
  final bool isAllDay;

  const ScheduleEvent({
    required this.id,
    required this.title,
    required this.start,
    required this.end,
    this.location,
    this.isAllDay = false,
  });

  /// '종일' 일정 표준화: 오전 9시 ~ 오후 6시.
  factory ScheduleEvent.allDay({
    required String id,
    required String title,
    required DateTime date,
    String? location,
  }) {
    final day = DateTime(date.year, date.month, date.day);
    return ScheduleEvent(
      id: id,
      title: title,
      start: day.add(const Duration(hours: 9)),
      end: day.add(const Duration(hours: 18)),
      location: location,
      isAllDay: true,
    );
  }

  Duration get duration => end.difference(start);
}
