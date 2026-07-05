import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../../theme/app_theme.dart';

/// TimeTree 공식 로그인 페이지를 웹뷰로 그대로 띄워서 로그인시키고,
/// 로그인 성공 후 생기는 세션 쿠키(_session_id)를 추출해 반환한다.
/// TimeTree에는 서드파티 OAuth/SSO가 없어서, 우리 앱 폼 대신 TimeTree
/// 자체 로그인 화면을 보여주는 방식으로 신뢰도를 높인 절충안이다.
///
/// `_session_id`는 HttpOnly 쿠키라 webview_flutter의 JS(document.cookie)나
/// 공개 쿠키 API로는 못 읽는다. 대신 안드로이드 네이티브
/// android.webkit.CookieManager를 MethodChannel로 직접 호출한다
/// (MainActivity.kt의 "today_guide/cookies" 채널 참고).
class TimeTreeWebViewLoginScreen extends StatefulWidget {
  const TimeTreeWebViewLoginScreen({super.key});

  static const _signInUrl = 'https://timetreeapp.com/signin';
  static const _cookieUrl = 'https://timetreeapp.com';
  static const _sessionCookieName = '_session_id';
  static const _cookieChannel = MethodChannel('today_guide/cookies');

  @override
  State<TimeTreeWebViewLoginScreen> createState() => _TimeTreeWebViewLoginScreenState();
}

class _TimeTreeWebViewLoginScreenState extends State<TimeTreeWebViewLoginScreen> {
  late final WebViewController _controller;
  Timer? _pollTimer;
  bool _resolved = false;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(NavigationDelegate(
        onPageFinished: (_) {
          if (mounted) setState(() => _loading = false);
        },
      ))
      ..loadRequest(Uri.parse(TimeTreeWebViewLoginScreen._signInUrl));
    // TimeTree는 로그인 성공 후 SPA 내부 라우팅으로 화면을 바꾸기 때문에
    // 웹뷰의 페이지 이동 이벤트만으로는 로그인 완료 시점을 알기 어렵다.
    // 대신 세션 쿠키가 생겼는지 주기적으로 확인한다.
    _pollTimer = Timer.periodic(const Duration(seconds: 1), (_) => _checkSession());
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  Future<void> _checkSession() async {
    if (_resolved || !mounted) return;
    String? cookieHeader;
    try {
      cookieHeader = await TimeTreeWebViewLoginScreen._cookieChannel
          .invokeMethod<String>('getCookie', {'url': TimeTreeWebViewLoginScreen._cookieUrl});
    } catch (_) {
      return;
    }
    if (cookieHeader == null) return;
    final match = RegExp('${TimeTreeWebViewLoginScreen._sessionCookieName}=([^;]+)').firstMatch(cookieHeader);
    if (match == null) return;
    _resolved = true;
    _pollTimer?.cancel();
    if (mounted) Navigator.of(context).pop(match.group(1));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.deepSpace,
      appBar: AppBar(
        backgroundColor: AppColors.deepSpace,
        title: const Text('TimeTree 로그인'),
      ),
      body: Stack(
        children: [
          WebViewWidget(controller: _controller),
          if (_loading) const Center(child: CircularProgressIndicator(color: AppColors.neonCyan)),
        ],
      ),
    );
  }
}
