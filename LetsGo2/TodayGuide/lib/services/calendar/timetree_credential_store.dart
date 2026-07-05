import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// TimeTree 이메일/비밀번호 및 로그인 세션 쿠키를 기기에 암호화 저장한다.
/// (일반 SharedPreferences는 평문 저장이라 자격증명을 담기에 부적절)
class TimeTreeCredentialStore {
  TimeTreeCredentialStore({FlutterSecureStorage? storage}) : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  static const _emailKey = 'timetree_email';
  static const _passwordKey = 'timetree_password';
  static const _sessionKey = 'timetree_session_id';

  Future<void> saveCredentials({required String email, required String password}) async {
    await _storage.write(key: _emailKey, value: email);
    await _storage.write(key: _passwordKey, value: password);
  }

  Future<({String email, String password})?> readCredentials() async {
    final email = await _storage.read(key: _emailKey);
    final password = await _storage.read(key: _passwordKey);
    if (email == null || password == null) return null;
    return (email: email, password: password);
  }

  Future<void> clearCredentials() async {
    await _storage.delete(key: _emailKey);
    await _storage.delete(key: _passwordKey);
    await clearSession();
  }

  Future<void> saveSession(String sessionId) => _storage.write(key: _sessionKey, value: sessionId);

  Future<String?> readSession() => _storage.read(key: _sessionKey);

  Future<void> clearSession() => _storage.delete(key: _sessionKey);
}
