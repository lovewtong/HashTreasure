use serde::{Deserialize, Serialize};
use sysinfo::{System, SystemExt};
use tauri::AppHandle;
use crate::api::Api;
use crate::device_id::{ensure_local_fingerprint, set_cloud_device_id, get_cloud_device_id};

#[derive(Serialize)]
struct DeviceRegisterReq<'a> {
    deviceName: &'a str,
    deviceType: &'a str,
    deviceInfo: serde_json::Value,
}
#[derive(Deserialize)]
struct ApiResp<T> { code: i32, data: Option<T> }
#[derive(Deserialize)]
pub struct DeviceVo { pub deviceId: String, pub deviceName: String }

pub async fn ensure_registered(api: &Api, app: &AppHandle, username: &str) -> anyhow::Result<String> {
    if let Some(id) = get_cloud_device_id(app).await { return Ok(id); }
    let finger = ensure_local_fingerprint(app).await?;
    let mut sys = System::new_all();
    sys.refresh_all();
    let host = sys.host_name().unwrap_or_else(|| "MyPC".into());
    let name = format!("{}@{}", username, host);
    let info = serde_json::json!({
        "fingerprint": finger,
        "os": sys.name(),
        "kernel_version": sys.kernel_version(),
        "cpu_count": sys.cpus().len(),
        "total_memory": sys.total_memory(),
    });
    let req = DeviceRegisterReq{ deviceName: &name, deviceType: "PC", deviceInfo: info };
    let resp: ApiResp<DeviceVo> = api.auth_post(app, "/api/v1/devices", &req).await?;
    let dev = resp.data.ok_or_else(|| anyhow::anyhow!("empty device data"))?;
    set_cloud_device_id(app, &dev.deviceId).await;
    Ok(dev.deviceId)
}
