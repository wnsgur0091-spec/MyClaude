import '../models/outfit_recommendation.dart';
import '../models/user_settings.dart';
import '../models/weather_snapshot.dart';

/// 기온대별 상/하의/신발 매핑 + 준비물(우산/선글라스/양산) 규칙.
class OutfitRules {
  static OutfitRecommendation recommend({
    required List<WeatherSnapshot> daySnapshots,
    required Gender gender,
    bool noEventsReason = false,
  }) {
    if (daySnapshots.isEmpty) {
      return OutfitRecommendation(
        top: '가벼운 겉옷',
        bottom: '편한 바지',
        shoes: '운동화',
        items: const [],
        reason: noEventsReason
            ? '오늘 등록된 일정이 없어 일반적인 차림을 안내해요.'
            : '오늘 일정 시간대의 날씨 정보를 일시적으로 가져오지 못해 일반적인 차림을 안내해요.',
      );
    }

    final minTemp = daySnapshots.map((w) => w.tempC).reduce((a, b) => a < b ? a : b);
    final maxTemp = daySnapshots.map((w) => w.tempC).reduce((a, b) => a > b ? a : b);
    final representative = (minTemp + maxTemp) / 2;
    final clothing = _clothingFor(representative, gender);

    final items = <String>[];
    if (daySnapshots.any((w) => w.needsUmbrella)) {
      items.add('우산');
    }
    if (daySnapshots.any((w) => w.isStrongSun)) {
      items.add('선글라스');
      items.add('양산');
    }

    return OutfitRecommendation(
      top: clothing.top,
      bottom: clothing.bottom,
      shoes: clothing.shoes,
      items: items,
      reason: '오늘 일정 시간대 기온 ${minTemp.round()}~${maxTemp.round()}℃ 기준 추천이에요.',
    );
  }

  static ({String top, String bottom, String shoes}) _clothingFor(double tempC, Gender gender) {
    if (tempC >= 28) {
      return (
        top: '반팔 티셔츠',
        bottom: gender == Gender.female ? '얇은 원피스 또는 반바지' : '반바지',
        shoes: '샌들 또는 스니커즈',
      );
    }
    if (tempC >= 23) {
      return (top: '반팔 또는 얇은 셔츠', bottom: '면바지', shoes: '스니커즈');
    }
    if (tempC >= 20) {
      return (top: '얇은 가디건 또는 셔츠', bottom: '청바지', shoes: '스니커즈');
    }
    if (tempC >= 17) {
      return (top: '자켓 또는 니트', bottom: '청바지', shoes: '캐주얼화');
    }
    if (tempC >= 12) {
      return (top: '트렌치코트 또는 자켓', bottom: '청바지', shoes: '부츠 또는 스니커즈');
    }
    if (tempC >= 9) {
      return (top: '코트', bottom: '니트 + 청바지', shoes: '첼시부츠');
    }
    if (tempC >= 5) {
      return (top: '두꺼운 코트 또는 패딩', bottom: '기모 바지', shoes: '방한 부츠');
    }
    return (top: '롱패딩', bottom: '기모 두꺼운 바지', shoes: '방한 부츠');
  }
}
