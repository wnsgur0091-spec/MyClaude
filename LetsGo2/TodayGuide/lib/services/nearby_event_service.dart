import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import '../models/nearby_event.dart';
import 'diagnostic_log.dart';

/// 한국관광공사 TourAPI "위치기반 관광정보조회"(locationBasedList2) 연동.
/// contentTypeId=15(축제공연행사)로 필터링해서 반경 내 축제/행사만 가져온다.
/// data.go.kr 인증키는 계정 단위로 공용이라 기상청 등과 같은 키를 그대로 쓴다
/// (한국관광공사_국문 관광정보 서비스 데이터셋에 별도로 활용신청 필요).
class NearbyEventService {
  NearbyEventService({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  static const _endpoint = 'https://apis.data.go.kr/B551011/KorService2/locationBasedList2';
  static const _festivalContentTypeId = '15';

  Future<List<NearbyEvent>> fetchNearbyFestivals({
    required double lat,
    required double lng,
    int radiusMeters = 20000,
  }) async {
    if (AppConfig.kmaServiceKey.isEmpty) return const [];

    final uri = Uri.parse(_endpoint).replace(queryParameters: {
      'serviceKey': AppConfig.kmaServiceKey,
      'MobileOS': 'ETC',
      'MobileApp': 'TodayGuide',
      '_type': 'json',
      'mapX': '$lng',
      'mapY': '$lat',
      'radius': '$radiusMeters',
      'contentTypeId': _festivalContentTypeId,
      'arrange': 'E', // 거리순 정렬
      'numOfRows': '10',
      'pageNo': '1',
    });

    try {
      final response = await _client.get(uri);
      if (response.statusCode != 200) {
        await DiagnosticLog.log('근교 축제 조회 실패: HTTP ${response.statusCode}');
        return const [];
      }

      final body = jsonDecode(response.body) as Map<String, dynamic>;
      final header = body['response']?['header'] as Map<String, dynamic>?;
      if (header != null && header['resultCode'] != '0000' && header['resultCode'] != '00') {
        await DiagnosticLog.log('근교 축제 조회 실패: ${header['resultMsg']}');
        return const [];
      }

      final rawItems = body['response']?['body']?['items']?['item'];
      final items = rawItems is List ? rawItems : (rawItems == null ? const [] : [rawItems]);
      if (items.isEmpty) {
        await DiagnosticLog.log('근교 축제 조회 결과 없음(반경 ${radiusMeters}m)');
      }

      return items
          .cast<Map<String, dynamic>>()
          .map((item) {
            final mapX = double.tryParse('${item['mapx'] ?? ''}');
            final mapY = double.tryParse('${item['mapy'] ?? ''}');
            final title = item['title'] as String?;
            if (mapX == null || mapY == null || title == null || title.isEmpty) return null;
            return NearbyEvent(
              title: title,
              address: item['addr1'] as String?,
              lat: mapY,
              lng: mapX,
              imageUrl: (item['firstimage'] as String?)?.isNotEmpty == true ? item['firstimage'] as String : null,
            );
          })
          .whereType<NearbyEvent>()
          .toList();
    } catch (e) {
      await DiagnosticLog.log('근교 축제 조회 예외: $e');
      return const [];
    }
  }
}
