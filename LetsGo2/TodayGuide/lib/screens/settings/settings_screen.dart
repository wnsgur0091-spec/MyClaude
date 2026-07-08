import 'package:flutter/material.dart';

import '../../models/event_attendee_role.dart';
import '../../models/user_settings.dart';
import '../../services/battery_optimization_service.dart';
import '../../services/location_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/starfield_background.dart';
import '../../widgets/timetree_connect_section.dart';
import 'diagnostic_log_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key, required this.settings, required this.onSave});

  final UserSettings settings;
  final Future<void> Function(UserSettings settings) onSave;

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _locationService = LocationService();

  late Gender _gender;
  late final TextEditingController _homeAddressController;
  late final TextEditingController _workAddressController;
  double? _homeLat;
  double? _homeLng;
  double? _workLat;
  double? _workLng;
  bool _saving = false;

  String? _timeTreeCalendarId;
  String? _timeTreeCalendarName;
  Map<int, EventAttendeeRole> _timeTreeLabelRoles = {};
  bool _isSpouseDevice = false;
  bool _resolvingAddress = false;
  bool _ignoringBatteryOptimizations = false;

  @override
  void initState() {
    super.initState();
    final s = widget.settings;
    _gender = s.gender;
    _homeAddressController = TextEditingController(text: s.homeAddress ?? '');
    _workAddressController = TextEditingController(text: s.workAddress ?? '');
    _homeLat = s.homeLat;
    _homeLng = s.homeLng;
    _workLat = s.workLat;
    _workLng = s.workLng;
    _timeTreeCalendarId = s.timeTreeCalendarId;
    _timeTreeCalendarName = s.timeTreeCalendarName;
    _timeTreeLabelRoles = Map.of(s.timeTreeLabelRoles);
    _isSpouseDevice = s.isSpouseDevice ?? false;
    _loadBatteryOptimizationState();
  }

  Future<void> _loadBatteryOptimizationState() async {
    final ignoring = await BatteryOptimizationService.isIgnoringBatteryOptimizations();
    if (mounted) setState(() => _ignoringBatteryOptimizations = ignoring);
  }

  @override
  void dispose() {
    _homeAddressController.dispose();
    _workAddressController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: StarfieldBackground(
        child: SafeArea(
          child: Column(
            children: [
              AppBar(
                backgroundColor: Colors.transparent,
                title: const Text('설정'),
              ),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(20),
                  children: [
                    _sectionTitle('프로필'),
                    _profileSection(),
                    const SizedBox(height: 24),
                    _sectionTitle('기본 출발지'),
                    _addressField(
                      label: '집 주소',
                      controller: _homeAddressController,
                      onResolved: (lat, lng) => setState(() {
                        _homeLat = lat;
                        _homeLng = lng;
                      }),
                    ),
                    const SizedBox(height: 12),
                    _addressField(
                      label: '회사 주소',
                      controller: _workAddressController,
                      onResolved: (lat, lng) => setState(() {
                        _workLat = lat;
                        _workLng = lng;
                      }),
                    ),
                    const SizedBox(height: 24),
                    _sectionTitle('TimeTree 연동'),
                    _calendarProviderSection(),
                    const SizedBox(height: 24),
                    _sectionTitle('기기 구분'),
                    _spouseDeviceTile(),
                    const SizedBox(height: 24),
                    _sectionTitle('알림 안정성'),
                    _batteryOptimizationTile(),
                    const SizedBox(height: 24),
                    _sectionTitle('문제 해결'),
                    _diagnosticLogTile(),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(20),
                child: FilledButton(
                  onPressed: _saving ? null : _save,
                  child: _saving
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Text('저장'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _sectionTitle(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Text(text,
            style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 16)),
      );

  Widget _profileSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 8,
          children: Gender.values
              .where((g) => g != Gender.other)
              .map((g) => ChoiceChip(
                    label: Text(g.label),
                    selected: _gender == g,
                    onSelected: (_) => setState(() => _gender = g),
                  ))
              .toList(),
        ),
      ],
    );
  }

  Widget _addressField({
    required String label,
    required TextEditingController controller,
    required void Function(double lat, double lng) onResolved,
  }) {
    return Row(
      children: [
        Expanded(
          child: TextField(
            controller: controller,
            style: const TextStyle(color: AppColors.textPrimary),
            decoration: InputDecoration(labelText: label),
            onChanged: (_) => setState(() {}),
          ),
        ),
        const SizedBox(width: 8),
        IconButton(
          icon: _resolvingAddress
              ? const SizedBox(
                  height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.neonCyan))
              : const Icon(Icons.search, color: AppColors.neonCyan),
          onPressed: _resolvingAddress || controller.text.trim().isEmpty
              ? null
              : () async {
                  setState(() => _resolvingAddress = true);
                  final result = await _locationService.geocodeAddress(controller.text.trim());
                  if (result != null) onResolved(result.lat, result.lng);
                  if (mounted) setState(() => _resolvingAddress = false);
                  if (!mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                    content: Text(result == null ? '주소를 찾지 못했어요. 다시 확인해주세요.' : '주소를 확인했어요.'),
                  ));
                },
        ),
      ],
    );
  }

  Widget _calendarProviderSection() {
    return TimeTreeConnectSection(
      initialCalendarId: _timeTreeCalendarId,
      initialCalendarName: _timeTreeCalendarName,
      initialLabelRoles: _timeTreeLabelRoles,
      onChanged: ({required calendarId, required calendarName, required labelRoles}) {
        setState(() {
          _timeTreeCalendarId = calendarId;
          _timeTreeCalendarName = calendarName;
          _timeTreeLabelRoles = labelRoles;
        });
      },
    );
  }

  Widget _spouseDeviceTile() {
    return SwitchListTile(
      contentPadding: EdgeInsets.zero,
      activeColor: AppColors.neonCyan,
      value: _isSpouseDevice,
      onChanged: (v) => setState(() => _isSpouseDevice = v),
      title: const Text('이 기기는 배우자 기기예요', style: TextStyle(color: AppColors.textPrimary)),
      subtitle: const Text(
        '기종으로 자동 추정되지만, 틀렸거나 기기를 바꿨다면 여기서 직접 바꿔주세요. '
        '켜면 TimeTree 라벨의 본인/배우자 역할이 서로 바뀌어 해석돼요.',
        style: TextStyle(color: AppColors.textSecondary, fontSize: 12, height: 1.4),
      ),
    );
  }

  Widget _batteryOptimizationTile() {
    if (_ignoringBatteryOptimizations) {
      return const ListTile(
        contentPadding: EdgeInsets.zero,
        leading: Icon(Icons.check_circle, color: AppColors.neonCyan),
        title: Text('배터리 최적화 제외됨', style: TextStyle(color: AppColors.textPrimary)),
        subtitle: Text(
          '알림이 정확한 시각에 뜨도록 잘 설정돼 있어요.',
          style: TextStyle(color: AppColors.textSecondary, fontSize: 12, height: 1.4),
        ),
      );
    }
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: const Icon(Icons.battery_alert, color: AppColors.warning),
      title: const Text('배터리 최적화 제외 요청', style: TextStyle(color: AppColors.textPrimary)),
      subtitle: const Text(
        '기기가 절전 모드에서 앱을 강하게 제한하면, 예약된 알림 시각이 되어도 '
        '실제 알림이 뜨지 않을 수 있어요. 눌러서 예외로 등록해주세요.',
        style: TextStyle(color: AppColors.textSecondary, fontSize: 12, height: 1.4),
      ),
      trailing: OutlinedButton(
        onPressed: () async {
          await BatteryOptimizationService.requestIgnoreBatteryOptimizations();
          if (mounted) _loadBatteryOptimizationState();
        },
        child: const Text('요청'),
      ),
    );
  }

  Widget _diagnosticLogTile() {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: const Icon(Icons.bug_report_outlined, color: AppColors.textSecondary),
      title: const Text('진단 로그 보기', style: TextStyle(color: AppColors.textPrimary)),
      subtitle: const Text(
        '지침서 계산/알림 예약 기록이에요. 문제가 생기면 복사해서 알려주세요.',
        style: TextStyle(color: AppColors.textSecondary, fontSize: 12, height: 1.4),
      ),
      trailing: const Icon(Icons.chevron_right, color: AppColors.textSecondary),
      onTap: () => Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const DiagnosticLogScreen()),
      ),
    );
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    final updated = UserSettings(
      gender: _gender,
      homeAddress: _homeAddressController.text.trim().isEmpty ? null : _homeAddressController.text.trim(),
      homeLat: _homeLat,
      homeLng: _homeLng,
      workAddress: _workAddressController.text.trim().isEmpty ? null : _workAddressController.text.trim(),
      workLat: _workLat,
      workLng: _workLng,
      timeTreeCalendarId: _timeTreeCalendarId,
      timeTreeCalendarName: _timeTreeCalendarName,
      timeTreeLabelRoles: _timeTreeLabelRoles,
      isSpouseDevice: _isSpouseDevice,
      onboardingCompleted: true,
    );
    await widget.onSave(updated);
    if (mounted) {
      setState(() => _saving = false);
      Navigator.of(context).pop();
    }
  }
}
