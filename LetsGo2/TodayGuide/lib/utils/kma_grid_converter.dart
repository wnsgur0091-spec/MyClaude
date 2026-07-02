import 'dart:math';

/// 위경도를 기상청 단기예보 격자(nx, ny)로 변환한다.
/// (기상청이 공식 배포하는 Lambert Conformal Conic 변환 공식)
class KmaGridConverter {
  static const double _re = 6371.00877;
  static const double _grid = 5.0;
  static const double _slat1 = 30.0;
  static const double _slat2 = 60.0;
  static const double _olon = 126.0;
  static const double _olat = 38.0;
  static const double _xo = 43;
  static const double _yo = 136;

  static ({int nx, int ny}) latLngToGrid(double lat, double lng) {
    final degRad = pi / 180.0;
    final re = _re / _grid;
    final slat1 = _slat1 * degRad;
    final slat2 = _slat2 * degRad;
    final olon = _olon * degRad;
    final olat = _olat * degRad;

    final sn = log(cos(slat1) / cos(slat2)) /
        log(tan(pi * 0.25 + slat2 * 0.5) / tan(pi * 0.25 + slat1 * 0.5));
    final sf = pow(tan(pi * 0.25 + slat1 * 0.5), sn) * cos(slat1) / sn;
    final ro = re * sf / pow(tan(pi * 0.25 + olat * 0.5), sn);

    final ra0 = tan(pi * 0.25 + lat * degRad * 0.5);
    final ra = re * sf / pow(ra0, sn);
    var theta = lng * degRad - olon;
    if (theta > pi) theta -= 2 * pi;
    if (theta < -pi) theta += 2 * pi;
    theta *= sn;

    final x = (ra * sin(theta) + _xo + 0.5).floor();
    final y = (ro - ra * cos(theta) + _yo + 0.5).floor();
    return (nx: x, ny: y);
  }
}
