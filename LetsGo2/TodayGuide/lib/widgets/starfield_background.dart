import 'dart:math';

import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// 우주 컨셉 배경: 어두운 그라디언트 위에 도트(별) 패턴을 흩뿌리고,
/// 여러 유성이 떨어지고 여러 우주선이 화면 곳곳을 지나가는 효과를 더한다.
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
    // 유성은 6초 주기 안에서 여러 개가 시차를 두고 지나간다.
    _meteorController = AnimationController(vsync: this, duration: const Duration(seconds: 6))..repeat();
    // 우주선은 22초 주기 안에서 여러 대가 서로 다른 방향으로 지나간다.
    _shipController = AnimationController(vsync: this, duration: const Duration(seconds: 22))..repeat();
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

/// 유성/우주선 하나의 이동 경로. start/end는 화면 비율(0.0~1.0) 좌표이고,
/// [phase]는 공유 컨트롤러의 한 주기 중 이 개체가 시작되는 시점(0.0~1.0)이다.
class _FlightPath {
  const _FlightPath({required this.start, required this.end, required this.phase, this.scale = 1.0});
  final Offset start;
  final Offset end;
  final double phase;
  final double scale;
}

/// 여러 유성(짧고 빠르게 대각선으로 지나가는 빛줄기)과 여러 우주선(앱
/// 아이콘과 같은 모양, 화면 곳곳을 서로 다른 방향으로 지나감)을 그린다.
/// 각 개체는 공유 컨트롤러의 한 주기 중 [phase]에서 시작해서 자기 몫의
/// 구간에서만 보이고 나머지 구간은 화면 밖에 있는 것으로 취급한다.
class _SkyEffectsPainter extends CustomPainter {
  const _SkyEffectsPainter({required this.meteorProgress, required this.shipProgress});

  final double meteorProgress;
  final double shipProgress;

  // 유성은 자기 구간의 앞 35%만 날아가고 나머지는 쉰다.
  static const _meteorActiveFraction = 0.35;
  static const _meteors = [
    _FlightPath(start: Offset(0.88, -0.02), end: Offset(0.2, 0.42), phase: 0.0),
    _FlightPath(start: Offset(0.15, -0.02), end: Offset(0.75, 0.3), phase: 0.38, scale: 0.85),
    _FlightPath(start: Offset(0.6, -0.02), end: Offset(0.05, 0.5), phase: 0.68, scale: 1.15),
  ];

  // 우주선은 자기 구간의 70%를 들여 화면을 가로지른다.
  static const _shipActiveFraction = 0.7;
  static const _ships = [
    _FlightPath(start: Offset(-0.12, 0.16), end: Offset(1.12, 0.1), phase: 0.0),
    _FlightPath(start: Offset(1.12, 0.62), end: Offset(-0.12, 0.7), phase: 0.3, scale: 0.85),
    _FlightPath(start: Offset(0.15, -0.08), end: Offset(0.85, 1.05), phase: 0.55, scale: 0.75),
    _FlightPath(start: Offset(0.9, 1.05), end: Offset(0.25, -0.08), phase: 0.8, scale: 0.9),
  ];

  @override
  void paint(Canvas canvas, Size size) {
    for (final meteor in _meteors) {
      _paintMeteor(canvas, size, meteor);
    }
    for (final ship in _ships) {
      _paintShip(canvas, size, ship);
    }
  }

  double _localT(double controllerValue, double phase, double activeFraction) {
    final elapsed = (controllerValue - phase) % 1.0;
    if (elapsed > activeFraction) return -1;
    return elapsed / activeFraction;
  }

  void _paintMeteor(Canvas canvas, Size size, _FlightPath path) {
    final t = _localT(meteorProgress, path.phase, _meteorActiveFraction);
    if (t < 0) return;

    final start = Offset(path.start.dx * size.width, path.start.dy * size.height);
    final end = Offset(path.end.dx * size.width, path.end.dy * size.height);
    final head = Offset.lerp(start, end, t)!;
    const tailLength = 0.16;
    final tailT = (t - tailLength).clamp(0.0, 1.0);
    final tail = Offset.lerp(start, end, tailT)!;

    final opacity = sin(t * pi).clamp(0.0, 1.0);
    final gradient = Paint()
      ..shader = LinearGradient(
        colors: [AppColors.textPrimary.withOpacity(opacity), AppColors.neonCyan.withOpacity(0)],
      ).createShader(Rect.fromPoints(head, tail))
      ..strokeWidth = 2.2 * path.scale
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(head, tail, gradient);
    canvas.drawCircle(head, 2.1 * path.scale, Paint()..color = AppColors.textPrimary.withOpacity(opacity));
  }

  void _paintShip(Canvas canvas, Size size, _FlightPath path) {
    final t = _localT(shipProgress, path.phase, _shipActiveFraction);
    if (t < 0) return;

    final start = Offset(path.start.dx * size.width, path.start.dy * size.height);
    final end = Offset(path.end.dx * size.width, path.end.dy * size.height);
    final pos = Offset.lerp(start, end, t)!;
    final angle = atan2(end.dy - start.dy, end.dx - start.dx);
    // 등장/퇴장 구간에서 서서히 나타나고 사라지게 한다.
    final opacity = (t < 0.12 ? t / 0.12 : (t > 0.88 ? (1 - t) / 0.12 : 1.0)).clamp(0.0, 1.0);

    canvas.save();
    canvas.translate(pos.dx, pos.dy);
    canvas.rotate(angle);
    canvas.scale(path.scale);
    _drawRocket(canvas, opacity);
    canvas.restore();
  }

  /// 앱 아이콘과 같은 모양의 로켓(로컬 좌표 +x가 기수 방향)을 그린다.
  void _drawRocket(Canvas canvas, double opacity) {
    // 불꽃(꼬리, -x 방향)
    final flamePath = Path()
      ..moveTo(-7, -2.2)
      ..lineTo(-15, 0)
      ..lineTo(-7, 2.2)
      ..close();
    canvas.drawPath(
      flamePath,
      Paint()
        ..shader = LinearGradient(colors: [
          const Color(0xFFFFC94A).withOpacity(opacity),
          const Color(0xFFFF7A3D).withOpacity(opacity * 0.2),
        ]).createShader(const Rect.fromLTWH(-15, -2.2, 8, 4.4)),
    );

    // 뒷쪽 지느러미(위/아래)
    final finPaint = Paint()..color = const Color(0xFFE0473E).withOpacity(opacity);
    canvas.drawPath(
      Path()
        ..moveTo(-2, -3.4)
        ..lineTo(-9, -7.5)
        ..lineTo(-3.5, -3.4)
        ..close(),
      finPaint,
    );
    canvas.drawPath(
      Path()
        ..moveTo(-2, 3.4)
        ..lineTo(-9, 7.5)
        ..lineTo(-3.5, 3.4)
        ..close(),
      finPaint,
    );

    // 몸통(연한 하늘색 캡슐)
    final bodyRect = RRect.fromRectAndRadius(const Rect.fromLTWH(-6, -3.6, 12, 7.2), const Radius.circular(3.4));
    canvas.drawRRect(bodyRect, Paint()..color = const Color(0xFFC7D6E0).withOpacity(opacity));

    // 기수(빨간 원뿔, +x 방향)
    canvas.drawPath(
      Path()
        ..moveTo(5, -3.4)
        ..lineTo(13, 0)
        ..lineTo(5, 3.4)
        ..close(),
      Paint()..color = const Color(0xFFE0473E).withOpacity(opacity),
    );

    // 창(짙은 원 + 밝은 테두리)
    canvas.drawCircle(const Offset(-0.5, 0), 2.1, Paint()..color = const Color(0xFF2B3A4A).withOpacity(opacity));
    canvas.drawCircle(
      const Offset(-0.5, 0),
      2.1,
      Paint()
        ..color = AppColors.neonCyan.withOpacity(opacity * 0.8)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 0.6,
    );
  }

  @override
  bool shouldRepaint(covariant _SkyEffectsPainter oldDelegate) =>
      oldDelegate.meteorProgress != meteorProgress || oldDelegate.shipProgress != shipProgress;
}
