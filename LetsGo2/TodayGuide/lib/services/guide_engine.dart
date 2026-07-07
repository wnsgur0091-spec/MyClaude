import 'dart:async';

import '../models/event_attendee_role.dart';
import '../models/nearby_event.dart';
import '../models/outfit_recommendation.dart';
import '../models/route_plan.dart';
import '../models/schedule_event.dart';
import '../models/today_guide_result.dart';
import '../models/user_settings.dart';
import '../models/weather_snapshot.dart';
import 'calendar/calendar_service.dart';
import 'diagnostic_log.dart';
import 'event_location_override_repository.dart';
import 'location_service.dart';
import 'nearby_event_service.dart';
import 'outfit_rules.dart';
import 'route/naver_driving_route_service.dart';
import 'route/odsay_transit_route_service.dart';
import 'weather/air_quality_service.dart';
import 'weather/kma_uv_service.dart';
import 'weather/kma_weather_service.dart';
import 'weather/weather_warning_service.dart';

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
    KmaUvService? uvService,
    AirQualityService? airQualityService,
    WeatherWarningService? weatherWarningService,
    NearbyEventService? nearbyEventService,
    EventLocationOverrideRepository? locationOverrideRepository,
    this.onEventsFetched,
  })  : uvService = uvService ?? KmaUvService(),
        airQualityService = airQualityService ?? AirQualityService(),
        weatherWarningService = weatherWarningService ?? WeatherWarningService(),
        nearbyEventService = nearbyEventService ?? NearbyEventService(),
        locationOverrideRepository = locationOverrideRepository ?? EventLocationOverrideRepository();

  final LocationService locationService;
  final KmaWeatherService weatherService;
  final NaverDrivingRouteService drivingRouteService;
  final OdsayTransitRouteService transitRouteService;
  final KmaUvService uvService;
  final AirQualityService airQualityService;
  final WeatherWarningService weatherWarningService;
  final NearbyEventService nearbyEventService;
  final EventLocationOverrideRepository locationOverrideRepository;

  /// 일정을 조회할 때마다(=buildTodayGuide 호출마다) 호출된다.
  /// 일정별 사전 알림(3시간 전) 재예약 등에 쓴다.
  final Future<void> Function(List<ScheduleEvent> events)? onEventsFetched;

  /// 오늘의 지침서를 계산한다. logcat은 몇 시간만 지나도 버퍼가 순환돼서
  /// 간헐적으로 발생하는 오류를 나중에 확인할 방법이 없기 때문에, 시작/종료/
  /// 실패를 항상 DiagnosticLog에 남긴다(설정 화면에서 확인 가능).
  Future<TodayGuideResult> buildTodayGuide({
    required UserSettings settings,
    required CalendarService calendarService,
  }) async {
    final stopwatch = Stopwatch()..start();
    unawaited(DiagnosticLog.log('buildTodayGuide 시작'));
    try {
      final result = await _buildTodayGuideInner(settings: settings, calendarService: calendarService);
      unawaited(DiagnosticLog.log(
          'buildTodayGuide 완료 (${stopwatch.elapsedMilliseconds}ms, 일정 ${result.eventGuides.length}건, 안내 ${result.notices.length}건)'));
      return result;
    } catch (e, stack) {
      unawaited(DiagnosticLog.log(
          'buildTodayGuide 실패 (${stopwatch.elapsedMilliseconds}ms): $e\n${_truncateStack(stack)}'));
      rethrow;
    }
  }

  String _truncateStack(StackTrace stack) {
    final lines = '$stack'.split('\n');
    return lines.take(6).join('\n');
  }

  Future<TodayGuideResult> _buildTodayGuideInner({
    required UserSettings settings,
    required CalendarService calendarService,
  }) async {
    final now = DateTime.now();
    final notices = <String>[];
    final stageWatch = Stopwatch()..start();

    // TimeTree 조회(네트워크)와 GPS 위치 확인은 서로 의존하지 않으므로
    // 순차 대기 대신 동시에 시작해서 전체 대기 시간을 줄인다.
    final fetchedFuture = calendarService.fetchTodayAndNext(now);
    final locationFuture = locationService.resolveCurrentLocation(settings);
    final fetched = await fetchedFuture;
    unawaited(DiagnosticLog.log('  TimeTree 조회 완료 (${stageWatch.elapsedMilliseconds}ms)'));
    final currentLocation = await locationFuture;
    unawaited(DiagnosticLog.log('  위치 확인 완료 (${stageWatch.elapsedMilliseconds}ms, fallback=${currentLocation.isFallback})'));

    final hadEventsToday = fetched.todayEvents.isNotEmpty;
    // 앱을 연 시점 기준으로 이미 끝난 일정은 이동경로를 계산할 이유가 없고
    // 화면에도 보여줄 필요가 없으므로 여기서 걸러낸다.
    final events = fetched.todayEvents.where((e) => e.end.isAfter(now)).toList();
    final nextEvent = fetched.nextUpcomingEvent;
    final nextEventAlreadyToday = nextEvent != null && events.any((e) => e.id == nextEvent.id);

    await onEventsFetched?.call([
      ...events,
      if (nextEvent != null && !nextEventAlreadyToday) nextEvent,
    ]);

    if (currentLocation.isFallback) {
      notices.add('현재 위치를 가져오지 못해 ${currentLocation.label}를 기준으로 계산했어요.');
    }

    // 날씨 예보와 자외선지수용 도시명 조회도 서로 독립적이라 동시에 시작한다.
    final rawForecastFuture = _safeForecast(currentLocation.lat, currentLocation.lng, notices);
    final cityNameFuture = _safeCall(() => locationService.resolveCityName(currentLocation.lat, currentLocation.lng));
    final rawForecast = await rawForecastFuture;
    final cityName = await cityNameFuture;

    // 자외선지수/미세먼지 부착과 기상특보 조회도 서로 독립적이라 동시에 시작한다.
    final forecastFuture = _attachUv(rawForecast, cityName, notices);
    final warningsFuture = cityName == null
        ? Future<List<String>>.value(const [])
        : weatherWarningService.fetchActiveWarnings(cityName: cityName, now: now);
    final forecast = await forecastFuture;
    final weatherWarnings = await warningsFuture;
    unawaited(DiagnosticLog.log('  날씨/자외선지수/특보 조회 완료 (${stageWatch.elapsedMilliseconds}ms)'));

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

    var nearbyEvents = const <NearbyEvent>[];
    String? todayEmptyNotice;
    if (events.isEmpty) {
      if (hadEventsToday) {
        // 오늘 일정이 있었지만 다 끝난 상태. 방금 소화한(=가장 늦게 끝난) 일정
        // 제목을 언급해서 수고했다는 느낌으로 안내한다. 단, 배우자 단독
        // 일정(partner)은 이 기기 사용자가 소화한 게 아니므로 제외한다 —
        // 안 그러면 배우자 일정을 두고 "고생했어요"라고 잘못 말하게 된다.
        final completedOwnToday = fetched.todayEvents
            .where((e) => !e.end.isAfter(now) && e.attendeeRole != EventAttendeeRole.partner)
            .toList()
          ..sort((a, b) => a.end.compareTo(b.end));
        final lastOwnEvent = completedOwnToday.isNotEmpty ? completedOwnToday.last : null;
        todayEmptyNotice = lastOwnEvent != null
            ? '"${lastOwnEvent.title}" 일정을 소화하느라 고생했어요.'
            : '오늘 남은 일정이 없어요. 외출 시 현재 날씨를 참고해주세요.';
      } else {
        todayEmptyNotice = '오늘 등록된 일정이 없어요. 외출 시 현재 날씨를 참고해주세요.';
      }

      // 오늘 남은 일정이 없으면 현재 위치 근처(반경 20km) 축제/행사를
      // 추천해준다. 다만 하루를 시작하는 낮 12시 이전에만 보여준다 — 오후에
      // 뜬금없이 "오늘 볼거리 추천"이 뜨는 건 맥락에 안 맞아서다.
      if (now.hour < 12) {
        nearbyEvents = await _safeCall(
              () => nearbyEventService.fetchNearbyFestivals(lat: currentLocation.lat, lng: currentLocation.lng),
            ) ??
            const [];
      }
    }

    // 오늘 일정이 없어서 대신 계산한 "다음 일정"(미래 날짜)은 오늘의
    // 동선/옷차림에 섞지 않고 별도 D+N 섹션 데이터로 분리해서 들고 있는다.
    EventGuide? upcomingEventGuide;
    int? upcomingDayOffset;
    if (nextEvent != null && !nextEventAlreadyToday) {
      final built = await _buildEventGuide(
        event: nextEvent,
        originLat: currentLocation.lat,
        originLng: currentLocation.lng,
        forecast: forecast,
        notices: notices,
      );
      upcomingEventGuide = built.eventGuide;
      upcomingDayOffset = DateTime(nextEvent.start.year, nextEvent.start.month, nextEvent.start.day)
          .difference(DateTime(now.year, now.month, now.day))
          .inDays;
    }

    // 알림 배너는 실제로 알림이 울리는 대상(본인/같이 일정)만 기준으로
    // 삼는다. nextEvent(역할 무관)를 쓰면 배우자 단독 일정에 대해 "알림이
    // 울린다"고 잘못 안내하게 된다(그 일정엔 실제로 알림이 안 울림).
    final nextOwnEvent = fetched.nextOwnUpcomingEvent;
    final alarmNotice = nextOwnEvent == null ? null : _alarmNotice(nextOwnEvent, now);

    unawaited(DiagnosticLog.log(
        '  이동경로 계산 완료 (${stageWatch.elapsedMilliseconds}ms, 일정 ${events.length}건 + 다음일정 ${upcomingEventGuide != null ? 1 : 0}건)'));

    final outfit = OutfitRules.recommend(
      daySnapshots: daySnapshots,
      gender: settings.gender,
      noEventsReason: events.isEmpty,
    );

    // "오늘의 옷차림"에 딸린 시간대별 날씨는 오늘 일정 기준일 때만 보여준다.
    // 다음 일정이 미래 날짜라면 여기 섞지 않고 아래 upcomingOutfit으로 분리한다.
    // 최대 12시간까지만 보여줘서 종일 일정처럼 구간이 긴 경우에도 표가 너무
    // 길어지지 않게 한다.
    const maxHourlyRows = 12;
    final outfitReferenceEvent = nextEventAlreadyToday ? nextEvent : null;
    final outfitHourly = outfitReferenceEvent == null
        ? const <WeatherSnapshot>[]
        : weatherService.hourlyBreakdown(forecast, outfitReferenceEvent.start, outfitReferenceEvent.end,
            maxHours: maxHourlyRows);

    OutfitRecommendation? upcomingOutfit;
    var upcomingOutfitHourly = const <WeatherSnapshot>[];
    if (upcomingEventGuide != null) {
      upcomingOutfitHourly = weatherService.hourlyBreakdown(
          forecast, upcomingEventGuide.event.start, upcomingEventGuide.event.end,
          maxHours: maxHourlyRows);
      upcomingOutfit = OutfitRules.recommend(daySnapshots: upcomingOutfitHourly, gender: settings.gender);
    }

    final briefing = _buildBriefing(
      now: now,
      weatherWarnings: weatherWarnings,
      outfit: outfit,
      nextEvent: nextEvent,
      hasNearbyEvents: nearbyEvents.isNotEmpty,
    );

    return TodayGuideResult(
      generatedAt: now,
      eventGuides: eventGuides,
      outfit: outfit,
      briefing: briefing,
      outfitEvent: outfitReferenceEvent,
      outfitHourlyWeather: outfitHourly,
      alarmNotice: alarmNotice,
      weatherWarnings: weatherWarnings,
      nearbyEvents: nearbyEvents,
      todayEmptyNotice: todayEmptyNotice,
      upcomingEventGuide: upcomingEventGuide,
      upcomingDayOffset: upcomingDayOffset,
      upcomingOutfit: upcomingOutfit,
      upcomingOutfitHourlyWeather: upcomingOutfitHourly,
      notices: notices,
    );
  }

  /// 날씨/옷차림/다음 일정 계산이 끝난 결과를 자연스러운 한 문단 인사말로
  /// 요약한다. Claude API 등 LLM 호출 없이 순수 문자열 템플릿으로 조합한다.
  String _buildBriefing({
    required DateTime now,
    required List<String> weatherWarnings,
    required OutfitRecommendation outfit,
    required ScheduleEvent? nextEvent,
    required bool hasNearbyEvents,
  }) {
    final buffer = StringBuffer(_greetingFor(now));

    if (weatherWarnings.isNotEmpty) {
      buffer.write(' 지금 ${weatherWarnings.first}가 발효 중이니 외출 시 조심하세요.');
    }

    buffer.write(' ${outfit.reason}');
    if (outfit.items.isNotEmpty) {
      buffer.write(' ${outfit.items.join(', ')} 챙기시고,');
    }
    buffer.write(' ${outfit.top} · ${outfit.bottom} · ${outfit.shoes} 조합 추천드려요.');

    if (nextEvent != null) {
      buffer.write(' 다음 일정은 "${nextEvent.title}"이고, ${_formatMoment(nextEvent.start)}에 시작해요.');
    } else if (hasNearbyEvents) {
      buffer.write(' 오늘 남은 일정은 없지만, 근처에 가볼 만한 축제/행사를 아래에 찾아봤어요.');
    } else {
      buffer.write(' 오늘 남은 일정은 없어요. 편안한 하루 보내세요.');
    }

    return buffer.toString();
  }

  String _greetingFor(DateTime now) {
    final h = now.hour;
    if (h < 6) return '아직 이른 새벽이에요.';
    if (h < 11) return '좋은 아침이에요!';
    if (h < 14) return '점심 시간대예요.';
    if (h < 18) return '오후에도 힘내세요!';
    if (h < 22) return '저녁 시간이네요.';
    return '늦은 시간까지 고생 많아요.';
  }

  /// 자외선지수/미세먼지를 조회해서 예보 목록에 붙여준다. 둘 다 같은 도시명에
  /// 의존할 뿐 서로 독립적이라 동시에 조회한다. 위경도를 도시명으로 바꾸지
  /// 못하거나(매핑 안 된 지역) 조회에 실패하면, 그 정보 없이도 우산 등 다른
  /// 추천은 그대로 동작하게 하고 안내 문구만 남긴다.
  Future<List<WeatherSnapshot>> _attachUv(
    List<WeatherSnapshot> forecast,
    String? cityName,
    List<String> notices,
  ) async {
    if (forecast.isEmpty) return forecast;

    Map<DateTime, int> uvForecast = const {};
    AirQualityGrade airQuality = const AirQualityGrade();
    if (cityName != null) {
      final uvFuture = _safeCall(() => uvService.fetchUvForecast(cityName: cityName, baseTime: DateTime.now()));
      final airFuture = _safeCall(() => airQualityService.fetchGrade(sidoName: cityName));
      uvForecast = await uvFuture ?? const {};
      airQuality = await airFuture ?? const AirQualityGrade();
    }

    if (uvForecast.isEmpty) {
      notices.add('자외선지수 정보를 가져오지 못해 선글라스/양산 추천은 표시되지 않았어요.');
    }
    if (airQuality.pm10Grade == null && airQuality.pm25Grade == null) {
      notices.add('미세먼지 정보를 가져오지 못해 마스크 추천은 표시되지 않았어요.');
    }
    if (uvForecast.isEmpty && airQuality.pm10Grade == null && airQuality.pm25Grade == null) {
      return forecast;
    }

    return forecast
        .map((s) => WeatherSnapshot(
              time: s.time,
              tempC: s.tempC,
              precipitationType: s.precipitationType,
              precipitationProbability: s.precipitationProbability,
              skyCondition: s.skyCondition,
              uvIndex: uvService.pickForTime(uvForecast, s.time),
              pm10Grade: airQuality.pm10Grade,
              pm25Grade: airQuality.pm25Grade,
            ))
        .toList();
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
      // 자차/대중교통 소요시간은 서로 독립적인 조회라 동시에 시작한다.
      final carMinutesFuture = _safeCall(
        () => drivingRouteService.estimateDurationMinutes(
          startLat: originLat,
          startLng: originLng,
          goalLat: dest.lat,
          goalLng: dest.lng,
        ),
        onFailure: () => notices.add('"${event.title}" 자동차 이동 시간을 일시적인 문제로 가져오지 못했어요.'),
      );
      final transitMinutesFuture = _safeCall(
        () => transitRouteService.estimateDurationMinutes(
          startLat: originLat,
          startLng: originLng,
          goalLat: dest.lat,
          goalLng: dest.lng,
        ),
        onFailure: () => notices.add('"${event.title}" 대중교통 이동 시간을 일시적인 문제로 가져오지 못했어요.'),
      );
      final carMinutes = await carMinutesFuture;
      final transitMinutes = await transitMinutesFuture;

      if (carMinutes != null) {
        carPlan = RoutePlan.forArrival(
          mode: TransportMode.car,
          durationMinutes: carMinutes,
          eventStart: event.start,
          originLat: originLat,
          originLng: originLng,
          destinationLat: dest.lat,
          destinationLng: dest.lng,
        );
      }
      if (transitMinutes != null) {
        transitPlan = RoutePlan.forArrival(
          mode: TransportMode.transit,
          durationMinutes: transitMinutes,
          eventStart: event.start,
          originLat: originLat,
          originLng: originLng,
          destinationLat: dest.lat,
          destinationLng: dest.lng,
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
