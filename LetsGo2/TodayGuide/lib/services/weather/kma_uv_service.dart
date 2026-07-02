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

  Future<int?> fetchUvIndex({required String cityName, required DateTime time}) async {
    final areaNo = _knownAreaNoByCityName[cityName];
    if (areaNo == null || AppConfig.kmaServiceKey.isEmpty) return null;

    final uri = Uri.parse(_endpoint).replace(queryParameters: {
      'serviceKey': AppConfig.kmaServiceKey,
      'pageNo': '1',
      'numOfRows': '10',
      'dataType': 'JSON',
      'areaNo': areaNo,
      'time': _formatBaseTime(time),
    });

    final response = await _client.get(uri);
    if (response.statusCode != 200) return null;

    final body = jsonDecode(response.body) as Map<String, dynamic>;
    final items = (body['response']?['body']?['items']?['item'] as List<dynamic>?) ?? const [];
    if (items.isEmpty) return null;

    final item = items.first as Map<String, dynamic>;
    final hourKey = 'h${time.hour.toString().padLeft(2, '0')}';
    final value = item[hourKey];
    if (value == null) return null;
    return int.tryParse('$value');
  }

  String _formatBaseTime(DateTime time) {
    final morning = DateTime(time.year, time.month, time.day, 6);
    final evening = DateTime(time.year, time.month, time.day, 18);
    final target = time.hour >= 18 ? evening : morning; // 자외선지수는 1일 2회(06,18) 발표
    return '${target.year}${target.month.toString().padLeft(2, '0')}${target.day.toString().padLeft(2, '0')}${target.hour.toString().padLeft(2, '0')}';
  }
}
