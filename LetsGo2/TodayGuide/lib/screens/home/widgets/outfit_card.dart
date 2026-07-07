import 'package:flutter/material.dart';

import '../../../models/outfit_recommendation.dart';
import '../../../models/schedule_event.dart';
import '../../../models/weather_snapshot.dart';
import '../../../theme/app_theme.dart';

class OutfitCard extends StatelessWidget {
  const OutfitCard({
    super.key,
    required this.outfit,
    this.title = '오늘의 옷차림',
    this.referenceEvent,
    this.hourlyWeather = const [],
  });

  final OutfitRecommendation outfit;

  /// 카드 제목. "오늘의 옷차림" 외에 "D+N일 후의 옷차림" 등으로도 재사용한다.
  final String title;

  /// 옷차림 추천이 기준으로 삼은 일정. 없으면 표시하지 않는다.
  final ScheduleEvent? referenceEvent;

  /// [referenceEvent] 구간의 1시간 간격 예상 날씨.
  final List<WeatherSnapshot> hourlyWeather;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.spacePanel, AppColors.spacePanelAlt],
        ),
        border: Border.all(color: AppColors.neonPurple.withOpacity(0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.checkroom, color: AppColors.neonPurple),
              const SizedBox(width: 8),
              Text(title,
                  style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 16)),
            ],
          ),
          if (referenceEvent != null) ...[
            const SizedBox(height: 6),
            Text(
              '"${referenceEvent!.title}" 일정(${_formatRange(referenceEvent!.start, referenceEvent!.end)}) 기준으로 안내해요.',
              style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
            ),
          ],
          const SizedBox(height: 16),
          _OutfitRow(label: '상의', value: outfit.top),
          _OutfitRow(label: '하의', value: outfit.bottom),
          _OutfitRow(label: '신발', value: outfit.shoes),
          if (outfit.items.isNotEmpty) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: outfit.items
                  .map((item) => Chip(
                        label: Text(item),
                        backgroundColor: AppColors.neonCyan.withOpacity(0.15),
                        labelStyle: const TextStyle(color: AppColors.neonCyan),
                        side: BorderSide.none,
                      ))
                  .toList(),
            ),
          ],
          const SizedBox(height: 12),
          Text(outfit.reason, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
          if (hourlyWeather.isNotEmpty) ...[
            const SizedBox(height: 16),
            const Text('시간대별 예상 날씨',
                style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 13)),
            const SizedBox(height: 8),
            SizedBox(
              height: 74,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: hourlyWeather.length,
                separatorBuilder: (_, __) => const SizedBox(width: 10),
                itemBuilder: (context, index) => _HourlyWeatherTile(snapshot: hourlyWeather[index]),
              ),
            ),
          ],
        ],
      ),
    );
  }

  static const _weekdayLabels = ['월', '화', '수', '목', '금', '토', '일'];

  String _formatRange(DateTime start, DateTime end) {
    String fmt(DateTime d) => '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
    final weekday = _weekdayLabels[start.weekday - 1];
    return '${start.month}월 ${start.day}일($weekday) ${fmt(start)}~${fmt(end)}';
  }
}

class _OutfitRow extends StatelessWidget {
  const _OutfitRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          SizedBox(width: 48, child: Text(label, style: const TextStyle(color: AppColors.textSecondary))),
          const SizedBox(width: 8),
          Expanded(child: Text(value, style: const TextStyle(color: AppColors.textPrimary))),
        ],
      ),
    );
  }
}

class _HourlyWeatherTile extends StatelessWidget {
  const _HourlyWeatherTile({required this.snapshot});

  final WeatherSnapshot snapshot;

  /// 강수형태/하늘상태에 맞는 날씨 아이콘을 고른다. 강수형태가 있으면
  /// 하늘상태보다 우선한다(비/눈 예보가 더 실용적인 정보라서).
  IconData get _icon {
    switch (snapshot.precipitationType) {
      case PrecipitationType.rain:
      case PrecipitationType.shower:
        return Icons.water_drop;
      case PrecipitationType.rainSnow:
        return Icons.grain;
      case PrecipitationType.snow:
        return Icons.ac_unit;
      case PrecipitationType.none:
        switch (snapshot.skyCondition) {
          case SkyCondition.clear:
            return Icons.wb_sunny;
          case SkyCondition.mostlyCloudy:
            return Icons.wb_cloudy;
          case SkyCondition.cloudy:
            return Icons.cloud;
        }
    }
  }

  Color get _iconColor {
    switch (snapshot.precipitationType) {
      case PrecipitationType.rain:
      case PrecipitationType.shower:
      case PrecipitationType.rainSnow:
        return AppColors.neonCyan;
      case PrecipitationType.snow:
        return AppColors.textPrimary;
      case PrecipitationType.none:
        return snapshot.skyCondition == SkyCondition.clear ? AppColors.warning : AppColors.textSecondary;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 56,
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 6),
      decoration: BoxDecoration(
        color: AppColors.spacePanelAlt,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text('${snapshot.time.hour}시', style: const TextStyle(color: AppColors.textSecondary, fontSize: 11)),
          const SizedBox(height: 4),
          Text('${snapshot.tempC.round()}℃',
              style: const TextStyle(color: AppColors.textPrimary, fontSize: 13, fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          Text('${snapshot.precipitationProbability}%',
              style: const TextStyle(color: AppColors.neonCyan, fontSize: 11)),
          const SizedBox(height: 4),
          Icon(_icon, size: 16, color: _iconColor),
        ],
      ),
    );
  }
}
