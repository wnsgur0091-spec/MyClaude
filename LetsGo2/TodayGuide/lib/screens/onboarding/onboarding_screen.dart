import 'package:flutter/material.dart';

import '../../models/event_attendee_role.dart';
import '../../models/user_settings.dart';
import '../../services/location_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/starfield_background.dart';
import '../../widgets/timetree_connect_section.dart';
import 'widgets/onboarding_notice_card.dart';

/// 최초 실행 시 초기 셋팅 마법사.
/// 알람 시각 → 프로필 → 기본 출발지 → 일정 관리 앱 연동 → 고지사항 확인 순으로
/// 입력받고, 완료 시 [onComplete]으로 최종 [UserSettings]를 전달한다.
class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key, required this.onComplete});

  final Future<void> Function(UserSettings settings) onComplete;

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _pageController = PageController();
  final _locationService = LocationService();

  final _ageController = TextEditingController();
  final _homeAddressController = TextEditingController();
  final _workAddressController = TextEditingController();

  int _stepIndex = 0;
  bool _notice1Ack = false;
  bool _notice2Ack = false;
  TimeOfDay _alarmTime = const TimeOfDay(hour: 8, minute: 0);
  Gender _gender = Gender.other;

  double? _homeLat;
  double? _homeLng;
  double? _workLat;
  double? _workLng;
  bool _resolvingAddress = false;
  bool _saving = false;

  String? _timeTreeCalendarId;
  String? _timeTreeCalendarName;
  Map<int, EventAttendeeRole> _timeTreeLabelRoles = {};
  Map<int, String> _timeTreeLabelNames = {};

  static const _stepCount = 5;

  @override
  void dispose() {
    _pageController.dispose();
    _ageController.dispose();
    _homeAddressController.dispose();
    _workAddressController.dispose();
    super.dispose();
  }

  bool get _canGoNext {
    switch (_stepIndex) {
      case 0:
        return _notice1Ack && _notice2Ack;
      case 1:
        return true;
      case 2:
        return _ageController.text.trim().isNotEmpty;
      case 3:
        return _homeAddressController.text.trim().isNotEmpty || _workAddressController.text.trim().isNotEmpty;
      case 4:
        return _timeTreeCalendarId != null;
      default:
        return true;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: StarfieldBackground(
        child: SafeArea(
          child: Column(
            children: [
              _buildProgressDots(),
              Expanded(
                child: PageView(
                  controller: _pageController,
                  physics: const NeverScrollableScrollPhysics(),
                  children: [
                    _buildNoticeStep(),
                    _buildAlarmTimeStep(),
                    _buildProfileStep(),
                    _buildAddressStep(),
                    _buildCalendarProviderStep(),
                  ],
                ),
              ),
              _buildNavigationButtons(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildProgressDots() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 20),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: List.generate(_stepCount, (i) {
          final active = i == _stepIndex;
          return AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            margin: const EdgeInsets.symmetric(horizontal: 4),
            width: active ? 22 : 8,
            height: 8,
            decoration: BoxDecoration(
              color: active ? AppColors.neonCyan : AppColors.starDim,
              borderRadius: BorderRadius.circular(4),
            ),
          );
        }),
      ),
    );
  }

  Widget _stepScaffold({required String title, required String subtitle, required List<Widget> children}) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
          const SizedBox(height: 8),
          Text(subtitle, style: const TextStyle(color: AppColors.textSecondary, height: 1.4)),
          const SizedBox(height: 24),
          ...children,
        ],
      ),
    );
  }

  Widget _buildNoticeStep() {
    return _stepScaffold(
      title: '시작하기 전에',
      subtitle: '오늘의 지침서가 정확하게 안내하기 위해 아래 규칙을 꼭 확인해주세요.',
      children: [
        const OnboardingNoticeCard(
          title: '당일 추가/수정된 일정은 반영되지 않아요',
          description: '오늘의 지침서는 하루 중 최초 조회 시점(보통 알람 시각)의 일정을 기준으로 안내돼요. '
              '이후 새로 추가하거나 변경한 일정은 그날 지침에 반영되지 않아요.',
        ),
        const SizedBox(height: 12),
        const OnboardingNoticeCard(
          title: "'종일' 일정은 오전 9시 ~ 오후 6시로 간주해요",
          description: "캘린더에 종일(all-day)로 등록된 일정은 오전 9시 시작, 오후 6시 종료로 계산해서 "
              "이동/옷차림 지침을 안내해요.",
        ),
        const SizedBox(height: 20),
        CheckboxListTile(
          value: _notice1Ack,
          onChanged: (v) => setState(() => _notice1Ack = v ?? false),
          controlAffinity: ListTileControlAffinity.leading,
          activeColor: AppColors.neonCyan,
          contentPadding: EdgeInsets.zero,
          title: const Text('당일 일정 변경 미반영 규칙을 확인했어요', style: TextStyle(color: AppColors.textPrimary)),
        ),
        CheckboxListTile(
          value: _notice2Ack,
          onChanged: (v) => setState(() => _notice2Ack = v ?? false),
          controlAffinity: ListTileControlAffinity.leading,
          activeColor: AppColors.neonCyan,
          contentPadding: EdgeInsets.zero,
          title: const Text("'종일' 일정 기준(09:00~18:00)을 확인했어요", style: TextStyle(color: AppColors.textPrimary)),
        ),
      ],
    );
  }

  Widget _buildAlarmTimeStep() {
    return _stepScaffold(
      title: '알람 시각',
      subtitle: '매일 이 시각에 오늘의 지침서 알림을 보내드려요. 디폴트는 오전 8시예요.',
      children: [
        Center(
          child: Column(
            children: [
              const SizedBox(height: 20),
              Text(
                _formatTime(_alarmTime),
                style: const TextStyle(fontSize: 56, color: AppColors.neonCyan, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 20),
              OutlinedButton.icon(
                onPressed: _pickAlarmTime,
                icon: const Icon(Icons.schedule),
                label: const Text('시각 변경'),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildProfileStep() {
    return _stepScaffold(
      title: '프로필',
      subtitle: '옷차림 추천에 참고할 최소한의 정보예요.',
      children: [
        const Text('성별', style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: Gender.values.map((g) {
            return ChoiceChip(
              label: Text(g.label),
              selected: _gender == g,
              onSelected: (_) => setState(() => _gender = g),
            );
          }).toList(),
        ),
        const SizedBox(height: 24),
        const Text('나이', style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        TextField(
          controller: _ageController,
          keyboardType: TextInputType.number,
          style: const TextStyle(color: AppColors.textPrimary),
          decoration: const InputDecoration(hintText: '예: 29'),
          onChanged: (_) => setState(() {}),
        ),
      ],
    );
  }

  Widget _buildAddressStep() {
    return _stepScaffold(
      title: '기본 출발지',
      subtitle: 'GPS로 현재 위치를 가져오지 못할 때 대신 사용할 주소예요. 최소 한 곳은 입력해주세요.',
      children: [
        _addressField(
          label: '집 주소',
          controller: _homeAddressController,
          onResolved: (lat, lng) => setState(() {
            _homeLat = lat;
            _homeLng = lng;
          }),
        ),
        const SizedBox(height: 16),
        _addressField(
          label: '회사 주소 (선택)',
          controller: _workAddressController,
          onResolved: (lat, lng) => setState(() {
            _workLat = lat;
            _workLng = lng;
          }),
        ),
      ],
    );
  }

  Widget _addressField({
    required String label,
    required TextEditingController controller,
    required void Function(double lat, double lng) onResolved,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: controller,
                style: const TextStyle(color: AppColors.textPrimary),
                decoration: const InputDecoration(hintText: '도로명 또는 지번 주소를 입력해주세요'),
                onChanged: (_) => setState(() {}),
              ),
            ),
            const SizedBox(width: 8),
            IconButton(
              onPressed: _resolvingAddress || controller.text.trim().isEmpty
                  ? null
                  : () async {
                      setState(() => _resolvingAddress = true);
                      final result = await _locationService.geocodeAddress(controller.text.trim());
                      if (result != null) onResolved(result.lat, result.lng);
                      if (mounted) setState(() => _resolvingAddress = false);
                      if (mounted && result == null) {
                        ScaffoldMessenger.of(context)
                            .showSnackBar(const SnackBar(content: Text('주소를 찾지 못했어요. 다시 확인해주세요.')));
                      }
                    },
              icon: const Icon(Icons.search, color: AppColors.neonCyan),
              tooltip: '주소 확인',
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildCalendarProviderStep() {
    return _stepScaffold(
      title: 'TimeTree 연동',
      subtitle: '둘이 같이 쓰는 TimeTree 공유 캘린더를 연결해주세요.',
      children: [
        TimeTreeConnectSection(
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
        ),
      ],
    );
  }

  Widget _buildNavigationButtons() {
    final isLastStep = _stepIndex == _stepCount - 1;
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Row(
        children: [
          if (_stepIndex > 0)
            Expanded(
              child: OutlinedButton(
                onPressed: _saving ? null : _goPrevious,
                child: const Text('이전'),
              ),
            ),
          if (_stepIndex > 0) const SizedBox(width: 12),
          Expanded(
            flex: 2,
            child: FilledButton(
              onPressed: !_canGoNext || _saving ? null : (isLastStep ? _finish : _goNext),
              child: _saving
                  ? const SizedBox(
                      height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : Text(isLastStep ? '지침서 시작하기' : '다음'),
            ),
          ),
        ],
      ),
    );
  }

  void _goNext() {
    setState(() => _stepIndex += 1);
    _pageController.nextPage(duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
  }

  void _goPrevious() {
    setState(() => _stepIndex -= 1);
    _pageController.previousPage(duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
  }

  Future<void> _pickAlarmTime() async {
    final picked = await showTimePicker(context: context, initialTime: _alarmTime);
    if (picked != null) setState(() => _alarmTime = picked);
  }

  Future<void> _finish() async {
    setState(() => _saving = true);
    final settings = UserSettings(
      alarmMinuteOfDay: _alarmTime.hour * 60 + _alarmTime.minute,
      gender: _gender,
      age: int.tryParse(_ageController.text.trim()) ?? 0,
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
    await widget.onComplete(settings);
    if (mounted) setState(() => _saving = false);
  }

  String _formatTime(TimeOfDay time) {
    final hour = time.hour.toString().padLeft(2, '0');
    final minute = time.minute.toString().padLeft(2, '0');
    return '$hour:$minute';
  }
}
