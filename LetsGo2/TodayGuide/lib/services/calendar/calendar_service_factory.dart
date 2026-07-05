import '../../models/calendar_provider_type.dart';
import '../../models/user_settings.dart';
import 'calendar_service.dart';
import 'google_calendar_service.dart';
import 'timetree_ics_service.dart';

CalendarService buildCalendarService(UserSettings settings) {
  switch (settings.calendarProvider) {
    case CalendarProviderType.googleCalendar:
      return GoogleCalendarService();
    case CalendarProviderType.timeTree:
      return TimeTreeIcsService(icsUrl: settings.timeTreeIcsUrl ?? '');
  }
}
