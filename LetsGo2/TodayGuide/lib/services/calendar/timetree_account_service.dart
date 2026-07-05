import 'timetree_client.dart';
import 'timetree_credential_store.dart';

/// 온보딩/설정 화면에서 TimeTree 계정 연결, 캘린더 선택, 라벨 조회에 쓰는 서비스.
/// 실제 하루치 일정 조회는 [TimeTreeApiService](CalendarService 구현체)가 담당한다.
class TimeTreeAccountService {
  TimeTreeAccountService({TimeTreeClient? client, TimeTreeCredentialStore? credentialStore})
      : _client = client ?? TimeTreeClient(),
        _credentialStore = credentialStore ?? TimeTreeCredentialStore();

  final TimeTreeClient _client;
  final TimeTreeCredentialStore _credentialStore;

  Future<bool> get isLoggedIn async {
    if ((await _credentialStore.readCredentials()) != null) return true;
    return (await _credentialStore.readSession()) != null;
  }

  Future<String?> get savedEmail async => (await _credentialStore.readCredentials())?.email;

  /// 이메일/비밀번호로 로그인 검증 후 자격증명과 세션을 저장한다.
  Future<void> login({required String email, required String password}) async {
    final sessionId = await _client.login(email: email, password: password);
    await _credentialStore.saveCredentials(email: email, password: password);
    await _credentialStore.saveSession(sessionId);
  }

  /// 앱 내 웹뷰로 TimeTree 로그인 페이지에서 직접 로그인해서 얻은 세션 쿠키를
  /// 저장한다. 비밀번호를 모르므로 세션이 만료되면 자동 재로그인은 못 하고
  /// 사용자가 웹뷰 로그인을 다시 해야 한다.
  Future<void> loginWithSession(String sessionId) => _credentialStore.saveSession(sessionId);

  Future<void> logout() => _credentialStore.clearCredentials();

  Future<List<TimeTreeCalendarSummary>> fetchCalendars() async {
    final sessionId = await _ensureSession();
    try {
      return await _client.getCalendars(sessionId);
    } on TimeTreeSessionExpiredException {
      final fresh = await _ensureSession(forceRelogin: true);
      return await _client.getCalendars(fresh);
    }
  }

  Future<Map<int, TimeTreeLabel>> fetchLabels(String calendarId) async {
    final sessionId = await _ensureSession();
    try {
      return await _client.getLabels(sessionId, calendarId);
    } on TimeTreeSessionExpiredException {
      final fresh = await _ensureSession(forceRelogin: true);
      return await _client.getLabels(fresh, calendarId);
    }
  }

  Future<String> _ensureSession({bool forceRelogin = false}) async {
    if (!forceRelogin) {
      final cached = await _credentialStore.readSession();
      if (cached != null) return cached;
    }
    final creds = await _credentialStore.readCredentials();
    if (creds == null) {
      throw StateError('TimeTree 계정이 연결되어 있지 않습니다.');
    }
    final sessionId = await _client.login(email: creds.email, password: creds.password);
    await _credentialStore.saveSession(sessionId);
    return sessionId;
  }
}
