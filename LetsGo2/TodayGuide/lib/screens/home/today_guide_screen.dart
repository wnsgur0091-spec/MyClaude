import 'package:flutter/material.dart';

import '../../models/schedule_event.dart';
import '../../models/today_guide_result.dart';
import '../../models/user_settings.dart';
import '../../services/calendar/calendar_service_factory.dart';
import '../../services/event_location_override_repository.dart';
import '../../services/guide_engine.dart';
import '../../services/location_service.dart';
import '../../services/route/naver_driving_route_service.dart';
import '../../services/route/odsay_transit_route_service.dart';
import '../../services/schedule_snapshot_repository.dart';
import '../../services/weather/kma_weather_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/app_alert_dialog.dart';
import '../../widgets/starfield_background.dart';
import 'widgets/outfit_card.dart';
import 'widgets/schedule_timeline_card.dart';

/// 오늘의 지침서 메인 화면. 알림을 탭하거나 앱을 열 때마다 그 시점의
/// 위치를 기준으로 지침을 새로 계산한다.
class TodayGuideScreen extends StatefulWidget {
  const TodayGuideScreen({
    super.key,
    required this.settings,
    required this.onOpenSettings,
    this.onFreshEventsFetched,
  });

  final UserSettings settings;
  final VoidCallback onOpenSettings;

  /// 그날 일정을 캘린더에서 새로 조회했을 때(캐시가 아닐 때)만 호출된다.
  /// 일정별 사전 알림(3시간 전) 예약에 쓴다.
  final Future<void> Function(List<ScheduleEvent> events)? onFreshEventsFetched;

  @override
  State<TodayGuideScreen> createState() => _TodayGuideScreenState();
}

class _TodayGuideScreenState extends State<TodayGuideScreen> {
  final _locationOverrideRepository = EventLocationOverrideRepository();

  late final GuideEngine _guideEngine = GuideEngine(
    locationService: LocationService(),
    weatherService: KmaWeatherService(),
    drivingRouteService: NaverDrivingRouteService(),
    transitRouteService: OdsayTransitRouteService(),
    snapshotRepository: ScheduleSnapshotRepository(),
    locationOverrideRepository: _locationOverrideRepository,
    onFreshEventsFetched: widget.onFreshEventsFetched,
  );

  late Future<TodayGuideResult> _future;
  bool _locationPromptShown = false;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  @override
  void didUpdateWidget(covariant TodayGuideScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.settings != widget.settings) {
      setState(() {
        _future = _load();
      });
    }
  }

  Future<TodayGuideResult> _load() {
    _locationPromptShown = false;
    return _guideEngine.buildTodayGuide(
      settings: widget.settings,
      calendarService: buildCalendarService(widget.settings),
    );
  }

  Future<void> _refresh() async {
    late final Future<TodayGuideResult> next;
    setState(() {
      next = _load();
      _future = next;
    });
    // setState의 콜백은 반환값이 없어야 한다(대입식을 화살표 함수 몸체로 쓰면
    // Future를 반환하게 되어 프레임워크가 "callback argument returned a Future"
    // 오류를 던진다). 그래서 대입은 블록 안에서, await는 밖에서 따로 한다.
    try {
      await next;
    } catch (e) {
      // FutureBuilder도 같은 에러를 인라인으로 보여주지만, "다시 시도"를 눌러
      // 재시도했을 때는 확인 버튼이 있는 알럿으로 한 번 더 명확히 알려준다.
      if (mounted) await showAppAlertDialog(context, title: '다시 시도했지만 실패했어요', message: _formatError(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: StarfieldBackground(
        child: SafeArea(
          child: RefreshIndicator(
            onRefresh: _refresh,
            color: AppColors.neonCyan,
            backgroundColor: AppColors.spacePanel,
            child: FutureBuilder<TodayGuideResult>(
              future: _future,
              builder: (context, snapshot) {
                if (snapshot.connectionState != ConnectionState.done) {
                  return _buildLoading();
                }
                if (snapshot.hasError) {
                  return _buildError(_formatError(snapshot.error));
                }
                final result = snapshot.data!;
                _maybePromptMissingLocations(result);
                return _buildResult(result);
              },
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLoading() {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        SizedBox(
          height: MediaQuery.of(context).size.height * 0.7,
          child: const Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                CircularProgressIndicator(color: AppColors.neonCyan),
                SizedBox(height: 16),
                Text('현재 위치를 기준으로 오늘의 지침서를 계산하고 있어요...',
                    textAlign: TextAlign.center, style: TextStyle(color: AppColors.textSecondary)),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildError(String message) {
    final needsSettings = message.contains('연결되어 있지 않습니다') || message.contains('로그인해주세요');
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        SizedBox(
          height: MediaQuery.of(context).size.height * 0.7,
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, color: AppColors.danger, size: 40),
                const SizedBox(height: 12),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 32),
                  child: Text(message,
                      textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textSecondary)),
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    OutlinedButton(onPressed: _refresh, child: const Text('다시 시도')),
                    if (needsSettings) ...[
                      const SizedBox(width: 12),
                      FilledButton(onPressed: widget.onOpenSettings, child: const Text('설정으로 이동')),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  /// StateError 등의 기술적인 "Bad state: " 접두사를 걷어내고 사용자에게 보여준다.
  String _formatError(Object? error) {
    final text = '$error';
    const prefix = 'Bad state: ';
    return text.startsWith(prefix) ? text.substring(prefix.length) : text;
  }

  /// 알림을 탭해서 들어왔을 때(=그날 최초 조회) 장소 없는 일정이 있으면
  /// 바로 입력하라고 안내한다. 같은 결과에 대해 한 번만 띄운다.
  void _maybePromptMissingLocations(TodayGuideResult result) {
    if (_locationPromptShown) return;
    final missing = result.eventGuides.where((g) => g.missingLocation).map((g) => g.event).toList();
    if (missing.isEmpty) return;
    _locationPromptShown = true;
    WidgetsBinding.instance.addPostFrameCallback((_) => _promptForLocations(missing));
  }

  Future<void> _promptForLocations(List<ScheduleEvent> events) async {
    var anySaved = false;
    for (final event in events) {
      if (!mounted) return;
      final saved = await _showLocationDialog(event);
      anySaved = anySaved || saved;
    }
    if (anySaved && mounted) await _refresh();
  }

  Future<bool> _showLocationDialog(ScheduleEvent event) async {
    final controller = TextEditingController();
    final address = await showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: AppColors.spacePanel,
        title: Text('"${event.title}" 장소를 입력해주세요',
            style: const TextStyle(color: AppColors.textPrimary, fontSize: 16)),
        content: TextField(
          controller: controller,
          autofocus: true,
          style: const TextStyle(color: AppColors.textPrimary),
          decoration: const InputDecoration(hintText: '예: 강남역 2번 출구, 판교 카페거리 스타벅스'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(dialogContext).pop(), child: const Text('나중에')),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(controller.text.trim()),
            child: const Text('저장'),
          ),
        ],
      ),
    );
    if (address == null || address.isEmpty) return false;
    await _locationOverrideRepository.save(event.id, address);
    return true;
  }

  Future<void> _addLocationFor(ScheduleEvent event) async {
    final saved = await _showLocationDialog(event);
    if (saved && mounted) await _refresh();
  }

  Widget _buildResult(TodayGuideResult result) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
      children: [
        _buildHeader(result),
        if (result.notices.isNotEmpty) ...[
          const SizedBox(height: 16),
          ...result.notices.map((n) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: _NoticeStrip(text: n),
              )),
        ],
        const SizedBox(height: 20),
        OutfitCard(outfit: result.outfit),
        const SizedBox(height: 24),
        const Text('오늘의 동선',
            style: TextStyle(
                color: AppColors.textPrimary, fontSize: 18, fontWeight: FontWeight.bold, letterSpacing: 1)),
        const SizedBox(height: 12),
        if (result.eventGuides.isEmpty)
          const Text('오늘 등록된 일정이 없어요.', style: TextStyle(color: AppColors.textSecondary))
        else
          ...result.eventGuides.map((g) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: ScheduleTimelineCard(
                  guide: g,
                  onAddLocation: g.missingLocation ? () => _addLocationFor(g.event) : null,
                ),
              )),
      ],
    );
  }

  Widget _buildHeader(TodayGuideResult result) {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('오늘의 지침서',
                  style: TextStyle(
                      color: AppColors.neonCyan, fontSize: 22, fontWeight: FontWeight.bold, letterSpacing: 1.4)),
              const SizedBox(height: 4),
              Text(_formatGeneratedAt(result.generatedAt),
                  style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
            ],
          ),
        ),
        IconButton(
          onPressed: widget.onOpenSettings,
          icon: const Icon(Icons.settings, color: AppColors.textSecondary),
        ),
      ],
    );
  }

  String _formatGeneratedAt(DateTime dt) {
    final h = dt.hour.toString().padLeft(2, '0');
    final m = dt.minute.toString().padLeft(2, '0');
    return '${dt.month}월 ${dt.day}일 · $h:$m 기준';
  }
}

class _NoticeStrip extends StatelessWidget {
  const _NoticeStrip({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.spacePanelAlt,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.warning.withOpacity(0.4)),
      ),
      child: Row(
        children: [
          const Icon(Icons.info_outline, size: 16, color: AppColors.warning),
          const SizedBox(width: 8),
          Expanded(child: Text(text, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12))),
        ],
      ),
    );
  }
}
