import 'package:device_info_plus/device_info_plus.dart';

/// 이 앱은 부부가 각자 자기 기기에 설치해서 쓴다. 기기 모델로 "이 폰이 배우자
/// 폰인지"를 자동 추정해서, 온보딩 때 매번 라벨 역할을 새로 정의하지 않고도
/// 합리적인 기본값을 잡아준다(설정에서 언제든 수동으로 바꿀 수 있음).
///
/// 기기가 바뀌거나(기종 변경) 추정이 틀리면 설정 화면에서 직접 토글하면 된다.
class DeviceRoleService {
  /// 갤럭시 S25 Ultra(한국 모델 SM-S938N 등, SM-S938로 시작).
  static const _spouseModelPrefixes = ['SM-S938'];

  Future<bool> detectIsSpouseDevice() async {
    try {
      final info = await DeviceInfoPlugin().androidInfo;
      final model = info.model.toUpperCase();
      return _spouseModelPrefixes.any((prefix) => model.startsWith(prefix));
    } catch (_) {
      return false;
    }
  }
}
