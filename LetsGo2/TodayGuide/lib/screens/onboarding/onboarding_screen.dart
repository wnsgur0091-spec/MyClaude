import 'package:flutter/material.dart';

import '../../models/event_attendee_role.dart';
import '../../models/user_settings.dart';
import '../../services/location_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/starfield_background.dart';
import '../../widgets/timetree_connect_section.dart';
import 'widgets/onboarding_notice_card.dart';

/// 최초 실행 시 초기 셋팅 마법사.
/// 고지사항 확인 → 프로필 → 기본 출발지 → 일정 관리 앱 연동 순으로
/// 입력받고, 완료 시 [onComplete]으로 최종 [UserSettings]를 전달한다.
/// 알람은 고정 시각이 아니라 TimeTree 일정 시작 3시간 전에 자동으로 오므로
/// 별도 설정 단계가 없다.
class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key, required this.onComplete});

  final Future<void> Function(UserSettings settings) onComplete;

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _pageController = PageController();
  final _locationService = LocationService();

  final _homeAddressController = TextEditingController();
  final _workAddressController = TextEditingController();

  int _stepIndex = 0;
  bool _notice1Ack = false;
  bool _notice2Ack = false;
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

  static const _stepCount = 4;

  @override
  void dispose() {
    _pageController.dispose();
    _homeAddressController.dispose();
    _workAddressController.dispose();
    super.dispose();
  }

  bool get _canGoNext {
    switch (_stepIndex) {
      case 0:
        return _notice1Ack && _notice2Ack;
      case 2:
        return _workAddressController.text.trim().isNotEmpty;
      case 3:
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
          title: '알람은 일정 시작 3시간 전에 와요',
          description: '정해진 시각에 오는 게 아니라, TimeTree에 등록된 각 일정 시작 3시간 전에 '
              '출발 준비 알림이 와요. 앱을 열거나 새로고침할 때마다 TimeTree 일정을 매번 새로 가져와요.',
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
          title: const Text('일정 시작 3시간 전 알람 규칙을 확인했어요', style: TextStyle(color: AppColors.textPrimary)),
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

  Widget _buildProfileStep() {
    return _stepScaffold(
      title: '프로필',
      subtitle: '옷차림 추천에 참고할 최소한의 정보예요.',
      children: [
        const Text('성별', style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: Gender.values.where((g) => g != Gender.other).map((g) {
            return ChoiceChip(
              label: Text(g.label),
              selected: _gender == g,
              onSelected: (_) => setState(() => _gender = g),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildAddressStep() {
    return _stepScaffold(
      title: '기본 출발지',
      subtitle: 'GPS로 현재 위치를 가져오지 못할 때 대신 사용할 주소예요. 회사 주소는 필수, 집 주소는 선택이에요.',
      children: [
        _addressField(
          label: '집 주소 (선택)',
          controller: _homeAddressController,
          onResolved: (lat, lng) => setState(() {
            _homeLat = lat;
            _homeLng = lng;
          }),
        ),
        const SizedBox(height: 16),
        _addressField(
          label: '회사 주소',
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
                      if (!mounted) return;
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                        content: Text(result == null ? '주소를 찾지 못했어요. 다시 확인해주세요.' : '주소를 확인했어요.'),
                      ));
                    },
              icon: _resolvingAddress
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.neonCyan))
                  : const Icon(Icons.search, color: AppColors.neonCyan),
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
          onChanged: ({required calendarId, required calendarName, required labelRoles}) {
            setState(() {
              _timeTreeCalendarId = calendarId;
              _timeTreeCalendarName = calendarName;
              _timeTreeLabelRoles = labelRoles;
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

  Future<void> _finish() async {
    setState(() => _saving = true);
    final settings = UserSettings(
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
      onboardingCompleted: true,
    );
    await widget.onComplete(settings);
    if (mounted) setState(() => _saving = false);
  }
}
