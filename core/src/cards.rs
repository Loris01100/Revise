//! Validation des cartes collées depuis Claude (phase 3).

use serde::Serialize;
use serde_json::Value;
use std::collections::HashMap;

/// Longueurs max, en caractères : au-delà, la carte ne se révise plus d'un coup d'œil.
pub const MAX_QUESTION: usize = 500;
pub const MAX_ANSWER: usize = 1000;
pub const MAX_EXPLANATION: usize = 500;
pub const MAX_CHOICE: usize = 200;
/// L'éditeur affiche au plus 4 propositions.
pub const MAX_CHOICES: usize = 4;

/// Carte acceptée, aux colonnes de `cards`.
#[derive(Debug, Serialize, PartialEq)]
pub struct Card {
    pub r#type: String,
    pub question: String,
    pub answer: String,
    pub choices: Option<Vec<String>>,
    pub explanation: Option<String>,
    pub source_page: Option<u32>,
}

/// Carte refusée : sa position dans le tableau collé (à partir de 0), sa question si elle en a une, et la raison.
#[derive(Debug, Serialize, PartialEq)]
pub struct Rejected {
    pub index: usize,
    pub question: Option<String>,
    pub reason: String,
}

#[derive(Debug, Serialize, PartialEq)]
pub struct Report {
    pub cards: Vec<Card>,
    pub rejected: Vec<Rejected>,
}

/// Texte collé → cartes valides et cartes refusées.
/// `existing` : questions déjà présentes dans la matière.
/// Erreur seulement si aucun tableau JSON n'est lisible.
pub fn validate(text: &str, existing: &[String]) -> Result<Report, String> {
    let items = extract(text)?;
    let mut seen: HashMap<String, Option<usize>> = existing.iter().map(|q| (key(q), None)).collect();
    let mut report = Report { cards: vec![], rejected: vec![] };
    for (index, item) in items.iter().enumerate() {
        let checked = card(item).and_then(|c| match seen.get(&key(&c.question)) {
            Some(None) => Err("question déjà présente dans la matière".into()),
            Some(Some(i)) => Err(format!("doublon de la carte {}", i + 1)),
            None => Ok(c),
        });
        match checked {
            Ok(c) => {
                seen.insert(key(&c.question), Some(index));
                report.cards.push(c);
            }
            Err(reason) => {
                let question = item["question"].as_str().map(|q| q.trim().to_string()).filter(|q| !q.is_empty());
                report.rejected.push(Rejected { index, question, reason })
            }
        }
    }
    Ok(report)
}

/// Tableau JSON du texte : dans le premier bloc ``` s'il y en a un, entre le premier `[` et le dernier `]`.
fn extract(text: &str) -> Result<Vec<Value>, String> {
    let body = text.split("```").nth(1).unwrap_or(text);
    let (Some(start), Some(end)) = (body.find('['), body.rfind(']')) else {
        return Err("aucun tableau JSON trouvé".into());
    };
    if end < start {
        return Err("aucun tableau JSON trouvé".into());
    }
    let items: Vec<Value> = serde_json::from_str(&body[start..=end]).map_err(|e| format!("JSON invalide : {e}"))?;
    if items.is_empty() {
        return Err("le tableau ne contient aucune carte".into());
    }
    Ok(items)
}

/// Clé de dédoublonnage : lettres et chiffres en minuscules, sans espaces ni ponctuation.
fn key(q: &str) -> String {
    q.chars().filter(|c| c.is_alphanumeric()).flat_map(char::to_lowercase).collect()
}

/// Texte obligatoire, nettoyé, d'au plus `max` caractères.
fn text(v: &Value, field: &str, max: usize) -> Result<String, String> {
    let s = v[field].as_str().map(str::trim).unwrap_or_default();
    if s.is_empty() {
        return Err(format!("« {field} » manquant"));
    }
    let n = s.chars().count();
    if n > max {
        return Err(format!("« {field} » trop long ({n} caractères, {max} au plus)"));
    }
    Ok(s.to_string())
}

fn card(v: &Value) -> Result<Card, String> {
    if !v.is_object() {
        return Err("ce n'est pas un objet JSON".into());
    }
    let kind = v["type"].as_str().unwrap_or_default();
    if !["qa", "cloze", "mcq", "explain"].contains(&kind) {
        return Err(format!("type inconnu : « {kind} »"));
    }
    let question = text(v, "question", MAX_QUESTION)?;
    let answer = text(v, "answer", MAX_ANSWER)?;
    let explanation = match &v["explanation"] {
        Value::Null => None,
        e if e.as_str().is_some_and(|s| s.trim().is_empty()) => None,
        _ => Some(text(v, "explanation", MAX_EXPLANATION)?),
    };
    // Une page invalide n'empêche pas de réviser la carte : on l'oublie.
    let source_page = v["source_page"].as_u64().filter(|&p| p >= 1).and_then(|p| u32::try_from(p).ok());

    let choices = if kind == "mcq" {
        let list = v["choices"].as_array().ok_or("QCM sans « choices »")?;
        let choices = list
            .iter()
            .map(|c| c.as_str().map(str::trim).filter(|s| !s.is_empty()).ok_or("proposition vide ou non textuelle"))
            .collect::<Result<Vec<_>, _>>()?;
        if !(2..=MAX_CHOICES).contains(&choices.len()) {
            return Err(format!("QCM à {} propositions (2 à {MAX_CHOICES})", choices.len()));
        }
        if choices.iter().any(|c| c.chars().count() > MAX_CHOICE) {
            return Err(format!("proposition trop longue ({MAX_CHOICE} caractères au plus)"));
        }
        if (1..choices.len()).any(|i| choices[..i].contains(&choices[i])) {
            return Err("deux propositions identiques".into());
        }
        if !choices.contains(&answer.as_str()) {
            return Err("la réponse ne figure pas parmi les propositions".into());
        }
        Some(choices.into_iter().map(String::from).collect())
    } else {
        None // « choices » ignoré hors QCM
    };

    if kind == "cloze" {
        // Un trou = une suite d'au moins 3 tirets bas, comme dans l'éditeur (/_{3,}/)
        let trous = question.split(|c| c != '_').filter(|s| s.len() >= 3).count();
        if trous != 1 {
            return Err(format!("texte à trous avec {trous} trou(s) ___ au lieu d'un seul"));
        }
    }

    Ok(Card { r#type: kind.into(), question, answer, choices, explanation, source_page })
}

#[cfg(test)]
mod tests {
    use super::*;

    const PARTIEL: &str = include_str!("../tests/fixtures/partiel.json");
    const DOCX: &str = include_str!("../tests/fixtures/docx.json");

    fn one(card: &str) -> Report {
        validate(&format!("[{card}]"), &[]).unwrap()
    }

    fn reason(card: &str) -> String {
        let r = one(card);
        assert!(r.cards.is_empty(), "acceptée à tort : {card}");
        r.rejected[0].reason.clone()
    }

    #[test]
    fn vrais_lots_acceptes() {
        for (lot, n) in [(PARTIEL, 21), (DOCX, 22)] {
            let r = validate(lot, &[]).unwrap();
            assert_eq!((r.cards.len(), r.rejected), (n, vec![]));
        }
        let mcq = validate(DOCX, &[]).unwrap().cards.into_iter().find(|c| c.r#type == "mcq").unwrap();
        assert_eq!(mcq.choices.unwrap().len(), 4);
    }

    #[test]
    fn lecture_tolerante() {
        let fenced = format!("Voici les cartes :\n```json\n{DOCX}\n```\nBonne révision [1] !");
        assert_eq!(validate(&fenced, &[]).unwrap().cards.len(), 22);
        let plain = format!("Voici les cartes : {PARTIEL} Bonne révision !");
        assert_eq!(validate(&plain, &[]).unwrap().cards.len(), 21);

        assert!(validate("", &[]).unwrap_err().contains("aucun tableau"));
        assert!(validate("] [", &[]).unwrap_err().contains("aucun tableau"));
        assert!(validate("[{\"type\": }]", &[]).unwrap_err().contains("JSON invalide"));
        assert!(validate("[]", &[]).unwrap_err().contains("aucune carte"));
    }

    #[test]
    fn schema() {
        assert!(reason(r#"{"type":"flash","question":"Q","answer":"R"}"#).contains("type inconnu"));
        assert!(reason(r#"{"type":"qa","question":" ","answer":"R"}"#).contains("question"));
        assert!(reason(r#"{"type":"qa","question":"Q"}"#).contains("answer"));
        assert!(reason(r#""texte""#).contains("objet"));
        // Champs facultatifs tolérés
        let r = one(r#"{"type":"qa","question":" Q ","answer":"R","choices":["a","b"],"explanation":"","source_page":"3","difficulty":2}"#);
        assert_eq!(r.cards[0], Card { r#type: "qa".into(), question: "Q".into(), answer: "R".into(), choices: None, explanation: None, source_page: None });
        assert_eq!(one(r#"{"type":"qa","question":"Q","answer":"R","source_page":4}"#).cards[0].source_page, Some(4));
        // Le terme clé ==…== passe tel quel : le surligneur est posé à l'affichage
        assert_eq!(one(r#"{"type":"qa","question":"Q","answer":"C'est l'==élasticité=="}"#).cards[0].answer, "C'est l'==élasticité==");
    }

    #[test]
    fn qcm_et_trous() {
        assert!(reason(r#"{"type":"mcq","question":"Q","answer":"a"}"#).contains("sans « choices »"));
        assert!(reason(r#"{"type":"mcq","question":"Q","answer":"a","choices":["a"]}"#).contains("1 propositions"));
        assert!(reason(r#"{"type":"mcq","question":"Q","answer":"a","choices":["a","b","c","d","e"]}"#).contains("5 propositions"));
        assert!(reason(r#"{"type":"mcq","question":"Q","answer":"a","choices":["a","b","b"]}"#).contains("identiques"));
        assert!(reason(r#"{"type":"mcq","question":"Q","answer":"z","choices":["a","b"]}"#).contains("ne figure pas"));
        assert!(reason(r#"{"type":"cloze","question":"Pas de trou","answer":"R"}"#).contains("0 trou"));
        assert!(reason(r#"{"type":"cloze","question":"___ et ___","answer":"R"}"#).contains("2 trou"));
        assert_eq!(one(r#"{"type":"cloze","question":"Un _____ long","answer":"R"}"#).cards.len(), 1);
    }

    #[test]
    fn trop_long() {
        let q = "x".repeat(MAX_QUESTION + 1);
        assert!(reason(&format!(r#"{{"type":"qa","question":"{q}","answer":"R"}}"#)).contains("trop long (501"));
        let e = "é".repeat(MAX_EXPLANATION); // compté en caractères, pas en octets
        assert_eq!(one(&format!(r#"{{"type":"qa","question":"Q","answer":"R","explanation":"{e}"}}"#)).cards.len(), 1);
    }

    #[test]
    fn doublons() {
        let lot = r#"[
            {"type":"qa","question":"Que signifie OPC ?","answer":"R"},
            {"type":"qa","question":"que signifie  OPC","answer":"R2"},
            {"type":"qa","question":"Qui sont les EA ?","answer":"R"}
        ]"#;
        let r = validate(lot, &["Qui sont les EA?".into()]).unwrap();
        assert_eq!(r.cards.len(), 1);
        assert_eq!(r.rejected, vec![
            Rejected { index: 1, question: Some("que signifie  OPC".into()), reason: "doublon de la carte 1".into() },
            Rejected { index: 2, question: Some("Qui sont les EA ?".into()), reason: "question déjà présente dans la matière".into() },
        ]);
    }
}
