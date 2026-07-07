import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../services/diagnostic_log.dart';
import '../../theme/app_theme.dart';
import '../../widgets/starfield_background.dart';

/// 간헐적으로 발생하는 오류를 나중에 확인할 수 있도록 남겨둔 진단 로그를
/// 보여준다. 화면 텍스트를 길게 눌러 복사해서 그대로 전달하면 된다.
class DiagnosticLogScreen extends StatefulWidget {
  const DiagnosticLogScreen({super.key});

  @override
  State<DiagnosticLogScreen> createState() => _DiagnosticLogScreenState();
}

class _DiagnosticLogScreenState extends State<DiagnosticLogScreen> {
  late Future<String> _future;

  @override
  void initState() {
    super.initState();
    _future = DiagnosticLog.readAll();
  }

  void _reload() => setState(() => _future = DiagnosticLog.readAll());

  Future<void> _copyAll() async {
    final text = await _future;
    await Clipboard.setData(ClipboardData(text: text));
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('로그를 복사했어요.')));
    }
  }

  Future<void> _clear() async {
    await DiagnosticLog.clear();
    _reload();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: StarfieldBackground(
        child: SafeArea(
          child: Column(
            children: [
              AppBar(
                backgroundColor: Colors.transparent,
                title: const Text('진단 로그'),
                actions: [
                  IconButton(onPressed: _copyAll, icon: const Icon(Icons.copy)),
                  IconButton(onPressed: _clear, icon: const Icon(Icons.delete_outline)),
                ],
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Text(
                  '오늘의 지침서 계산/알림 예약/TimeTree 로그인 기록의 최근 로그예요. '
                  '문제가 생겼을 때 복사해서 알려주면 원인을 찾는 데 도움이 돼요.',
                  style: const TextStyle(color: AppColors.textSecondary, fontSize: 12, height: 1.4),
                ),
              ),
              Expanded(
                child: FutureBuilder<String>(
                  future: _future,
                  builder: (context, snapshot) {
                    if (snapshot.connectionState != ConnectionState.done) {
                      return const Center(child: CircularProgressIndicator(color: AppColors.neonCyan));
                    }
                    return SingleChildScrollView(
                      padding: const EdgeInsets.all(20),
                      child: SelectableText(
                        snapshot.data ?? '',
                        style: const TextStyle(color: AppColors.textPrimary, fontSize: 12, fontFamily: 'monospace'),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
