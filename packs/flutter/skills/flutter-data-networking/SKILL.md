---
name: flutter-data-networking
description: Handles HTTP networking in Flutter Dart 3+ projects. Use when making dio HTTP requests, configuring a Dio instance (BaseOptions, interceptors for auth/logging/error, timeouts), building type-safe API clients with retrofit (@RestApi, @GET/@POST), generating immutable DTOs with freezed + json_serializable, streaming downloads/uploads, or cancelling in-flight requests. Networking-only — persistence lives in flutter-data-and-concurrency.
version: 1.0.0
platform: flutter
depends-on: [flutter-data-and-concurrency, flutter-di-and-build, flutter-error-handling, flutter-ui]
  - flutter-di-and-build
  - flutter-state-riverpod
---

# Flutter Data Networking (Dio, Retrofit, Freezed)

## Overview

Own every byte that crosses the network in a Flutter app. `dio` 5.x is the HTTP client: one configured `Dio` instance per process (base URL, timeouts, headers, interceptors), exposed through a provider from `flutter-di-and-build`. `retrofit` code-generates type-safe API clients (`@RestApi`) on top of that `Dio`. `freezed` + `json_serializable` produce immutable DTOs with `fromJson`/`toJson`. The networking layer stays behind a repository — widgets and state holders never touch `Dio` or DTOs directly. For small/one-off integrations, plain `dio` + `json_serializable` (no retrofit) is the sanctioned lighter path. This skill is networking only: local persistence (drift/hive) belongs to `flutter-data-and-concurrency`.

## When to Use

- Use when the app calls HTTP APIs — REST, uploads, downloads, streaming.
- Use when configuring the shared `Dio` instance: `BaseOptions`, interceptors, timeouts.
- Use when defining a type-safe client with `retrofit` (`@RestApi`, `@GET`, `@POST`, `@Body`, `@Path`, `@Query`).
- Use when modeling API request/response payloads as `@freezed` + `json_serializable` DTOs.
- Use when downloading large files, uploading multipart data, or streaming responses.
- Use when an in-flight request must be cancelled (superseded search, widget dispose).
- Do NOT use for local persistence (drift/hive/SharedPreferences) — see `flutter-data-and-concurrency`.
- Do NOT use when only changing UI code — see `flutter-ui`.

## Core Process

### 1. Configure a single `Dio` instance behind a provider

- `Dio` is configured **once** per process and exposed via a provider (see `flutter-di-and-build`). Never `Dio()` per call — per-call instances lose interceptors, pooling, and base config.
- dio 5.x takes `Duration` for timeouts. Set `connectTimeout`, `receiveTimeout`, and a sensible `sendTimeout` for uploads.
- Read the base URL from `--dart-define` (`String.fromEnvironment`) with a dev default.

```dart
final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(BaseOptions(
    baseUrl: const String.fromEnvironment('API_BASE', defaultValue: 'https://api.dev.example.com'),
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 15),
    sendTimeout: const Duration(seconds: 30),
    headers: {'Accept': 'application/json'},
    contentType: Headers.jsonContentType,
  ));
  dio.interceptors.addAll([
    AuthInterceptor(ref),
    LogInterceptor(requestBody: kDebugMode, responseBody: kDebugMode, logPrint: (l) => ref.read(loggerProvider).d(l)),
    ErrorInterceptor(),
  ]);
  return dio;
});
```

### 2. Interceptors: auth, logging, error — in that order

- **Auth**: read the token (e.g. from `flutter_secure_storage` via a provider) and attach `Authorization` in `onRequest`. For token refresh on 401, use `QueuedInterceptor` — it serializes requests while the refresh is in flight, preventing a stampede of parallel 401-refresh calls.
- **Logging**: `LogInterceptor` gated by `kDebugMode`. Never log `Authorization` headers or bodies in release.
- **Error**: normalize `DioException` into the app's error shape at the boundary, not in widgets.

```dart
class AuthInterceptor extends QueuedInterceptor {
  AuthInterceptor(this._ref);
  final Ref _ref;

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await _ref.read(authTokenProvider.future);
    if (token != null) options.headers['Authorization'] = 'Bearer $token';
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401 && !err.requestOptions.path.endsWith('/auth/refresh')) {
      final refreshed = await _ref.read(authRepositoryProvider).refresh();
      if (refreshed != null) {
        final opts = err.requestOptions..headers['Authorization'] = 'Bearer $refreshed';
        final res = await _ref.read(dioProvider).fetch(opts);
        return handler.resolve(res); // retried once with the new token
      }
    }
    handler.next(err);
  }
}
```

### 3. Error handling with `DioException`

- dio 5.x throws `DioException` (renamed from `DioError`). Branch on `e.type`, not string messages.
- Map to a sealed `Failure`/`Result` at the repository boundary (see `flutter-error-handling`); never surface raw exceptions to the UI.
- `DioExceptionType.cancel` is not an error — a cancelled request should not be surfaced as one.

```dart
Future<Result<List<TransactionDto>>> fetchTransactions() async {
  try {
    final res = await _api.getTransactions();
    return Result.success(res);
  } on DioException catch (e) {
    return switch (e.type) {
      DioExceptionType.badResponse => Result.failure(ApiFailure.fromStatus(e.response?.statusCode, e.response?.data)),
      DioExceptionType.connectionTimeout ||
      DioExceptionType.receiveTimeout ||
      DioExceptionType.connectionError => Result.failure(const ApiFailure.timeout()),
      DioExceptionType.cancel => Result.failure(const ApiFailure.cancelled()),
      _ => Result.failure(ApiFailure.unknown(e.message)),
    };
  }
}
```

### 4. Type-safe client with `retrofit` code generation

- Declare an `abstract` class annotated `@RestApi(baseUrl: ...)` with a factory that takes the shared `Dio`. `retrofit_generator` produces the concrete `_ApiClient`.
- Annotate endpoints: `@GET`/`@POST`/`@PUT`/`@PATCH`/`@DELETE`, `@Path`, `@Query`, `@Body`, `@Header`, `@MultiPart()` + `@Part()`.
- Run `dart run build_runner build --delete-conflicting-outputs` after every change and commit the generated `*.g.dart` (see `flutter-di-and-build` for the build step).

```dart
@RestApi(baseUrl: Env.apiBase)
abstract class ApiClient {
  factory ApiClient(Dio dio, {String baseUrl}) = _ApiClient;

  @GET('/transactions')
  Future<List<TransactionDto>> getTransactions(@Query('page') int page);

  @GET('/transactions/{id}')
  Future<TransactionDto> getTransaction(@Path('id') String id);

  @POST('/transactions')
  Future<TransactionDto> createTransaction(@Body() CreateTransactionDto dto);

  @MultiPart()
  @POST('/transactions/{id}/receipt')
  Future<void> uploadReceipt(@Path('id') String id, @Part() MultipartFile file);
}
```

- DTO mapping is automatic: retrofit's generated code calls the model's `fromJson` factory, so `@freezed` + `json_serializable` DTOs plug straight in.
- For paginated/list-wrapped responses, wrap the DTO: `Future<PageDto<TransactionDto>>` with a hand-written `fromJson` that reads `items` and `page` — retrofit handles the outer shape, `json_serializable` handles the inner.

### 5. Immutable DTOs with `freezed` + `json_serializable`

- Model every request/response payload as a `@freezed` class (value equality, `copyWith`, sealed unions) combined with `json_serializable` for `fromJson`/`toJson`.
- Configure `field_rename: snake` and `explicit_to_json: true` in `build.yaml` so API snake_case maps to Dart camelCase without per-field annotation noise.
- Run `build_runner` after any model change; commit `*.g.dart` and `*.freezed.dart`.

```dart
@freezed
class TransactionDto with _$TransactionDto {
  const factory TransactionDto({
    required String id,
    required int amountMinor, // cents — money is never double, see flutter-data-and-concurrency
    required String currency,
    required DateTime createdAt,
  }) = _TransactionDto;

  factory TransactionDto.fromJson(Map<String, dynamic> json) =>
      _$TransactionDtoFromJson(json);
}
```

### 6. Lighter path: plain `dio` + `json_serializable` (no retrofit)

- One or two ad-hoc endpoints, a third-party API you won't extend, or an MVP — skip retrofit. Call `dio` directly and decode with the DTO's `fromJson`.
- Keep it inside the repository; the raw `dio.get` call still goes through the shared instance.

```dart
// lib/data/repositories/exchange_rate_repository.dart
class ExchangeRateRepository {
  ExchangeRateRepository(this._dio);
  final Dio _dio;

  Future<ExchangeRateDto> fetchRate(String from, String to) async {
    final res = await _dio.get<Map<String, dynamic>>('/rates', queryParameters: {'from': from, 'to': to});
    return ExchangeRateDto.fromJson(res.data!);
  }
}
```

### 7. Streaming downloads and uploads

- **Download**: `dio.download` streams to a file with `onReceiveProgress` — do not `get` a huge body into memory first. For raw bytes, use `ResponseType.bytes`.
- **Upload**: `FormData.fromMap` + `MultipartFile.fromFile` for multipart uploads. Report progress with `onSendProgress`.
- **Stream response**: `Options(responseType: ResponseType.stream)` for large payloads or SSE-style endpoints; consume the stream and close it in `finally`.

```dart
await _dio.download(
  '/reports/monthly.pdf',
  savePath,
  onReceiveProgress: (received, total) {
    if (total != -1) _ref.read(uploadProgressProvider.notifier).set(received / total);
  },
);
```

### 8. Cancellation with `CancelToken`

- Create a `CancelToken` per cancellable operation (search-as-you-type, paged list, report download).
- Cancel when the operation is superseded or the widget disposes. A cancelled request surfaces `DioExceptionType.cancel` — swallow it in the interceptor/error mapper, never as a user-facing error.

```dart
final cancelToken = CancelToken();
_ref.onDispose(cancelToken.cancel); // cancelled on provider dispose

try {
  final res = await _dio.get('/search', queryParameters: {'q': query}, options: Options(cancelToken: cancelToken));
  // ...
} on DioException catch (e) {
  if (e.type == DioExceptionType.cancel) return; // superseded — not an error
  rethrow;
}
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll instantiate `Dio()` inside each call — it's simpler" | Per-call instances lose interceptors, timeouts, base URL, and connection pooling. One configured `Dio` per process behind a provider. |
| "I'll use `package:http` — it's the official package" | `http` is fine for a one-off script; in an app you hand-roll timeouts, headers, retry, and cancellation that `dio` ships built-in. Use `dio`; mention `http` only as a zero-dependency alternative. |
| "I'll catch `Exception` and show `e.toString()`" | That leaks dio internals to users. Branch on `DioExceptionType`, map to a sealed `Failure` at the repository boundary. |
| "Retrofit is magic — I'll just write the `fromJson` by hand" | Hand-rolled JSON mapping drifts from the API contract and the DTO. Let `retrofit` + `json_serializable` generate it; hand-write only when the response shape needs custom logic. |
| "I'll log the `Authorization` header in debug so I can debug auth" | `kDebugMode` logs still ship in debug builds handed to QA; tokens leak into log streams. Never log credentials. |
| "A cancelled request should show an error" | Cancellation is intentional — a superseded search or a disposed widget. `DioExceptionType.cancel` is not a failure; swallow it. |

## Red Flags

- `Dio()` instantiated inside a method or widget instead of via the shared provider.
- `package:http` used as the primary HTTP stack for an app with multiple endpoints.
- `DioException` caught with a bare `catch (e)` / string matching instead of `e.type` switches.
- Raw `dio`/`retrofit` responses (DTOs) flowing into widgets instead of domain models via a repository.
- JSON parsed with `jsonDecode` + manual `Map<String, dynamic>` casts when a `@freezed` model exists.
- Auth token attached by concatenating strings in every call site instead of an interceptor.
- Timeouts left at dio defaults (or unset) so a hanging server stalls the UI indefinitely.
- Downloads done via `dio.get` into memory instead of `dio.download` / `ResponseType.stream`.
- `CancelToken` never cancelled — superseded requests race and overwrite newer results.
- No retry-on-401: every token expiry logs the user out once instead of refreshing.

## Verification

- [ ] Exactly one `Dio` instance is configured in a provider; no per-call instantiation anywhere.
- [ ] `BaseOptions` sets `connectTimeout`/`receiveTimeout` (and `sendTimeout` for uploads) as `Duration`s.
- [ ] Interceptors order is auth → logging → error; logging is `kDebugMode`-gated and never prints credentials.
- [ ] All typed endpoints are declared in an `@RestApi` interface with `@GET`/`@POST` + `@Path`/`@Query`/`@Body`; no endpoint paths hand-built in repositories.
- [ ] Every DTO is a `@freezed` + `json_serializable` class with a working `fromJson` factory.
- [ ] `dart run build_runner build --delete-conflicting-outputs` is clean and generated `*.g.dart`/`*.freezed.dart` are committed.
- [ ] Error handling switches on `DioExceptionType` and maps to a sealed `Failure`/`Result` — never a bare `e.toString()`.
- [ ] 401 responses trigger token refresh with a `QueuedInterceptor` guard (one refresh, then one retry).
- [ ] Downloads use `dio.download` with progress; large responses use `ResponseType.stream`.
- [ ] Every `CancelToken` is cancelled on dispose/supersede, and `DioExceptionType.cancel` is swallowed, not surfaced.
