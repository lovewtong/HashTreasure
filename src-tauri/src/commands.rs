// src-tauri/src/commands.rs

use crate::api::ApiClient;
use crate::error::AppError;
use crate::models::{EmailCodeLoginDTO, SendCodeDTO, UserLoginDTO, UserLoginVO, UserRegisterDTO};
use std::path::PathBuf;
use tauri::{AppHandle, State};
use tauri_plugin_store::StoreBuilder;

const STORE_PATH: &str = "store.dat";

fn get_token_from_store(app: &AppHandle) -> Result<String, AppError> {
    let path = PathBuf::from(STORE_PATH);
    let store = StoreBuilder::new(app, path).build()?;
    match store.get("auth_token") {
        Some(token_value) if token_value.is_string() => {
            Ok(token_value.as_str().unwrap().to_string())
        }
        _ => Err(AppError::ApiError("Not logged in".to_string())),
    }
}

fn save_token(app: &AppHandle, token: &str) -> Result<(), AppError> {
    let path = PathBuf::from(STORE_PATH);
    let mut store = StoreBuilder::new(app, path).build()?;
    let token_value = serde_json::Value::String(token.to_string());
    store.set("auth_token".to_string(), token_value);
    store.save()?;
    Ok(())
}

fn remove_token(app: &AppHandle) -> Result<(), AppError> {
    let path = PathBuf::from(STORE_PATH);
    let mut store = StoreBuilder::new(app, path).build()?;
    store.delete("auth_token".to_string());
    store.save()?;
    Ok(())
}

#[tauri::command]
pub async fn login(
    // --- MODIFIED: Changed `username` to `email` for clarity ---
    email: String,
    password: String,
    app: AppHandle,
    api_client: State<'_, ApiClient>,
) -> Result<String, AppError> {
    log::info!("Attempting to login for user: {}", email);
    let payload = UserLoginDTO {
        // The API expects a `userName` field, which we populate with the email.
        email: email,
        userPassword: password,
    };
    let response: UserLoginVO = api_client.login(&payload).await?;
    if let Some(token) = response.token {
        save_token(&app, &token)?;
        Ok("Login successful".to_string())
    } else {
        Err(AppError::ApiError(
            "Login success but no token received".to_string(),
        ))
    }
}

#[tauri::command]
pub async fn login_by_code(
    email: String,
    code: String,
    app: AppHandle,
    api_client: State<'_, ApiClient>,
) -> Result<String, AppError> {
    log::info!("Attempting to login with code for email: {}", email);
    let payload = EmailCodeLoginDTO { email, code };
    let response: UserLoginVO = api_client.login_by_code(&payload).await?;
    if let Some(token) = response.token {
        save_token(&app, &token)?;
        Ok("Login with code successful".to_string())
    } else {
        Err(AppError::ApiError(
            "Login success but no token received".to_string(),
        ))
    }
}

#[tauri::command]
pub async fn register(
    username: String,
    password: String,
    email: String,
    code: String,
    alipay_phone: Option<String>,
    alipay_name: Option<String>,
    invite_code: Option<String>,
    phone: Option<String>,
    app: AppHandle,
    api_client: State<'_, ApiClient>,
) -> Result<String, AppError> {
    log::info!("Attempting to register new user: {}", username);
    let payload = UserRegisterDTO {
        user_name: username,
        user_password: password,
        email: email,
        code,
        reg_into: "client".to_string(),
        alipay_phone,
        alipay_name,
        invite_code,
        phone,
    };
    let response: UserLoginVO = api_client.register(&payload).await?;
    if let Some(token) = response.token {
        save_token(&app, &token)?;
        Ok("Registration successful".to_string())
    } else {
        Err(AppError::ApiError(
            "Register success but no token received".to_string(),
        ))
    }
}

#[tauri::command]
pub async fn send_code(
    email: String,
    r#type: String,
    api_client: State<'_, ApiClient>,
) -> Result<(), AppError> {
    log::info!("Sending code to email: {}", email);
    let payload = SendCodeDTO { email, r#type };
    api_client.send_code(&payload).await
}

#[tauri::command]
pub async fn get_auth_token(app: AppHandle) -> Result<Option<String>, AppError> {
    Ok(get_token_from_store(&app).ok())
}

#[tauri::command]
pub async fn logout(app: AppHandle) -> Result<(), AppError> {
    log::info!("User logging out");
    remove_token(&app)
}
