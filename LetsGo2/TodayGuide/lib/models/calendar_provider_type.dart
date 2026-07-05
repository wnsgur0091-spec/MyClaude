/// 초기 셋팅에서 선택하는 일정 관리 앱
enum CalendarProviderType {
  googleCalendar,
  timeTree;

  String get label {
    switch (this) {
      case CalendarProviderType.googleCalendar:
        return 'Google Calendar';
      case CalendarProviderType.timeTree:
        return 'TimeTree';
    }
  }

  static CalendarProviderType fromName(String name) {
    return CalendarProviderType.values.firstWhere(
      (e) => e.name == name,
      orElse: () => CalendarProviderType.googleCalendar,
    );
  }
}
