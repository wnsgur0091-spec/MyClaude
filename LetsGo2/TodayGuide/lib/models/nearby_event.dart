/// 한국관광공사 TourAPI 위치기반 관광정보(축제/공연/행사) 조회 결과 하나.
class NearbyEvent {
  final String title;
  final String? address;
  final double lat;
  final double lng;
  final String? imageUrl;

  const NearbyEvent({
    required this.title,
    required this.lat,
    required this.lng,
    this.address,
    this.imageUrl,
  });
}
