enum TransportMode {
  car,
  transit;

  String get label => this == TransportMode.car ? '자차' : '대중교통';
}

/// 특정 일정에 늦지 않게 도착하기 위한 이동 계획.
/// 일정 시작 15분 전 도착을 목표로 [departBy]를 역산한다.
class RoutePlan {
  final TransportMode mode;
  final int durationMinutes;
  final DateTime departBy;
  final DateTime arriveBy;

  const RoutePlan({
    required this.mode,
    required this.durationMinutes,
    required this.departBy,
    required this.arriveBy,
  });

  factory RoutePlan.forArrival({
    required TransportMode mode,
    required int durationMinutes,
    required DateTime eventStart,
    Duration buffer = const Duration(minutes: 15),
  }) {
    final arriveBy = eventStart.subtract(buffer);
    return RoutePlan(
      mode: mode,
      durationMinutes: durationMinutes,
      departBy: arriveBy.subtract(Duration(minutes: durationMinutes)),
      arriveBy: arriveBy,
    );
  }
}
