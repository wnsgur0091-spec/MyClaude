import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../config/app_config.dart';

/// 기상청 생활기상지수 "자외선지수" API(getUVIdxV4)는 위경도가 아니라
/// 행정구역 단위의 별도 지역코드(areaNo)를 요구한다. 전국 지역코드 매핑표를
/// 아직 내장하지 않았기 때문에, 알고 있는 지역코드가 있을 때만 값을 반환하고
/// 그 외에는 null을 반환해 상위 로직이 자외선지수 없이도 동작하도록 한다.
///
/// TODO: 기상청이 배포하는 전체 지역코드 CSV를 받아 areaNo 매핑을 완성할 것.
class KmaUvService {
  KmaUvService({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  static const _endpoint = 'https://apis.data.go.kr/1360000/LivingWthrIdxServiceV4/getUVIdxV4';

  static const Map<String, String> _knownAreaNoByCityName = {
    '서울': '1100000000',
    '인천': '2800000000',
    '부산': '2600000000',
  };

  /// [baseTime] 기준 발표된 예보 하나(며칠치 3시간 간격 hNN 컬럼을 담고 있음)를
  /// 가져와서, 그 안에 있는 모든 시각의 자외선지수를 시각->값 맵으로 반환한다.
  /// 지역코드를 모르거나 API 키가 없거나 조회에 실패하면 빈 맵을 반환한다.
  Future<Map<DateTime, int>> fetchUvForecast({required String cityName, required DateTime baseTime}) async {
    final areaNo = _knownAreaNoByCityName[cityName];
    if (areaNo == null || AppConfig.kmaServiceKey.isEmpty) return const {};

    final uri = Uri.parse(_endpoint).replace(queryParameters: {
      'serviceKey': AppConfig.kmaServiceKey,
      'pageNo': '1',
      'numOfRows': '10',
      'dataType': 'JSON',
      'areaNo': areaNo,
      'time': _formatBaseTime(baseTime),
    });

    final response = await _client.get(uri);
    if (response.statusCode != 200) return const {};

    final body = jsonDecode(response.body) as Map<String, dynamic>;
    final items = (body['response']?['body']?['items']?['item'] as List<dynamic>?) ?? const [];
    if (items.isEmpty) return const {};

    final item = items.first as Map<String, dynamic>;
    final result = <DateTime, int>{};
    final referenceDay = DateTime(baseTime.year, baseTime.month, baseTime.day);
    for (var dayOffset = 0; dayOffset < 3; dayOffset++) {
      final day = referenceDay.add(Duration(days: dayOffset));
      for (var hour = 0; hour < 24; hour += 3) {
        final key = dayOffset == 0
            ? 'h${hour.toString().padLeft(2, '0')}'
            : 'd${dayOffset}h${hour.toString().padLeft(2, '0')}';
        final value = item[key];
        if (value == null) continue;
        final parsed = int.tryParse('$value');
        if (parsed != null) result[day.add(Duration(hours: hour))] = parsed;
      }
    }
    return result;
  }

  /// [forecast]에서 [time]과 가장 가까운 시각의 자외선지수를 찾는다.
  int? pickForTime(Map<DateTime, int> forecast, DateTime time) {
    if (forecast.isEmpty) return null;
    final closest = forecast.keys.reduce(
      (a, b) => (a.difference(time)).abs() < (b.difference(time)).abs() ? a : b,
    );
    return forecast[closest];
  }

  String _formatBaseTime(DateTime time) {
    final morning = DateTime(time.year, time.month, time.day, 6);
    final evening = DateTime(time.year, time.month, time.day, 18);
    final target = time.hour >= 18 ? evening : morning; // 자외선지수는 1일 2회(06,18) 발표
    return '${target.year}${target.month.toString().padLeft(2, '0')}${target.day.toString().padLeft(2, '0')}${target.hour.toString().padLeft(2, '0')}';
  }
}
