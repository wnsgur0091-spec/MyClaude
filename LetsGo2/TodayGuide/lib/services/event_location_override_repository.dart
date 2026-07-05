import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// 캘린더 원본 일정에 장소가 비어 있을 때, 사용자가 알림/화면에서 직접
/// 입력한 장소를 이벤트 id 기준으로 저장해둔다. GuideEngine은 이동경로를
/// 다시 계산할 때 캘린더 원본보다 이 값을 우선 사용한다.
class EventLocationOverrideRepository {
  static const _key = 'today_guide.event_location_overrides';

  Future<Map<String, String>> _readAll() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    if (raw == null) return {};
    return Map<String, String>.from(jsonDecode(raw) as Map);
  }

  Future<String?> read(String eventId) async {
    final all = await _readAll();
    return all[eventId];
  }

  Future<void> save(String eventId, String address) async {
    final prefs = await SharedPreferences.getInstance();
    final all = await _readAll();
    all[eventId] = address;
    await prefs.setString(_key, jsonEncode(all));
  }
}
