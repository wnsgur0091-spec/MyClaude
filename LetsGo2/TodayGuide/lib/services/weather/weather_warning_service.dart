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

  static const _lookback = Duration(minutes: 30);

  /// [cityName] 기준으로, 앱 구동 시점([now]) 기준 최근 30분 이내에 발표된
  /// 특보 중 아직 해제되지 않은 것으로 보이는 항목의 제목 목록을 반환한다.
  /// fromTmFc/toTmFc는 날짜(yyyyMMdd) 단위만 지원한다 — 분단위(yyyyMMddHHmm)로
  /// 보내면 API가 DB_ERROR를 반환해서 조회 자체가 실패한다(실측 확인됨).
  /// 그래서 서버에는 날짜 범위만 요청하고, "최근 30분" 필터는 응답에 담긴
  /// 발표시각(tmFc)을 클라이언트에서 직접 비교해서 적용한다. 매핑 안 된
  /// 지역이거나 조회 실패/최근 특보 없음이면 빈 리스트.
  Future<List<String>> fetchActiveWarnings({required String cityName, required DateTime now}) async {
    final stnId = _knownStationIdByCityName[cityName];
    if (stnId == null || AppConfig.kmaServiceKey.isEmpty) return const [];

    final cutoff = now.subtract(_lookback);
    final uri = Uri.parse(_endpoint).replace(queryParameters: {
      'serviceKey': AppConfig.kmaServiceKey,
      'pageNo': '1',
      'numOfRows': '30',
      'dataType': 'JSON',
      'stnId': stnId,
      'fromTmFc': _formatDate(cutoff),
      'toTmFc': _formatDate(now),
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

      // 서버에 fromTmFc/toTmFc로 이미 최근 30분 구간을 요청했지만, 혹시
      // API가 분단위를 무시하고 날짜 단위로만 걸러줄 가능성에 대비해
      // 발표시각(tmFc)을 다시 한번 클라이언트에서도 검증한다.
      final recentItems = items.cast<Map<String, dynamic>>().where((item) {
        final tmFc = _parseTmFc(item['tmFc']);
        return tmFc != null && !tmFc.isBefore(cutoff);
      });

      // "해제"가 제목에 들어간 항목은 특보가 끝났다는 통보라 제외하고,
      // 나머지 제목만 안내 대상으로 남긴다. 같은 특보의 발표/해제가
      // 섞여 있을 수 있어 title 기준으로만 최소한으로 걸러낸다. 원문 제목은
      // "[특보] 제07-72호 : 2026.07.07.22:00 / 강풍주의보 발표 (*)"처럼 관보
      // 형식이라 그대로 보여주면 장황해서, 특보명만 뽑아 단순화한다.
      final titles = recentItems
          .map((item) => item['title'] as String?)
          .whereType<String>()
          .where((title) => !title.contains('해제'))
          .map(_simplifyTitle)
          .toSet() // 단순화 후 같은 특보명이면 중복 제거
          .toList();

      await DiagnosticLog.log(
          '기상특보: 조회 ${items.length}건 -> 최근 30분 필터 후 ${titles.length}건${items.isNotEmpty ? ' (원본 tmFc 예시: ${items.take(3).map((e) => (e as Map<String, dynamic>)['tmFc']).join(', ')})' : ''}');
      return titles;
    } catch (e) {
      await DiagnosticLog.log('기상특보 조회 예외: $e');
      return const [];
    }
  }

  /// 기상청 발표시각(tmFc) 형식(yyyyMMddHHmm)을 DateTime으로 변환한다.
  /// API가 문자열 대신 숫자로 내려줄 가능성까지 방어적으로 처리한다.
  /// 형식이 다르거나 파싱에 실패하면 null(해당 항목은 필터에서 제외됨).
  DateTime? _parseTmFc(dynamic raw) {
    final tmFc = raw?.toString();
    if (tmFc == null || tmFc.length < 12) return null;
    try {
      return DateTime(
        int.parse(tmFc.substring(0, 4)),
        int.parse(tmFc.substring(4, 6)),
        int.parse(tmFc.substring(6, 8)),
        int.parse(tmFc.substring(8, 10)),
        int.parse(tmFc.substring(10, 12)),
      );
    } catch (_) {
      return null;
    }
  }

  /// DateTime을 fromTmFc/toTmFc 쿼리 형식(yyyyMMdd)으로 변환한다.
  String _formatDate(DateTime dt) {
    String two(int n) => n.toString().padLeft(2, '0');
    return '${dt.year}${two(dt.month)}${two(dt.day)}';
  }

  /// "/"와 "발표"/"변경" 사이의 특보명만 뽑아낸다(예: "강풍주의보·풍랑주의보").
  /// 패턴이 안 맞으면 원문을 그대로 쓴다.
  static final _titlePattern = RegExp(r'/\s*(.+?)\s*(발표|변경)');
  String _simplifyTitle(String raw) {
    final match = _titlePattern.firstMatch(raw);
    return match?.group(1)?.trim() ?? raw;
  }
}
