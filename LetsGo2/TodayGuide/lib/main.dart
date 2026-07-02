import 'package:flutter/material.dart';

import 'models/user_settings.dart';
import 'screens/home/today_guide_screen.dart';
import 'screens/onboarding/onboarding_screen.dart';
import 'screens/settings/settings_screen.dart';
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
    if (_settings.onboardingCompleted) {
      await service.scheduleDaily(hour: _settings.alarmHour, minute: _settings.alarmMinute);
    }
    if (mounted) setState(() => _notificationService = service);
  }

  Future<void> _handleOnboardingComplete(UserSettings settings) async {
    await widget.settingsRepository.save(settings);
    await _notificationService?.scheduleDaily(hour: settings.alarmHour, minute: settings.alarmMinute);
    if (mounted) setState(() => _settings = settings);
  }

  Future<void> _handleSettingsSaved(UserSettings settings) async {
    await widget.settingsRepository.save(settings);
    await _notificationService?.scheduleDaily(hour: settings.alarmHour, minute: settings.alarmMinute);
    if (mounted) setState(() => _settings = settings);
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
          ? TodayGuideScreen(settings: _settings, onOpenSettings: _openSettings)
          : OnboardingScreen(onComplete: _handleOnboardingComplete),
    );
  }
}
