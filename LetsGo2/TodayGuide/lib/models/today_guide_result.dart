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

  /// 이 일정에 장소가 없어서(캘린더 원본에도, 사용자가 입력한 값에도) 이동경로를
  /// 계산하지 못한 상태. true면 화면에서 장소 입력을 유도한다.
  final bool missingLocation;

  const EventGuide({
    required this.event,
    this.carPlan,
    this.transitPlan,
    this.weather,
    this.missingLocation = false,
  });
}

/// 앱을 열었을 때(=알림을 탭했을 때) 계산되는 오늘의 지침서 전체 결과.
class TodayGuideResult {
  final DateTime generatedAt;
  final List<EventGuide> eventGuides;
  final OutfitRecommendation outfit;

  /// 옷차림 추천이 기준으로 삼은 일정(가장 가까운 다음 일정). 없으면 옷차림은
  /// 오늘 등록된 일정 전체 날씨를 기준으로 계산된 것이다.
  final ScheduleEvent? outfitEvent;

  /// [outfitEvent] 구간을 1시간 간격으로 보간한 날씨. outfitEvent가 없으면 비어 있다.
  final List<WeatherSnapshot> outfitHourlyWeather;

  /// 오늘 일정이 없을 때 등, 계산이 부분적으로 실패했을 때 표시할 안내 문구.
  final List<String> notices;

  const TodayGuideResult({
    required this.generatedAt,
    required this.eventGuides,
    required this.outfit,
    this.outfitEvent,
    this.outfitHourlyWeather = const [],
    this.notices = const [],
  });
}
