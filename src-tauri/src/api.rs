// src-tauri/src/api.rs

use crate::error::AppError;
use crate::models::{ApiResponse, UserLoginVO};
use reqwest::{Client, Response};
use serde::de::DeserializeOwned;
use serde::Serialize;

const API_BASE_URL: &str = "http://suanlibao.xyz:8080";

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
        let response_text = response.text().await.map_err(|_| AppError::NetworkError)?;
        
        log::info!("<-- Response Status: {}, Body: {}", status, response_text);

        if status.is_success() {
            let api_response = serde_json::from_str::<ApiResponse<T>>(&response_text).map_err(|e| {
                log::error!("Failed to parse response JSON: {}", e);
                AppError::JsonParseError
            })?;

            // --- MODIFIED: Check for success code 200 instead of 0 ---
            if api_response.code == 200 {
                match api_response.data {
                    Some(data) => Ok(data),
                    None => {
                         Err(AppError::ApiError("Response data is null on successful status".to_string()))
                    }
                }
            } else {
                log::warn!("API returned a business error. Code: {}, Message: {}", api_response.code, api_response.message);
                // We can use the message from the API directly.
                Err(AppError::ApiError(api_response.message))
            }
        } else {
             match serde_json::from_str::<ApiResponse<()>>(&response_text) {
                Ok(api_response) => Err(AppError::ApiError(api_response.message)),
                Err(_) => Err(AppError::NetworkError),
            }
        }
    }

    // A special handler for send_code which might not have a `data` field on success
    async fn handle_send_code_response(&self, response: Response) -> Result<(), AppError> {
        let status = response.status();
        let response_text = response.text().await.map_err(|_| AppError::NetworkError)?;
        log::info!("<-- send_code Response Status: {}, Body: {}", status, response_text);

        if status.is_success() {
            let api_response = serde_json::from_str::<ApiResponse<serde_json::Value>>(&response_text).map_err(|e| {
                log::error!("Failed to parse send_code response JSON: {}", e);
                AppError::JsonParseError
            })?;

            // --- MODIFIED: Check for success code 200 instead of 0 ---
            if api_response.code == 200 {
                Ok(()) // Business success, no data needed.
            } else {
                Err(AppError::ApiError(api_response.message))
            }
        } else {
             match serde_json::from_str::<ApiResponse<()>>(&response_text) {
                Ok(api_response) => Err(AppError::ApiError(api_response.message)),
                Err(_) => Err(AppError::NetworkError),
            }
        }
    }


    async fn post<T: Serialize, R: DeserializeOwned>(
        &self,
        path: &str,
        body: &T,
    ) -> Result<R, AppError> {
        let url = format!("{}{}", API_BASE_URL, path);
        
        let body_str = serde_json::to_string_pretty(body)
            .unwrap_or_else(|_| "Failed to serialize body".to_string());

        log::info!("--> POST {}", &url);
        log::info!("    Body: {}", &body_str);

        let response = self
            .client
            .post(&url)
            .header("User-Agent", "Apifox/1.0.0 (http://apifox.com)")
            .header("Accept", "*/*")
            .json(body)
            .send()
            .await
            .map_err(|e| {
                log::error!("POST request to {} failed: {}", &url, e);
                AppError::NetworkError
            })?;

        self.handle_response(response).await
    }

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
        let url = format!("{}{}", API_BASE_URL, "/api/v1/user/send-code");

        let body_str = serde_json::to_string_pretty(body)
            .unwrap_or_else(|_| "Failed to serialize body".to_string());
        
        log::info!("--> POST {}", &url);
        log::info!("    Body: {}", &body_str);

        let response = self
            .client
            .post(&url)
            .header("Accept", "*/*")
            .json(body)
            .send()
            .await
            .map_err(|e| {
                log::error!("POST request (send_code) to {} failed: {}", &url, e);
                AppError::NetworkError
            })?;

        self.handle_send_code_response(response).await
    }
}
