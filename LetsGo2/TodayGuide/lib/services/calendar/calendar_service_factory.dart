import '../../models/user_settings.dart';
import 'calendar_service.dart';
import 'timetree_api_service.dart';

CalendarService buildCalendarService(UserSettings settings) {
  return TimeTreeApiService(
    calendarId: settings.timeTreeCalendarId ?? '',
    labelRoles: settings.timeTreeLabelRoles,
  );
}
