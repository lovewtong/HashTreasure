use serde::{Deserialize, Serialize};

/// 用户登录请求体 (Data Transfer Object)
#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct UserLoginDTO {
    pub userName: String,
    pub userPassword: String,
}

/// 邮箱验证码登录请求体
#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct EmailCodeLoginDTO {
    pub email: String,
    pub code: String,
}

/// 发送验证码请求体
#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SendCodeDTO {
    pub email: String,
    // 根据 API 文档，可能需要一个 type 字段，例如 "login" 或 "register"
    // 这里我们暂时假设登录用的 type 是 "login"
    pub r#type: String,
}

/// 通用的 API 响应结构
#[derive(Deserialize, Debug)]
pub struct ApiResponse<T> {
    pub code: i32,
    pub message: String,
    pub data: Option<T>,
}

/// 登录成功后返回的数据结构 (View Object)
#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct UserLoginVO {
    pub uid: Option<i64>,
    pub userName: Option<String>,
    pub token: Option<String>,
}

/// 用户注册请求体 (Data Transfer Object)
#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
#[derive(Deserialize)]
pub struct UserRegisterDTO {
    #[serde(rename = "username")]
    pub user_name: String,
    #[serde(rename = "password")]
    pub user_password: String,
    pub email: String,  // Already matches "email"
    pub code: String,   // Already matches "code"
    #[serde(rename = "regInto")]  // If JS sends "reg_into", adjust; otherwise, if it's hardcoded in Rust, no rename needed
    pub reg_into: String,
}