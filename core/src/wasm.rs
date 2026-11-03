//! Interface JS : JSON calqué sur les lignes D1, dates ISO 8601.

use crate::fsrs::{self, CardState};
use crate::session::{self, SessionCard};
use chrono::{DateTime, Utc};
use rs_fsrs::State;
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

/// Ligne de `card_state`, sans `card_id`.
#[derive(Serialize, Deserialize)]
struct Row {
    due: DateTime<Utc>,
    stability: f64,
    difficulty: f64,
    reps: i32,
    lapses: i32,
    state: String,
    last_review: Option<DateTime<Utc>>,
}

/// `cards.id`, `cards.subject_id`, `cards.type` + la ligne `card_state`.
#[derive(Deserialize)]
struct CardRow {
    id: String,
    subject_id: String,
    r#type: String,
    #[serde(flatten)]
    row: Row,
}

impl TryFrom<Row> for CardState {
    type Error = String;
    fn try_from(r: Row) -> Result<Self, String> {
        let state = match r.state.as_str() {
            "new" => State::New,
            "learning" => State::Learning,
            "review" => State::Review,
            "relearning" => State::Relearning,
            s => return Err(format!("état inconnu : {s}")),
        };
        Ok(Self { due: r.due, stability: r.stability, difficulty: r.difficulty, reps: r.reps, lapses: r.lapses, state, last_review: r.last_review })
    }
}

impl From<CardState> for Row {
    fn from(s: CardState) -> Self {
        let state = match s.state {
            State::New => "new",
            State::Learning => "learning",
            State::Review => "review",
            State::Relearning => "relearning",
        };
        Self { due: s.due, stability: s.stability, difficulty: s.difficulty, reps: s.reps, lapses: s.lapses, state: state.into(), last_review: s.last_review }
    }
}

fn parse<T: for<'a> Deserialize<'a>>(s: &str) -> Result<T, String> {
    serde_json::from_str(s).map_err(|e| e.to_string())
}

fn schedule_json(state: &str, grade: u8, now: &str) -> Result<String, String> {
    let s = fsrs::schedule(&parse::<Row>(state)?.try_into()?, grade, parse(&format!("\"{now}\""))?)?;
    serde_json::to_string(&Row::from(s)).map_err(|e| e.to_string())
}

fn compose_json(cards: &str, quick5: bool, new_quota: usize, now: &str) -> Result<String, String> {
    let cards = parse::<Vec<CardRow>>(cards)?
        .into_iter()
        .map(|c| Ok(SessionCard { id: c.id, subject_id: c.subject_id, kind: c.r#type, state: c.row.try_into()? }))
        .collect::<Result<Vec<_>, String>>()?;
    let ids: Vec<_> = session::compose(&cards, quick5, new_quota, parse(&format!("\"{now}\""))?).iter().map(|c| &c.id).collect();
    serde_json::to_string(&ids).map_err(|e| e.to_string())
}

/// Ligne `card_state` (JSON) → ligne suivante après la note `grade`.
#[wasm_bindgen]
pub fn schedule(state: &str, grade: u8, now: &str) -> Result<String, JsError> {
    schedule_json(state, grade, now).map_err(|e| JsError::new(&e))
}

/// Cartes candidates (JSON) → ids de la file, dans l'ordre (JSON).
#[wasm_bindgen]
pub fn compose(cards: &str, quick5: bool, new_quota: usize, now: &str) -> Result<String, JsError> {
    compose_json(cards, quick5, new_quota, now).map_err(|e| JsError::new(&e))
}

#[cfg(test)]
mod tests {
    use super::*;

    const NOW: &str = "2026-11-02T09:00:00.000Z";

    #[test]
    fn aller_retour_json() {
        let row = r#"{"due":"2026-11-02T09:00:00Z","stability":0,"difficulty":0,"reps":0,"lapses":0,"state":"new","last_review":null}"#;
        let next: serde_json::Value = serde_json::from_str(&schedule_json(row, 3, NOW).unwrap()).unwrap();
        assert_eq!(next["state"], "learning");
        assert_eq!(next["last_review"], "2026-11-02T09:00:00Z");

        let cards = format!(r#"[{{"id":"c1","subject_id":"s","type":"qa",{}}}]"#, &row[1..row.len() - 1]);
        assert_eq!(compose_json(&cards, true, 10, NOW).unwrap(), r#"["c1"]"#);
        assert!(schedule_json(&row.replace("new", "x"), 3, NOW).is_err());
    }
}
