import 'outfit_recommendation.dart';
import 'route_plan.dart';
import 'schedule_event.dart';
import 'weather_snapshot.dart';

/// 일정 하나에 대한 이동 지침.
class EventGuide {
  final ScheduleEvent event;
  final RoutePlan? carPlan;
  final RoutePlan? transitPlan;
  final WeatherSnapshot? weather;

  const EventGuide({
    required this.event,
    this.carPlan,
    this.transitPlan,
    this.weather,
  });
}

/// 앱을 열었을 때(=알림을 탭했을 때) 계산되는 오늘의 지침서 전체 결과.
class TodayGuideResult {
  final DateTime generatedAt;
  final List<EventGuide> eventGuides;
  final OutfitRecommendation outfit;

  /// 오늘 일정이 없을 때 등, 계산이 부분적으로 실패했을 때 표시할 안내 문구.
  final List<String> notices;

  const TodayGuideResult({
    required this.generatedAt,
    required this.eventGuides,
    required this.outfit,
    this.notices = const [],
  });
}
