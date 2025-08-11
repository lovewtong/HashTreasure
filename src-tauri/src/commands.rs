// src-tauri/src/commands.rs

use crate::api::ApiClient;
use crate::error::AppError;
use crate::models::{EmailCodeLoginDTO, SendCodeDTO, UserLoginDTO, UserLoginVO, UserRegisterDTO};
use serde_json::Value;
use tauri::{State, Wry};
use tauri_plugin_store::Store;

// 辅助函数：从 store 中获取 token。
// 只需要不可变引用 &Store<Wry>。
fn get_token_from_store(store: &Store<Wry>) -> Result<String, AppError> {
    match store.get("auth_token") {
        Some(token_value) if token_value.is_string() => {
            Ok(token_value.as_str().unwrap().to_string())
        }
        _ => Err(AppError::ApiError("Not logged in".to_string())),
    }
}

// 辅助函数：保存 token。
// 只需要不可变引用 &Store<Wry>，因为它使用了内部可变性。
fn save_token(store: &Store<Wry>, token: &str) -> Result<(), AppError> {
    store.set(
        "auth_token".to_string(),
        Value::String(token.to_string()),
    );

    store.save().map_err(|_| AppError::StoreError)
}

// 辅助函数：移除 token。
// 只需要不可变引用 &Store<Wry>。
fn remove_token(store: &Store<Wry>) -> Result<(), AppError> {
    store.delete("auth_token".to_string());

    store.save().map_err(|_| AppError::StoreError)
}

// **FIX**: 所有命令中的 store 参数都不再需要 mut
#[tauri::command]
pub async fn login(
    username: String,
    password: String,
    api_client: State<'_, ApiClient>,
    store: State<'_, Store<Wry>>,
) -> Result<String, AppError> {
    log::info!("Attempting to login for user: {}", username);
    let payload = UserLoginDTO {
        userName: username,
        userPassword: password,
    };
    let response: UserLoginVO = api_client.login(&payload).await?;
    if let Some(token) = response.token {
        // **FIX**: 直接传递 deref 后的 &store
        save_token(&store, &token)?;
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
    api_client: State<'_, ApiClient>,
    store: State<'_, Store<Wry>>,
) -> Result<String, AppError> {
    log::info!("Attempting to login with code for email: {}", email);
    let payload = EmailCodeLoginDTO { email, code };
    let response: UserLoginVO = api_client.login_by_code(&payload).await?;
    if let Some(token) = response.token {
        save_token(&store, &token)?;
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
    api_client: State<'_, ApiClient>,
    store: State<'_, Store<Wry>>,
) -> Result<String, AppError> {
    log::info!("Attempting to register new user: {}", username);
    let payload = UserRegisterDTO {
        user_name: username,
        user_password: password,
        email,
        code,
        reg_into: "client".to_string(),
    };
    let response: UserLoginVO = api_client.register(&payload).await?;
    if let Some(token) = response.token {
        save_token(&store, &token)?;
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
pub async fn get_auth_token(store: State<'_, Store<Wry>>) -> Result<Option<String>, AppError> {
    Ok(get_token_from_store(&store).ok())
}

#[tauri::command]
pub async fn logout(store: State<'_, Store<Wry>>) -> Result<(), AppError> {
    log::info!("User logging out");
    remove_token(&store)
}
