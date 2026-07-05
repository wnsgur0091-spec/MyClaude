import 'event_attendee_role.dart';

enum Gender {
  female,
  male,
  other;

  String get label {
    switch (this) {
      case Gender.female:
        return '여성';
      case Gender.male:
        return '남성';
      case Gender.other:
        return '기타/응답 안 함';
    }
  }

  static Gender fromName(String name) {
    return Gender.values.firstWhere((e) => e.name == name, orElse: () => Gender.other);
  }
}

/// 초기 셋팅값 + 앱 전역 설정
class UserSettings {
  /// 알람(오늘의 지침서) 송신 시각, 분 단위(0~1439). 디폴트 08:00 = 480.
  final int alarmMinuteOfDay;
  final Gender gender;
  final int age;

  /// GPS 실패 시 폴백으로 쓰는 기본 출발지. 최소 하나는 채워져 있어야 한다.
  final String? homeAddress;
  final double? homeLat;
  final double? homeLng;
  final String? workAddress;
  final double? workLat;
  final double? workLng;

  /// 연동된 TimeTree 캘린더 id/이름(표시용). 로그인 자격증명은 별도로
  /// 기기에 암호화 저장하고(TimeTreeCredentialStore) 여기엔 담지 않는다.
  final String? timeTreeCalendarId;
  final String? timeTreeCalendarName;

  /// TimeTree 라벨(색상) id -> 이 라벨이 누구 일정인지.
  final Map<int, EventAttendeeRole> timeTreeLabelRoles;

  final bool onboardingCompleted;

  const UserSettings({
    this.alarmMinuteOfDay = 8 * 60,
    this.gender = Gender.other,
    this.age = 0,
    this.homeAddress,
    this.homeLat,
    this.homeLng,
    this.workAddress,
    this.workLat,
    this.workLng,
    this.timeTreeCalendarId,
    this.timeTreeCalendarName,
    this.timeTreeLabelRoles = const {},
    this.onboardingCompleted = false,
  });

  int get alarmHour => alarmMinuteOfDay ~/ 60;
  int get alarmMinute => alarmMinuteOfDay % 60;

  bool get hasFallbackAddress => homeAddress != null || workAddress != null;

  bool get hasTimeTreeCalendar => timeTreeCalendarId != null;

  UserSettings copyWith({
    int? alarmMinuteOfDay,
    Gender? gender,
    int? age,
    String? homeAddress,
    double? homeLat,
    double? homeLng,
    String? workAddress,
    double? workLat,
    double? workLng,
    String? timeTreeCalendarId,
    String? timeTreeCalendarName,
    Map<int, EventAttendeeRole>? timeTreeLabelRoles,
    bool? onboardingCompleted,
  }) {
    return UserSettings(
      alarmMinuteOfDay: alarmMinuteOfDay ?? this.alarmMinuteOfDay,
      gender: gender ?? this.gender,
      age: age ?? this.age,
      homeAddress: homeAddress ?? this.homeAddress,
      homeLat: homeLat ?? this.homeLat,
      homeLng: homeLng ?? this.homeLng,
      workAddress: workAddress ?? this.workAddress,
      workLat: workLat ?? this.workLat,
      workLng: workLng ?? this.workLng,
      timeTreeCalendarId: timeTreeCalendarId ?? this.timeTreeCalendarId,
      timeTreeCalendarName: timeTreeCalendarName ?? this.timeTreeCalendarName,
      timeTreeLabelRoles: timeTreeLabelRoles ?? this.timeTreeLabelRoles,
      onboardingCompleted: onboardingCompleted ?? this.onboardingCompleted,
    );
  }

  Map<String, dynamic> toJson() => {
        'alarmMinuteOfDay': alarmMinuteOfDay,
        'gender': gender.name,
        'age': age,
        'homeAddress': homeAddress,
        'homeLat': homeLat,
        'homeLng': homeLng,
        'workAddress': workAddress,
        'workLat': workLat,
        'workLng': workLng,
        'timeTreeCalendarId': timeTreeCalendarId,
        'timeTreeCalendarName': timeTreeCalendarName,
        'timeTreeLabelRoles': timeTreeLabelRoles.map((id, role) => MapEntry('$id', role.name)),
        'onboardingCompleted': onboardingCompleted,
      };

  factory UserSettings.fromJson(Map<String, dynamic> json) => UserSettings(
        alarmMinuteOfDay: json['alarmMinuteOfDay'] as int? ?? 8 * 60,
        gender: Gender.fromName(json['gender'] as String? ?? 'other'),
        age: json['age'] as int? ?? 0,
        homeAddress: json['homeAddress'] as String?,
        homeLat: (json['homeLat'] as num?)?.toDouble(),
        homeLng: (json['homeLng'] as num?)?.toDouble(),
        workAddress: json['workAddress'] as String?,
        workLat: (json['workLat'] as num?)?.toDouble(),
        workLng: (json['workLng'] as num?)?.toDouble(),
        timeTreeCalendarId: json['timeTreeCalendarId'] as String?,
        timeTreeCalendarName: json['timeTreeCalendarName'] as String?,
        timeTreeLabelRoles: (json['timeTreeLabelRoles'] as Map<String, dynamic>? ?? const {}).map(
          (id, role) => MapEntry(int.parse(id), EventAttendeeRole.fromName(role as String?)),
        ),
        onboardingCompleted: json['onboardingCompleted'] as bool? ?? false,
      );
}
