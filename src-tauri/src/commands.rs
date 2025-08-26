// src-tauri/src/commands.rs

use crate::api::ApiClient;
use crate::error::AppError;
use crate::models::{EmailCodeLoginDTO, SendCodeDTO, UserLoginDTO, UserLoginVO, UserRegisterDTO};
use std::path::PathBuf;
use tauri::{AppHandle, State};
use tauri_plugin_store::StoreBuilder;

// 挖矿进程管理依赖
use tokio::sync::Mutex;
use tokio::process::{Child as TokioChild, Command as TokioCommand};

const STORE_PATH: &str = "store.dat";

/// --------------------
/// CPU 挖矿进程管理器
/// --------------------
#[derive(Default)]
pub struct MiningManager {
    child: Mutex<Option<TokioChild>>,
}

impl MiningManager {
    async fn start(&self) -> Result<(), String> {
        let mut guard = self.child.lock().await;
        if guard.is_some() {
            return Err("CPU mining is already running".into());
        }

        // 根据系统选择二进制名。请将 xmrig/xmrig.exe 放到应用同目录
        let binary_name = if cfg!(target_os = "windows") { "xmrig.exe" } else { "xmrig" };
        let exe_path = std::env::current_exe()
            .map_err(|e| format!("Failed to get current executable path: {}", e))?
            .parent()
            .map(|p| p.join(binary_name))
            .ok_or_else(|| "Failed to resolve xmrig binary path".to_string())?;

        // TODO: 替换为你在 C3Pool 的账号/钱包地址
        let mut cmd = TokioCommand::new(exe_path);
        cmd.arg("-o").arg("c3pool.com:3333")
           .arg("-u").arg("your_c3pool_username")
           .arg("-k");

        let child = cmd.spawn().map_err(|e| format!("Failed to start xmrig process: {}", e))?;
        *guard = Some(child);
        Ok(())
    }

    async fn stop(&self) -> Result<(), String> {
        let mut guard = self.child.lock().await;
        match guard.take() {
            Some(mut child) => {
                // 兼容性更好的做法：start_kill()（同步）+ wait().await
                if let Err(e) = child.start_kill() {
                    // 若进程已退出，忽略；否则报错
                    // 也可以选择直接返回 Err
                    eprintln!("xmrig start_kill error (may already be exited): {}", e);
                }
                child
                    .wait()
                    .await
                    .map_err(|e| format!("Failed to wait for xmrig process: {}", e))?;
                Ok(())
            }
            None => Err("CPU mining is not running".into()),
        }
    }
}

#[tauri::command]
pub async fn start_cpu_mining(manager: State<'_, MiningManager>) -> Result<(), String> {
    manager.start().await
}

#[tauri::command]
pub async fn stop_cpu_mining(manager: State<'_, MiningManager>) -> Result<(), String> {
    manager.stop().await
}

/// --------------------
/// 登录/注册 + 本地 Token 存储
/// --------------------
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
    // set 返回 ()，不能用 ?
    store.set("auth_token".to_string(), token_value);
    // save 才返回 Result
    store.save()?;
    Ok(())
}

fn remove_token(app: &AppHandle) -> Result<(), AppError> {
    let path = PathBuf::from(STORE_PATH);
    let mut store = StoreBuilder::new(app, path).build()?;
    // delete 返回 bool，不能用 ?
    let _ = store.delete("auth_token".to_string());
    store.save()?;
    Ok(())
}

#[tauri::command]
pub async fn login(
    email: String,
    password: String,
    app: AppHandle,
    api_client: State<'_, ApiClient>,
) -> Result<String, AppError> {
    log::info!("Attempting to login for user: {}", email);
    let payload = UserLoginDTO {
        email,
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
        email,
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
