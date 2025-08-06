use serde::{Serialize, ser::Serializer};
use thiserror::Error;

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

    #[error("本地存储操作失败")]
    StoreError,

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

impl AppError {
    /// 根据后端的错误码映射到具体的错误类型
    pub fn from_api_code(code: i32) -> Self {
        match code {
            // 这里可以根据您的 API 文档定义更多具体的错误码
            401 | 403 | 1001 => AppError::InvalidCredentials,
            _ => AppError::ApiError(format!("未知服务端错误码: {}", code)),
        }
    }
}
