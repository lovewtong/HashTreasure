use serde::{ser::Serializer, Serialize};
use thiserror::Error;
// 新增: 导入 store 插件的 Error 类型
use tauri_plugin_store::Error as StoreError;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("网络请求失败")]
    NetworkError,

    #[error("JSON 解析失败")]
    JsonParseError,

    #[error("API 返回错误: {0}")]
    ApiError(String),

    #[error("文件路径解析失败")]
    PathError,

    // 新增: 为 Store 错误创建一个专门的变体
    // #[from] 属性会自动为我们实现 From<StoreError> for AppError
    #[error("本地存储操作失败: {0}")]
    StoreError(#[from] StoreError),

    #[error("用户名或密码错误")]
    InvalidCredentials,

    #[error("未知错误")]
    Unknown,
}

// 实现 Serialize trait，以便能将错误传递给前端
impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

// from_api_code 函数保持不变
impl AppError {
    pub fn from_api_code(code: i32) -> Self {
        match code {
            401 | 403 | 1001 => AppError::InvalidCredentials,
            _ => AppError::ApiError(format!("未知服务端错误码: {}", code)),
        }
    }
}