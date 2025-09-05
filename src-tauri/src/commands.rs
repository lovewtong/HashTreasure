use crate::api::ApiClient;
use crate::error::AppError;
use crate::models::{EmailCodeLoginDTO, SendCodeDTO, UserLoginDTO, UserLoginVO, UserRegisterDTO};
use serde_json::json;
use std::sync::Arc;
use std::{
    fs,
    path::{Path, PathBuf},
};
use tauri::{AppHandle, State};
use tauri::Emitter; // 引入 Emitter trait，才能使用 app.emit()
use tauri_plugin_store::StoreBuilder;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child as TokioChild, Command as TokioCommand};
use tokio::sync::Mutex;

const STORE_PATH: &str = "store.dat";

// ======= 固定矿池与钱包（后端写死，不给前端改） =======
const C3POOL_USER: &str = "45MMv63J3y3751BLryGrDgdXfqX1BC2aNKE1ULUNygB5Dqtr8gibaV4R5kfXfMgSedSWA4RsswmYs63zYS8UC2xsJd289Qt";
const C3POOL_WORKER: Option<&str> = Some("HashTreasure-CPU");
const CPU_THREADS: Option<u16> = None; // None => 让 XMRig 自适应

#[derive(Default)]
pub struct MiningManager {
    child: Mutex<Option<TokioChild>>,       // 当前挖矿子进程
    last_hashrate: Arc<Mutex<Option<f64>>>, // 最近一次解析到的 10s hashrate
    last_algo: Arc<Mutex<Option<String>>>,  // 最近一次解析到的算法（如 rx/0）
}

impl MiningManager {
    async fn start(&self, app: AppHandle) -> Result<(), String> {
        let mut child_guard = self.child.lock().await;
        if child_guard.is_some() {
            return Err("CPU mining is already running".into());
        }
        let bin = if cfg!(target_os = "windows") { "xmrig.exe" } else { "xmrig" };
        let exe_path = std::env::current_exe().map_err(|e| format!("get current_exe failed: {e}"))?;
        let xmrig_path = exe_path
            .parent()
            .ok_or_else(|| "resolve xmrig binary path failed (no parent)".to_string())?
            .join(bin);
        if C3POOL_USER.trim().is_empty() {
            return Err("C3POOL_USER 为空，请在 commands.rs 中填写你的钱包/账号".into());
        }
        // 写配置 —— 优先与 xmrig.exe 同目录，其次回落到 %TEMP%
        let exe_dir = xmrig_path.parent().ok_or_else(|| "xmrig path has no parent".to_string())?;
        let cfg_path = match write_xmrig_config_into(exe_dir) {
            Ok(p) => p,
            Err(e) => {
                eprintln!("[miner] write config to exe_dir failed: {e}; falling back to temp dir");
                write_xmrig_config_temp()?
            }
        };
        let mut cmd = TokioCommand::new(&xmrig_path);
        cmd.current_dir(exe_dir);
        cmd.arg("--config").arg(&cfg_path); // 显式指定，双保险
        cmd.arg("--tls");
        if let Some(t) = CPU_THREADS { cmd.arg("-t").arg(t.to_string()); }
        cmd.stdout(std::process::Stdio::piped());
        cmd.stderr(std::process::Stdio::piped());
        eprintln!("[miner] launching {} with --config {}", xmrig_path.display(), cfg_path.display());
        let mut child = cmd.spawn().map_err(|e| format!("spawn xmrig failed: {e}"))?;
        // stdout 读行：解析 hashrate 与算法，并向前端广播事件
        if let Some(stdout) = child.stdout.take() {
            let last_hashrate = Arc::clone(&self.last_hashrate);
            let last_algo = Arc::clone(&self.last_algo);
            let app_for_emit = app.clone();
            tokio::spawn(async move {
                let mut lines = BufReader::new(stdout).lines();
                loop {
                    match lines.next_line().await {
                        Ok(Some(line)) => {
                            println!("{line}");
                            // 解析 10s hashrate
                            if let Some(pos) = line.find("speed 10s/") {
                                let nums: Vec<f64> = line[pos..]
                                    .split_whitespace()
                                    .filter_map(|s| {
                                        let s = s.trim().trim_end_matches(',');
                                        s.replace(',', ".").parse::<f64>().ok()
                                    })
                                    .collect();
                                if let Some(h10) = nums.first().copied() {
                                    let mut g = last_hashrate.lock().await;
                                    *g = Some(h10);
                                    let _ = app_for_emit.emit("cpu_hashrate", h10);
                                }
                            }
                            // 解析算法（如 algo rx/0）
                            if let Some(ai) = line.find("algo ") {
                                let tail = &line[ai + 5..];
                                let algo = tail
                                    .split_whitespace()
                                    .next()
                                    .unwrap_or("")
                                    .trim_matches(|c: char| c == ',' || c == ';')
                                    .to_string();
                                if !algo.is_empty() {
                                    let mut a = last_algo.lock().await;
                                    *a = Some(algo.clone());
                                    let _ = app_for_emit.emit("cpu_algo", algo);
                                }
                            }
                        }
                        Ok(None) => break,
                        Err(e) => {
                            eprintln!("[xmrig stdout] read error: {e}");
                            break;
                        }
                    }
                }
            });
        }
        // stderr 读行（仅打印）
        if let Some(stderr) = child.stderr.take() {
            tokio::spawn(async move {
                let mut lines = BufReader::new(stderr).lines();
                while let Ok(Some(line)) = lines.next_line().await {
                    eprintln!("{line}");
                }
            });
        }
        *child_guard = Some(child);
        Ok(())
    }
    // 需要在 main.rs 中调用，所以设为 pub
    pub async fn stop(&self) -> Result<(), String> {
        let mut guard = self.child.lock().await;
        match guard.take() {
            Some(mut child) => {
                if let Err(e) = child.kill().await {
                    eprintln!("xmrig kill error (maybe already exited): {e}");
                }
                let _ = child.wait().await;
                Ok(())
            }
            None => Err("CPU mining is not running".into()),
        }
    }
    async fn get_hashrate(&self) -> Option<f64> {
        self.last_hashrate.lock().await.clone()
    }
    async fn get_algo(&self) -> Option<String> {
        self.last_algo.lock().await.clone()
    }
    async fn is_running(&self) -> bool {
        self.child.lock().await.is_some()
    }
}

// 写配置到 xmrig.exe 同目录（优先方案）
fn write_xmrig_config_into(dir: &Path) -> Result<PathBuf, String> {
    let cfg_path = dir.join("config.json");
    write_xmrig_config_core(&cfg_path)?;
    Ok(cfg_path)
}
// 写配置到 %TEMP%\hash_treasure\xmrig.json（备用方案）
fn write_xmrig_config_temp() -> Result<PathBuf, String> {
    let dir = std::env::temp_dir().join("hash_treasure");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let cfg_path = dir.join("xmrig.json");
    write_xmrig_config_core(&cfg_path)?;
    Ok(cfg_path)
}
// 仅使用配置文件配置 HTTP API / 矿池 / DNS 行为
fn write_xmrig_config_core(cfg_path: &Path) -> Result<(), String> {
    // 主/备：端口 33333 + TLS，与 "--tls" 保持一致
    let mut pool_main = json!({
        "url": "auto.c3pool.org:33333",
        "user": C3POOL_USER,
        "keepalive": true,
        "tls": true,
        "sni": true
    });
    if let Some(w) = C3POOL_WORKER {
        pool_main["rig-id"] = json!(w);
    }
    let mut pool_backup = json!({
        "url": "auto.c3pool.org:33333",
        "user": C3POOL_USER,
        "keepalive": true,
        "tls": true,
        "sni": true
    });
    if let Some(w) = C3POOL_WORKER {
        pool_backup["rig-id"] = json!(w);
    }
    let config = json!({
        "autosave": true,
        "print-time": 30,
        "dns": { "ipv6": false },
        "cpu": { "huge-pages": false },
        "pools": [ pool_main, pool_backup ],
        "http": {
            "enabled": true,
            "host": "127.0.0.1",
            "port": 21550,
            "restricted": true
        }
    });
    fs::write(cfg_path, serde_json::to_vec_pretty(&config).unwrap()).map_err(|e| e.to_string())?;
    Ok(())
}

// ======= Tauri commands =======

#[tauri::command]
pub async fn start_cpu_mining(app: AppHandle, manager: State<'_, MiningManager>) -> Result<(), String> {
    manager.start(app).await
}
#[tauri::command]
pub async fn stop_cpu_mining(manager: State<'_, MiningManager>) -> Result<(), String> {
    manager.stop().await
}
#[tauri::command]
pub async fn get_cpu_hashrate(manager: State<'_, MiningManager>) -> Result<Option<f64>, String> {
    Ok(manager.get_hashrate().await)
}
#[tauri::command]
pub async fn is_cpu_mining(manager: State<'_, MiningManager>) -> Result<bool, String> {
    Ok(manager.is_running().await)
}
#[tauri::command]
pub async fn get_cpu_algo(manager: State<'_, MiningManager>) -> Result<Option<String>, String> {
    Ok(manager.get_algo().await)
}

// ======= 登录/注册 + 本地 Token（与你现有逻辑一致） =======
fn get_token_from_store(app: &AppHandle) -> Result<String, AppError> {
    let path = PathBuf::from(STORE_PATH);
    let store = StoreBuilder::new(app, path).build()?;
    // 重新加载数据以确保读取最新值
    let _ = store.reload();
    match store.get("auth_token") {
        Some(v) if v.is_string() => Ok(v.as_str().unwrap().to_string()),
        _ => Err(AppError::ApiError("Not logged in".to_string())),
    }
}
fn save_token(app: &AppHandle, token: &str) -> Result<(), AppError> {
    let path = PathBuf::from(STORE_PATH);
    let store = StoreBuilder::new(app, path).build()?;
    store.set("auth_token", serde_json::Value::String(token.to_string()));
    store.save()?;
    Ok(())
}
fn remove_token(app: &AppHandle) -> Result<(), AppError> {
    let path = PathBuf::from(STORE_PATH);
    let store = StoreBuilder::new(app, path).build()?;
    let _ = store.delete("auth_token");
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
    let payload = UserLoginDTO { email, user_password: password };
    let response: UserLoginVO = api_client.login(&payload).await?;
    if let Some(token) = response.token {
        save_token(&app, &token)?;
        Ok("Login successful".to_string())
    } else {
        Err(AppError::ApiError("Login success but no token received".to_string()))
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
        Err(AppError::ApiError("Login success but no token received".to_string()))
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
        Err(AppError::ApiError("Register success but no token received".to_string()))
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
