// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager};
use tauri_plugin_store::{PluginBuilder};

mod api;
mod models;
mod error;

// 主函数
fn main() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(PluginBuilder::default().build())
        .invoke_handler(tauri::generate_handler![
            api::login,
            api::get_auth_token,
            api::logout,
            api::send_code,      // <-- 注册发送验证码命令
            api::login_by_code,  // <-- 注册验证码登录命令
            api::register,
        ])
        .setup(|app| {
            let window = app.get_window("main").unwrap();
            let _ = window.start_dragging();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
