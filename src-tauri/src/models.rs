use serde::{Deserialize, Serialize};

/// 用户登录请求体 (Data Transfer Object)
#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct UserLoginDTO {
    pub email: String,
    pub user_password: String,
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
// **FIX**: 结构体与接口文档完全对齐
#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct UserRegisterDTO {
    pub user_name: String,
    pub user_password: String,
    pub email: String,
    pub code: String,
    pub reg_into: String,
    // 添加可选字段，使用 #[serde(skip_serializing_if = "Option::is_none")]
    // 可以在值为 None 时不序列化该字段，保持 JSON 清洁
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alipay_phone: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alipay_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub invite_code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub phone: Option<String>,
}
