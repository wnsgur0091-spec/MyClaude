import 'package:flutter/services.dart';

/// 배터리 최적화 제외 상태 확인/요청. 제조사(특히 삼성)의 공격적인 백그라운드
/// 제한 때문에 정확한 시각에 예약한 알림이 OS 알람은 정상 발화해도 실제
/// 알림으로 이어지지 않는 경우가 있어서, 이걸 끄도록 유도하는 채널.
class BatteryOptimizationService {
  static const _channel = MethodChannel('today_guide/power');

  static Future<bool> isIgnoringBatteryOptimizations() async {
    final result = await _channel.invokeMethod<bool>('isIgnoringBatteryOptimizations');
    return result ?? false;
  }

  /// 시스템 설정 다이얼로그를 띄운다. 사용자가 직접 허용/거부를 선택해야 한다.
  static Future<void> requestIgnoreBatteryOptimizations() async {
    await _channel.invokeMethod<bool>('requestIgnoreBatteryOptimizations');
  }
}
