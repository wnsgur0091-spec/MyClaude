enum PrecipitationType {
  none,
  rain,
  rainSnow,
  snow,
  shower;

  static PrecipitationType fromKmaCode(String code) {
    // 기상청 단기예보(getVilageFcst) PTY 코드
    switch (code) {
      case '1':
        return PrecipitationType.rain;
      case '2':
        return PrecipitationType.rainSnow;
      case '3':
        return PrecipitationType.snow;
      case '4':
        return PrecipitationType.shower;
      default:
        return PrecipitationType.none;
    }
  }
}

enum SkyCondition {
  clear,
  mostlyCloudy,
  cloudy;

  static SkyCondition fromKmaCode(String code) {
    // 기상청 단기예보 SKY 코드: 1 맑음, 3 구름많음, 4 흐림
    switch (code) {
      case '3':
        return SkyCondition.mostlyCloudy;
      case '4':
        return SkyCondition.cloudy;
      default:
        return SkyCondition.clear;
    }
  }
}

/// 특정 시각/구간의 날씨 스냅샷.
class WeatherSnapshot {
  final DateTime time;
  final double tempC;
  final PrecipitationType precipitationType;

  /// 강수확률(%), 기상청 POP 값
  final int precipitationProbability;
  final SkyCondition skyCondition;

  /// 자외선지수. 지역코드를 못 찾는 등 조회 실패 시 null.
  final int? uvIndex;

  /// 미세먼지/초미세먼지 등급(1=좋음, 2=보통, 3=나쁨, 4=매우나쁨). 조회 실패 시 null.
  final int? pm10Grade;
  final int? pm25Grade;

  const WeatherSnapshot({
    required this.time,
    required this.tempC,
    required this.precipitationType,
    required this.precipitationProbability,
    required this.skyCondition,
    this.uvIndex,
    this.pm10Grade,
    this.pm25Grade,
  });

  bool get needsUmbrella =>
      precipitationType != PrecipitationType.none || precipitationProbability >= 40;

  bool get isStrongSun =>
      skyCondition == SkyCondition.clear && (uvIndex ?? 0) >= 6;

  /// 미세먼지든 초미세먼지든 "나쁨" 이상이면 마스크를 권한다.
  bool get needsMask => (pm10Grade ?? 0) >= 3 || (pm25Grade ?? 0) >= 3;
}
