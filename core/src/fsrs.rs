//! Planification FSRS : une note (1 à 4) fait passer une carte à son état suivant.

use chrono::{DateTime, Utc};
use rs_fsrs::{Card, FSRS, Rating, State};

/// Reflet d'une ligne de `card_state`.
#[derive(Debug, Clone, PartialEq)]
pub struct CardState {
    pub due: DateTime<Utc>,
    pub stability: f64,
    pub difficulty: f64,
    pub reps: i32,
    pub lapses: i32,
    pub state: State,
    pub last_review: Option<DateTime<Utc>>,
}

impl CardState {
    /// État d'une carte qui vient d'être acceptée : due tout de suite.
    pub fn new(now: DateTime<Utc>) -> Self {
        Self {
            due: now,
            stability: 0.0,
            difficulty: 0.0,
            reps: 0,
            lapses: 0,
            state: State::New,
            last_review: None,
        }
    }
}

/// Applique la note `grade` (1 = à revoir, 4 = facile) à l'instant `now`.
/// Rétention cible 90 % (valeur par défaut de rs-fsrs).
pub fn schedule(s: &CardState, grade: u8, now: DateTime<Utc>) -> Result<CardState, String> {
    let rating = match grade {
        1 => Rating::Again,
        2 => Rating::Hard,
        3 => Rating::Good,
        4 => Rating::Easy,
        _ => return Err(format!("note invalide : {grade}")),
    };
    let card = Card {
        due: s.due,
        stability: s.stability,
        difficulty: s.difficulty,
        elapsed_days: 0,   // recalculé par le planificateur
        scheduled_days: 0, // sortie seulement
        reps: s.reps,
        lapses: s.lapses,
        state: s.state,
        last_review: s.last_review.unwrap_or(now),
    };
    let c = FSRS::default().next(card, now, rating).card;
    Ok(CardState {
        due: c.due,
        stability: c.stability,
        difficulty: c.difficulty,
        reps: c.reps,
        lapses: c.lapses,
        state: c.state,
        last_review: Some(c.last_review),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{Duration, TimeZone};

    fn t0() -> DateTime<Utc> {
        Utc.with_ymd_and_hms(2026, 11, 2, 9, 0, 0).unwrap()
    }

    #[test]
    fn note_invalide() {
        let s = CardState::new(t0());
        assert!(schedule(&s, 0, t0()).is_err());
        assert!(schedule(&s, 5, t0()).is_err());
    }

    #[test]
    fn nouvelle_carte_meilleure_note_plus_loin() {
        let s = CardState::new(t0());
        let dues: Vec<_> = (1..=4).map(|g| schedule(&s, g, t0()).unwrap().due).collect();
        assert!(dues.windows(2).all(|w| w[0] <= w[1]), "{dues:?}");
        assert!(dues[3] > t0() + Duration::days(1), "Facile doit sortir de l'apprentissage");
        let again = schedule(&s, 1, t0()).unwrap();
        assert_eq!(again.state, State::Learning);
        assert_eq!(again.reps, 1);
        assert_eq!(again.last_review, Some(t0()));
    }

    #[test]
    fn revue_reussie_allonge_puis_oubli_compte_un_lapse() {
        let s = schedule(&CardState::new(t0()), 4, t0()).unwrap();
        assert_eq!(s.state, State::Review);
        let first = s.due - t0();

        let s2 = schedule(&s, 3, s.due).unwrap();
        assert!(s2.due - s.due > first, "l'intervalle doit grandir");
        assert!(s2.stability > s.stability);

        let s3 = schedule(&s2, 1, s2.due).unwrap();
        assert_eq!(s3.state, State::Relearning);
        assert_eq!(s3.lapses, 1);
        assert!(s3.due - s2.due < Duration::days(1));
    }

    #[test]
    fn deterministe() {
        let s = CardState::new(t0());
        assert_eq!(schedule(&s, 3, t0()), schedule(&s, 3, t0()));
    }
}
