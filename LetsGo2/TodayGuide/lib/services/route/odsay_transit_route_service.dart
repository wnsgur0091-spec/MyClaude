import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../config/app_config.dart';

/// 대중교통 길찾기: 네이버 지도 API(Direction 5)는 자동차/도보만 제공하고
/// 대중교통 경로 탐색은 지원하지 않는다. 이를 대체하기 위해 ODsay Lab의
/// "대중교통 길찾기" API를 사용한다(회원가입 후 무료 호출 쿼터 제공, 초과 시
/// 유료 — 정확한 단가는 ODsay 개발자 콘솔에서 확인 필요).
class OdsayTransitRouteService {
  OdsayTransitRouteService({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  static const _endpoint = 'https://api.odsay.com/v1/api/searchPubTransPathT';

  /// 예상 소요 시간(분)을 반환한다. 실패 시 null.
  Future<int?> estimateDurationMinutes({
    required double startLat,
    required double startLng,
    required double goalLat,
    required double goalLng,
  }) async {
    final uri = Uri.parse(_endpoint).replace(queryParameters: {
      'SX': '$startLng',
      'SY': '$startLat',
      'EX': '$goalLng',
      'EY': '$goalLat',
      'apiKey': AppConfig.odsayApiKey,
    });

    final response = await _client.get(uri);
    if (response.statusCode != 200) return null;

    final body = jsonDecode(response.body) as Map<String, dynamic>;
    final paths = body['result']?['path'] as List<dynamic>?;
    if (paths == null || paths.isEmpty) return null;

    final durations = paths.map((p) {
      final info = (p as Map<String, dynamic>)['info'] as Map<String, dynamic>;
      return info['totalTime'] as int;
    }).toList()
      ..sort();

    return durations.first;
  }
}
