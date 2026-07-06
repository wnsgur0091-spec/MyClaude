import 'package:flutter/services.dart';

/// 외부 앱(지도 등)으로 URL을 여는 네이티브 채널 래퍼.
/// url_launcher 패키지는 최신 버전이 이 프로젝트의 compileSdk 요구치보다
/// 높은 안드로이드 라이브러리를 끌고 와서 빌드가 깨지기 때문에, 표준
/// ACTION_VIEW 인텐트를 직접 호출하는 네이티브 채널로 대체했다
/// (android/.../MainActivity.kt의 today_guide/launcher 채널).
class ExternalLinkLauncher {
  static const _channel = MethodChannel('today_guide/launcher');

  /// 열기에 성공하면 true, 열 수 있는 앱이 없으면 false.
  static Future<bool> openUrl(String url) async {
    final opened = await _channel.invokeMethod<bool>('openUrl', {'url': url});
    return opened ?? false;
  }
}
