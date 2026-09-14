import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// Soft pulsing placeholder used while screens load.
class TakkaBone extends StatefulWidget {
  const TakkaBone({
    super.key,
    this.height = 16,
    this.width,
    this.radius = 12,
  });

  final double height;
  final double? width;
  final double radius;

  @override
  State<TakkaBone> createState() => _TakkaBoneState();
}

class _TakkaBoneState extends State<TakkaBone>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1100),
  )..repeat(reverse: true);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final t = _controller.value;
        return Container(
          height: widget.height,
          width: widget.width,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(widget.radius),
            color: Color.lerp(
              const Color(0xFFE8D9CC),
              const Color(0xFFF6EDE4),
              t,
            ),
          ),
        );
      },
    );
  }
}

class TakkaCardSkeleton extends StatelessWidget {
  const TakkaCardSkeleton({super.key, this.lines = 2});

  final int lines;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: TakkaColors.softLine),
      ),
      child: Row(
        children: [
          const TakkaBone(height: 56, width: 56, radius: 16),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const TakkaBone(height: 14, width: 140),
                const SizedBox(height: 10),
                for (var i = 0; i < lines; i++) ...[
                  TakkaBone(
                    height: 12,
                    width: i == lines - 1 ? 100 : double.infinity,
                  ),
                  if (i < lines - 1) const SizedBox(height: 8),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class CustomerHomeSkeleton extends StatelessWidget {
  const CustomerHomeSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const TakkaBone(height: 48, radius: 16),
        const SizedBox(height: 16),
        const TakkaBone(height: 140, radius: 24),
        const SizedBox(height: 16),
        const TakkaBone(height: 22, width: 120),
        const SizedBox(height: 12),
        SizedBox(
          height: 88,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: 5,
            separatorBuilder: (_, index) => const SizedBox(width: 10),
            itemBuilder: (_, index) => const TakkaBone(
              height: 88,
              width: 88,
              radius: 20,
            ),
          ),
        ),
        const SizedBox(height: 18),
        const TakkaBone(height: 72, radius: 20),
        const SizedBox(height: 16),
        const TakkaBone(height: 20, width: 160),
        const SizedBox(height: 12),
        const TakkaCardSkeleton(lines: 3),
        const SizedBox(height: 12),
        const TakkaCardSkeleton(lines: 2),
        const SizedBox(height: 12),
        const TakkaCardSkeleton(lines: 2),
      ],
    );
  }
}

class ListScreenSkeleton extends StatelessWidget {
  const ListScreenSkeleton({
    super.key,
    this.titleWidth = 120,
    this.itemCount = 5,
  });

  final double titleWidth;
  final int itemCount;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
      children: [
        TakkaBone(height: 28, width: titleWidth, radius: 10),
        const SizedBox(height: 18),
        for (var i = 0; i < itemCount; i++) ...[
          const TakkaCardSkeleton(),
          if (i < itemCount - 1) const SizedBox(height: 12),
        ],
      ],
    );
  }
}

class DetailScreenSkeleton extends StatelessWidget {
  const DetailScreenSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const TakkaBone(height: 180, radius: 24),
        const SizedBox(height: 16),
        const TakkaBone(height: 22, width: 180),
        const SizedBox(height: 10),
        const TakkaBone(height: 14),
        const SizedBox(height: 8),
        const TakkaBone(height: 14, width: 220),
        const SizedBox(height: 20),
        const TakkaBone(height: 18, width: 100),
        const SizedBox(height: 12),
        const TakkaCardSkeleton(lines: 3),
        const SizedBox(height: 12),
        const TakkaCardSkeleton(lines: 2),
        const SizedBox(height: 12),
        const TakkaCardSkeleton(lines: 2),
      ],
    );
  }
}

class AccountScreenSkeleton extends StatelessWidget {
  const AccountScreenSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
      children: [
        const TakkaBone(height: 28, width: 90, radius: 10),
        const SizedBox(height: 18),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: TakkaColors.softLine),
          ),
          child: const Row(
            children: [
              TakkaBone(height: 64, width: 64, radius: 32),
              SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    TakkaBone(height: 16, width: 140),
                    SizedBox(height: 10),
                    TakkaBone(height: 12, width: 110),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 28),
        const TakkaBone(height: 16, width: 70),
        const SizedBox(height: 12),
        for (var i = 0; i < 4; i++) ...[
          const TakkaCardSkeleton(lines: 1),
          if (i < 3) const SizedBox(height: 10),
        ],
      ],
    );
  }
}

class FormScreenSkeleton extends StatelessWidget {
  const FormScreenSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const TakkaBone(height: 24, width: 160),
        const SizedBox(height: 16),
        for (var i = 0; i < 5; i++) ...[
          const TakkaBone(height: 52, radius: 16),
          const SizedBox(height: 12),
        ],
        const SizedBox(height: 8),
        const TakkaBone(height: 48, radius: 16),
      ],
    );
  }
}
