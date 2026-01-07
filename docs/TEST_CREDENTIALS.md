# Testing Credentials

## Local Users (Recommended for Testing)

Local users tersimpan di database lokal dengan password yang di-hash menggunakan SHA256. Gunakan credentials ini untuk testing fitur-fitur aplikasi.

### Primary Test Accounts

| Username   | Password    | Role       | Permissions                                        |
| ---------- | ----------- | ---------- | -------------------------------------------------- |
| superadmin | password123 | SUPERADMIN | Full access - semua fitur                          |
| checker1   | checker123  | CHECKER    | Dashboard, Create/View Transaction, Verify Payment |
| loader1    | loader123   | LOADER     | Dashboard, View Loader Queue, Update Status        |

### Testing by Role

**SUPERADMIN (superadmin / password123)**

- ✅ Full system access
- ✅ Manage Users, Roles, Items
- ✅ View Reports
- ✅ All transaction operations

**CHECKER (checker1 / checker123)**

- ✅ View Dashboard
- ✅ Create Transaction
- ✅ View Transaction
- ✅ Verify Payment
- ❌ Cannot manage users/roles

**LOADER (loader1 / loader123)**

- ✅ View Dashboard
- ✅ View Loader Queue
- ✅ Update Loader Status
- ❌ Cannot create transactions or manage users

---

## DummyJSON API Users (Optional)

The application juga supports DummyJSON API untuk authentication testing. User ini otomatis ter-assign role di database lokal.

### DummyJSON Test Accounts

| Username | Password     | Full Name        | Email                            | Local Role |
| -------- | ------------ | ---------------- | -------------------------------- | ---------- |
| emilys   | emilyspass   | Emily Johnson    | emily.johnson@x.dummyjson.com    | CHECKER    |
| michaelw | michaelwpass | Michael Williams | michael.williams@x.dummyjson.com | -          |
| sophiab  | sophiabpass  | Sophia Brown     | sophia.brown@x.dummyjson.com     | LOADER     |
| jamesd   | jamesdpass   | James Davis      | james.davis@x.dummyjson.com      | inactive   |
| emmaw    | emmawpass    | Emma Wilson      | emma.wilson@x.dummyjson.com      | -          |

---

## Testing Scenarios

### 1. Successful Login

- Use any of the credentials above
- Should successfully authenticate and show main app
- User profile should display in header

### 2. Failed Login

- Use any incorrect credentials
- Example: username `test` with password `wrong`
- Should show error message: "Login gagal"

### 3. Network Offline Login

- Login successfully first with valid credentials
- Close application
- Disable network connection
- Reopen application
- Should remain logged in and work offline

### 4. Token Refresh

- Login successfully
- Wait 60+ minutes (or manually expire token in database)
- Make any authenticated request
- Token should automatically refresh if online

## API Endpoints

All authentication requests go to DummyJSON API:

**Base URL:** `https://dummyjson.com`

**Login Endpoint:**

```
POST /auth/login
Body: { username, password, expiresInMins: 60 }
Response: { id, username, email, firstName, lastName, accessToken, refreshToken }
```

**Get Current User:**

```
GET /auth/me
Headers: { Authorization: Bearer {token} }
Response: User profile data
```

**Refresh Token:**

```
POST /auth/refresh
Body: { refreshToken, expiresInMins: 60 }
Response: { accessToken, refreshToken }
```

## Test User Limitations

**Important Notes:**

1. **Dummy Data:** These are test users only - not real accounts
2. **No Persistence:** Data resets on DummyJSON server periodically
3. **Shared Access:** Multiple testers may use same credentials
4. **No Modification:** User profiles cannot be modified
5. **API Rate Limits:** DummyJSON may have rate limiting

## Creating Additional Test Users

DummyJSON provides a fixed set of users. You cannot create new users.

To see all available users:

```
GET https://dummyjson.com/users
```

## Documentation Links

- **DummyJSON Auth Docs:** https://dummyjson.com/docs/auth
- **DummyJSON Users:** https://dummyjson.com/docs/users
- **API Playground:** https://dummyjson.com/docs

## Troubleshooting Test Credentials

### Issue: Credentials not working

**Possible causes:**

- DummyJSON API is down
- Network connectivity issues
- Credentials were mistyped

**Solution:**

- Verify you're online
- Check API status at https://dummyjson.com
- Copy-paste credentials to avoid typos

### Issue: Token expired immediately

**Possible causes:**

- System clock incorrect
- Network latency issues

**Solution:**

- Check system date/time settings
- Try login again

## Switching to Production

When replacing with Laravel backend:

1. Update `DummyJSONClient.ts` baseUrl
2. Update login endpoint paths if different
3. Update test credentials documentation
4. Remove DummyJSON references from UI
5. Test with real user accounts

---

**Last Updated:** 2026-01-03  
**API Version:** DummyJSON v1  
**Total Test Users:** 208 users available
