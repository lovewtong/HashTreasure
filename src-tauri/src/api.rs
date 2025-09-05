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
        let mut store = StoreBuilder::new(app, PathBuf::from(STORE_PATH)).build();
        store.load().await.ok();
        let access = store.get(KEY_ACCESS).and_then(|v| v.as_str().map(|s| s.to_string()));
        let refresh = store.get(KEY_REFRESH).and_then(|v| v.as_str().map(|s| s.to_string()));
        (access, refresh)
    }

    async fn set_tokens(app: &AppHandle, access: &str, refresh: &str) {
        let mut store = StoreBuilder::new(app, PathBuf::from(STORE_PATH)).build();
        store.load().await.ok();
        store.set(KEY_ACCESS, access);
        store.set(KEY_REFRESH, refresh);
        let _ = store.save().await;
    }

    pub async fn login(&self, app: &AppHandle, user: &str, pass: &str) -> anyhow::Result<()> {
        #[derive(Serialize)]
        struct LoginReq<'a> { userName: &'a str, userPassword: &'a str }
        #[derive(Deserialize)]
        struct LoginResp { code: i32, data: Option<AuthVo> }
        #[derive(Deserialize)]
        struct AuthVo { accessToken: String, refreshToken: String }

        let url = format!("{}/api/v1/auth/login", self.base);
        let resp = self.client.post(url)
            .json(&LoginReq{ userName: user, userPassword: pass })
            .send().await?;
        if resp.status() != StatusCode::OK { anyhow::bail!("login http {}", resp.status()); }
        let body: LoginResp = resp.json().await?;
        if let Some(d) = body.data { Self::set_tokens(app, &d.accessToken, &d.refreshToken).await; Ok(()) } else { anyhow::bail!("login empty data") }
    }

    pub async fn auth_get<T: for<'de> Deserialize<'de>>(&self, app: &AppHandle, path: &str) -> anyhow::Result<T> {
        let (mut access, refresh) = Self::tokens(app).await;
        let url = format!("{}{}", self.base, path);
        let mut req = self.client.get(&url);
        if let Some(a) = &access { req = req.bearer_auth(a); }
        let mut resp = req.send().await?;
        if resp.status() == StatusCode::UNAUTHORIZED {
            if let Some(r) = refresh {
                let rurl = format!("{}/api/v1/auth/refresh", self.base);
                #[derive(Serialize)] struct R<'a>{ refreshToken: &'a str }
                #[derive(Deserialize)] struct RR{ code: i32, data: Option<AuthVo> }
                #[derive(Deserialize)] struct AuthVo{ accessToken: String, refreshToken: String }
                let rresp = self.client.post(rurl).json(&R{ refreshToken: &r }).send().await?;
                if rresp.status() == StatusCode::OK {
                    if let Ok(RR{ data: Some(d), .. }) = rresp.json().await { Self::set_tokens(app, &d.accessToken, &d.refreshToken).await; access = Some(d.accessToken); }
                }
                let mut req2 = self.client.get(&url);
                if let Some(a) = &access { req2 = req2.bearer_auth(a); }
                resp = req2.send().await?;
            }
        }
        if resp.status() != StatusCode::OK { anyhow::bail!("get http {}", resp.status()); }
        Ok(resp.json::<T>().await?)
    }

    pub async fn auth_post<B: Serialize, T: for<'de> Deserialize<'de>>(&self, app: &AppHandle, path: &str, body: &B) -> anyhow::Result<T> {
        let (mut access, refresh) = Self::tokens(app).await;
        let url = format!("{}{}", self.base, path);
        let mut req = self.client.post(&url);
        if let Some(a) = &access { req = req.bearer_auth(a); }
        let mut resp = req.json(body).send().await?;
        if resp.status() == StatusCode::UNAUTHORIZED {
            if let Some(r) = refresh {
                let rurl = format!("{}/api/v1/auth/refresh", self.base);
                #[derive(Serialize)] struct R<'a>{ refreshToken: &'a str }
                #[derive(Deserialize)] struct RR{ code: i32, data: Option<AuthVo> }
                #[derive(Deserialize)] struct AuthVo{ accessToken: String, refreshToken: String }
                let rresp = self.client.post(rurl).json(&R{ refreshToken: &r }).send().await?;
                if rresp.status() == StatusCode::OK {
                    if let Ok(RR{ data: Some(d), .. }) = rresp.json().await { Self::set_tokens(app, &d.accessToken, &d.refreshToken).await; access = Some(d.accessToken); }
                }
                let mut req2 = self.client.post(&url);
                if let Some(a) = &access { req2 = req2.bearer_auth(a); }
                resp = req2.json(body).send().await?;
            }
        }
        if resp.status() != StatusCode::OK { anyhow::bail!("post http {}", resp.status()); }
        Ok(resp.json::<T>().await?)
    }
}
