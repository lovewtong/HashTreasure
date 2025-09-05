use sha2::{Digest, Sha256};
use uuid::Uuid;


// 计算 MAC 地址的 SHA256 哈希值
pub fn hash_mac(mac: &[u8]) -> String {
let mut hasher = Sha256::new();
hasher.update(mac);
let out = hasher.finalize();
// 取前 12 个十六进制字符用于展示/组合
hex::encode(out)[..12].to_string()
}


#[cfg(target_os = "windows")]
fn primary_mac() -> Option<[u8; 6]> {
mac_address::get_mac_address().ok().flatten().map(|m| m.bytes())
}
#[cfg(not(target_os = "windows"))]
fn primary_mac() -> Option<[u8; 6]> {
mac_address::get_mac_address().ok().flatten().map(|m| m.bytes())
}


/// 生成/组合设备 ID："{base_uuid}-{mac_hash_12}"
pub fn compose_device_id(base_uuid: Uuid) -> String {
let mac_hash_12 = primary_mac()
.map(|b| hash_mac(&b))
.unwrap_or_else(|| "nomac000000".to_string());
format!("{}-{}", base_uuid.hyphenated(), mac_hash_12)
}