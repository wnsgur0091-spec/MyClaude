/// 공유 캘린더(TimeTree) 라벨 색상을 어떤 사람의 일정인지로 매핑한 값.
/// 온보딩/설정에서 라벨별로 지정하고, GuideEngine이 이동경로 계산에 참고한다.
enum EventAttendeeRole {
  /// 이 기기 사용자 본인의 일정.
  me,

  /// 배우자(상대방) 단독 일정. 본인 이동경로 계산 체인에서 제외한다.
  partner,

  /// 둘이 같이 소화하는 일정.
  both,

  /// 라벨이 없거나 매핑되지 않은 일정. 안전하게 본인 일정으로 간주한다.
  unknown;

  String get name {
    switch (this) {
      case EventAttendeeRole.me:
        return 'me';
      case EventAttendeeRole.partner:
        return 'partner';
      case EventAttendeeRole.both:
        return 'both';
      case EventAttendeeRole.unknown:
        return 'unknown';
    }
  }

  String get label {
    switch (this) {
      case EventAttendeeRole.me:
        return '본인';
      case EventAttendeeRole.partner:
        return '배우자';
      case EventAttendeeRole.both:
        return '같이';
      case EventAttendeeRole.unknown:
        return '미지정';
    }
  }

  /// 본인 이동경로 계산 체인에 포함해야 하는지 여부.
  bool get includeInOwnRoute => this != EventAttendeeRole.partner;

  static EventAttendeeRole fromName(String? name) {
    return EventAttendeeRole.values.firstWhere(
      (e) => e.name == name,
      orElse: () => EventAttendeeRole.unknown,
    );
  }
}
