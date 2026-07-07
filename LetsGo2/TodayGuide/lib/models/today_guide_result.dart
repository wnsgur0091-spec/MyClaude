import 'nearby_event.dart';
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

  /// 날씨/일정 계산 결과를 한 문단으로 요약한 인사말. AI 호출 없이 순수
  /// 문자열 템플릿으로 만든다(오늘의 지침서 화면 맨 위에 강조해서 보여준다).
  final String briefing;

  /// 옷차림 추천이 기준으로 삼은 일정(가장 가까운 다음 일정). 없으면 옷차림은
  /// 오늘 등록된 일정 전체 날씨를 기준으로 계산된 것이다.
  final ScheduleEvent? outfitEvent;

  /// [outfitEvent] 구간을 1시간 간격으로 보간한 날씨. outfitEvent가 없으면 비어 있다.
  final List<WeatherSnapshot> outfitHourlyWeather;

  /// 다음 일정의 3시간 전 알림이 언제 울리는지 안내하는 문구. 화면 상단에
  /// 강조해서 보여준다(다른 안내 문구와는 성격이 달라 구분해서 관리).
  final String? alarmNotice;

  /// 현재 발효 중인 기상특보 제목들(예: "강풍주의보"). 안전 관련이라
  /// 다른 안내 문구보다 눈에 띄게 상단에 보여준다.
  final List<String> weatherWarnings;

  /// 오늘 남은 일정이 없을 때(낮 12시 이전에만), 현재 위치 근처(반경 20km)
  /// 축제/행사 추천.
  final List<NearbyEvent> nearbyEvents;

  /// 오늘 등록된/남은 일정이 없을 때 보여줄 안내 문구. 하단 알림 목록이
  /// 아니라 "오늘의 옷차림"과 "오늘의 동선" 섹션 안에서 문맥에 맞게 보여준다.
  final String? todayEmptyNotice;

  /// 오늘 일정이 없어서 대신 보여주는 다음 일정 날짜(미래)의 이동 지침 전체
  /// (역할 무관 — 배우자 단독 일정도 포함). "오늘의 동선"에는 섞지 않고
  /// 별도 "D+N일 후" 섹션으로 보여준다. 그날 가장 빠른 일정 하나만 보여주면
  /// 같은 날 뒤에 있는 배우자 일정이 가려지므로, 오늘의 동선처럼 그날 전체를
  /// 담는다.
  final List<EventGuide> upcomingEventGuides;

  /// [upcomingEventGuides]가 오늘로부터 며칠 뒤인지(1 이상). null이면 다음 일정 없음.
  final int? upcomingDayOffset;

  /// [upcomingEventGuides] 시간대 날씨 전체를 기준으로 계산한 옷차림 추천.
  final OutfitRecommendation? upcomingOutfit;

  /// [upcomingEventGuides]가 걸쳐 있는 구간을 1시간 간격으로 보간한 날씨.
  final List<WeatherSnapshot> upcomingOutfitHourlyWeather;

  /// 오늘 일정이 없을 때, 외부 API 조회에 실패했을 때 등 계산이 부분적으로
  /// 실패했을 때 표시할 안내 문구. 화면 하단에 보여준다.
  final List<String> notices;

  const TodayGuideResult({
    required this.generatedAt,
    required this.eventGuides,
    required this.outfit,
    required this.briefing,
    this.outfitEvent,
    this.outfitHourlyWeather = const [],
    this.alarmNotice,
    this.weatherWarnings = const [],
    this.nearbyEvents = const [],
    this.todayEmptyNotice,
    this.upcomingEventGuides = const [],
    this.upcomingDayOffset,
    this.upcomingOutfit,
    this.upcomingOutfitHourlyWeather = const [],
    this.notices = const [],
  });
}
