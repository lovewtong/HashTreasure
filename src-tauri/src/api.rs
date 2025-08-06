use tauri::{AppHandle, State, Manager};
use tauri_plugin_store::{Store, StoreBuilder};
use std::path::PathBuf;
use crate::models::{UserLoginDTO, ApiResponse, UserLoginVO};
use crate::error::AppError;

const API_BASE_URL: &str = "https://suanlibao.xyz"; // 请替换为您的 API Base URL

/// 登录命令，由前端调用
#[tauri::command]
pub async fn login(app: AppHandle, username: String, password: String) -> Result<String, AppError> {
    log::info!("Attempting to login for user: {}", username);

    let client = reqwest::Client::new();
    let login_payload = UserLoginDTO {
        userName: username.clone(),
        userPassword: password,
    };

    let res = client
        .post(format!("{}/api/v1/user/login", API_BASE_URL))
        .json(&login_payload)
        .send()
        .await
        .map_err(|e| {
            log::error!("Network request failed: {}", e);
            AppError::NetworkError
        })?;

    if res.status().is_success() {
        let api_response = res.json::<ApiResponse<UserLoginVO>>().await.map_err(|e| {
            log::error!("Failed to parse login response: {}", e);
            AppError::JsonParseError
        })?;

        if api_response.code == 0 {
            if let Some(token) = api_response.data.and_then(|d| d.token) {
                log::info!("Login successful for user: {}", username);
                // 存储 token
                save_token(&app, &token)?;
                Ok("Login successful".to_string())
            } else {
                log::warn!("Login API success, but no token in response for user: {}", username);
                Err(AppError::ApiError("登录成功但未返回Token".to_string()))
            }
        } else {
            log::warn!("Login failed for user: {}. API Code: {}, Message: {}", username, api_response.code, api_response.message);
            // 根据错误码映射本地化提示
            Err(AppError::from_api_code(api_response.code))
        }
    } else {
        let status = res.status();
        let error_body = res.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        log::error!("Login API returned non-success status: {}. Body: {}", status, error_body);
        Err(AppError::ApiError(format!("服务器错误: {}", status)))
    }
}

/// 从本地存储中获取 Token
#[tauri::command]
pub async fn get_auth_token(app: AppHandle) -> Result<Option<String>, AppError> {
    let mut store = get_store(app)?;
    if let Some(token_value) = store.get("auth_token") {
        Ok(Some(token_value.as_str().unwrap().to_string()))
    } else {
        Ok(None)
    }
}


/// 获取持久化存储实例
fn get_store(app: AppHandle) -> Result<Store, AppError> {
    let path = app.path_resolver()
        .app_config_dir()
        .ok_or(AppError::PathError)?
        .join("store.json");
    StoreBuilder::new(app, path).build().map_err(|_| AppError::StoreError)
}

/// 保存 Token 到本地
fn save_token(app: &AppHandle, token: &str) -> Result<(), AppError> {
    let mut store = get_store(app.clone())?;
    store.insert("auth_token".to_string(), serde_json::Value::String(token.to_string()))
         .map_err(|_| AppError::StoreError)?;
    store.save().map_err(|_| AppError::StoreError)
}


/// 【新增】邮箱验证码登录命令
#[tauri::command]
pub async fn login_by_code(app: AppHandle, email: String, code: String) -> Result<String, AppError> {
    log::info!("Attempting to login with code for email: {}", email);

    let client = reqwest::Client::new();
    let payload = EmailCodeLoginDTO {
        email: email.clone(),
        code,
    };

    let res = client
        .post(format!("{}/api/v1/user/login-by-code", API_BASE_URL))
        .json(&payload)
        .send()
        .await
        .map_err(|_| AppError::NetworkError)?;
    
    if res.status().is_success() {
        let api_response = res.json::<ApiResponse<UserLoginVO>>().await.map_err(|_| AppError::JsonParseError)?;
        if api_response.code == 0 {
            if let Some(token) = api_response.data.and_then(|d| d.token) {
                log::info!("Login with code successful for email: {}", email);
                save_token(&app, &token)?;
                Ok("Login successful".to_string())
            } else {
                Err(AppError::ApiError("登录成功但未返回Token".to_string()))
            }
        } else {
            Err(AppError::from_api_code(api_response.code))
        }
    } else {
        Err(AppError::ApiError("服务器错误".to_string()))
    }
}


#[tauri::command]
pub async fn login(app: AppHandle, username: String, password: String) -> Result<String, AppError> {
    log::info!("Attempting to login for user: {}", username);

    let client = reqwest::Client::new();
    let login_payload = UserLoginDTO {
        userName: username.clone(),
        userPassword: password,
    };

    let res = client
        .post(format!("{}/api/v1/user/login", API_BASE_URL))
        .json(&login_payload)
        .send()
        .await
        .map_err(|e| {
            log::error!("Network request failed: {}", e);
            AppError::NetworkError
        })?;

    if res.status().is_success() {
        let api_response = res.json::<ApiResponse<UserLoginVO>>().await.map_err(|e| {
            log::error!("Failed to parse login response: {}", e);
            AppError::JsonParseError
        })?;

        if api_response.code == 0 {
            if let Some(token) = api_response.data.and_then(|d| d.token) {
                log::info!("Login successful for user: {}", username);
                save_token(&app, &token)?;
                Ok("Login successful".to_string())
            } else {
                log::warn!("Login API success, but no token in response for user: {}", username);
                Err(AppError::ApiError("登录成功但未返回Token".to_string()))
            }
        } else {
            log::warn!("Login failed for user: {}. API Code: {}, Message: {}", username, api_response.message);
            Err(AppError::from_api_code(api_response.code))
        }
    } else {
        let status = res.status();
        let error_body = res.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        log::error!("Login API returned non-success status: {}. Body: {}", status, error_body);
        Err(AppError::ApiError(format!("服务器错误: {}", status)))
    }
}

#[tauri::command]
pub async fn register(app: AppHandle, username: String, password: String, email: String, code: String) -> Result<String, AppError> {
    log::info!("Attempting to register new user: {}", username);

    let client = reqwest::Client::new();
    let payload = UserRegisterDTO {
        user_name: username.clone(),
        user_password: password,
        email: email.clone(),
        code,
        reg_into: "client".to_string(), // 标记注册来源为客户端
    };

    let res = client
        .post(format!("{}/api/v1/user/register", API_BASE_URL))
        .json(&payload)
        .send()
        .await
        .map_err(|_| AppError::NetworkError)?;

    if res.status().is_success() {
        let api_response = res.json::<ApiResponse<UserLoginVO>>().await.map_err(|_| AppError::JsonParseError)?;
        if api_response.code == 0 {
            if let Some(token) = api_response.data.and_then(|d| d.token) {
                log::info!("Registration and login successful for user: {}", username);
                save_token(&app, &token)?;
                Ok("Registration successful".to_string())
            } else {
                Err(AppError::ApiError("注册成功但未返回Token".to_string()))
            }
        } else {
            log::warn!("Registration failed for {}. API Code: {}, Message: {}", username, api_response.code, api_response.message);
            Err(AppError::ApiError(api_response.message))
        }
    } else {
        Err(AppError::ApiError("服务器错误".to_string()))
    }
}

/// 从本地存储中获取 Token
#[tauri::command]
pub async fn get_auth_token(app: AppHandle) -> Result<Option<String>, AppError> {
    let mut store = get_store(app)?;
    if let Some(token_value) = store.get("auth_token") {
        Ok(Some(token_value.as_str().unwrap().to_string()))
    } else {
        Ok(None)
    }
}

/// 【新增】登出命令
#[tauri::command]
pub async fn logout(app: AppHandle) -> Result<(), AppError> {
    log::info!("User logging out");
    remove_token(&app)?;
    Ok(())
}

/// 获取持久化存储实例
fn get_store(app: AppHandle) -> Result<Store, AppError> {
    let path = app.path_resolver()
        .app_config_dir()
        .ok_or(AppError::PathError)?
        .join("store.json");
    StoreBuilder::new(app, path).build().map_err(|_| AppError::StoreError)
}

/// 保存 Token 到本地
fn save_token(app: &AppHandle, token: &str) -> Result<(), AppError> {
    let mut store = get_store(app.clone())?;
    store.insert("auth_token".to_string(), serde_json::Value::String(token.to_string()))
         .map_err(|_| AppError::StoreError)?;
    store.save().map_err(|_| AppError::StoreError)
}

/// 【新增】移除 Token 的辅助函数
fn remove_token(app: &AppHandle) -> Result<(), AppError> {
    let mut store = get_store(app.clone())?;
    store.delete("auth_token".to_string()).map_err(|_| AppError::StoreError)?;
    store.save().map_err(|_| AppError::StoreError)
}