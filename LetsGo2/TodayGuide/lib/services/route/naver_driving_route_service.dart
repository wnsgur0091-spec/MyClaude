import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../config/app_config.dart';

/// 네이버 클라우드 플랫폼 Maps > Direction 5(자동차 길찾기) API.
/// 월 무료 크레딧 이후 종량 과금이며(Naver Cloud Platform 콘솔에서 단가 확인 필요),
/// 대중교통 길찾기는 이 API에 포함되어 있지 않다(도보/자동차만 제공) —
/// 대중교통은 OdsayTransitRouteService로 대체한다.
class NaverDrivingRouteService {
  NaverDrivingRouteService({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  static const _endpoint = 'https://maps.apigw.ntruss.com/map-direction/v1/driving';

  /// 예상 소요 시간(분)을 반환한다. 실패 시 null.
  Future<int?> estimateDurationMinutes({
    required double startLat,
    required double startLng,
    required double goalLat,
    required double goalLng,
  }) async {
    final uri = Uri.parse(_endpoint).replace(queryParameters: {
      'start': '$startLng,$startLat',
      'goal': '$goalLng,$goalLat',
      'option': 'trafast',
    });

    final response = await _client.get(uri, headers: {
      'x-ncp-apigw-api-key-id': AppConfig.naverMapClientId,
      'x-ncp-apigw-api-key': AppConfig.naverMapClientSecret,
    });

    if (response.statusCode != 200) return null;

    final body = jsonDecode(response.body) as Map<String, dynamic>;
    final routes = body['route']?['trafast'] as List<dynamic>?;
    if (routes == null || routes.isEmpty) return null;

    final summary = (routes.first as Map<String, dynamic>)['summary'] as Map<String, dynamic>;
    final durationMs = summary['duration'] as int;
    return (durationMs / 60000).ceil();
  }
}
