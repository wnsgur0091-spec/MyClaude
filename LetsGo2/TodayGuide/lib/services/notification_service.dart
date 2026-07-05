import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest.dart' as tz_data;
import 'package:timezone/timezone.dart' as tz;

/// 매일 사용자가 설정한 시각(디폴트 08:00)에 "오늘의 지침서" 알림을 보낸다.
/// 알림 자체에는 미리 계산된 지침을 담지 않고, 사용자가 알림을 탭한 시점에만
/// 위치/일정/날씨를 계산한다(트리거 시점의 제약을 피하기 위한 설계).
class NotificationService {
  NotificationService(this._plugin);

  final FlutterLocalNotificationsPlugin _plugin;

  static const _channelId = 'today_guide_daily';
  static const _channelName = '오늘의 지침서';
  static const _notificationId = 1001;
  static const tapPayload = 'open_today_guide';

  static Future<NotificationService> create({
    required void Function(String? payload) onNotificationTap,
  }) async {
    tz_data.initializeTimeZones();
    tz.setLocalLocation(tz.getLocation('Asia/Seoul'));

    final plugin = FlutterLocalNotificationsPlugin();
    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    const initSettings = InitializationSettings(android: androidInit);

    await plugin.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (response) => onNotificationTap(response.payload),
    );

    return NotificationService(plugin);
  }

  Future<void> requestPermission() async {
    await _plugin
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.requestNotificationsPermission();
  }

  Future<void> scheduleDaily({required int hour, required int minute}) async {
    await _plugin.zonedSchedule(
      _notificationId,
      '오늘의 지침서가 도착했어요',
      '오늘의 동선과 옷차림, 준비물을 확인해보세요.',
      _nextInstanceOf(hour, minute),
      const NotificationDetails(
        android: AndroidNotificationDetails(
          _channelId,
          _channelName,
          channelDescription: '매일 설정한 시각에 오늘의 지침서를 알려줍니다.',
          importance: Importance.high,
          priority: Priority.high,
        ),
      ),
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      matchDateTimeComponents: DateTimeComponents.time,
      payload: tapPayload,
    );
  }

  tz.TZDateTime _nextInstanceOf(int hour, int minute) {
    final now = tz.TZDateTime.now(tz.local);
    var scheduled = tz.TZDateTime(tz.local, now.year, now.month, now.day, hour, minute);
    if (scheduled.isBefore(now)) {
      scheduled = scheduled.add(const Duration(days: 1));
    }
    return scheduled;
  }
}
