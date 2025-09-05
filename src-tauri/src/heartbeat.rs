use serde::Serialize;
use tauri::AppHandle;
use crate::api::Api;
use tokio::time::{interval, Duration};

#[derive(Serialize, Clone, Default)]
pub struct HeartbeatPayload {
    pub cpuUsage: String,
    pub gpuUsage: String,
    pub memoryUsage: f64,
    pub cpuHashrate: f64,
    pub gpuHashrate: f64,
}

pub async fn spawn_heartbeat(api: Api, app: AppHandle, device_id: String, mut sampler: impl FnMut() -> HeartbeatPayload + Send + 'static)
{
    tauri::async_runtime::spawn(async move {
        let mut backoff = 1u64;
        let mut ticker = interval(Duration::from_secs(30));
        loop {
            ticker.tick().await;
            let payload = sampler();
            let path = format!("/api/v1/devices/{}/heartbeat", device_id);
            let res: Result<serde_json::Value, _> = api.auth_post(&app, &path, &payload).await;
            match res {
                Ok(_) => { backoff = 1; let _ = app.emit_all("heartbeat:ok", &payload); },
                Err(err) => {
                    let _ = app.emit_all("heartbeat:err", &format!("{}", err));
                    let wait = backoff.min(480);
                    tokio::time::sleep(Duration::from_secs(wait)).await;
                    backoff = (backoff * 2).min(480);
                }
            }
        }
    });
}
