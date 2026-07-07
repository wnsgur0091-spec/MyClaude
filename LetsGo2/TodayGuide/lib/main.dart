import 'package:flutter/material.dart';

import 'models/user_settings.dart';
import 'screens/home/today_guide_screen.dart';
import 'screens/onboarding/onboarding_screen.dart';
import 'screens/settings/settings_screen.dart';
import 'services/calendar/timetree_account_service.dart';
import 'services/device_role_service.dart';
import 'services/event_location_override_repository.dart';
import 'services/notification_service.dart';
import 'services/settings_repository.dart';
import 'theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final settingsRepository = SettingsRepository();
  final initialSettings = await settingsRepository.load();
  runApp(TodayGuideApp(settingsRepository: settingsRepository, initialSettings: initialSettings));
}

class TodayGuideApp extends StatefulWidget {
  const TodayGuideApp({super.key, required this.settingsRepository, required this.initialSettings});

  final SettingsRepository settingsRepository;
  final UserSettings initialSettings;

  @override
  State<TodayGuideApp> createState() => _TodayGuideAppState();
}

class _TodayGuideAppState extends State<TodayGuideApp> {
  final _navigatorKey = GlobalKey<NavigatorState>();

  late UserSettings _settings = widget.initialSettings;
  NotificationService? _notificationService;

  @override
  void initState() {
    super.initState();
    _initNotifications();
    _detectSpouseDeviceIfNeeded();
  }

  /// 최초 실행 시 기종으로 "이 기기가 배우자 기기인지" 자동 추정한다.
  /// 이미 값이 있으면(자동 추정됐거나 설정에서 수동으로 바꿨으면) 건드리지 않는다.
  Future<void> _detectSpouseDeviceIfNeeded() async {
    if (_settings.isSpouseDevice != null) return;
    final isSpouseDevice = await DeviceRoleService().detectIsSpouseDevice();
    final updated = _settings.copyWith(isSpouseDevice: isSpouseDevice);
    await widget.settingsRepository.save(updated);
    if (mounted) setState(() => _settings = updated);
  }

  Future<void> _initNotifications() async {
    final service = await NotificationService.create(
      onNotificationTap: (payload) {
        // 알림을 탭한 시점에 홈 화면으로 돌아가면, TodayGuideScreen이 그 시점의
        // 현재 위치를 기준으로 지침을 새로 계산한다(트리거 시점 계산 회피 설계).
        _navigatorKey.currentState?.popUntil((route) => route.isFirst);
      },
    );
    await service.requestPermission();
    await service.scheduleDailyGreeting();
    if (mounted) setState(() => _notificationService = service);
  }

  Future<void> _handleOnboardingComplete(UserSettings settings) async {
    await widget.settingsRepository.save(settings);
    if (mounted) setState(() => _settings = settings);
  }

  Future<void> _handleSettingsSaved(UserSettings settings) async {
    await widget.settingsRepository.save(settings);
    if (mounted) setState(() => _settings = settings);
  }

  /// 설정/로그인/일정 장소 오버라이드/예약된 알림을 모두 지우고 온보딩부터
  /// 다시 시작하게 한다.
  Future<void> _resetApp() async {
    await _notificationService?.cancelAll();
    await widget.settingsRepository.clear();
    await TimeTreeAccountService().logout();
    await EventLocationOverrideRepository().clearAll();
    if (mounted) setState(() => _settings = const UserSettings());
  }

  void _openSettings() {
    _navigatorKey.currentState?.push(
      MaterialPageRoute(
        builder: (_) => SettingsScreen(settings: _settings, onSave: _handleSettingsSaved),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: _navigatorKey,
      title: '오늘의 지침서',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.dark,
      home: _settings.onboardingCompleted
          ? TodayGuideScreen(
              settings: _settings,
              onOpenSettings: _openSettings,
              onEventsFetched: (events) => _notificationService?.scheduleEventReminders(events) ?? Future.value(),
              onResetApp: _resetApp,
            )
          : OnboardingScreen(onComplete: _handleOnboardingComplete),
    );
  }
}
