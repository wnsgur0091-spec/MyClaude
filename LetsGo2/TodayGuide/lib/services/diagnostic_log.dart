import 'dart:io';

import 'package:path_provider/path_provider.dart';

/// 간헐적으로 발생하는 오류를 나중에라도 확인할 수 있도록 파일에 기록해둔다.
/// logcat은 버퍼가 몇 시간~하루 안에 순환돼서 지난 오류를 다시 볼 수 없기
/// 때문에, 앱 자체 파일에 최근 이벤트를 남겨서 설정 화면에서 확인/복사할
/// 수 있게 한다.
class DiagnosticLog {
  static const _fileName = 'diagnostic_log.txt';
  static const _maxLines = 500;

  static Future<File> _file() async {
    final dir = await getApplicationDocumentsDirectory();
    return File('${dir.path}/$_fileName');
  }

  static Future<void> log(String message) async {
    try {
      final file = await _file();
      final line = '${DateTime.now().toIso8601String()} $message\n';
      await file.writeAsString(line, mode: FileMode.append, flush: true);
      await _trim(file);
    } catch (_) {
      // 로그 기록 자체가 실패해도 앱 동작에는 영향이 없어야 한다.
    }
  }

  static Future<void> _trim(File file) async {
    final lines = await file.readAsLines();
    if (lines.length <= _maxLines) return;
    final trimmed = lines.sublist(lines.length - _maxLines);
    await file.writeAsString('${trimmed.join('\n')}\n');
  }

  static Future<String> readAll() async {
    try {
      final file = await _file();
      if (!await file.exists()) return '(기록된 로그가 없어요)';
      final content = await file.readAsString();
      return content.isEmpty ? '(기록된 로그가 없어요)' : content;
    } catch (e) {
      return '로그를 읽지 못했어요: $e';
    }
  }

  static Future<void> clear() async {
    try {
      final file = await _file();
      if (await file.exists()) await file.delete();
    } catch (_) {
      // 무시: 다음 기록에서 새로 만들어진다.
    }
  }
}
