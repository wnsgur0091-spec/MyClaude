import 'package:flutter/material.dart';

import '../../models/event_attendee_role.dart';
import '../../models/user_settings.dart';
import '../../services/location_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/starfield_background.dart';
import '../../widgets/timetree_connect_section.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key, required this.settings, required this.onSave});

  final UserSettings settings;
  final Future<void> Function(UserSettings settings) onSave;

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _locationService = LocationService();

  late TimeOfDay _alarmTime;
  late Gender _gender;
  late final TextEditingController _ageController;
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
  Map<int, String> _timeTreeLabelNames = {};

  @override
  void initState() {
    super.initState();
    final s = widget.settings;
    _alarmTime = TimeOfDay(hour: s.alarmHour, minute: s.alarmMinute);
    _gender = s.gender;
    _ageController = TextEditingController(text: s.age > 0 ? '${s.age}' : '');
    _homeAddressController = TextEditingController(text: s.homeAddress ?? '');
    _workAddressController = TextEditingController(text: s.workAddress ?? '');
    _homeLat = s.homeLat;
    _homeLng = s.homeLng;
    _workLat = s.workLat;
    _workLng = s.workLng;
    _timeTreeCalendarId = s.timeTreeCalendarId;
    _timeTreeCalendarName = s.timeTreeCalendarName;
    _timeTreeLabelRoles = Map.of(s.timeTreeLabelRoles);
    _timeTreeLabelNames = Map.of(s.timeTreeLabelNames);
  }

  @override
  void dispose() {
    _ageController.dispose();
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
                    _sectionTitle('알람 시각'),
                    _alarmTimeTile(),
                    const SizedBox(height: 24),
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

  Widget _alarmTimeTile() {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: const Icon(Icons.schedule, color: AppColors.neonCyan),
      title: Text(_formatTime(_alarmTime), style: const TextStyle(color: AppColors.textPrimary, fontSize: 18)),
      trailing: const Icon(Icons.chevron_right, color: AppColors.textSecondary),
      onTap: () async {
        final picked = await showTimePicker(context: context, initialTime: _alarmTime);
        if (picked != null) setState(() => _alarmTime = picked);
      },
    );
  }

  Widget _profileSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 8,
          children: Gender.values
              .map((g) => ChoiceChip(
                    label: Text(g.label),
                    selected: _gender == g,
                    onSelected: (_) => setState(() => _gender = g),
                  ))
              .toList(),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _ageController,
          keyboardType: TextInputType.number,
          style: const TextStyle(color: AppColors.textPrimary),
          decoration: const InputDecoration(labelText: '나이'),
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
          ),
        ),
        const SizedBox(width: 8),
        IconButton(
          icon: const Icon(Icons.search, color: AppColors.neonCyan),
          onPressed: controller.text.trim().isEmpty
              ? null
              : () async {
                  final result = await _locationService.geocodeAddress(controller.text.trim());
                  if (result != null) {
                    onResolved(result.lat, result.lng);
                  } else if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('주소를 찾지 못했어요.')));
                  }
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
      initialLabelNames: _timeTreeLabelNames,
      onChanged: ({required calendarId, required calendarName, required labelRoles, required labelNames}) {
        setState(() {
          _timeTreeCalendarId = calendarId;
          _timeTreeCalendarName = calendarName;
          _timeTreeLabelRoles = labelRoles;
          _timeTreeLabelNames = labelNames;
        });
      },
    );
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    final updated = UserSettings(
      alarmMinuteOfDay: _alarmTime.hour * 60 + _alarmTime.minute,
      gender: _gender,
      age: int.tryParse(_ageController.text.trim()) ?? widget.settings.age,
      homeAddress: _homeAddressController.text.trim().isEmpty ? null : _homeAddressController.text.trim(),
      homeLat: _homeLat,
      homeLng: _homeLng,
      workAddress: _workAddressController.text.trim().isEmpty ? null : _workAddressController.text.trim(),
      workLat: _workLat,
      workLng: _workLng,
      timeTreeCalendarId: _timeTreeCalendarId,
      timeTreeCalendarName: _timeTreeCalendarName,
      timeTreeLabelRoles: _timeTreeLabelRoles,
      timeTreeLabelNames: _timeTreeLabelNames,
      onboardingCompleted: true,
    );
    await widget.onSave(updated);
    if (mounted) {
      setState(() => _saving = false);
      Navigator.of(context).pop();
    }
  }

  String _formatTime(TimeOfDay time) {
    final hour = time.hour.toString().padLeft(2, '0');
    final minute = time.minute.toString().padLeft(2, '0');
    return '$hour:$minute';
  }
}
