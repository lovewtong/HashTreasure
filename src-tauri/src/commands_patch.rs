use tauri::{AppHandle};
use crate::api::Api;
use crate::device_reg::ensure_registered;
use crate::heartbeat::{spawn_heartbeat, HeartbeatPayload};

#[tauri::command]
pub async fn cmd_login(app: AppHandle, base: String, user: String, pass: String) -> Result<(), String> {
    let api = Api::new(base);
    api.login(&app, &user, &pass).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn cmd_bootstrap(app: AppHandle, base: String, username: String) -> Result<String, String> {
    let api = Api::new(base.clone());
    ensure_registered(&api, &app, &username).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn cmd_start_heartbeat(app: AppHandle, base: String, device_id: String) -> Result<(), String> {
    let api = Api::new(base.clone());
    spawn_heartbeat(api, app.clone(), device_id, || {
        // TODO: 替换为真实采样数据
        HeartbeatPayload { cpuUsage: "20".into(), gpuUsage: "35".into(), memoryUsage: 40.5, cpuHashrate: 1200.3, gpuHashrate: 45000.7 }
    }).await;
    Ok(())
}
