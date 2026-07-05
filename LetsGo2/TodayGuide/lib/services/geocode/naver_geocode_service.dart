import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../config/app_config.dart';

/// 네이버 클라우드 플랫폼 Maps > Geocoding API.
/// `geocoding` 패키지(안드로이드 네이티브 Geocoder, 구글 백엔드)는 국내 지번 주소
/// 검색 정확도가 낮아, 도로명/지번 주소를 모두 잘 인식하는 네이버 Geocoding으로 대체한다.
class NaverGeocodeService {
  NaverGeocodeService({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  static const _endpoint = 'https://maps.apigw.ntruss.com/map-geocode/v2/geocode';

  /// 주소(도로명 또는 지번)를 좌표로 변환한다. 실패/결과 없음이면 null.
  Future<({double lat, double lng})?> geocode(String query) async {
    final uri = Uri.parse(_endpoint).replace(queryParameters: {'query': query});

    final response = await _client.get(uri, headers: {
      'x-ncp-apigw-api-key-id': AppConfig.naverMapClientId,
      'x-ncp-apigw-api-key': AppConfig.naverMapClientSecret,
      'Accept': 'application/json',
    });

    if (response.statusCode != 200) return null;

    final body = jsonDecode(response.body) as Map<String, dynamic>;
    final addresses = body['addresses'] as List<dynamic>?;
    if (addresses == null || addresses.isEmpty) return null;

    final first = addresses.first as Map<String, dynamic>;
    final lat = double.tryParse(first['y'] as String? ?? '');
    final lng = double.tryParse(first['x'] as String? ?? '');
    if (lat == null || lng == null) return null;

    return (lat: lat, lng: lng);
  }
}
