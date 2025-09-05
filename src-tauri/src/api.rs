use serde::{Deserialize, Serialize};
use reqwest::{Client, StatusCode};
use std::time::Duration;
use tauri::AppHandle;
use tauri_plugin_store::StoreBuilder;
use std::path::PathBuf;


const STORE_PATH: &str = "store.dat";
const KEY_ACCESS: &str = "access_token";
const KEY_REFRESH: &str = "refresh_token";


#[derive(Clone)]
pub struct Api {
    pub base: String,
    pub client: Client,
}

impl Api {
    pub fn new(base: String) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(15))
            .build()
            .unwrap();
        Self { base, client }
    }

    async fn tokens(app: &AppHandle) -> (Option<String>, Option<String>) {
        let store = match StoreBuilder::new(app, PathBuf::from(STORE_PATH)).build() {
            Ok(store) => store,
            Err(_) => return (None, None),
        };
        // synchronously reload from disk; ignore errors
        let _ = store.reload();
        let access = store
            .get(KEY_ACCESS)
            .and_then(|v| v.as_str().map(|s| s.to_string()));
        let refresh = store
            .get(KEY_REFRESH)
            .and_then(|v| v.as_str().map(|s| s.to_string()));
        (access, refresh)
    }

    /// Persist the provided access and refresh tokens to the local store.  If
    /// building the store fails (e.g. plugin not initialised) the request is
    /// silently ignored.
    async fn set_tokens(app: &AppHandle, access: &str, refresh: &str) {
        if let Ok(store) = StoreBuilder::new(app, PathBuf::from(STORE_PATH)).build() {
            let _ = store.reload();
            store.set(KEY_ACCESS, access);
            store.set(KEY_REFRESH, refresh);
            let _ = store.save();
        }
    }

    /// Perform a username/password login.  This helper posts to the
    /// `/api/v1/auth/login` endpoint and stores the returned access/refresh
    /// tokens on success.
    pub async fn login(
        &self,
        app: &AppHandle,
        user: &str,
        pass: &str,
    ) -> anyhow::Result<()> {
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct LoginReq<'a> {
            user_name: &'a str,
            user_password: &'a str,
        }
        #[derive(Deserialize)]
        struct LoginResp {
            code: i32,
            data: Option<AuthVo>,
        }
        #[derive(Deserialize)]
        struct AuthVo {
            #[serde(rename = "accessToken")]
            access_token: String,
            #[serde(rename = "refreshToken")]
            refresh_token: String,
        }

        let url = format!("{}/api/v1/auth/login", self.base);
        let resp = self
            .client
            .post(url)
            .json(&LoginReq {
                user_name: user,
                user_password: pass,
            })
            .send()
            .await?;
        if resp.status() != StatusCode::OK {
            anyhow::bail!("login http {}", resp.status());
        }
        let body: LoginResp = resp.json().await?;
        if let Some(d) = body.data {
            Self::set_tokens(app, &d.access_token, &d.refresh_token).await;
            Ok(())
        } else {
            anyhow::bail!("login empty data");
        }
    }

    /// Perform an authenticated GET request.  The request will include a
    /// bearer token if one is available.  If the server responds with
    /// `401 Unauthorized` and a refresh token exists, a refresh will be
    /// attempted automatically and the request retried once.
    pub async fn auth_get<T: for<'de> Deserialize<'de>>(
        &self,
        app: &AppHandle,
        path: &str,
    ) -> anyhow::Result<T> {
        let (mut access, refresh) = Self::tokens(app).await;
        let url = format!("{}{}", self.base, path);
        let mut req = self.client.get(&url);
        if let Some(a) = &access {
            req = req.bearer_auth(a);
        }
        let mut resp = req.send().await?;
        if resp.status() == StatusCode::UNAUTHORIZED {
            if let Some(r) = refresh {
                let rurl = format!("{}/api/v1/auth/refresh", self.base);
                #[derive(Serialize)]
                struct R<'a> {
                    #[serde(rename = "refreshToken")]
                    refresh_token: &'a str,
                }
                #[derive(Deserialize)]
                struct RR {
                    code: i32,
                    data: Option<AuthVo>,
                }
                #[derive(Deserialize)]
                struct AuthVo {
                    #[serde(rename = "accessToken")]
                    access_token: String,
                    #[serde(rename = "refreshToken")]
                    refresh_token: String,
                }
                let rresp = self
                    .client
                    .post(rurl)
                    .json(&R {
                        refresh_token: &r,
                    })
                    .send()
                    .await?;
                if rresp.status() == StatusCode::OK {
                    if let Ok(RR { data: Some(d), .. }) = rresp.json().await {
                        Self::set_tokens(app, &d.access_token, &d.refresh_token).await;
                        access = Some(d.access_token);
                    }
                }
                let mut req2 = self.client.get(&url);
                if let Some(a) = &access {
                    req2 = req2.bearer_auth(a);
                }
                resp = req2.send().await?;
            }
        }
        if resp.status() != StatusCode::OK {
            anyhow::bail!("get http {}", resp.status());
        }
        Ok(resp.json::<T>().await?)
    }

    /// Perform an authenticated POST request.  The request will include a
    /// bearer token if one is available.  If the server responds with
    /// `401 Unauthorized` and a refresh token exists, a refresh will be
    /// attempted automatically and the request retried once.
    pub async fn auth_post<B: Serialize, T: for<'de> Deserialize<'de>>(
        &self,
        app: &AppHandle,
        path: &str,
        body: &B,
    ) -> anyhow::Result<T> {
        let (mut access, refresh) = Self::tokens(app).await;
        let url = format!("{}{}", self.base, path);
        let mut req = self.client.post(&url);
        if let Some(a) = &access {
            req = req.bearer_auth(a);
        }
        let mut resp = req.json(body).send().await?;
        if resp.status() == StatusCode::UNAUTHORIZED {
            if let Some(r) = refresh {
                let rurl = format!("{}/api/v1/auth/refresh", self.base);
                #[derive(Serialize)]
                struct R<'a> {
                    #[serde(rename = "refreshToken")]
                    refresh_token: &'a str,
                }
                #[derive(Deserialize)]
                struct RR {
                    code: i32,
                    data: Option<AuthVo>,
                }
                #[derive(Deserialize)]
                struct AuthVo {
                    #[serde(rename = "accessToken")]
                    access_token: String,
                    #[serde(rename = "refreshToken")]
                    refresh_token: String,
                }
                let rresp = self
                    .client
                    .post(rurl)
                    .json(&R {
                        refresh_token: &r,
                    })
                    .send()
                    .await?;
                if rresp.status() == StatusCode::OK {
                    if let Ok(RR { data: Some(d), .. }) = rresp.json().await {
                        Self::set_tokens(app, &d.access_token, &d.refresh_token).await;
                        access = Some(d.access_token);
                    }
                }
                let mut req2 = self.client.post(&url);
                if let Some(a) = &access {
                    req2 = req2.bearer_auth(a);
                }
                resp = req2.json(body).send().await?;
            }
        }
        if resp.status() != StatusCode::OK {
            anyhow::bail!("post http {}", resp.status());
        }
        Ok(resp.json::<T>().await?)
    }
}

/// A high‑level API client used by the Tauri commands.  This wrapper reads
/// the backend base URL from the `API_BASE_URL` environment variable (falling
/// back to an empty string) and exposes login, registration and code
/// operations that return strongly‑typed model structs or `AppError`s.
pub struct ApiClient {
    api: Api,
}

impl ApiClient {
    /// Construct a new `ApiClient` using the `API_BASE_URL` environment
    /// variable as the backend base URL.  If the variable is unset the base
    /// defaults to an empty string, meaning relative paths will be used.
    pub fn new() -> Self {
        let base = std::env::var("API_BASE_URL").unwrap_or_default();
        Self {
            api: Api::new(base),
        }
    }

    /// Log in with an email and password.  On success the server returns a
    /// `UserLoginVO` which may contain a token used for subsequent
    /// authenticated requests.  Network and deserialisation failures are
    /// converted into appropriate `AppError` variants.
    pub async fn login(
        &self,
        payload: &crate::models::UserLoginDTO,
    ) -> Result<crate::models::UserLoginVO, crate::error::AppError> {
        use crate::models::ApiResponse;
        let url = format!("{}/api/v1/auth/login", self.api.base);
        let resp = self
            .api
            .client
            .post(&url)
            .json(payload)
            .send()
            .await
            .map_err(|_| crate::error::AppError::NetworkError)?;
        let status = resp.status();
        let body: ApiResponse<crate::models::UserLoginVO> = resp
            .json()
            .await
            .map_err(|_| crate::error::AppError::JsonParseError)?;
        if status != StatusCode::OK {
            return Err(crate::error::AppError::from_api_code(
                status.as_u16() as i32,
            ));
        }
        body.data.ok_or_else(|| {
            crate::error::AppError::ApiError(format!("No data: {}", body.message))
        })
    }

    /// Log in with an email verification code.  The code is posted to
    /// `/api/v1/auth/login-by-code` and the resulting `UserLoginVO` is
    /// returned on success.
    pub async fn login_by_code(
        &self,
        payload: &crate::models::EmailCodeLoginDTO,
    ) -> Result<crate::models::UserLoginVO, crate::error::AppError> {
        use crate::models::ApiResponse;
        let url = format!("{}/api/v1/auth/login-by-code", self.api.base);
        let resp = self
            .api
            .client
            .post(&url)
            .json(payload)
            .send()
            .await
            .map_err(|_| crate::error::AppError::NetworkError)?;
        let status = resp.status();
        let body: ApiResponse<crate::models::UserLoginVO> = resp
            .json()
            .await
            .map_err(|_| crate::error::AppError::JsonParseError)?;
        if status != StatusCode::OK {
            return Err(crate::error::AppError::from_api_code(
                status.as_u16() as i32,
            ));
        }
        body.data.ok_or_else(|| {
            crate::error::AppError::ApiError(format!("No data: {}", body.message))
        })
    }

    /// Register a new user.  Posts the `UserRegisterDTO` to the
    /// `/api/v1/auth/register` endpoint and returns the resulting
    /// `UserLoginVO`.  All errors are mapped into `AppError`s.
    pub async fn register(
        &self,
        payload: &crate::models::UserRegisterDTO,
    ) -> Result<crate::models::UserLoginVO, crate::error::AppError> {
        use crate::models::ApiResponse;
        let url = format!("{}/api/v1/auth/register", self.api.base);
        let resp = self
            .api
            .client
            .post(&url)
            .json(payload)
            .send()
            .await
            .map_err(|_| crate::error::AppError::NetworkError)?;
        let status = resp.status();
        let body: ApiResponse<crate::models::UserLoginVO> = resp
            .json()
            .await
            .map_err(|_| crate::error::AppError::JsonParseError)?;
        if status != StatusCode::OK {
            return Err(crate::error::AppError::from_api_code(
                status.as_u16() as i32,
            ));
        }
        body.data.ok_or_else(|| {
            crate::error::AppError::ApiError(format!("No data: {}", body.message))
        })
    }

    /// Send a verification code to the specified email.  Returns `Ok(())` on
    /// success.  The API response is deserialised into a generic
    /// `ApiResponse` with a `serde_json::Value` payload because the data
    /// content is irrelevant for this call.
    pub async fn send_code(
        &self,
        payload: &crate::models::SendCodeDTO,
    ) -> Result<(), crate::error::AppError> {
        use crate::models::ApiResponse;
        let url = format!("{}/api/v1/auth/send-code", self.api.base);
        let resp = self
            .api
            .client
            .post(&url)
            .json(payload)
            .send()
            .await
            .map_err(|_| crate::error::AppError::NetworkError)?;
        let status = resp.status();
        let body: ApiResponse<serde_json::Value> = resp
            .json()
            .await
            .map_err(|_| crate::error::AppError::JsonParseError)?;
        if status != StatusCode::OK {
            return Err(crate::error::AppError::from_api_code(
                status.as_u16() as i32,
            ));
        }
        if body.code == 0 {
            Ok(())
        } else {
            Err(crate::error::AppError::ApiError(format!(
                "code {}: {}",
                body.code, body.message
            )))
        }
    }
}
