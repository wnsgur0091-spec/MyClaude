import 'package:geocoding/geocoding.dart' as geocoding;
import 'package:geolocator/geolocator.dart';

import '../models/user_settings.dart';
import 'geocode/naver_geocode_service.dart';

class ResolvedLocation {
  final double lat;
  final double lng;
  final bool isFallback;
  final String label;

  const ResolvedLocation({
    required this.lat,
    required this.lng,
    required this.isFallback,
    required this.label,
  });
}

/// 오늘의 지침서는 알림이 울린 시점이 아니라 "사용자가 앱/알림을 여는 시점"의
/// 현재 위치를 기준으로 계산한다(출발지 고정 방지). GPS를 못 가져오면
/// 온보딩에서 등록한 기본 출발지(집 → 회사 순)로 대체한다.
class LocationService {
  LocationService({NaverGeocodeService? naverGeocodeService})
      : _naverGeocodeService = naverGeocodeService ?? NaverGeocodeService();

  final NaverGeocodeService _naverGeocodeService;

  Future<ResolvedLocation> resolveCurrentLocation(UserSettings settings) async {
    try {
      final hasPermission = await _ensurePermission();
      if (hasPermission) {
        final position = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.high,
            timeLimit: Duration(seconds: 10),
          ),
        );
        return ResolvedLocation(
          lat: position.latitude,
          lng: position.longitude,
          isFallback: false,
          label: '현재 위치',
        );
      }
    } catch (_) {
      // GPS 실패 시 아래 폴백으로 진행한다.
    }
    return _fallbackLocation(settings);
  }

  Future<bool> _ensurePermission() async {
    if (!await Geolocator.isLocationServiceEnabled()) return false;
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.deniedForever) return false;
    return permission == LocationPermission.always || permission == LocationPermission.whileInUse;
  }

  ResolvedLocation _fallbackLocation(UserSettings settings) {
    if (settings.homeLat != null && settings.homeLng != null) {
      return ResolvedLocation(
        lat: settings.homeLat!,
        lng: settings.homeLng!,
        isFallback: true,
        label: '집(기본 출발지)',
      );
    }
    if (settings.workLat != null && settings.workLng != null) {
      return ResolvedLocation(
        lat: settings.workLat!,
        lng: settings.workLng!,
        isFallback: true,
        label: '회사(기본 출발지)',
      );
    }
    throw StateError('GPS를 가져올 수 없고 기본 출발지도 설정되어 있지 않습니다.');
  }

  /// 온보딩/일정 장소 문자열을 좌표로 변환할 때 사용.
  /// 네이버 Geocoding(도로명·지번 주소 모두 지원)을 우선 시도하고,
  /// 실패하면 안드로이드 네이티브 Geocoder(구글 백엔드)로 한 번 더 시도한다
  /// (일정 장소에 적힌 건물명/장소명 등 주소가 아닌 텍스트를 보완하기 위함).
  Future<({double lat, double lng})?> geocodeAddress(String address) async {
    try {
      final naverResult = await _naverGeocodeService.geocode(address);
      if (naverResult != null) return naverResult;
    } catch (_) {
      // 네이버 조회 실패 시 아래 폴백으로 진행한다.
    }

    try {
      final results = await geocoding.locationFromAddress(address);
      if (results.isEmpty) return null;
      final first = results.first;
      return (lat: first.latitude, lng: first.longitude);
    } catch (_) {
      return null;
    }
  }
}
