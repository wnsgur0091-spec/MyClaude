import 'dart:math';

import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// 우주 컨셉 배경: 어두운 그라디언트 위에 도트(별) 패턴을 흩뿌리고,
/// 주기적으로 유성이 떨어지고 우주선이 지나가는 효과를 더한다.
class StarfieldBackground extends StatefulWidget {
  const StarfieldBackground({super.key, this.child});

  final Widget? child;

  @override
  State<StarfieldBackground> createState() => _StarfieldBackgroundState();
}

class _StarfieldBackgroundState extends State<StarfieldBackground> with TickerProviderStateMixin {
  late final AnimationController _meteorController;
  late final AnimationController _shipController;

  @override
  void initState() {
    super.initState();
    // 유성은 5초 주기 중 앞부분(0~18%)에만 휙 지나가고 나머지는 대기한다.
    _meteorController = AnimationController(vsync: this, duration: const Duration(seconds: 5))..repeat();
    // 우주선은 훨씬 느리고 뜸하게(18초 주기) 지나간다.
    _shipController = AnimationController(vsync: this, duration: const Duration(seconds: 18))..repeat();
  }

  @override
  void dispose() {
    _meteorController.dispose();
    _shipController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [AppColors.deepSpace, Color(0xFF0A0C1F), AppColors.deepSpace],
        ),
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          const Positioned.fill(child: CustomPaint(painter: _StarfieldPainter())),
          Positioned.fill(
            child: AnimatedBuilder(
              animation: Listenable.merge([_meteorController, _shipController]),
              builder: (context, _) => CustomPaint(
                painter: _SkyEffectsPainter(
                  meteorProgress: _meteorController.value,
                  shipProgress: _shipController.value,
                ),
              ),
            ),
          ),
          if (widget.child != null) widget.child!,
        ],
      ),
    );
  }
}

class _StarfieldPainter extends CustomPainter {
  const _StarfieldPainter();

  static final List<Offset> _relativePositions = List.generate(140, (i) {
    final random = Random(i);
    return Offset(random.nextDouble(), random.nextDouble());
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = AppColors.neonCyan.withOpacity(0.45);
    for (final pos in _relativePositions) {
      final radius = 0.6 + (pos.dx * pos.dy) % 1.0;
      canvas.drawCircle(Offset(pos.dx * size.width, pos.dy * size.height), radius, paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// 유성(짧고 빠르게 대각선으로 지나가는 빛줄기)과 우주선(느리게 수평으로
/// 지나가는 작은 실루엣)을 그린다. 둘 다 한 주기 중 일부 구간에서만
/// 보이고 나머지 구간은 화면 밖에 있는 것으로 취급한다.
class _SkyEffectsPainter extends CustomPainter {
  const _SkyEffectsPainter({required this.meteorProgress, required this.shipProgress});

  final double meteorProgress;
  final double shipProgress;

  // 유성은 주기의 앞 18%만 날아가고 나머지는 쉰다.
  static const _meteorActiveFraction = 0.18;
  // 우주선은 주기의 절반 정도만 화면을 가로지른다.
  static const _shipActiveFraction = 0.5;

  @override
  void paint(Canvas canvas, Size size) {
    _paintMeteor(canvas, size);
    _paintShip(canvas, size);
  }

  void _paintMeteor(Canvas canvas, Size size) {
    if (meteorProgress > _meteorActiveFraction) return;
    final t = meteorProgress / _meteorActiveFraction; // 0.0 ~ 1.0

    final start = Offset(size.width * 0.85, size.height * -0.02);
    final end = Offset(size.width * 0.15, size.height * 0.4);
    final head = Offset.lerp(start, end, t)!;
    final tailLength = 0.16;
    final tailT = (t - tailLength).clamp(0.0, 1.0);
    final tail = Offset.lerp(start, end, tailT)!;

    final opacity = (sin(t * pi)).clamp(0.0, 1.0); // 나타났다 사라지는 느낌
    final gradient = Paint()
      ..shader = LinearGradient(
        colors: [AppColors.textPrimary.withOpacity(opacity), AppColors.neonCyan.withOpacity(0)],
      ).createShader(Rect.fromPoints(head, tail))
      ..strokeWidth = 2.4
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(head, tail, gradient);

    canvas.drawCircle(head, 2.2, Paint()..color = AppColors.textPrimary.withOpacity(opacity));
  }

  void _paintShip(Canvas canvas, Size size) {
    if (shipProgress > _shipActiveFraction) return;
    final t = shipProgress / _shipActiveFraction; // 0.0 ~ 1.0

    final dx = lerpDouble(-0.1, 1.1, t) * size.width;
    final dy = size.height * 0.14;
    final opacity = sin(t * pi).clamp(0.0, 1.0);

    canvas.save();
    canvas.translate(dx, dy);
    canvas.rotate(0.35);

    final bodyPaint = Paint()..color = AppColors.textSecondary.withOpacity(opacity * 0.9);
    final path = Path()
      ..moveTo(14, 0)
      ..lineTo(-8, -5)
      ..lineTo(-4, 0)
      ..lineTo(-8, 5)
      ..close();
    canvas.drawPath(path, bodyPaint);
    canvas.drawCircle(const Offset(3, 0), 2, Paint()..color = AppColors.neonCyan.withOpacity(opacity));

    final trailPaint = Paint()
      ..shader = LinearGradient(
        colors: [AppColors.neonCyan.withOpacity(opacity * 0.6), AppColors.neonCyan.withOpacity(0)],
      ).createShader(const Rect.fromLTWH(-30, -1.5, 22, 3));
    canvas.drawRect(const Rect.fromLTWH(-30, -1.5, 22, 3), trailPaint);

    canvas.restore();
  }

  double lerpDouble(double a, double b, double t) => a + (b - a) * t;

  @override
  bool shouldRepaint(covariant _SkyEffectsPainter oldDelegate) =>
      oldDelegate.meteorProgress != meteorProgress || oldDelegate.shipProgress != shipProgress;
}
