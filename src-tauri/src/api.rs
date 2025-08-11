// src-tauri/src/api.rs

use crate::error::AppError;
use crate::models::{ApiResponse, UserLoginVO};
use reqwest::{Client, Response};
use serde::de::DeserializeOwned;
use serde::Serialize;

const API_BASE_URL: &str = "https://suanlibao.xyz"; // 你的 API 地址

#[derive(Debug)]
pub struct ApiClient {
    client: Client,
}

impl ApiClient {
    pub fn new() -> Self {
        ApiClient {
            client: Client::new(),
        }
    }

    async fn handle_response<T: DeserializeOwned>(
        &self,
        response: Response,
    ) -> Result<T, AppError> {
        let status = response.status();
        if status.is_success() {
            let api_response = response.json::<ApiResponse<T>>().await.map_err(|e| {
                log::error!("Failed to parse response JSON: {}", e);
                AppError::JsonParseError
            })?;

            if api_response.code == 0 {
                match api_response.data {
                    Some(data) => Ok(data),
                    None => {
                        log::error!("API success code, but data is null.");
                        Err(AppError::ApiError("Response data is null".to_string()))
                    }
                }
            } else {
                log::warn!("API returned an error. Code: {}, Message: {}", api_response.code, api_response.message);
                Err(AppError::from_api_code(api_response.code))
            }
        } else {
            let error_body = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            log::error!("HTTP request failed with status: {}. Body: {}", status, error_body);
            Err(AppError::NetworkError)
        }
    }

    async fn post<T: Serialize, R: DeserializeOwned>(
        &self,
        path: &str,
        body: &T,
    ) -> Result<R, AppError> {
        let response = self
            .client
            .post(format!("{}{}", API_BASE_URL, path))
            .json(body)
            .send()
            .await
            .map_err(|_| AppError::NetworkError)?;

        self.handle_response(response).await
    }

    // 具体的 API 调用实现
    pub async fn login(&self, body: &impl Serialize) -> Result<UserLoginVO, AppError> {
        self.post("/api/v1/user/login", body).await
    }

    pub async fn login_by_code(&self, body: &impl Serialize) -> Result<UserLoginVO, AppError> {
        self.post("/api/v1/user/login-by-code", body).await
    }

    pub async fn register(&self, body: &impl Serialize) -> Result<UserLoginVO, AppError> {
        self.post("/api/v1/user/register", body).await
    }

    pub async fn send_code(&self, body: &impl Serialize) -> Result<(), AppError> {
        self.post("/api/v1/user/send-code", body).await
    }
}
