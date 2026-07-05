import 'dart:math';

import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// 우주 컨셉 배경: 어두운 그라디언트 위에 도트(별) 패턴을 흩뿌린다.
class StarfieldBackground extends StatelessWidget {
  const StarfieldBackground({super.key, this.child});

  final Widget? child;

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
          if (child != null) child!,
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
