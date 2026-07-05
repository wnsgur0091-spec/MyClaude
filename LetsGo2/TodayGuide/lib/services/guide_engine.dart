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
import 'schedule_snapshot_repository.dart';
import 'weather/kma_weather_service.dart';

/// 오늘의 지침서 핵심 계산기.
/// 앱/알림을 여는 시점에만 실행되며, 그 시점의 현재 위치와 "당일 최초 조회
/// 시점에 고정된" 일정 스냅샷을 조합해 이동/옷차림/준비물 지침을 만든다.
class GuideEngine {
  GuideEngine({
    required this.locationService,
    required this.weatherService,
    required this.drivingRouteService,
    required this.transitRouteService,
    required this.snapshotRepository,
    EventLocationOverrideRepository? locationOverrideRepository,
  }) : locationOverrideRepository = locationOverrideRepository ?? EventLocationOverrideRepository();

  final LocationService locationService;
  final KmaWeatherService weatherService;
  final NaverDrivingRouteService drivingRouteService;
  final OdsayTransitRouteService transitRouteService;
  final ScheduleSnapshotRepository snapshotRepository;
  final EventLocationOverrideRepository locationOverrideRepository;

  Future<TodayGuideResult> buildTodayGuide({
    required UserSettings settings,
    required CalendarService calendarService,
  }) async {
    final now = DateTime.now();
    final notices = <String>[];

    final events = await _loadTodayEventsWithSnapshot(now, calendarService, notices);
    final currentLocation = await locationService.resolveCurrentLocation(settings);
    if (currentLocation.isFallback) {
      notices.add('현재 위치를 가져오지 못해 ${currentLocation.label}를 기준으로 계산했어요.');
    }

    if (events.isEmpty) {
      return TodayGuideResult(
        generatedAt: now,
        eventGuides: const [],
        outfit: OutfitRules.recommend(daySnapshots: const [], gender: settings.gender),
        notices: [...notices, '오늘 등록된 일정이 없어요. 외출 시 현재 날씨를 참고해주세요.'],
      );
    }

    final forecast = await _safeForecast(currentLocation.lat, currentLocation.lng, notices);

    var originLat = currentLocation.lat;
    var originLng = currentLocation.lng;

    final eventGuides = <EventGuide>[];
    final daySnapshots = <WeatherSnapshot>[];

    for (final event in events) {
      WeatherSnapshot? weather;
      if (forecast.isNotEmpty) {
        weather = weatherService.pickForRange(forecast, event.start, event.end);
        if (weather != null) daySnapshots.add(weather);
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
          destination = await _safeCall(() => locationService.geocodeAddress(resolved));
          if (destination == null) {
            notices.add('"${event.title}" 장소($resolved)의 위치를 찾지 못했어요.');
          }
        }
      }
      if (destination != null) {
        final dest = destination;
        final carMinutes = await _safeCall(
          () => drivingRouteService.estimateDurationMinutes(
            startLat: originLat,
            startLng: originLng,
            goalLat: dest.lat,
            goalLng: dest.lng,
          ),
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
        );
        if (transitMinutes != null) {
          transitPlan = RoutePlan.forArrival(
            mode: TransportMode.transit,
            durationMinutes: transitMinutes,
            eventStart: event.start,
          );
        }

        originLat = dest.lat;
        originLng = dest.lng;
      }

      eventGuides.add(EventGuide(
        event: event,
        carPlan: carPlan,
        transitPlan: transitPlan,
        weather: weather,
        missingLocation: missingLocation,
      ));
    }

    final outfit = OutfitRules.recommend(daySnapshots: daySnapshots, gender: settings.gender);

    return TodayGuideResult(generatedAt: now, eventGuides: eventGuides, outfit: outfit, notices: notices);
  }

  Future<List<ScheduleEvent>> _loadTodayEventsWithSnapshot(
    DateTime now,
    CalendarService calendarService,
    List<String> notices,
  ) async {
    final cached = await snapshotRepository.readTodaySnapshot(now);
    if (cached != null) return cached;

    final fresh = await calendarService.fetchEventsForDate(now);
    await snapshotRepository.writeTodaySnapshot(now, fresh);
    notices.add('일정은 오늘 최초 조회 시점 기준으로 고정돼요. 이후 추가/수정된 일정은 반영되지 않아요.');
    return fresh;
  }

  Future<List<WeatherSnapshot>> _safeForecast(double lat, double lng, List<String> notices) async {
    try {
      return await weatherService.fetchTodayForecast(lat: lat, lng: lng);
    } catch (_) {
      notices.add('날씨 정보를 가져오지 못해 옷차림 추천이 부정확할 수 있어요.');
      return const [];
    }
  }

  /// 캘린더 원본 장소가 없으면 사용자가 직접 입력해둔 장소(override)를 대신 쓴다.
  Future<String?> _resolveAddress(ScheduleEvent event) async {
    final original = event.location?.trim();
    if (original != null && original.isNotEmpty) return original;
    final override = await locationOverrideRepository.read(event.id);
    return (override == null || override.trim().isEmpty) ? null : override.trim();
  }

  Future<T?> _safeCall<T>(Future<T?> Function() call) async {
    try {
      return await call();
    } catch (_) {
      return null;
    }
  }
}
