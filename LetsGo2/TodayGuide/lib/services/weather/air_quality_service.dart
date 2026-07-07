import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../config/app_config.dart';
import '../diagnostic_log.dart';

/// 등급: 1=좋음, 2=보통, 3=나쁨, 4=매우나쁨. 조회 실패/값 없음이면 null.
class AirQualityGrade {
  const AirQualityGrade({this.pm10Grade, this.pm25Grade});
  final int? pm10Grade;
  final int? pm25Grade;

  bool get needsMask => (pm10Grade ?? 0) >= 3 || (pm25Grade ?? 0) >= 3;
}

/// 한국환경공단 에어코리아 "시도별 실시간 측정정보 조회" API(getCtprvnRltmMesureDnsty).
/// data.go.kr 인증키는 계정 단위로 공용이라 기상청 API와 같은 키를 그대로 쓴다
/// (해당 계정으로 이 데이터셋에 별도로 활용신청만 하면 됨).
class AirQualityService {
  AirQualityService({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  static const _endpoint = 'https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty';

  /// [sidoName]은 "서울", "인천", "부산" 같은 시도명(LocationService.resolveCityName과 동일한 값).
  /// 여러 측정소 중 값이 있는 첫 번째 결과를 대표값으로 쓴다.
  Future<AirQualityGrade> fetchGrade({required String sidoName}) async {
    if (AppConfig.kmaServiceKey.isEmpty) return const AirQualityGrade();

    final uri = Uri.parse(_endpoint).replace(queryParameters: {
      'serviceKey': AppConfig.kmaServiceKey,
      'returnType': 'json',
      'numOfRows': '100',
      'pageNo': '1',
      'sidoName': sidoName,
      'ver': '1.3',
    });

    final response = await _client.get(uri);
    if (response.statusCode != 200) {
      await DiagnosticLog.log('미세먼지 조회 실패: HTTP ${response.statusCode} - ${_truncate(response.body)}');
      return const AirQualityGrade();
    }

    final body = jsonDecode(response.body) as Map<String, dynamic>;
    final resultCode = body['response']?['header']?['resultCode'];
    final items = (body['response']?['body']?['items'] as List<dynamic>?) ?? const [];

    if (items.isEmpty) {
      await DiagnosticLog.log(
          '미세먼지 조회 결과 없음: sido=$sidoName resultCode=$resultCode (활용신청 승인 직후라 데이터 반영이 지연됐을 수 있음)');
    }

    for (final raw in items) {
      final item = raw as Map<String, dynamic>;
      final pm10Grade = int.tryParse('${item['pm10Grade'] ?? ''}');
      final pm25Grade = int.tryParse('${item['pm25Grade'] ?? ''}');
      if (pm10Grade != null || pm25Grade != null) {
        return AirQualityGrade(pm10Grade: pm10Grade, pm25Grade: pm25Grade);
      }
    }
    return const AirQualityGrade();
  }

  String _truncate(String s) => s.length > 200 ? s.substring(0, 200) : s;
}
