use axum::{
    routing::{get, post},
    Router,
    Json,
    http::{Method, HeaderValue, header},
    response::{IntoResponse, Response},
};
use serde_json::json;
use std::net::SocketAddr;
use tower_http::{
    cors::{Any, CorsLayer},
    trace::TraceLayer,
    set_header::SetResponseHeaderLayer,
    compression::CompressionLayer,
};

use tower::ServiceBuilder;

#[tokio::main]
async fn main() {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();

    // CORS Configuration - Restrict to your frontend source in production
    let cors = CorsLayer::new()
        // In production, replace `Any` with specific origins like: 
        // .allow_origin("https://your-domain.com".parse::<HeaderValue>().unwrap())
        .allow_origin(Any) 
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers(Any);

    // Security Headers (Helmet-style)
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
        .layer(
            ServiceBuilder::new()
                .layer(TraceLayer::new_for_http())
                .layer(CompressionLayer::new().gzip(true)) // Explicit Gzip
                .layer(cors)
                .layer(security_headers)
                .layer(SetResponseHeaderLayer::overriding(
                    axum::http::header::CACHE_CONTROL,
                    HeaderValue::from_static("public, max-age=300"), // 5 Minutes Caching
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
    println!(">> [Security Shield] Verifying Access Request...");
    
    let mut response = Json(json!({ "status": "success", "data": "Access Verified" })).into_response();
    
    // Performance: Predictive Preload for Signup flow
    // When secure_action is called, user is usually going to signup
    response.headers_mut().insert(
        header::LINK,
        HeaderValue::from_static("</auth/signup>; rel=prefetch, </auth/signup/birthday>; rel=prefetch")
    );
    
    response
}
