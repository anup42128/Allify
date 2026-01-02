use axum::{
    routing::{get, post},
    Router,
    Json,
    http::{Method, HeaderValue, header, StatusCode},
    response::{IntoResponse, Response},
    extract::State,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::{
    net::SocketAddr,
    sync::{Arc, RwLock},
    collections::HashMap,
};
use tower_http::{
    cors::{Any, CorsLayer},
    trace::TraceLayer,
    set_header::SetResponseHeaderLayer,
    compression::CompressionLayer,
};
use tower::ServiceBuilder;
use chrono::{DateTime, Utc, Duration};

// --- State Management ---
#[derive(Clone, Debug, Default)]
struct DeviceState {
    request_timestamps: Vec<DateTime<Utc>>,
    cooldown_expiry: Option<DateTime<Utc>>,
    
    // Resend specific state
    resend_timestamps: Vec<DateTime<Utc>>,
    resend_cooldown_expiry: Option<DateTime<Utc>>,
}

// Global App State
struct AppState {
    device_limits: RwLock<HashMap<String, DeviceState>>,
}

#[derive(Deserialize)]
struct ResetRequest {
    device_id: String,
    action: Option<String>, // "request" (default) or "resend"
    check_only: Option<bool>,
}

#[tokio::main]
async fn main() {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();

    // Initialize State
    let shared_state = Arc::new(AppState {
        device_limits: RwLock::new(HashMap::new()),
    });

    // CORS Configuration
    let cors = CorsLayer::new()
        .allow_origin(Any) 
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers(Any);

    // Security Headers
    let security_headers = ServiceBuilder::new()
        .layer(SetResponseHeaderLayer::overriding(
            axum::http::header::X_CONTENT_TYPE_OPTIONS,
            HeaderValue::from_static("nosniff"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            axum::http::header::X_FRAME_OPTIONS,
            HeaderValue::from_static("DENY"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            axum::http::header::X_XSS_PROTECTION,
            HeaderValue::from_static("1; mode=block"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            axum::http::header::STRICT_TRANSPORT_SECURITY,
            HeaderValue::from_static("max-age=63072000; includeSubDomains; preload"),
        ));

    // Build the application
    let app = Router::new()
        .route("/health", get(health_check))
        .route("/api/secure-action", post(secure_action))
        .route("/api/security/request-reset", post(request_reset_permission))
        .with_state(shared_state)
        .layer(
            ServiceBuilder::new()
                .layer(TraceLayer::new_for_http())
                .layer(CompressionLayer::new().gzip(true))
                .layer(cors)
                .layer(security_headers)
                .layer(SetResponseHeaderLayer::overriding(
                    axum::http::header::CACHE_CONTROL,
                    HeaderValue::from_static("no-store"), // Sensitive endpoints shouldn't be cached
                ))
        );

    // Run the server
    let addr = SocketAddr::from(([127, 0, 0, 1], 8080));
    println!("Security Backend listening on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn health_check() -> Response {
    let mut response = Json(json!({ "status": "ok", "message": "Security Shield Active" })).into_response();
    
    // Performance: Preload common assets/routes
    response.headers_mut().insert(
        header::LINK,
        HeaderValue::from_static("</auth/login>; rel=prefetch")
    );
    
    response
}

async fn secure_action() -> Response {
    let mut response = Json(json!({ "status": "success", "data": "Access Verified" })).into_response();
    response.headers_mut().insert(
        header::LINK,
        HeaderValue::from_static("</auth/signup>; rel=prefetch, </auth/signup/birthday>; rel=prefetch")
    );
    response
}

// --- Rate Limiting Logic ---
async fn request_reset_permission(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<ResetRequest>,
) -> Response {
    let mut limits = state.device_limits.write().unwrap();
    let now = Utc::now();
    let one_hour_ago = now - Duration::hours(1);
    
    let device_state = limits.entry(payload.device_id).or_insert(DeviceState::default());

    // --- Branch: Resend Logic (Limit: 3/hour) ---
    if let Some(action) = &payload.action {
        if action == "resend" {
            // 1. Check Lock (Always performed)
            if let Some(expiry) = device_state.resend_cooldown_expiry {
                if now < expiry {
                    let remaining = expiry.signed_duration_since(now).num_seconds();
                    return (
                        StatusCode::TOO_MANY_REQUESTS,
                        Json(json!({
                            "status": "error",
                            "message": "Please try again after 1 hour.",
                            "cooldown_remaining": remaining
                        }))
                    ).into_response();
                } else if !payload.check_only.unwrap_or(false) {
                     // Lock expired, verify logic handles clearing
                     // check_only should NOT prune unless necessary, but safer to let real request do it.
                     // But if we are checking, we want true state.
                     // If it's expired, we can clear it safely even in check_only because it helps cleanup.
                     device_state.resend_cooldown_expiry = None;
                     device_state.resend_timestamps.clear();
                }
            }

            // If check_only, we just want to know if we CAN proceed.
            // But we must simulate the state to know if we are ABOUT to be locked? 
            // Usually check_only is "am I currently locked?".
            if payload.check_only.unwrap_or(false) {
                // Return 'allowed' if no current lock. 
                // We don't check "will this next one lock me?" because that's complex logic.
                // Just "am I currently blocked?".
                // Since we passed the lock check above, we are OK.
                 return (
                    StatusCode::OK,
                    Json(json!({ "status": "allowed", "message": "Resend permitted (check only)" }))
                ).into_response();
            }

            // 2. Prune old timestamps
            device_state.resend_timestamps.retain(|&t| t > one_hour_ago);

            // 3. Check Count (Limit 3)
            if device_state.resend_timestamps.len() >= 3 {
                let cooldown_expiry = now + Duration::hours(1);
                device_state.resend_cooldown_expiry = Some(cooldown_expiry);
                
                return (
                    StatusCode::TOO_MANY_REQUESTS,
                    Json(json!({
                        "status": "error",
                        "message": "Please try again after 1 hour.",
                        "cooldown_remaining": 3600
                    }))
                ).into_response();
            }

            // 4. Record
            device_state.resend_timestamps.push(now);

            return (
                StatusCode::OK,
                Json(json!({ "status": "allowed", "message": "Resend permitted" }))
            ).into_response();
        }
    }

    // --- Branch: Initial Request Logic (Limit: 5/hour + 2.5m interval) ---
    // (Default behavior if action is None or "request")

    // 1. Check Lock
    if let Some(expiry) = device_state.cooldown_expiry {
        if now < expiry {
            let remaining = expiry.signed_duration_since(now).num_seconds();
            return (
                StatusCode::TOO_MANY_REQUESTS,
                Json(json!({
                    "status": "error",
                    "message": "Please try again after 1 hour for security reasons.",
                    "cooldown_remaining": remaining
                }))
            ).into_response();
        } else if !payload.check_only.unwrap_or(false) {
             device_state.cooldown_expiry = None;
             device_state.request_timestamps.clear();
        }
    }

    // Interval Check Logic needed for strict checking?
    // If last request was recent, we are technically "cooldown blocked" even if not "hourly blocked".
    // Should check_only reveal this? Yes.
    
    if payload.check_only.unwrap_or(false) {
        if let Some(&last_request) = device_state.request_timestamps.last() {
            let since_last = now.signed_duration_since(last_request); 
            if since_last < Duration::seconds(150) {
                 let wait_seconds = (Duration::seconds(150) - since_last).num_seconds();
                 return (
                    StatusCode::TOO_MANY_REQUESTS,
                    Json(json!({
                        "status": "error",
                        "message": format!("Please wait {} seconds before requesting again.", wait_seconds),
                        "cooldown_remaining": wait_seconds
                    }))
                ).into_response();
            }
        }
        return (
            StatusCode::OK,
            Json(json!({ "status": "allowed", "message": "Reset request permitted (check only)" }))
        ).into_response();
    }


    // 2. Prune
    device_state.request_timestamps.retain(|&t| t > one_hour_ago);

    // 2.5 Interval Check (150s)
    if let Some(&last_request) = device_state.request_timestamps.last() {
        let since_last = now.signed_duration_since(last_request); 
        if since_last < Duration::seconds(150) {
             let wait_seconds = (Duration::seconds(150) - since_last).num_seconds();
             return (
                StatusCode::TOO_MANY_REQUESTS,
                Json(json!({
                    "status": "error",
                    "message": format!("Please wait {} seconds before requesting again.", wait_seconds),
                    "cooldown_remaining": wait_seconds
                }))
            ).into_response();
        }
    }

    // 3. Check Count (Limit 5)
    if device_state.request_timestamps.len() >= 5 {
        let cooldown_expiry = now + Duration::hours(1);
        device_state.cooldown_expiry = Some(cooldown_expiry);
        
        return (
            StatusCode::TOO_MANY_REQUESTS,
            Json(json!({
                "status": "error",
                "message": "Please try again after 1 hour for security reasons.",
                "cooldown_remaining": 3600
            }))
        ).into_response();
    }

    // 4. Record
    device_state.request_timestamps.push(now);

    (
        StatusCode::OK,
        Json(json!({
            "status": "allowed", 
            "message": "Reset request permitted",
            "remaining_attempts": 5 - device_state.request_timestamps.len() 
        }))
    ).into_response()
}
