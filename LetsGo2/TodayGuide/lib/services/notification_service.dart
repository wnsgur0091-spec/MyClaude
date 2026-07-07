import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest.dart' as tz_data;
import 'package:timezone/timezone.dart' as tz;

import '../models/event_attendee_role.dart';
import '../models/schedule_event.dart';
import 'diagnostic_log.dart';

/// 일정마다 시작 3시간 전에 출발 준비 알림을 보낸다. 이게 유일한 알림
/// 체계다(고정 시각 알람은 없음).
/// 알림 자체에는 미리 계산된 지침을 담지 않고, 사용자가 알림을 탭한 시점에만
/// 위치/일정/날씨를 계산한다(트리거 시점의 제약을 피하기 위한 설계 — GPS를
/// 못 가져오면 기본 출발지로 대체하는 로직도 그 계산 시점에 동일하게 적용됨).
/// 알림 발송 시점에 미리 위치를 계산해서 내용에 담지 않는 이유는, 안드로이드
/// 백그라운드 실행 제약(특히 삼성 기기의 공격적인 절전 프로세스 종료) 때문에
/// "정확한 시각에 백그라운드에서 GPS+길찾기를 계산"하는 방식은 실제로는 자주
/// 실패하거나 지연될 수 있어서다.
class NotificationService {
  NotificationService(this._plugin);

  final FlutterLocalNotificationsPlugin _plugin;

  static const tapPayload = 'open_today_guide';

  static const _eventReminderChannelId = 'today_guide_event_reminder';
  static const _eventReminderChannelName = '일정 출발 준비 알림';
  static const _eventReminderIdBase = 2000;
  static const _eventReminderSlotCount = 50;
  static const _reminderLeadTime = Duration(hours: 3);

  static const _dailyGreetingChannelId = 'today_guide_daily_greeting';
  static const _dailyGreetingChannelName = '아침 인사말 알림';
  static const _dailyGreetingNotificationId = 3000;
  static const _dailyGreetingHour = 7;
  static const _dailyGreetingMinute = 0;

  /// 예전 버전(고정 시각 일일 알람)에서 쓰던 알림 id. 남아있으면 취소만 한다.
  static const _legacyDailyNotificationId = 1001;

  static Future<NotificationService> create({
    required void Function(String? payload) onNotificationTap,
  }) async {
    tz_data.initializeTimeZones();
    tz.setLocalLocation(tz.getLocation('Asia/Seoul'));

    final plugin = FlutterLocalNotificationsPlugin();
    const androidInit = AndroidInitializationSettings('@drawable/ic_notification');
    const initSettings = InitializationSettings(android: androidInit);

    await plugin.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (response) => onNotificationTap(response.payload),
    );
    await plugin.cancel(_legacyDailyNotificationId);

    return NotificationService(plugin);
  }

  Future<void> requestPermission() async {
    await _plugin
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.requestNotificationsPermission();
  }

  /// 예약된 일정 알림을 전부 취소한다. 앱 초기화 시 사용. 매일 아침 인사말
  /// 알림은 일정/계정과 무관한 별도 알람이라 여기서 건드리지 않는다.
  Future<void> cancelAll() async {
    for (var i = 0; i < _eventReminderSlotCount; i++) {
      await _plugin.cancel(_eventReminderIdBase + i);
    }
  }

  /// 매일 아침 7시에 "오늘의 지침서를 확인해보세요" 알림을 보낸다. 일정
  /// 알림과 같은 이유로(안드로이드 백그라운드 실행 제약) 실제 날씨/일정
  /// 기반 인사말을 미리 계산해서 담지 않는다 — 탭해서 앱을 열면
  /// TodayGuideScreen이 그 시점 기준으로 계산한 인사말을 화면에 보여준다.
  /// [DateTimeComponents.time]으로 예약해서 한 번 예약하면 매일 반복된다.
  Future<void> scheduleDailyGreeting() async {
    final now = tz.TZDateTime.now(tz.local);
    var fireAt = tz.TZDateTime(tz.local, now.year, now.month, now.day, _dailyGreetingHour, _dailyGreetingMinute);
    if (!fireAt.isAfter(now)) {
      fireAt = fireAt.add(const Duration(days: 1));
    }

    try {
      await _plugin.zonedSchedule(
        _dailyGreetingNotificationId,
        '좋은 아침이에요!',
        '오늘의 지침서를 확인해보세요.',
        fireAt,
        const NotificationDetails(
          android: AndroidNotificationDetails(
            _dailyGreetingChannelId,
            _dailyGreetingChannelName,
            channelDescription: '매일 아침 7시에 오늘의 지침서 확인을 알려줍니다.',
            importance: Importance.high,
            priority: Priority.high,
          ),
        ),
        androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
        uiLocalNotificationDateInterpretation: UILocalNotificationDateInterpretation.absoluteTime,
        matchDateTimeComponents: DateTimeComponents.time,
        payload: tapPayload,
      );
      await DiagnosticLog.log('아침 인사말 알림 예약: 매일 $_dailyGreetingHour시 $_dailyGreetingMinute분');
    } catch (e) {
      await DiagnosticLog.log('아침 인사말 알림 예약 실패: $e');
    }
  }

  /// 조회된 일정을 기준으로, 각 일정 시작 3시간 전에 출발 준비 알림을
  /// 예약한다. 본인 일정과 같이 하는 일정만 알림을 보내고, 배우자 단독
  /// 일정 및 역할 미지정 일정은 제외한다. 이미 3시간 전 시점이 지난
  /// 일정도 건너뛴다. 앱을 열거나 새로고침할 때마다 호출돼서 최신 일정
  /// 기준으로 다시 계산된다.
  Future<void> scheduleEventReminders(List<ScheduleEvent> events) async {
    for (var i = 0; i < _eventReminderSlotCount; i++) {
      await _plugin.cancel(_eventReminderIdBase + i);
    }

    final now = tz.TZDateTime.now(tz.local);
    final relevant = events
        .where((e) => e.attendeeRole == EventAttendeeRole.me || e.attendeeRole == EventAttendeeRole.both)
        .toList();

    var scheduledCount = 0;
    for (var i = 0; i < relevant.length && i < _eventReminderSlotCount; i++) {
      final event = relevant[i];
      final fireAt = tz.TZDateTime.from(event.start.subtract(_reminderLeadTime), tz.local);
      if (!fireAt.isAfter(now)) continue;

      try {
        await _plugin.zonedSchedule(
          _eventReminderIdBase + i,
          '곧 "${event.title}" 일정이 있어요',
          '3시간 후 시작이에요. 지금 위치 기준으로 출발 준비를 확인해보세요.',
          fireAt,
          const NotificationDetails(
            android: AndroidNotificationDetails(
              _eventReminderChannelId,
              _eventReminderChannelName,
              channelDescription: '일정 시작 3시간 전에 출발 준비를 알려줍니다.',
              importance: Importance.high,
              priority: Priority.high,
            ),
          ),
          androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
          uiLocalNotificationDateInterpretation: UILocalNotificationDateInterpretation.absoluteTime,
          payload: tapPayload,
        );
        scheduledCount++;
        await DiagnosticLog.log('알림 예약: "${event.title}" -> $fireAt');
      } catch (e) {
        // 일정 하나의 알림 예약이 실패해도(예: 비정상적인 시각) 나머지
        // 일정의 알림과 오늘의 지침서 전체 계산은 계속 진행되어야 한다.
        // 다만 조용히 무시하면 나중에 왜 알림이 안 왔는지 추적할 수 없으므로 기록은 남긴다.
        await DiagnosticLog.log('알림 예약 실패: "${event.title}" ($fireAt) - $e');
      }
    }
    await DiagnosticLog.log('알림 재예약 완료: 대상 ${relevant.length}건 중 $scheduledCount건 예약됨');
  }
}
