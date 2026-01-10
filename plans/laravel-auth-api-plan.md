# Rencana Implementasi API Auth di ERP Cloud Laravel 12

## Ringkasan

Dokumen ini merencanakan implementasi API Authentication di project ERP Cloud Laravel 12 untuk menggantikan DummyJSON API. API ini akan menggunakan struktur payload yang sama dengan DummyJSON agar kompatibel dengan aplikasi Electron yang sudah ada.

## Struktur Payload DummyJSON (Reference)

### Login Request

```json
POST /auth/login
{
  "username": "string",
  "password": "string",
  "expiresInMins": 60
}
```

### Login Response

```json
{
  "id": 1,
  "username": "string",
  "email": "string",
  "firstName": "string",
  "lastName": "string",
  "gender": "string",
  "image": "string",
  "accessToken": "string",
  "refreshToken": "string"
}
```

### Refresh Token Request

```json
POST /auth/refresh
{
  "refreshToken": "string",
  "expiresInMins": 60
}
```

### Refresh Token Response

```json
{
  "accessToken": "string",
  "refreshToken": "string"
}
```

### Get Current User

```
GET /auth/me
Authorization: Bearer {accessToken}
```

### Get Current User Response

```json
{
  "id": 1,
  "username": "string",
  "email": "string",
  "firstName": "string",
  "lastName": "string",
  "gender": "string",
  "image": "string"
}
```

---

## 1. Database Schema

### 1.1 Migration: users

```php
// database/migrations/xxxx_xx_xx_create_users_table.php

public function up()
{
    Schema::create('users', function (Blueprint $table) {
        $table->id();
        $table->string('username')->unique();
        $table->string('email')->unique();
        $table->string('password');
        $table->string('first_name');
        $table->string('last_name');
        $table->string('gender')->nullable();
        $table->string('image')->nullable();
        $table->enum('status', ['active', 'inactive'])->default('active');
        $table->timestamp('email_verified_at')->nullable();
        $table->rememberToken();
        $table->timestamps();
        $table->softDeletes();
    });
}
```

### 1.2 Migration: refresh_tokens

```php
// database/migrations/xxxx_xx_xx_create_refresh_tokens_table.php

public function up()
{
    Schema::create('refresh_tokens', function (Blueprint $table) {
        $table->id();
        $table->foreignId('user_id')->constrained()->onDelete('cascade');
        $table->string('token')->unique();
        $table->timestamp('expires_at');
        $table->timestamp('revoked_at')->nullable();
        $table->timestamps();

        $table->index('token');
        $table->index('user_id');
        $table->index('expires_at');
    });
}
```

### 1.3 Migration: auth_logs (Optional - untuk audit)

```php
// database/migrations/xxxx_xx_xx_create_auth_logs_table.php

public function up()
{
    Schema::create('auth_logs', function (Blueprint $table) {
        $table->id();
        $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
        $table->string('event_type'); // LOGIN, LOGOUT, REFRESH, FAILED_LOGIN
        $table->ipAddress('ip_address')->nullable();
        $table->string('user_agent')->nullable();
        $table->boolean('success')->default(true);
        $table->text('error_message')->nullable();
        $table->timestamps();

        $table->index('user_id');
        $table->index('event_type');
        $table->index('created_at');
    });
}
```

---

## 2. Dependencies yang Diperlukan

### 2.1 Install Package JWT

```bash
composer require firebase/php-jwt
```

### 2.2 Install CORS (untuk Electron app)

```bash
composer require fruitcake/laravel-cors
# Laravel 12 mungkin sudah include CORS bawaan
```

---

## 3. Konfigurasi

### 3.1 Environment Variables (.env)

```env
# JWT Configuration
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_ACCESS_TOKEN_EXPIRY=60
JWT_REFRESH_TOKEN_EXPIRY=43200  # 30 hari dalam menit

# API Configuration
APP_URL=https://your-erp-cloud.com
API_PREFIX=api

# CORS Configuration (untuk Electron)
CORS_ALLOWED_ORIGINS=electron://*,http://localhost:*
```

### 3.2 Config File: config/jwt.php

```php
<?php

return [
    'secret' => env('JWT_SECRET'),
    'access_token_expiry' => (int) env('JWT_ACCESS_TOKEN_EXPIRY', 60),
    'refresh_token_expiry' => (int) env('JWT_REFRESH_TOKEN_EXPIRY', 43200),
    'algorithm' => 'HS256',
];
```

---

## 4. Models

### 4.1 User Model

```php
// app/Models/User.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'username',
        'email',
        'password',
        'first_name',
        'last_name',
        'gender',
        'image',
        'status',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
    ];

    public function refreshTokens()
    {
        return $this->hasMany(RefreshToken::class);
    }

    public function authLogs()
    {
        return $this->hasMany(AuthLog::class);
    }

    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }
}
```

### 4.2 RefreshToken Model

```php
// app/Models/RefreshToken.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RefreshToken extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'token',
        'expires_at',
        'revoked_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'revoked_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function isRevoked(): bool
    {
        return $this->revoked_at !== null;
    }

    public function isValid(): bool
    {
        return !$this->isExpired() && !$this->isRevoked();
    }
}
```

### 4.3 AuthLog Model (Optional)

```php
// app/Models/AuthLog.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AuthLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'event_type',
        'ip_address',
        'user_agent',
        'success',
        'error_message',
    ];

    protected $casts = [
        'success' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
```

---

## 5. Services

### 5.1 JWT Service

```php
// app/Services/JWTService.php

namespace App\Services;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Support\Facades\Config;
use Exception;

class JWTService
{
    private string $secret;
    private string $algorithm;
    private int $accessTokenExpiry;
    private int $refreshTokenExpiry;

    public function __construct()
    {
        $this->secret = Config::get('jwt.secret');
        $this->algorithm = Config::get('jwt.algorithm', 'HS256');
        $this->accessTokenExpiry = Config::get('jwt.access_token_expiry', 60);
        $this->refreshTokenExpiry = Config::get('jwt.refresh_token_expiry', 43200);
    }

    public function generateAccessToken(array $payload): string
    {
        $issuedAt = time();
        $expire = $issuedAt + ($this->accessTokenExpiry * 60);

        $tokenPayload = array_merge($payload, [
            'iat' => $issuedAt,
            'exp' => $expire,
            'type' => 'access',
        ]);

        return JWT::encode($tokenPayload, $this->secret, $this->algorithm);
    }

    public function generateRefreshToken(array $payload): string
    {
        $issuedAt = time();
        $expire = $issuedAt + ($this->refreshTokenExpiry * 60);

        $tokenPayload = array_merge($payload, [
            'iat' => $issuedAt,
            'exp' => $expire,
            'type' => 'refresh',
        ]);

        return JWT::encode($tokenPayload, $this->secret, $this->algorithm);
    }

    public function decodeToken(string $token): object
    {
        try {
            return JWT::decode($token, new Key($this->secret, $this->algorithm));
        } catch (Exception $e) {
            throw new Exception('Invalid or expired token: ' . $e->getMessage());
        }
    }

    public function validateAccessToken(string $token): object
    {
        $decoded = $this->decodeToken($token);

        if (!isset($decoded->type) || $decoded->type !== 'access') {
            throw new Exception('Invalid token type');
        }

        return $decoded;
    }

    public function validateRefreshToken(string $token): object
    {
        $decoded = $this->decodeToken($token);

        if (!isset($decoded->type) || $decoded->type !== 'refresh') {
            throw new Exception('Invalid token type');
        }

        return $decoded;
    }
}
```

### 5.2 Auth Service

```php
// app/Services/AuthService.php

namespace App\Services;

use App\Models\User;
use App\Models\RefreshToken;
use App\Models\AuthLog;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Http\Request;

class AuthService
{
    private JWTService $jwtService;

    public function __construct(JWTService $jwtService)
    {
        $this->jwtService = $jwtService;
    }

    public function login(string $username, string $password, int $expiresInMins = 60): array
    {
        $user = User::where('username', $username)
            ->where('status', 'active')
            ->first();

        if (!$user || !Hash::check($password, $user->password)) {
            // Log failed login
            AuthLog::create([
                'event_type' => 'FAILED_LOGIN',
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
                'success' => false,
                'error_message' => 'Invalid credentials',
            ]);

            throw new \Exception('Invalid username or password');
        }

        // Generate tokens
        $accessTokenPayload = [
            'sub' => $user->id,
            'username' => $user->username,
        ];

        $accessToken = $this->jwtService->generateAccessToken($accessTokenPayload);

        // Create refresh token
        $refreshTokenString = Str::random(64);
        $refreshTokenExpiresAt = now()->addMinutes($expiresInMins);

        RefreshToken::create([
            'user_id' => $user->id,
            'token' => hash('sha256', $refreshTokenString),
            'expires_at' => $refreshTokenExpiresAt,
        ]);

        // Log successful login
        AuthLog::create([
            'user_id' => $user->id,
            'event_type' => 'LOGIN',
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'success' => true,
        ]);

        return [
            'id' => $user->id,
            'username' => $user->username,
            'email' => $user->email,
            'firstName' => $user->first_name,
            'lastName' => $user->last_name,
            'gender' => $user->gender ?? '',
            'image' => $user->image ?? '',
            'accessToken' => $accessToken,
            'refreshToken' => $refreshTokenString,
        ];
    }

    public function refresh(string $refreshToken, int $expiresInMins = 60): array
    {
        $hashedToken = hash('sha256', $refreshToken);

        $tokenRecord = RefreshToken::where('token', $hashedToken)
            ->with('user')
            ->first();

        if (!$tokenRecord || !$tokenRecord->isValid()) {
            throw new \Exception('Invalid or expired refresh token');
        }

        $user = $tokenRecord->user;

        // Generate new access token
        $accessTokenPayload = [
            'sub' => $user->id,
            'username' => $user->username,
        ];

        $newAccessToken = $this->jwtService->generateAccessToken($accessTokenPayload);

        // Generate new refresh token
        $newRefreshTokenString = Str::random(64);
        $newRefreshTokenExpiresAt = now()->addMinutes($expiresInMins);

        // Revoke old refresh token
        $tokenRecord->update(['revoked_at' => now()]);

        // Create new refresh token
        RefreshToken::create([
            'user_id' => $user->id,
            'token' => hash('sha256', $newRefreshTokenString),
            'expires_at' => $newRefreshTokenExpiresAt,
        ]);

        // Log refresh
        AuthLog::create([
            'user_id' => $user->id,
            'event_type' => 'REFRESH',
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'success' => true,
        ]);

        return [
            'accessToken' => $newAccessToken,
            'refreshToken' => $newRefreshTokenString,
        ];
    }

    public function getCurrentUser(string $accessToken): array
    {
        $decoded = $this->jwtService->validateAccessToken($accessToken);
        $userId = $decoded->sub;

        $user = User::find($userId);

        if (!$user || $user->status !== 'active') {
            throw new \Exception('User not found or inactive');
        }

        return [
            'id' => $user->id,
            'username' => $user->username,
            'email' => $user->email,
            'firstName' => $user->first_name,
            'lastName' => $user->last_name,
            'gender' => $user->gender ?? '',
            'image' => $user->image ?? '',
        ];
    }

    public function logout(string $refreshToken): void
    {
        $hashedToken = hash('sha256', $refreshToken);

        $tokenRecord = RefreshToken::where('token', $hashedToken)->first();

        if ($tokenRecord) {
            $tokenRecord->update(['revoked_at' => now()]);

            // Log logout
            AuthLog::create([
                'user_id' => $tokenRecord->user_id,
                'event_type' => 'LOGOUT',
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
                'success' => true,
            ]);
        }
    }
}
```

---

## 6. Controllers

### 6.1 Auth Controller

```php
// app/Http/Controllers/AuthController.php

namespace App\Http\Controllers;

use App\Services\AuthService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    private AuthService $authService;

    public function __construct(AuthService $authService)
    {
        $this->authService = $authService;
    }

    public function login(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'username' => 'required|string',
                'password' => 'required|string',
                'expiresInMins' => 'nullable|integer|min:1|max:1440',
            ]);

            $expiresInMins = $validated['expiresInMins'] ?? 60;

            $result = $this->authService->login(
                $validated['username'],
                $validated['password'],
                $expiresInMins
            );

            return response()->json($result);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 401);
        }
    }

    public function refresh(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'refreshToken' => 'required|string',
                'expiresInMins' => 'nullable|integer|min:1|max:1440',
            ]);

            $expiresInMins = $validated['expiresInMins'] ?? 60;

            $result = $this->authService->refresh(
                $validated['refreshToken'],
                $expiresInMins
            );

            return response()->json($result);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 401);
        }
    }

    public function getCurrentUser(Request $request): JsonResponse
    {
        try {
            $accessToken = $request->bearerToken();

            if (!$accessToken) {
                return response()->json([
                    'message' => 'Access token required',
                ], 401);
            }

            $result = $this->authService->getCurrentUser($accessToken);

            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 401);
        }
    }

    public function logout(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'refreshToken' => 'required|string',
            ]);

            $this->authService->logout($validated['refreshToken']);

            return response()->json([
                'message' => 'Logged out successfully',
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}
```

---

## 7. Routes

### 7.1 API Routes

```php
// routes/api.php

use App\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/refresh', [AuthController::class, 'refresh']);
    Route::get('/me', [AuthController::class, 'getCurrentUser']);
    Route::post('/logout', [AuthController::class, 'logout']);
});
```

---

## 8. Middleware

### 8.1 CORS Configuration (config/cors.php)

```php
<?php

return [
    'paths' => ['api/*'],
    'allowed_methods' => ['*'],
    'allowed_origins' => explode(',', env('CORS_ALLOWED_ORIGINS', '*')),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => false,
];
```

### 8.2 Rate Limiting (Optional)

```php
// app/Http/Kernel.php atau bootstrap/app.php (Laravel 12)

Route::middleware(['throttle:60,1'])->group(function () {
    Route::prefix('auth')->group(function () {
        Route::post('/login', [AuthController::class, 'login']);
        Route::post('/refresh', [AuthController::class, 'refresh']);
    });
});
```

---

## 9. Seeding Data

### 9.1 User Seeder

```php
// database/seeders/UserSeeder.php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            [
                'username' => 'admin',
                'email' => 'admin@kiram.com',
                'password' => Hash::make('admin123'),
                'first_name' => 'Admin',
                'last_name' => 'User',
                'gender' => 'other',
                'status' => 'active',
            ],
            [
                'username' => 'emilys',
                'email' => 'emilys@example.com',
                'password' => Hash::make('emilyspass'),
                'first_name' => 'Emily',
                'last_name' => 'Smith',
                'gender' => 'female',
                'status' => 'active',
            ],
            [
                'username' => 'michaelw',
                'email' => 'michaelw@example.com',
                'password' => Hash::make('michaelwpass'),
                'first_name' => 'Michael',
                'last_name' => 'Williams',
                'gender' => 'male',
                'status' => 'active',
            ],
        ];

        foreach ($users as $user) {
            User::create($user);
        }
    }
}
```

---

## 10. Integrasi dengan Electron App

### 10.1 Update DummyJSONClient.ts di Electron

```typescript
// electron/auth/DummyJSONClient.ts

export class DummyJSONClient {
  // Ganti dengan URL Laravel API
  private readonly baseUrl = "https://your-erp-cloud.com/api";
  private readonly timeout = 5000;

  // ... rest of the code remains the same
}
```

---

## 11. Checklist Implementasi

### Backend (Laravel)

- [ ] Install dependencies (firebase/php-jwt, CORS)
- [ ] Setup environment variables (.env)
- [ ] Buat config file (config/jwt.php)
- [ ] Buat migrations (users, refresh_tokens, auth_logs)
- [ ] Jalankan migrations
- [ ] Buat models (User, RefreshToken, AuthLog)
- [ ] Buat JWTService
- [ ] Buat AuthService
- [ ] Buat AuthController
- [ ] Setup routes (api.php)
- [ ] Configure CORS
- [ ] Jalankan seeder (UserSeeder)
- [ ] Test API endpoints dengan Postman/curl

### Frontend (Electron)

- [ ] Update baseUrl di DummyJSONClient.ts
- [ ] Test login dengan Laravel API
- [ ] Test token refresh
- [ ] Test get current user
- [ ] Test logout
- [ ] Verifikasi offline mode masih berfungsi

---

## 12. Testing dengan Postman

### Test Login

```http
POST https://your-erp-cloud.com/api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123",
  "expiresInMins": 60
}
```

### Test Refresh Token

```http
POST https://your-erp-cloud.com/api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token-from-login",
  "expiresInMins": 60
}
```

### Test Get Current User

```http
GET https://your-erp-cloud.com/api/auth/me
Authorization: Bearer your-access-token-from-login
```

### Test Logout

```http
POST https://your-erp-cloud.com/api/auth/logout
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

---

## 13. Security Considerations

### 13.1 JWT Secret

- Gunakan secret key minimal 32 karakter
- Gunakan environment variable, jangan hardcode
- Generate dengan: `php artisan key:generate` atau `openssl rand -base64 32`

### 13.2 Password Hashing

- Laravel menggunakan bcrypt secara default
- Pastikan password di-hash sebelum disimpan

### 13.3 HTTPS

- API harus menggunakan HTTPS di production
- Validasi SSL certificate

### 13.4 Rate Limiting

- Implement rate limiting untuk endpoint login
- Mencegah brute force attack

### 13.5 Token Expiry

- Access token: 60 menit (sesuai DummyJSON)
- Refresh token: 30 hari (dapat disesuaikan)

### 13.6 CORS

- Hanya allow origins yang terpercaya
- Production: restrict ke specific domains

---

## 14. Troubleshooting

### Error: "Invalid or expired token"

- Cek JWT_SECRET di .env
- Pastikan secret sama antara generate dan decode
- Cek token expiry

### Error: "CORS policy blocked"

- Cek config/cors.php
- Pastikan origin Electron ada di allowed_origins

### Error: "User not found or inactive"

- Pastikan user status = 'active'
- Cek database user sudah ada

---

## 15. Catatan Tambahan

1. **Laravel 12**: Pastikan kompatibilitas dengan versi Laravel yang digunakan
2. **Testing**: Buat unit tests dan feature tests untuk semua endpoint
3. **Documentation**: Update API documentation (Swagger/OpenAPI)
4. **Monitoring**: Implement logging dan monitoring untuk production
5. **Backup**: Backup database secara berkala
6. **Versioning**: Consider API versioning untuk future changes
