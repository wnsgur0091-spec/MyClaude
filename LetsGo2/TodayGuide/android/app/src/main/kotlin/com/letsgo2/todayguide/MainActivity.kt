package com.letsgo2.todayguide

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.webkit.CookieManager
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val cookieChannelName = "today_guide/cookies"
    private val launcherChannelName = "today_guide/launcher"

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

        // 상세 이동경로 등 외부 앱(지도 등)으로 URL을 여는 채널.
        // url_launcher 패키지는 이 플랫폼의 compileSdk 요구 버전이 이 프로젝트보다
        // 높아서 빌드가 깨지므로, 표준 ACTION_VIEW 인텐트를 직접 호출한다.
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, launcherChannelName).setMethodCallHandler { call, result ->
            if (call.method == "openUrl") {
                val url = call.argument<String>("url")
                if (url == null) {
                    result.error("INVALID_ARGUMENT", "url is required", null)
                    return@setMethodCallHandler
                }
                try {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    startActivity(intent)
                    result.success(true)
                } catch (e: ActivityNotFoundException) {
                    result.success(false)
                }
            } else {
                result.notImplemented()
            }
        }
    }
}
