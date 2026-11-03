//! Composition d'une session : quelles cartes, dans quel ordre.

use crate::fsrs::CardState;
use chrono::{DateTime, Utc};
use rs_fsrs::State;

/// Nombre de cartes nouvelles introduites par jour.
pub const NEW_PER_DAY: usize = 10;

/// Une carte active candidate, avec son état FSRS.
#[derive(Debug, Clone, PartialEq)]
pub struct SessionCard {
    pub id: String,
    pub subject_id: String,
    pub kind: String, // qa, cloze, mcq, explain
    pub state: CardState,
}

/// File de la session.
/// - `quick5` : les 5 cartes dues les plus en retard, complétées par des nouvelles.
/// - sinon (`timed`, `subject`) : toutes les dues puis les nouvelles ; si rien n'est dû,
///   révision par anticipation des cartes les plus proches de leur échéance.
///
/// `new_quota` = cartes nouvelles encore permises aujourd'hui (`NEW_PER_DAY` moins celles déjà vues).
pub fn compose(cards: &[SessionCard], quick5: bool, new_quota: usize, now: DateTime<Utc>) -> Vec<&SessionCard> {
    let (mut new, mut reviews): (Vec<_>, Vec<_>) = cards.iter().partition(|c| c.state.state == State::New);
    new.retain(|c| c.state.due <= now);
    new.sort_by_key(|c| c.state.due);
    reviews.sort_by_key(|c| c.state.due);
    let due = reviews.partition_point(|c| c.state.due <= now);

    let limit = if quick5 { 5 } else { usize::MAX };
    let mut picked: Vec<_> = reviews[..due].iter().copied().take(limit).collect();
    let room = limit - picked.len();
    picked.extend(new.into_iter().take(new_quota.min(room)));
    if picked.is_empty() && !quick5 {
        picked = reviews;
    }
    alternate(picked)
}

/// Réordonne en évitant deux cartes de suite de même matière, puis de même type,
/// sans trop s'écarter de l'ordre de priorité reçu.
// ponytail: O(n²), suffit pour quelques centaines de cartes ; passer par des files par matière au-delà.
fn alternate(mut rest: Vec<&SessionCard>) -> Vec<&SessionCard> {
    let mut out: Vec<&SessionCard> = Vec::with_capacity(rest.len());
    while !rest.is_empty() {
        let i = match out.last() {
            None => 0,
            Some(p) => (0..rest.len())
                .min_by_key(|&i| 2 * (rest[i].subject_id == p.subject_id) as u8 + (rest[i].kind == p.kind) as u8)
                .unwrap(),
        };
        out.push(rest.remove(i));
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{Duration, TimeZone};

    fn t0() -> DateTime<Utc> {
        Utc.with_ymd_and_hms(2026, 11, 2, 9, 0, 0).unwrap()
    }

    /// Carte due à `t0 + h` heures.
    fn card(id: &str, subject: &str, kind: &str, state: State, h: i64) -> SessionCard {
        let mut s = CardState::new(t0() + Duration::hours(h));
        s.state = state;
        SessionCard { id: id.into(), subject_id: subject.into(), kind: kind.into(), state: s }
    }

    fn ids(q: Vec<&SessionCard>) -> Vec<&str> {
        q.into_iter().map(|c| c.id.as_str()).collect()
    }

    #[test]
    fn quick5_prend_les_plus_en_retard() {
        let cards: Vec<_> = (0..8)
            .map(|i| card(&format!("r{i}"), "a", "qa", State::Review, -i))
            .chain([card("futur", "a", "qa", State::Review, 5), card("n", "a", "qa", State::New, -1)])
            .collect();
        let mut q = ids(compose(&cards, true, NEW_PER_DAY, t0()));
        q.sort();
        assert_eq!(q, ["r3", "r4", "r5", "r6", "r7"]);
    }

    #[test]
    fn quick5_complete_avec_des_nouvelles_dans_le_quota() {
        let cards = [
            card("r", "a", "qa", State::Review, -1),
            card("n1", "a", "qa", State::New, -3),
            card("n2", "a", "qa", State::New, -2),
            card("n3", "a", "qa", State::New, -1),
            card("demain", "a", "qa", State::New, 24),
        ];
        assert_eq!(ids(compose(&cards, true, 2, t0())), ["r", "n1", "n2"]);
        assert_eq!(ids(compose(&cards, true, 0, t0())), ["r"]);
    }

    #[test]
    fn session_longue_toutes_les_dues_et_les_nouvelles_du_quota() {
        let cards: Vec<_> = (0..30)
            .map(|i| card(&format!("r{i}"), "a", "qa", State::Review, -i))
            .chain((0..15).map(|i| card(&format!("n{i}"), "a", "qa", State::New, -1)))
            .collect();
        let q = compose(&cards, false, NEW_PER_DAY, t0());
        assert_eq!(q.len(), 30 + NEW_PER_DAY);
        assert_eq!(q[0].id, "r29", "la plus en retard d'abord");
    }

    #[test]
    fn alterne_matieres_puis_types() {
        let cards = [
            card("a1", "a", "qa", State::Review, -6),
            card("a2", "a", "cloze", State::Review, -5),
            card("a3", "a", "qa", State::Review, -4),
            card("b1", "b", "qa", State::Review, -3),
            card("b2", "b", "cloze", State::Review, -2),
        ];
        assert_eq!(ids(compose(&cards, false, 0, t0())), ["a1", "b2", "a3", "b1", "a2"]);
    }

    #[test]
    fn rien_de_du_anticipation_hors_quick5() {
        let cards = [
            card("loin", "a", "qa", State::Review, 48),
            card("proche", "b", "qa", State::Review, 2),
            card("demain", "a", "qa", State::New, 24),
        ];
        assert!(compose(&cards, true, NEW_PER_DAY, t0()).is_empty());
        assert_eq!(ids(compose(&cards, false, NEW_PER_DAY, t0())), ["proche", "loin"]);
    }
}
