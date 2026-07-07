import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../config/app_config.dart';
import '../diagnostic_log.dart';

/// 기상청 "기상특보 조회서비스"(getWthrWrnList) 연동. data.go.kr 인증키는
/// 계정 단위로 공용이라 기상청/에어코리아와 같은 키를 그대로 쓴다.
class WeatherWarningService {
  WeatherWarningService({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  static const _endpoint = 'https://apis.data.go.kr/1360000/WthrWrnInfoService/getWthrWrnList';

  /// 지점코드(stnId). 특보는 위경도가 아니라 KMA 지점번호 기준이라 자외선
  /// 지수/미세먼지와 같은 방식으로 알려진 도시명만 매핑해둔다.
  static const _knownStationIdByCityName = {
    '서울': '108',
    '인천': '112',
    '부산': '159',
  };

  /// [cityName] 기준으로 오늘 발표된 특보 중 아직 해제되지 않은 것으로
  /// 보이는 항목의 제목 목록을 반환한다. 매핑 안 된 지역이거나 조회
  /// 실패/특보 없음이면 빈 리스트.
  Future<List<String>> fetchActiveWarnings({required String cityName, required DateTime now}) async {
    final stnId = _knownStationIdByCityName[cityName];
    if (stnId == null || AppConfig.kmaServiceKey.isEmpty) return const [];

    final today = '${now.year}${now.month.toString().padLeft(2, '0')}${now.day.toString().padLeft(2, '0')}';
    final uri = Uri.parse(_endpoint).replace(queryParameters: {
      'serviceKey': AppConfig.kmaServiceKey,
      'pageNo': '1',
      'numOfRows': '30',
      'dataType': 'JSON',
      'stnId': stnId,
      'fromTmFc': today,
      'toTmFc': today,
    });

    try {
      final response = await _client.get(uri);
      if (response.statusCode != 200) {
        await DiagnosticLog.log('기상특보 조회 실패: HTTP ${response.statusCode}');
        return const [];
      }

      final body = jsonDecode(response.body) as Map<String, dynamic>;
      final header = body['response']?['header'] as Map<String, dynamic>?;
      if (header != null && header['resultCode'] != '00') {
        await DiagnosticLog.log('기상특보 조회 실패: ${header['resultMsg']}');
        return const [];
      }

      final items = (body['response']?['body']?['items']?['item'] as List<dynamic>?) ?? const [];
      // "해제"가 제목에 들어간 항목은 특보가 끝났다는 통보라 제외하고,
      // 나머지 제목만 안내 대상으로 남긴다. 같은 특보의 발표/해제가
      // 섞여 있을 수 있어 title 기준으로만 최소한으로 걸러낸다.
      final titles = items
          .map((raw) => (raw as Map<String, dynamic>)['title'] as String?)
          .whereType<String>()
          .where((title) => !title.contains('해제'))
          .toSet() // 같은 특보가 여러 번 나오는 경우 중복 제거
          .toList();

      if (items.isNotEmpty && titles.isEmpty) {
        await DiagnosticLog.log('기상특보: 오늘 발표 ${items.length}건이지만 전부 해제 통보라 표시할 특보 없음');
      }
      return titles;
    } catch (e) {
      await DiagnosticLog.log('기상특보 조회 예외: $e');
      return const [];
    }
  }
}
