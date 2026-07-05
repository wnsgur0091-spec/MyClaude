/// 외부 API 키. 빌드 시 --dart-define 으로 주입한다.
///
/// 예) flutter run \
///   --dart-define=NAVER_MAP_CLIENT_ID=xxx \
///   --dart-define=NAVER_MAP_CLIENT_SECRET=xxx \
///   --dart-define=KMA_SERVICE_KEY=xxx \
///   --dart-define=ODSAY_API_KEY=xxx
abstract final class AppConfig {
  static const naverMapClientId = String.fromEnvironment('NAVER_MAP_CLIENT_ID');
  static const naverMapClientSecret = String.fromEnvironment('NAVER_MAP_CLIENT_SECRET');
  static const kmaServiceKey = String.fromEnvironment('KMA_SERVICE_KEY');
  static const odsayApiKey = String.fromEnvironment('ODSAY_API_KEY');
}
