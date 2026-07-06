# TodayGuide (오늘의 지침서)

TimeTree에 등록된 일정 시작 3시간 전에 알림을 보내고, 앱을 열거나 새로고침할 때마다 그 시점의 현재 위치와 최신 TimeTree 일정을 기준으로 동선(자차/대중교통)·옷차림(상/하의/신발)·준비물(우산/양산/선글라스)을 안내하는 Flutter(Android) 앱.

## 실행 방법

```bash
cd LetsGo2/TodayGuide
flutter create --platforms=android .   # gradle wrapper 등 나머지 안드로이드 빌드 파일 생성(최초 1회)
flutter pub get
cp env.json.example env.json   # 최초 1회, 실제 키값 채워넣기(env.json은 gitignore됨)
flutter run --dart-define-from-file=env.json
```

**주의: `env.json`을 채우지 않고 빌드하면 네이버 Geocoding(주소 검색)·자동차/대중교통 길찾기·날씨 API가 모두 "키 없음"으로 조용히 실패하고 폴백 경로만 탑니다.** 주소 검색이 안 되거나 이동 지침이 안 나온다면 가장 먼저 `env.json`에 실제 키가 채워져 있는지 확인하세요.

## 필요한 외부 API와 확인된 사항

| 용도 | API | 비용 |
|---|---|---|
| 주소 검색(지번/도로명) | 네이버클라우드플랫폼 Maps > Geocoding | 월 무료 크레딧 이후 종량 과금 |
| 자동차 길찾기(동선) | 네이버클라우드플랫폼 Maps > Direction 5 | 월 무료 크레딧 이후 종량 과금 (콘솔에서 실제 단가 확인 필요) |
| 대중교통 길찾기 | ODsay Lab 대중교통 API | 무료 호출 쿼터 제공, 초과 시 유료 |
| 기온/하늘상태/강수 | 기상청 공공데이터포털 단기예보 조회서비스(getVilageFcst) | 무료(일일 호출 한도 있음) |
| 자외선지수 | 기상청 생활기상지수 getUVIdxV4 | 무료, 단 지역코드(areaNo) 매핑표가 필요 |

네이버클라우드플랫폼(https://www.ncloud.com) 콘솔에서 Maps(Geocoding + Direction 5) 서비스를 신청하면 Client ID/Secret이 발급됩니다. ODsay는 https://lab.odsay.com, 기상청 키는 https://www.data.go.kr 공공데이터포털에서 각각 회원가입 후 무료로 발급받을 수 있습니다.

**중요한 제약을 설계에 반영했습니다.**

1. **네이버 지도 API에는 대중교통 길찾기가 없습니다.** Direction 5는 자동차/도보만 제공하므로, 대중교통 구간은 ODsay Lab API로 대체했습니다(`lib/services/route/odsay_transit_route_service.dart`).
2. **TimeTree는 서드파티용 공개 API를 제공하지 않습니다.** 대신 TimeTree 계정 이메일/비밀번호로 직접 로그인해서 비공식 API로 캘린더/일정을 조회합니다(`lib/services/calendar/timetree_client.dart`, `timetree_api_service.dart`). 자격증명은 기기에 암호화 저장하며, 앱 내 웹뷰로 TimeTree 로그인 페이지를 열어 세션만 저장하는 방식도 지원합니다. Google Calendar 연동은 2인 전용 앱이라는 특성상 제거했습니다.

또한 자외선지수 API는 위경도가 아니라 행정구역 지역코드를 요구하는데, 전국 지역코드표를 아직 반영하지 못해 서울/인천/부산 정도만 매핑되어 있습니다(`lib/services/weather/kma_uv_service.dart`의 TODO 참고). 이 경우 자외선지수 없이도 우산/선글라스 로직은 강수확률과 하늘상태만으로 동작합니다.

## 알림/새로고침 정책

고정된 시각에 오는 알림은 없습니다. **TimeTree 일정 시작 3시간 전에** 출발 준비 알림이 오고(본인/같이 일정만 대상), 앱을 열거나 화면을 당겨서 새로고침할 때마다 TimeTree 일정·날씨·이동경로를 **매번 새로 조회**합니다(당일 캐시 없음). 그래서 하루 중 새로 추가되거나 변경된 일정도 다음 새로고침부터 바로 반영됩니다.

또한 매번 조회할 때마다 오늘 일정뿐 아니라 **조회 시점 기준 가장 가까운 다음 일정**(오늘 일정이 없거나 이미 다 지났다면 그 이후 날짜의 일정이라도)에 대해 동일하게 이동경로·날씨 지침을 계산하고, 그 일정의 3시간 전 알림이 정확히 몇 월 며칠 몇 시에 울리는지 안내 문구로 보여줍니다.

## 구조

```
lib/
  main.dart                 앱 진입점, 온보딩 완료 여부에 따라 홈/온보딩 라우팅
  theme/                    우주/SF 컨셉 다크 테마
  models/                   UserSettings, ScheduleEvent, WeatherSnapshot, RoutePlan 등
  services/
    calendar/                TimeTree 비공식 API 연동(이메일/비밀번호, 웹뷰 로그인)
    weather/                 기상청 단기예보 / 자외선지수
    route/                   네이버(자동차) / ODsay(대중교통)
    guide_engine.dart        핵심 계산 로직(교통 -15분 도착, 옷차림/준비물 규칙)
  screens/
    onboarding/               초기 셋팅 마법사 + 고지사항
    home/                     오늘의 지침서 메인 화면
    settings/                 설정 화면
```
