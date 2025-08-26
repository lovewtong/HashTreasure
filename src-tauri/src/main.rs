// src-tauri/src/main.rs

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod api;
mod commands;
mod error;
mod models;
use tauri_plugin_log::{Builder, Target as LogTarget, TargetKind};

fn main() {
    // 准备好所有需要管理的状态和配置
    let api_client = api::ApiClient::new();

    let targets = [
        LogTarget::new(TargetKind::Stdout),
        LogTarget::new(TargetKind::Webview),
    ];

    // --- 创建唯一的一个 Builder 实例，并将所有配置链接在一起 ---
    tauri::Builder::default()
        // 1. 管理 ApiClient 状态
        .manage(api_client)
        // 2.全局状态：挖矿进程管理器
        .manage(commands::MiningManager::default())
        // 3. 注册日志插件
        .plugin(Builder::new().targets(targets).build())
        // 4. 注册 Store 插件
        .plugin(tauri_plugin_store::Builder::default().build())
        // 5. 注册所有命令
        .invoke_handler(tauri::generate_handler![
            // 账号
            commands::login,
            commands::login_by_code,
            commands::register,
            commands::send_code,
            commands::get_auth_token,
            commands::logout,
            // 挖矿控制
            commands::start_cpu_mining,
            commands::stop_cpu_mining,
        ])
        // 5. 在所有配置完成后，最后运行应用
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}