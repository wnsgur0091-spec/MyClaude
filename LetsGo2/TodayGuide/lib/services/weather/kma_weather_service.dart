import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../config/app_config.dart';
import '../../models/weather_snapshot.dart';
import '../../utils/kma_grid_converter.dart';

/// 기상청 공공데이터포털 "단기예보 조회서비스"(getVilageFcst) 연동.
/// 3시간 간격 예보만 제공하므로, 특정 시각의 날씨는 해당 시각이 속한
/// 3시간 구간의 예보값으로 근사한다. 호출 자체는 무료이나 하루 호출
/// 한도가 있어 트래픽이 많으면 활용신청 시 한도 증량이 필요하다.
class KmaWeatherService {
  KmaWeatherService({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  static const _endpoint = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst';

  Future<List<WeatherSnapshot>> fetchTodayForecast({
    required double lat,
    required double lng,
  }) async {
    final grid = KmaGridConverter.latLngToGrid(lat, lng);
    final base = _latestBaseDateTime(DateTime.now());

    final uri = Uri.parse(_endpoint).replace(queryParameters: {
      'serviceKey': AppConfig.kmaServiceKey,
      'pageNo': '1',
      'numOfRows': '1000',
      'dataType': 'JSON',
      'base_date': base.dateStr,
      'base_time': base.timeStr,
      'nx': '${grid.nx}',
      'ny': '${grid.ny}',
    });

    final response = await _client.get(uri);
    if (response.statusCode != 200) {
      throw StateError('기상청 단기예보 조회 실패 (${response.statusCode})');
    }

    final body = jsonDecode(response.body) as Map<String, dynamic>;
    final header = body['response']?['header'] as Map<String, dynamic>?;
    if (header != null && header['resultCode'] != '00') {
      throw StateError('기상청 API 오류: ${header['resultMsg']}');
    }
    final items = (body['response']?['body']?['items']?['item'] as List<dynamic>?) ?? const [];

    final byTime = <String, Map<String, String>>{};
    for (final raw in items) {
      final item = raw as Map<String, dynamic>;
      final key = '${item['fcstDate']}${item['fcstTime']}';
      final bucket = byTime.putIfAbsent(key, () => {});
      bucket[item['category'] as String] = '${item['fcstValue']}';
    }

    final snapshots = byTime.entries.map((entry) {
      final dateStr = entry.key.substring(0, 8);
      final timeStr = entry.key.substring(8, 12);
      final time = DateTime(
        int.parse(dateStr.substring(0, 4)),
        int.parse(dateStr.substring(4, 6)),
        int.parse(dateStr.substring(6, 8)),
        int.parse(timeStr.substring(0, 2)),
        int.parse(timeStr.substring(2, 4)),
      );
      final values = entry.value;
      return WeatherSnapshot(
        time: time,
        tempC: double.tryParse(values['TMP'] ?? '') ?? 20,
        precipitationType: PrecipitationType.fromKmaCode(values['PTY'] ?? '0'),
        precipitationProbability: int.tryParse(values['POP'] ?? '') ?? 0,
        skyCondition: SkyCondition.fromKmaCode(values['SKY'] ?? '1'),
      );
    }).toList();

    snapshots.sort((a, b) => a.time.compareTo(b.time));
    return snapshots;
  }

  /// 주어진 시간대(예: 일정 진행 구간)를 커버하는 예보 중 대표값 하나를 고른다.
  /// 우산을 못 챙기는 실수를 줄이기 위해 강수확률이 가장 높은 시점을 우선한다.
  WeatherSnapshot? pickForRange(List<WeatherSnapshot> forecast, DateTime start, DateTime end) {
    if (forecast.isEmpty) return null;
    final within = forecast.where((w) => !w.time.isBefore(start) && w.time.isBefore(end)).toList();
    if (within.isNotEmpty) {
      within.sort((a, b) => b.precipitationProbability.compareTo(a.precipitationProbability));
      return within.first;
    }
    final sorted = [...forecast]
      ..sort((a, b) => (a.time.difference(start)).abs().compareTo((b.time.difference(start)).abs()));
    return sorted.first;
  }

  /// 기상청 단기예보는 3시간 간격으로만 오기 때문에, 일정 구간([start], [end))을
  /// 1시간 단위로 보여주기 위해 앞뒤 3시간 예보 사이를 선형 보간한다. 기온은
  /// 보간하고, 하늘상태/강수형태처럼 범주형인 값은 더 가까운 쪽 예보값을 그대로 쓴다.
  /// (실제로 매시 관측된 값이 아니라 추정치라는 점에 유의)
  ///
  /// [maxHours]로 반복 횟수를 직접 제한한다 — TimeTree 일정의 end가 비정상적으로
  /// 먼 미래(예: 시각 파싱 버그, 잘못된 종일 일정 등)여도 이 루프가 사실상
  /// 무한히 도는 것을 막기 위한 방어 코드다(실제로 이 캡이 없어서 앱이 멈추는
  /// 문제가 있었다).
  List<WeatherSnapshot> hourlyBreakdown(List<WeatherSnapshot> forecast, DateTime start, DateTime end,
      {int maxHours = 24}) {
    if (forecast.isEmpty) return const [];
    final sorted = [...forecast]..sort((a, b) => a.time.compareTo(b.time));

    final hours = <WeatherSnapshot>[];
    var t = DateTime(start.year, start.month, start.day, start.hour);
    final endFloor = DateTime(end.year, end.month, end.day, end.hour);
    while (!t.isAfter(endFloor) && hours.length < maxHours) {
      hours.add(_interpolateAt(sorted, t));
      t = t.add(const Duration(hours: 1));
    }
    return hours;
  }

  WeatherSnapshot _interpolateAt(List<WeatherSnapshot> sorted, DateTime t) {
    WeatherSnapshot? before;
    WeatherSnapshot? after;
    for (final s in sorted) {
      if (!s.time.isAfter(t)) before = s;
      if (s.time.isAfter(t) && after == null) after = s;
    }

    if (before == null) return _copyAt(sorted.first, t);
    if (after == null) return _copyAt(before, t);

    final spanMinutes = after.time.difference(before.time).inMinutes;
    final progress = spanMinutes == 0 ? 0.0 : t.difference(before.time).inMinutes / spanMinutes;
    final nearer = progress < 0.5 ? before : after;
    return WeatherSnapshot(
      time: t,
      tempC: before.tempC + (after.tempC - before.tempC) * progress,
      precipitationType: nearer.precipitationType,
      precipitationProbability:
          (before.precipitationProbability + (after.precipitationProbability - before.precipitationProbability) * progress)
              .round(),
      skyCondition: nearer.skyCondition,
      uvIndex: nearer.uvIndex,
      pm10Grade: nearer.pm10Grade,
      pm25Grade: nearer.pm25Grade,
    );
  }

  WeatherSnapshot _copyAt(WeatherSnapshot source, DateTime t) => WeatherSnapshot(
        time: t,
        tempC: source.tempC,
        precipitationType: source.precipitationType,
        precipitationProbability: source.precipitationProbability,
        skyCondition: source.skyCondition,
        uvIndex: source.uvIndex,
        pm10Grade: source.pm10Grade,
        pm25Grade: source.pm25Grade,
      );

  ({String dateStr, String timeStr}) _latestBaseDateTime(DateTime now) {
    const baseHours = [23, 20, 17, 14, 11, 8, 5, 2];
    // 발표 후 API 반영까지 지연이 있어 10분 여유를 둔다.
    final adjusted = now.subtract(const Duration(minutes: 10));
    for (final hour in baseHours) {
      if (adjusted.hour >= hour) {
        return (dateStr: _formatDate(adjusted), timeStr: '${hour.toString().padLeft(2, '0')}00');
      }
    }
    final yesterday = adjusted.subtract(const Duration(days: 1));
    return (dateStr: _formatDate(yesterday), timeStr: '2300');
  }

  String _formatDate(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}${d.month.toString().padLeft(2, '0')}${d.day.toString().padLeft(2, '0')}';
}
