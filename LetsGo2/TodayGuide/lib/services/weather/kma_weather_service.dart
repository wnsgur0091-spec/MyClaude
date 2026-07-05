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
