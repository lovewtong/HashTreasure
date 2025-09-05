// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod api;
mod commands;
mod error;
mod models;
mod device;

use crate::commands::MiningManager;
use tauri::{Manager, WindowEvent};
use tauri_plugin_log::{Builder as LogBuilder, Target as LogTarget, TargetKind};

fn main() {
    // 你的 ApiClient 构造
    let api_client = api::ApiClient::new();

    let targets = [
        LogTarget::new(TargetKind::Stdout),
        LogTarget::new(TargetKind::Webview),
    ];

    tauri::Builder::default()
        // 1) 管理 ApiClient
        .manage(api_client)
        // 2) 管理挖矿进程状态
        .manage(MiningManager::default())
        // 3) 关闭窗口时，优雅停止 miner
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { .. } = event {
                // 注意：不要把 window/app_handle/state 移入 tokio::spawn（会有 'static 生命周期要求）
                // 这里同步阻塞一小下就行（应用要退出了）
                let manager = window.app_handle().state::<MiningManager>();
                tauri::async_runtime::block_on(async {
                    let _ = manager.stop().await;
                });
            }
        })
        // 4) 日志插件
        .plugin(LogBuilder::new().targets(targets).build())
        // 5) Store 插件
        .plugin(tauri_plugin_store::Builder::default().build())
        // 6) 注册命令
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
            commands::get_cpu_hashrate,
            // 前端状态查询
            commands::is_cpu_mining,
            commands::get_cpu_algo,
        ])
        // 7) 运行
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
