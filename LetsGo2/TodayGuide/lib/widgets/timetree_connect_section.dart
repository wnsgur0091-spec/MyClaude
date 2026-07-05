import 'package:flutter/material.dart';

import '../models/event_attendee_role.dart';
import '../services/calendar/timetree_account_service.dart';
import '../services/calendar/timetree_client.dart';
import '../theme/app_theme.dart';

/// TimeTree 계정 연결(이메일/비밀번호) → 캘린더 선택 → 라벨(색상)별 담당자
/// 지정까지 한 번에 처리하는 재사용 위젯. 온보딩과 설정 화면에서 함께 쓴다.
class TimeTreeConnectSection extends StatefulWidget {
  const TimeTreeConnectSection({
    super.key,
    this.initialCalendarId,
    this.initialCalendarName,
    this.initialLabelRoles = const {},
    required this.onChanged,
  });

  final String? initialCalendarId;
  final String? initialCalendarName;
  final Map<int, EventAttendeeRole> initialLabelRoles;

  /// 선택 상태가 바뀔 때마다 호출된다.
  final void Function({
    required String? calendarId,
    required String? calendarName,
    required Map<int, EventAttendeeRole> labelRoles,
  }) onChanged;

  @override
  State<TimeTreeConnectSection> createState() => TimeTreeConnectSectionState();
}

class TimeTreeConnectSectionState extends State<TimeTreeConnectSection> {
  final _accountService = TimeTreeAccountService();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _loading = false;
  bool _loggedIn = false;
  String? _errorMessage;

  List<TimeTreeCalendarSummary> _calendars = [];
  String? _selectedCalendarId;
  String? _selectedCalendarName;
  Map<int, TimeTreeLabel> _labels = {};
  late Map<int, EventAttendeeRole> _labelRoles;

  @override
  void initState() {
    super.initState();
    _selectedCalendarId = widget.initialCalendarId;
    _selectedCalendarName = widget.initialCalendarName;
    _labelRoles = Map.of(widget.initialLabelRoles);
    _restoreExistingLogin();
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  bool get isReady => _selectedCalendarId != null;

  Future<void> _restoreExistingLogin() async {
    final loggedIn = await _accountService.isLoggedIn;
    if (!mounted || !loggedIn) return;
    final email = await _accountService.savedEmail;
    if (email != null) _emailController.text = email;
    setState(() => _loggedIn = true);
    await _loadCalendars();
    if (_selectedCalendarId != null) {
      await _loadLabels(_selectedCalendarId!, keepExistingRoles: true);
    }
  }

  Future<void> _login() async {
    setState(() {
      _loading = true;
      _errorMessage = null;
    });
    try {
      await _accountService.login(
        email: _emailController.text.trim(),
        password: _passwordController.text,
      );
      setState(() => _loggedIn = true);
      await _loadCalendars();
    } catch (e) {
      setState(() => _errorMessage = '$e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _logout() async {
    await _accountService.logout();
    setState(() {
      _loggedIn = false;
      _calendars = [];
      _labels = {};
      _selectedCalendarId = null;
      _selectedCalendarName = null;
      _labelRoles = {};
      _passwordController.clear();
    });
    _emitChange();
  }

  Future<void> _loadCalendars() async {
    setState(() {
      _loading = true;
      _errorMessage = null;
    });
    try {
      final calendars = await _accountService.fetchCalendars();
      if (mounted) setState(() => _calendars = calendars);
    } catch (e) {
      if (mounted) setState(() => _errorMessage = '$e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadLabels(String calendarId, {bool keepExistingRoles = false}) async {
    setState(() => _loading = true);
    try {
      final labels = await _accountService.fetchLabels(calendarId);
      if (!mounted) return;
      setState(() {
        _labels = labels;
        if (!keepExistingRoles) {
          _labelRoles = {for (final id in labels.keys) id: EventAttendeeRole.unknown};
        }
      });
      _emitChange();
    } catch (e) {
      if (mounted) setState(() => _errorMessage = '$e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _selectCalendar(TimeTreeCalendarSummary calendar) {
    setState(() {
      _selectedCalendarId = calendar.id;
      _selectedCalendarName = calendar.name;
    });
    _loadLabels(calendar.id);
  }

  void _setLabelRole(int labelId, EventAttendeeRole role) {
    setState(() => _labelRoles[labelId] = role);
    _emitChange();
  }

  void _emitChange() {
    widget.onChanged(
      calendarId: _selectedCalendarId,
      calendarName: _selectedCalendarName,
      labelRoles: _labelRoles,
    );
  }

  @override
  Widget build(BuildContext context) {
    if (!_loggedIn) return _buildLoginForm();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.check_circle, color: AppColors.neonCyan, size: 18),
            const SizedBox(width: 8),
            Expanded(
              child: Text('${_emailController.text} 로 연결됨',
                  style: const TextStyle(color: AppColors.textPrimary)),
            ),
            TextButton(onPressed: _loading ? null : _logout, child: const Text('로그아웃')),
          ],
        ),
        const SizedBox(height: 12),
        if (_errorMessage != null) _buildError(),
        if (_loading) const Center(child: Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator())),
        if (_calendars.isNotEmpty) ...[
          const Text('공유 캘린더 선택', style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          ..._calendars.map((c) => RadioListTile<String>(
                value: c.id,
                groupValue: _selectedCalendarId,
                onChanged: (_) => _selectCalendar(c),
                activeColor: AppColors.neonCyan,
                contentPadding: EdgeInsets.zero,
                title: Text(c.name, style: const TextStyle(color: AppColors.textPrimary)),
              )),
        ],
        if (_labels.isNotEmpty) ...[
          const SizedBox(height: 16),
          const Text('라벨(색상)별 담당자 지정',
              style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          const Text(
            '이 라벨이 붙은 일정을 누가 소화하는지 알려주면, 배우자 단독 일정은 본인 이동경로 계산에서 제외해요.',
            style: TextStyle(color: AppColors.textSecondary, fontSize: 12, height: 1.4),
          ),
          const SizedBox(height: 12),
          ..._labels.values.map(_buildLabelRow),
        ],
      ],
    );
  }

  Widget _buildLoginForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'TimeTree는 앱 간 연동용 공식 API가 없어, TimeTree 계정 이메일/비밀번호로 '
          '직접 로그인해서 일정을 가져와요. 자격증명은 이 기기에만 암호화 저장돼요.',
          style: TextStyle(color: AppColors.textSecondary, height: 1.4),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _emailController,
          keyboardType: TextInputType.emailAddress,
          style: const TextStyle(color: AppColors.textPrimary),
          decoration: const InputDecoration(labelText: 'TimeTree 이메일'),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _passwordController,
          obscureText: true,
          style: const TextStyle(color: AppColors.textPrimary),
          decoration: const InputDecoration(labelText: '비밀번호'),
        ),
        const SizedBox(height: 12),
        if (_errorMessage != null) _buildError(),
        FilledButton.icon(
          onPressed: _loading ? null : _login,
          icon: _loading
              ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2))
              : const Icon(Icons.login),
          label: const Text('TimeTree 로그인'),
        ),
      ],
    );
  }

  Widget _buildError() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Text(_errorMessage!, style: const TextStyle(color: AppColors.danger, fontSize: 13)),
    );
  }

  Widget _buildLabelRow(TimeTreeLabel label) {
    final color = _parseColor(label.colorHex);
    final role = _labelRoles[label.id] ?? EventAttendeeRole.unknown;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Container(
            width: 16,
            height: 16,
            decoration: BoxDecoration(color: color ?? AppColors.starDim, shape: BoxShape.circle),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(label.name.isEmpty ? '(이름 없는 라벨)' : label.name,
                style: const TextStyle(color: AppColors.textPrimary)),
          ),
          DropdownButton<EventAttendeeRole>(
            value: role,
            dropdownColor: AppColors.spacePanelAlt,
            style: const TextStyle(color: AppColors.textPrimary),
            items: EventAttendeeRole.values
                .map((r) => DropdownMenuItem(value: r, child: Text(r.label)))
                .toList(),
            onChanged: (v) => _setLabelRole(label.id, v ?? EventAttendeeRole.unknown),
          ),
        ],
      ),
    );
  }

  Color? _parseColor(String? hex) {
    if (hex == null) return null;
    final cleaned = hex.replaceFirst('#', '');
    final value = int.tryParse(cleaned, radix: 16);
    if (value == null) return null;
    return Color(0xFF000000 | value);
  }
}
