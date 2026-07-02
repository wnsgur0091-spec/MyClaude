/// 상의/하의/신발 + 준비물 추천 결과.
class OutfitRecommendation {
  final String top;
  final String bottom;
  final String shoes;
  final List<String> items;
  final String reason;

  const OutfitRecommendation({
    required this.top,
    required this.bottom,
    required this.shoes,
    required this.items,
    required this.reason,
  });
}
