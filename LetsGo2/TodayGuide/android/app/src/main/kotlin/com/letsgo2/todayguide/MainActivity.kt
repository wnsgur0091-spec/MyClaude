package com.letsgo2.todayguide

import android.webkit.CookieManager
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val cookieChannelName = "today_guide/cookies"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        // TimeTree 웹뷰 로그인 후 HttpOnly 세션 쿠키를 읽어오기 위한 채널.
        // webview_flutter의 공개 API로는 HttpOnly 쿠키를 읽을 수 없어
        // 안드로이드 네이티브 CookieManager를 직접 호출한다.
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, cookieChannelName).setMethodCallHandler { call, result ->
            if (call.method == "getCookie") {
                val url = call.argument<String>("url")
                if (url == null) {
                    result.error("INVALID_ARGUMENT", "url is required", null)
                } else {
                    result.success(CookieManager.getInstance().getCookie(url))
                }
            } else {
                result.notImplemented()
            }
        }
    }
}
