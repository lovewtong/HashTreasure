// src-tauri/src/main.rs

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod api;
mod commands;
mod error;
mod models;

fn main() {
    let api_client = api::ApiClient::new();

    tauri::Builder::default()
        // 1. 使用 .plugin() 来正确地初始化和注册 tauri-plugin-store
        .plugin(tauri_plugin_store::Builder::default().build())
        .manage(api_client)
        .invoke_handler(tauri::generate_handler![
            commands::login,
            commands::login_by_code,
            commands::register,
            commands::send_code,
            commands::get_auth_token,
            commands::logout
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
