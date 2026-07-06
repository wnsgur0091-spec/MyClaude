import '../models/route_plan.dart';
import '../models/schedule_event.dart';
import '../models/today_guide_result.dart';
import '../models/user_settings.dart';
import '../models/weather_snapshot.dart';
import 'calendar/calendar_service.dart';
import 'event_location_override_repository.dart';
import 'location_service.dart';
import 'outfit_rules.dart';
import 'route/naver_driving_route_service.dart';
import 'route/odsay_transit_route_service.dart';
import 'weather/kma_weather_service.dart';

/// 오늘의 지침서 핵심 계산기.
/// 앱을 열거나 새로고침할 때마다 그 시점의 현재 위치와 TimeTree 일정을
/// 매번 새로 가져와서 이동/옷차림/준비물 지침을 만든다(당일 고정 캐시 없음).
/// 오늘 일정뿐 아니라 조회 시점 기준 가장 가까운 다음 일정(오늘 이후 날짜여도)에
/// 대해서도 같은 방식으로 이동 지침을 만들고, 그 일정의 3시간 전 알림이
/// 정확히 몇 월 며칠 몇 시에 울리는지 안내 문구를 덧붙인다.
class GuideEngine {
  GuideEngine({
    required this.locationService,
    required this.weatherService,
    required this.drivingRouteService,
    required this.transitRouteService,
    EventLocationOverrideRepository? locationOverrideRepository,
    this.onEventsFetched,
  }) : locationOverrideRepository = locationOverrideRepository ?? EventLocationOverrideRepository();

  final LocationService locationService;
  final KmaWeatherService weatherService;
  final NaverDrivingRouteService drivingRouteService;
  final OdsayTransitRouteService transitRouteService;
  final EventLocationOverrideRepository locationOverrideRepository;

  /// 일정을 조회할 때마다(=buildTodayGuide 호출마다) 호출된다.
  /// 일정별 사전 알림(3시간 전) 재예약 등에 쓴다.
  final Future<void> Function(List<ScheduleEvent> events)? onEventsFetched;

  Future<TodayGuideResult> buildTodayGuide({
    required UserSettings settings,
    required CalendarService calendarService,
  }) async {
    final now = DateTime.now();
    final notices = <String>[];

    final fetched = await calendarService.fetchTodayAndNext(now);
    final events = fetched.todayEvents;
    final nextEvent = fetched.nextUpcomingEvent;
    final nextEventAlreadyToday = nextEvent != null && events.any((e) => e.id == nextEvent.id);

    await onEventsFetched?.call([
      ...events,
      if (nextEvent != null && !nextEventAlreadyToday) nextEvent,
    ]);

    final currentLocation = await locationService.resolveCurrentLocation(settings);
    if (currentLocation.isFallback) {
      notices.add('현재 위치를 가져오지 못해 ${currentLocation.label}를 기준으로 계산했어요.');
    }

    final forecast = await _safeForecast(currentLocation.lat, currentLocation.lng, notices);

    var originLat = currentLocation.lat;
    var originLng = currentLocation.lng;

    final eventGuides = <EventGuide>[];
    final daySnapshots = <WeatherSnapshot>[];

    for (final event in events) {
      final built = await _buildEventGuide(
        event: event,
        originLat: originLat,
        originLng: originLng,
        forecast: forecast,
        notices: notices,
      );
      eventGuides.add(built.eventGuide);
      if (built.eventGuide.weather != null) daySnapshots.add(built.eventGuide.weather!);
      originLat = built.nextOriginLat;
      originLng = built.nextOriginLng;
    }

    if (events.isEmpty) {
      notices.add('오늘 등록된 일정이 없어요. 외출 시 현재 날씨를 참고해주세요.');
    }

    if (nextEvent != null && !nextEventAlreadyToday) {
      final built = await _buildEventGuide(
        event: nextEvent,
        originLat: currentLocation.lat,
        originLng: currentLocation.lng,
        forecast: forecast,
        notices: notices,
      );
      eventGuides.add(built.eventGuide);
    }

    if (nextEvent != null) {
      notices.add(_alarmNotice(nextEvent, now));
    }

    final outfit = OutfitRules.recommend(
      daySnapshots: daySnapshots,
      gender: settings.gender,
      noEventsReason: events.isEmpty,
    );

    return TodayGuideResult(generatedAt: now, eventGuides: eventGuides, outfit: outfit, notices: notices);
  }

  /// 다음 일정의 3시간 전 알림이 정확히 언제 울리는지 안내하는 문구.
  /// 이미 3시간 이내로 다가와서 알림이 울리지 않을 시점이면 그 사실을 알린다.
  String _alarmNotice(ScheduleEvent event, DateTime now) {
    final alarmAt = event.start.subtract(const Duration(hours: 3));
    if (!alarmAt.isAfter(now)) {
      return '"${event.title}" 일정이 3시간 이내로 다가와서 별도 알림 없이 바로 시작해요.';
    }
    return '"${event.title}" 일정 알림은 ${_formatMoment(alarmAt)}에 울려요.';
  }

  String _formatMoment(DateTime dt) {
    final minutePart = dt.minute == 0 ? '' : ' ${dt.minute}분';
    return '${dt.month}월 ${dt.day}일 ${dt.hour}시$minutePart';
  }

  Future<List<WeatherSnapshot>> _safeForecast(double lat, double lng, List<String> notices) async {
    try {
      return await weatherService.fetchTodayForecast(lat: lat, lng: lng);
    } catch (_) {
      notices.add('일시적인 문제로 날씨 정보를 가져오지 못해 옷차림 추천이 부정확할 수 있어요.');
      return const [];
    }
  }

  /// 일정 하나에 대한 날씨/이동 지침을 계산한다. [originLat]/[originLng]는 이
  /// 일정으로 이동을 시작하는 출발지이고, 반환값의 nextOriginLat/Lng는 이 일정
  /// 장소를 다음 이동의 출발지로 삼을 때 쓸 좌표다(장소를 못 찾으면 그대로 유지).
  Future<({EventGuide eventGuide, double nextOriginLat, double nextOriginLng})> _buildEventGuide({
    required ScheduleEvent event,
    required double originLat,
    required double originLng,
    required List<WeatherSnapshot> forecast,
    required List<String> notices,
  }) async {
    WeatherSnapshot? weather;
    if (forecast.isNotEmpty) {
      weather = weatherService.pickForRange(forecast, event.start, event.end);
    }

    RoutePlan? carPlan;
    RoutePlan? transitPlan;
    var missingLocation = false;

    ({double lat, double lng})? destination;
    if (event.attendeeRole.includeInOwnRoute) {
      final resolved = await _resolveAddress(event);
      if (resolved == null) {
        missingLocation = true;
        notices.add('"${event.title}" 일정에 장소가 없어요. 카드에서 장소를 입력해주세요.');
      } else {
        var geocodeFailed = false;
        destination = await _safeCall(
          () => locationService.geocodeAddress(resolved),
          onFailure: () => geocodeFailed = true,
        );
        if (destination == null) {
          notices.add(geocodeFailed
              ? '"${event.title}" 장소 정보를 일시적인 문제로 가져오지 못했어요.'
              : '"${event.title}" 장소($resolved)의 위치를 찾지 못했어요.');
        }
      }
    }

    var nextOriginLat = originLat;
    var nextOriginLng = originLng;

    if (destination != null) {
      final dest = destination;
      final carMinutes = await _safeCall(
        () => drivingRouteService.estimateDurationMinutes(
          startLat: originLat,
          startLng: originLng,
          goalLat: dest.lat,
          goalLng: dest.lng,
        ),
        onFailure: () => notices.add('"${event.title}" 자동차 이동 시간을 일시적인 문제로 가져오지 못했어요.'),
      );
      if (carMinutes != null) {
        carPlan = RoutePlan.forArrival(
          mode: TransportMode.car,
          durationMinutes: carMinutes,
          eventStart: event.start,
        );
      }

      final transitMinutes = await _safeCall(
        () => transitRouteService.estimateDurationMinutes(
          startLat: originLat,
          startLng: originLng,
          goalLat: dest.lat,
          goalLng: dest.lng,
        ),
        onFailure: () => notices.add('"${event.title}" 대중교통 이동 시간을 일시적인 문제로 가져오지 못했어요.'),
      );
      if (transitMinutes != null) {
        transitPlan = RoutePlan.forArrival(
          mode: TransportMode.transit,
          durationMinutes: transitMinutes,
          eventStart: event.start,
        );
      }

      nextOriginLat = dest.lat;
      nextOriginLng = dest.lng;
    }

    final eventGuide = EventGuide(
      event: event,
      carPlan: carPlan,
      transitPlan: transitPlan,
      weather: weather,
      missingLocation: missingLocation,
    );

    return (eventGuide: eventGuide, nextOriginLat: nextOriginLat, nextOriginLng: nextOriginLng);
  }

  /// 캘린더 원본 장소가 없으면 사용자가 직접 입력해둔 장소(override)를 대신 쓴다.
  Future<String?> _resolveAddress(ScheduleEvent event) async {
    final original = event.location?.trim();
    if (original != null && original.isNotEmpty) return original;
    final override = await locationOverrideRepository.read(event.id);
    return (override == null || override.trim().isEmpty) ? null : override.trim();
  }

  /// 외부 API 호출 하나를 감싸서, 실패해도 나머지 계산(다른 이동수단/일정)이
  /// 계속 진행되도록 한다. [onFailure]는 실제로 예외가 발생했을 때만
  /// 호출된다(예: "경로를 찾지 못함" 같은 정상적인 null 응답과는 구분).
  Future<T?> _safeCall<T>(Future<T?> Function() call, {void Function()? onFailure}) async {
    try {
      return await call();
    } catch (_) {
      onFailure?.call();
      return null;
    }
  }
}
