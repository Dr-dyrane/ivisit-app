// PULLBACK NOTE: Ask iVisit is intentionally a local FAQ proposal boundary.
// It consumes already-authorized FAQ projections and must not read/write Supabase,
// invoke an AI gateway, or create a support ticket.

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "can",
  "do",
  "for",
  "how",
  "i",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "the",
  "to",
  "what",
  "with",
  "you",
  "your",
]);

const MAX_QUERY_LENGTH = 500;

function toText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeSupportQuestion(value) {
  return toText(value).slice(0, MAX_QUERY_LENGTH);
}

function normalizeForMatch(value) {
  return normalizeSupportQuestion(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getTokens(value) {
  return Array.from(
    new Set(
      normalizeForMatch(value)
        .split(" ")
        .filter((token) => token.length > 2 && !STOP_WORDS.has(token)),
    ),
  );
}

function toEvidence(faq, index) {
  const question = toText(faq?.question);
  const answer = toText(faq?.answer);
  if (!question || !answer) return null;

  const rank = Number(faq?.rank);
  return {
    id:
      faq?.id != null && String(faq.id).trim()
        ? String(faq.id).trim()
        : `faq-${index + 1}`,
    question,
    answer,
    category: toText(faq?.category),
    rank: Number.isFinite(rank) ? rank : index,
  };
}

function scoreFaq(question, evidence) {
  const tokens = getTokens(question);
  if (tokens.length === 0) return 0;

  const questionText = normalizeForMatch(evidence.question);
  const categoryText = normalizeForMatch(evidence.category);
  const answerText = normalizeForMatch(evidence.answer);
  const normalizedQuestion = normalizeForMatch(question);

  let score = questionText.includes(normalizedQuestion) ? 12 : 0;
  let matchedTokenCount = 0;
  for (const token of tokens) {
    const matchesQuestion = questionText.includes(token);
    const matchesCategory = categoryText.includes(token);
    const matchesAnswer = answerText.includes(token);
    if (matchesQuestion || matchesCategory || matchesAnswer) {
      matchedTokenCount += 1;
    }
    if (matchesQuestion) score += 5;
    if (matchesCategory) score += 3;
    if (matchesAnswer) score += 1;
  }

  // A lone generic overlap (for example "update") must not turn a question
  // about coverage into an unrelated medical-profile answer. Multi-term
  // questions need corroboration from at least two distinct terms; otherwise
  // the honest outcome is escalation.
  if (tokens.length > 1 && matchedTokenCount < 2) return 0;
  return score;
}

function createEscalationDraft(question) {
  return {
    subject: "Help with iVisit",
    message: `Question: ${question}`,
  };
}

/**
 * Returns only verbatim approved FAQ evidence or an honest no-match state.
 * This is deliberately deterministic so it can be tested and reviewed without
 * treating a support response as server or clinical truth.
 */
export function createHelpSupportAnswerProposal({ question, faqs } = {}) {
  const normalizedQuestion = normalizeSupportQuestion(question);
  if (!normalizedQuestion) {
    return {
      kind: "idle",
      question: "",
      answer: null,
      source: null,
      escalationDraft: null,
    };
  }

  const rankedEvidence = (Array.isArray(faqs) ? faqs : [])
    .map(toEvidence)
    .filter(Boolean)
    .map((evidence) => ({
      evidence,
      score: scoreFaq(normalizedQuestion, evidence),
    }))
    .filter((entry) => entry.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.evidence.rank - right.evidence.rank ||
        left.evidence.id.localeCompare(right.evidence.id),
    );

  const best = rankedEvidence[0]?.evidence;
  if (!best) {
    return {
      kind: "no_match",
      question: normalizedQuestion,
      answer:
        "I could not find an approved FAQ answer for that. You can review a support request before sending it.",
      source: null,
      escalationDraft: createEscalationDraft(normalizedQuestion),
    };
  }

  return {
    kind: "faq_answer",
    question: normalizedQuestion,
    answer: best.answer,
    source: {
      id: best.id,
      label: best.category ? `FAQ - ${best.category}` : "FAQ",
      question: best.question,
    },
    escalationDraft: createEscalationDraft(normalizedQuestion),
  };
}

export default createHelpSupportAnswerProposal;
