//! KT-2003 — the reasons Kronn writes for an unavailable agent or a refused
//! model reach the API as a code with its parameters, next to the unchanged
//! English sentence. A third-party text gets no code. Every test name carries
//! `reason_code` so `cargo test --lib reason_code` selects them.

use super::*;
use crate::db::model_catalog as db;

fn test_db() -> Database {
    Database::open_in_memory().unwrap()
}

fn discovered(model_id: &str, capabilities: &[&str]) -> DiscoveredModel {
    DiscoveredModel {
        model_id: model_id.into(),
        display_name: model_id.into(),
        resolved_model: None,
        description: None,
        capabilities: capabilities.iter().map(|c| c.to_string()).collect(),
        reasoning_modes: vec![],
        default_reasoning_mode: None,
    }
}

async fn view_after_refresh_failure(
    agent: AgentType,
    reason: ModelUnavailableReason,
    detail: String,
) -> ModelCatalogView {
    let database = test_db();
    let target = db::agent_runtime_target_id(&agent);
    let (t, a) = (target.clone(), agent.clone());
    database
        .with_conn(move |conn| db::record_refresh_failure(conn, &t, &a, reason, &detail))
        .await
        .unwrap();
    build_view(&database, target, agent).await.unwrap()
}

#[tokio::test]
async fn catalog_reason_code_names_the_full_access_refusal_the_picker_reads() {
    // The discovery of a native agent without full access stores the English
    // refusal; the view, the tier verdict and the preflight failure carry it
    // as a code with the agent's label, and keep the English sentence as is.
    let agent = AgentType::CopilotCli;
    let english = crate::agents::runner::native_full_access_refusal_in(&agent, "en");
    let view = view_after_refresh_failure(
        agent.clone(),
        ModelUnavailableReason::ProviderError,
        english.clone(),
    )
    .await;
    let expected = CatalogReasonCode::NativeFullAccessRequired {
        agent: "GitHub Copilot".into(),
    };
    assert_eq!(view.last_error_code.as_ref(), Some(&expected));
    assert_eq!(view.last_error_detail.as_deref(), Some(english.as_str()));

    let decision = decide_model(
        &agent,
        ModelTier::Default,
        &view.runtime_target_id,
        "gpt-5".into(),
        None,
        &view.models,
        Some(&view),
    );
    let failure = decision.clone().expect_err("the refusal is unchanged");
    assert_eq!(failure.reason, ModelUnavailableReason::ProviderError);
    assert_eq!(failure.detail, english, "the English sentence stays");
    assert_eq!(failure.detail_code.as_ref(), Some(&expected));

    let verdict = CatalogTierVerdict::from_decision(
        ModelTier::Default,
        Some("gpt-5".into()),
        decision.map(Some),
    );
    assert!(!verdict.launchable);
    let json = serde_json::to_value(&verdict).unwrap();
    assert_eq!(
        json["detail_code"],
        serde_json::json!({"code": "native_full_access_required", "agent": "GitHub Copilot"})
    );
    assert_eq!(json["detail"], serde_json::json!(english));
}

#[tokio::test]
async fn catalog_reason_code_recognises_the_prefixed_launch_refusal_too() {
    let agent = AgentType::OpenCode;
    let launch = crate::agents::runner::native_full_access_refusal(&agent);
    assert_eq!(
        refresh_error_code(&agent, &launch),
        Some(CatalogReasonCode::NativeFullAccessRequired {
            agent: "OpenCode".into()
        })
    );
    // Another agent's sentence is not this agent's refusal.
    assert_eq!(
        refresh_error_code(
            &AgentType::Kiro,
            &crate::agents::runner::native_full_access_refusal_in(&agent, "en")
        ),
        None
    );
}

#[tokio::test]
async fn catalog_reason_code_is_absent_for_a_third_party_refresh_error() {
    let view = view_after_refresh_failure(
        AgentType::Codex,
        ModelUnavailableReason::AuthRequired,
        "login required".into(),
    )
    .await;
    assert_eq!(view.last_error_code, None);
    let failure = decide_model(
        &AgentType::Codex,
        ModelTier::Default,
        &view.runtime_target_id,
        "gpt-5".into(),
        None,
        &view.models,
        Some(&view),
    )
    .expect_err("an auth failure blocks");
    assert_eq!(failure.detail, "login required");
    assert_eq!(failure.detail_code, None, "a third-party text is quoted");
    let json = serde_json::to_value(&failure).unwrap();
    assert!(
        json.get("detail_code").is_none(),
        "no code, no field: {json}"
    );
}

#[tokio::test]
async fn catalog_reason_code_of_discovery_timeout_unsupported_and_no_detail() {
    assert_eq!(
        refresh_error_code(&AgentType::Codex, DISCOVERY_TIMEOUT_DETAIL),
        Some(CatalogReasonCode::DiscoveryTimeout)
    );
    assert_eq!(
        refresh_error_code(&AgentType::Codex, DISCOVERY_UNSUPPORTED_DETAIL),
        Some(CatalogReasonCode::DiscoveryUnsupported)
    );
    let mut view = view_after_refresh_failure(
        AgentType::Codex,
        ModelUnavailableReason::Timeout,
        DISCOVERY_TIMEOUT_DETAIL.into(),
    )
    .await;
    assert_eq!(
        view.last_error_code,
        Some(CatalogReasonCode::DiscoveryTimeout)
    );
    view.last_error_detail = None;
    view.last_error_code = None;
    let failure = decide_model(
        &AgentType::Codex,
        ModelTier::Default,
        &view.runtime_target_id,
        "gpt-5".into(),
        None,
        &view.models,
        Some(&view),
    )
    .expect_err("a timeout blocks");
    assert_eq!(failure.detail, "the runtime catalog could not be refreshed");
    assert_eq!(
        failure.detail_code,
        Some(CatalogReasonCode::CatalogNotRefreshed)
    );
}

#[test]
fn catalog_reason_code_reads_back_the_entry_sentences_kronn_stores() {
    use crate::api::lite_llm::model_failure_detail;
    assert_eq!(
        entry_reason_code(
            "m",
            Some(ModelUnavailableReason::Disappeared),
            Some(db::DISAPPEARED_DETAIL)
        ),
        Some(CatalogReasonCode::ModelDisappeared {
            model_id: "m".into()
        })
    );
    let denied = model_failure_detail(ModelUnavailableReason::AccessDenied, 401);
    assert_eq!(
        entry_reason_code(
            "m",
            Some(ModelUnavailableReason::AccessDenied),
            Some(&denied)
        ),
        Some(CatalogReasonCode::ModelAccessDenied { status: 401 })
    );
    let missing = model_failure_detail(ModelUnavailableReason::NotFound, 404);
    assert_eq!(
        entry_reason_code("m", Some(ModelUnavailableReason::NotFound), Some(&missing)),
        Some(CatalogReasonCode::ModelNotFound { status: 404 })
    );
    // A text Kronn did not write word for word stays a quoted detail.
    for (reason, detail) in [
        (
            ModelUnavailableReason::NotFound,
            "Not found or access denied (HTTP 404)",
        ),
        (
            ModelUnavailableReason::Disappeared,
            "absent from the live catalogue",
        ),
        (ModelUnavailableReason::ProviderError, "upstream said no"),
    ] {
        assert_eq!(entry_reason_code("m", Some(reason), Some(detail)), None);
    }
    assert_eq!(
        entry_reason_code("m", Some(ModelUnavailableReason::NotFound), None),
        None
    );
}

#[tokio::test]
async fn catalog_reason_code_rides_on_the_stored_entry_and_its_refusal() {
    let database = test_db();
    let target = "http:connection-a";
    let detail =
        crate::api::lite_llm::model_failure_detail(ModelUnavailableReason::AccessDenied, 403);
    let stored = detail.clone();
    database
        .with_conn(move |conn| {
            db::reconcile_live(
                conn,
                target,
                &AgentType::LiteLlm,
                &[discovered("vertex/refused", &["chat"])],
            )?;
            db::mark_unavailable(
                conn,
                target,
                "vertex/refused",
                ModelUnavailableReason::AccessDenied,
                Some(&stored),
            )?;
            Ok(())
        })
        .await
        .unwrap();
    let view = build_view(&database, target.into(), AgentType::LiteLlm)
        .await
        .unwrap();
    let entry = view
        .models
        .iter()
        .find(|entry| entry.model_id == "vertex/refused")
        .unwrap();
    let expected = CatalogReasonCode::ModelAccessDenied { status: 403 };
    assert_eq!(entry.unavailable_code.as_ref(), Some(&expected));
    let failure = decide_model(
        &AgentType::LiteLlm,
        ModelTier::Default,
        target,
        "vertex/refused".into(),
        None,
        &view.models,
        None,
    )
    .expect_err("a refused model stays refused");
    assert_eq!(failure.detail, detail);
    assert_eq!(failure.detail_code, Some(expected));
}

#[tokio::test]
async fn catalog_reason_code_of_a_disappeared_model_without_replacement() {
    let database = test_db();
    database
        .with_conn(|conn| {
            let target = db::agent_runtime_target_id(&AgentType::ClaudeCode);
            db::reconcile_live(
                conn,
                &target,
                &AgentType::ClaudeCode,
                &[discovered("retired-reasoner", &["chat"])],
            )?;
            db::reconcile_live(conn, &target, &AgentType::ClaudeCode, &[])
        })
        .await
        .unwrap();
    let target = db::agent_runtime_target_id(&AgentType::ClaudeCode);
    let entries = durable_entries(&database, &target).await;
    let failure = decide_model(
        &AgentType::ClaudeCode,
        ModelTier::Reasoning,
        &target,
        "retired-reasoner".into(),
        None,
        &entries,
        None,
    )
    .expect_err("no replacement, refused");
    assert!(failure.detail.contains("no available replacement"));
    assert_eq!(
        failure.detail_code,
        Some(CatalogReasonCode::ModelDisappearedNoReplacement {
            model_id: "retired-reasoner".into(),
            tier: ModelTier::Reasoning,
            agent: "Claude Code".into(),
        })
    );
}

#[tokio::test]
async fn catalog_reason_code_of_a_model_that_does_not_chat_and_a_not_listed_notice() {
    let database = test_db();
    let target = "http:connection-a";
    database
        .with_conn(move |conn| {
            db::reconcile_live(
                conn,
                target,
                &AgentType::LiteLlm,
                &[discovered("flux", &["image"])],
            )
        })
        .await
        .unwrap();
    let entries = durable_entries(&database, target).await;
    let failure = decide_model(
        &AgentType::LiteLlm,
        ModelTier::Default,
        target,
        "flux".into(),
        None,
        &entries,
        None,
    )
    .expect_err("an image model is refused for chat");
    assert!(failure.detail.contains("does not support chat"));
    assert_eq!(
        failure.detail_code,
        Some(CatalogReasonCode::ModelNotChat {
            model_id: "flux".into(),
            capabilities: vec!["image".into()],
        })
    );

    let mut listed = entries[0].clone();
    listed.capabilities = vec!["chat".into()];
    listed.listing = CatalogListing::NotListed;
    let resolution = decide_model(
        &AgentType::Codex,
        ModelTier::Default,
        "agent:codex",
        "flux".into(),
        None,
        &[listed],
        None,
    )
    .expect("a notice never refuses");
    assert!(resolution.notice.is_some());
    assert!(matches!(
        resolution.notice_code,
        Some(CatalogReasonCode::ModelNotListed { ref model_id, ref agent, .. })
            if model_id == "flux" && agent == "Codex"
    ));
}

#[test]
fn catalog_reason_code_serializes_as_a_tagged_code_with_its_parameters() {
    let code = CatalogReasonCode::ModelNotListed {
        model_id: "m".into(),
        agent: "Codex".into(),
        version: None,
    };
    assert_eq!(
        serde_json::to_value(&code).unwrap(),
        serde_json::json!({"code": "model_not_listed", "model_id": "m", "agent": "Codex", "version": null})
    );
    assert_eq!(
        serde_json::to_value(CatalogReasonCode::CatalogNotRefreshed).unwrap(),
        serde_json::json!({"code": "catalog_not_refreshed"})
    );
}
