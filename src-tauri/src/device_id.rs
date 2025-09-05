use sha2::{Digest, Sha256};
use uuid::Uuid;
use std::{path::PathBuf};
use tauri::AppHandle;
use tauri_plugin_store::StoreBuilder;

const STORE_PATH: &str = "store.dat";
const KEY_DEVICE_ID: &str = "device_id";
const KEY_LOCAL_FINGERPRINT: &str = "local_fingerprint";

#[cfg(target_os = "windows")]
fn choose_primary_mac() -> Option<[u8;6]> {
    mac_address::get_mac_address().ok().flatten().map(|m| m.bytes())
}
#[cfg(not(target_os = "windows"))]
fn choose_primary_mac() -> Option<[u8;6]> {
    mac_address::get_mac_address().ok().flatten().map(|m| m.bytes())
}

fn calc_fingerprint() -> String {
    let uuid = Uuid::new_v4().to_string();
    let mac_hash = choose_primary_mac().map(|b| {
        let mut hasher = Sha256::new();
        hasher.update(&b);
        let digest = hasher.finalize();
        hex::encode(&digest[..8])
    }).unwrap_or_else(|| "nomac0000000000".to_string());
    format!("{}-{}", uuid, mac_hash)
}

pub async fn ensure_local_fingerprint(app: &AppHandle) -> tauri::Result<String> {
    let mut store = StoreBuilder::new(app, PathBuf::from(STORE_PATH)).build();
    store.load().await.ok();
    if let Some(v) = store.get(KEY_LOCAL_FINGERPRINT) {
        if let Some(s) = v.as_str() { return Ok(s.to_string()); }
    }
    let fp = calc_fingerprint();
    store.set(KEY_LOCAL_FINGERPRINT, fp.clone());
    store.save().await.ok();
    Ok(fp)
}

pub async fn get_cloud_device_id(app: &AppHandle) -> Option<String> {
    let mut store = StoreBuilder::new(app, PathBuf::from(STORE_PATH)).build();
    store.load().await.ok();
    store.get(KEY_DEVICE_ID).and_then(|v| v.as_str().map(|s| s.to_string()))
}

pub async fn set_cloud_device_id(app: &AppHandle, id: &str) {
    let mut store = StoreBuilder::new(app, PathBuf::from(STORE_PATH)).build();
    store.load().await.ok();
    store.set(KEY_DEVICE_ID, id);
    let _ = store.save().await;
}
