/**
 * Simplified Technical English (STE) spec-writing rules for feature-context.
 * These FRs govern author prose, so each one is a waiver: the rule is applied by
 * AI authoring and review, not by a deterministic check.
 */

describe('feature-context: STE spec-writing rules', () => {
  // @req FR:feature-context/spec.ste.sentence — cannot be automated: judging that each FR is one sentence of 20 words or fewer requires authoring review
  it.skip('should aim for one sentence of 20 words or fewer per FR', () => {});

  // @req FR:feature-context/spec.ste.voice — cannot be automated: active voice depends on sentence meaning, not a fixed pattern
  it.skip('should write FR prose in active voice with the actor as subject', () => {});

  // @req FR:feature-context/spec.ste.rationale — cannot be automated: detecting rationale clauses requires reading intent, not only matching words
  it.skip('should exclude rationale clauses from FR prose', () => {});

  // @req FR:feature-context/spec.ste.rationale.scenario — cannot be automated: exemption applies to scenario user-story lines chosen by the author
  it.skip('should allow the so that value clause in scenario user-story lines', () => {});

  // @req FR:feature-context/spec.ste.rationale.bullet — cannot be automated: whether an FR needs rationale is an author judgment
  it.skip('should allow one nested Rationale bullet of up to 20 words', () => {});

  // @req FR:feature-context/spec.ste.rationale.overflow — cannot be automated: judging rationale length and placement requires authoring review
  it.skip('should route rationale over 20 words to design-decisions.md', () => {});

  // @req FR:feature-context/spec.ste.idioms — cannot be automated: idioms are identified by meaning, not by a fixed word list
  it.skip('should exclude idioms and figurative phrases from FR prose', () => {});

  // @req FR:feature-context/spec.ste.terms — cannot be automated: term choice depends on the concept and on terms each project defines
  it.skip('should use one project-defined term for each concept', () => {});
});
