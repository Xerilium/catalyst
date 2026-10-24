import { describe, it, expect } from "@jest/globals";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { join } from "path";

/**
 * Tests for pull-request-workflow playbooks and commands
 */
describe("Pull Request Workflow", () => {
  const PLAYBOOKS_DIR = join(__dirname, "../../../src/resources/playbooks");
  const COMMANDS_DIR = join(
    __dirname,
    "../../../src/resources/ai-plugin/skills",
  );

  /** Returns a playbook's Error Handling section, so assertions can't pass on text from elsewhere. */
  async function errorHandling(playbook: string): Promise<string> {
    const content = await readFile(playbook, "utf-8");
    const match = content.match(/## Error Handling[\s\S]+?(?=\n## )/);
    expect(match).not.toBeNull();
    return match![0];
  }

  describe("review-pull-request.md playbook", () => {
    const playbookPath = join(PLAYBOOKS_DIR, "review-pull-request.md");

    /** @req FR:pull-request-workflow/review */
    it("should exist", () => {
      expect(existsSync(playbookPath)).toBe(true);
    });

    /** @req FR:pull-request-workflow/review */
    it("should NOT have YAML frontmatter", async () => {
      const content = await readFile(playbookPath, "utf-8");
      const lines = content.split("\n");
      expect(lines[0]).not.toBe("---");
    });

    /** @req FR:pull-request-workflow/review */
    it("should have a title heading", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/^# .*[Rr]eview.*[Pp]ull [Rr]equest/m);
    });

    /** @req FR:pull-request-workflow/review.input */
    it("should document pr-number as optional input", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/pr-number.*optional/i);
    });

    /** @req FR:pull-request-workflow/review.input.discovery */
    it("should have a Phase 0 for PR number discovery", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/### Phase 0: Resolve PR Number/);
    });

    /** @req FR:pull-request-workflow/review.input.discovery */
    it("should document session context check and recent PR query in Phase 0", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/session context/i);
      expect(content).toMatch(/gh pr list/);
    });

    /** @req FR:pull-request-workflow/review.setup */
    it("should have a Setup phase", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/### Phase 1: Setup/);
    });

    /** @req FR:pull-request-workflow/review.setup.get */
    it("should reference gh pr view for setup", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/gh pr view/);
    });

    // @req FR:pull-request-workflow/review.setup.uncommitted — cannot be automated: runtime AI behavior (stop on uncommitted changes)
    it.skip("should stop on uncommitted changes", () => {});

    /** @req FR:pull-request-workflow/review.setup.pending-review */
    it("should detect a pending review and ask the user to clear it before posting", async () => {
      const content = await readFile(playbookPath, "utf-8");
      const step = content.match(/\*\*Check for a pending review:\*\*[^\n]+/);
      expect(step).not.toBeNull();
      expect(step![0]).toMatch(/states:\[PENDING\]/);
      expect(step![0]).toMatch(/auq\.md/);
      expect(step![0]).toMatch(/submit or discard/i);
    });

    // @req FR:pull-request-workflow/review.setup.checkout — cannot be automated: runtime AI decision (conditional checkout based on PR size)
    it.skip("should conditionally checkout based on PR size", () => {});

    // @req FR:pull-request-workflow/review.setup.todo — cannot be automated: runtime AI behavior (create todo list)
    it.skip("should create tracking todo list", () => {});

    /** @req FR:pull-request-workflow/review.context */
    it("should have a Context phase", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/### Phase 2: Context/);
    });

    // @req FR:pull-request-workflow/review.context.issue — cannot be automated: runtime AI behavior (read linked issue context)
    it.skip("should read linked issue context", () => {});

    // @req FR:pull-request-workflow/review.context.feature — cannot be automated: runtime AI behavior (read feature specs)
    it.skip("should read feature context from .xe/features/", () => {});

    // @req FR:pull-request-workflow/review.context.prior — cannot be automated: runtime AI behavior (read prior work artifacts)
    it.skip("should read prior work artifacts", () => {});

    /** @req FR:pull-request-workflow/review.analyze */
    it("should have an Analysis phase", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/### Phase 3: Analysis/);
    });

    /** @req FR:pull-request-workflow/review.analyze.quality */
    it("should include quality analysis dimension", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/[Qq]uality/);
    });

    /** @req FR:pull-request-workflow/review.analyze.correctness */
    it("should include functional correctness analysis dimension", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/[Ff]unctional [Cc]orrectness/i);
    });

    /** @req FR:pull-request-workflow/review.analyze.alignment */
    it("should include project alignment analysis dimension", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/[Pp]roject [Aa]lignment/i);
    });

    /** @req FR:pull-request-workflow/review.classify */
    it("should have a Classification phase", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/### Phase 4: Classify/);
    });

    /** @req FR:pull-request-workflow/review.classify.blocker */
    it("should define Blocker severity tier", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/🚫.*[Bb]locker/);
    });

    /** @req FR:pull-request-workflow/review.classify.should-fix */
    it("should define Should fix severity tier", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/⚠️.*[Ss]hould fix/);
    });

    /** @req FR:pull-request-workflow/review.classify.suggestion */
    it("should define Suggestion severity tier", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/💡.*[Ss]uggestion/);
    });

    /** @req FR:pull-request-workflow/review.consult */
    it("should have a User Consultation phase", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/### Phase 5: User Consultation/);
    });

    /** @req FR:pull-request-workflow/review.consult.progressive */
    it("should reference AskUserQuestion for consultation", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/AskUserQuestion/);
    });

    /** @req FR:pull-request-workflow/review.consult.progressive */
    it("should NOT instruct AI to use ~5 word per-item summaries (cold-reader test failure)", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).not.toMatch(/[~≈]?\s*5\s*words\s*each/i);
    });

    /** @req FR:pull-request-workflow/review.consult.progressive */
    it("should require per-item context (problem, ask, change, rationale) for batch-approval options", async () => {
      const content = await readFile(playbookPath, "utf-8");
      const phase5Match = content.match(
        /### Phase 5: User Consultation[\s\S]+?(?=\n### Phase 6:)/,
      );
      expect(phase5Match).not.toBeNull();
      const phase5 = phase5Match![0];
      expect(phase5).toMatch(/file:line|anchor/i);
      expect(phase5).toMatch(/problem|flagged|issue/i);
      expect(phase5).toMatch(/\bask\b/i);
      expect(phase5).toMatch(/change|fix|apply/i);
      expect(phase5).toMatch(/rationale|why|recommend/i);
    });

    /** @req FR:pull-request-workflow/review.consult.progressive */
    it("should compose theme grouping with the comprehension budget (collapse obvious, keep themes coherent)", async () => {
      const content = await readFile(playbookPath, "utf-8");
      const phase5Match = content.match(
        /### Phase 5: User Consultation[\s\S]+?(?=\n### Phase 6:)/,
      );
      const phase5 = phase5Match![0];
      // theme axis preserved and composed with the budget
      expect(phase5).toMatch(/by theme|compose|two axes/i);
      expect(phase5).toMatch(/obvious|terse/i);
      expect(phase5).toMatch(/judgment|design choice|architecture|contest/i);
      // guardrail against dissolving themes into single-finding questions
      expect(phase5).toMatch(
        /never.*(split a coherent|one.finding.per.question|isolated single)/i,
      );
    });

    /** @req FR:pull-request-workflow/review.consult.progressive */
    it("should require split-into-batches (not truncate) when context exceeds the AUQ", async () => {
      const content = await readFile(playbookPath, "utf-8");
      const phase5Match = content.match(
        /### Phase 5: User Consultation[\s\S]+?(?=\n### Phase 6:)/,
      );
      const phase5 = phase5Match![0];
      expect(phase5).toMatch(/split|smaller|themed batch|review by category/i);
      expect(phase5).toMatch(
        /never.*truncate|rather than truncate|do not.*truncate/i,
      );
    });

    // @req FR:pull-request-workflow/review.consult.individual — cannot be automated: runtime AUQ interaction (individual review drill-down)
    it.skip("should support individual review drill-down", () => {});

    // @req FR:pull-request-workflow/review.consult.grouping — cannot be automated: runtime AUQ interaction (group 5+ items by theme)
    it.skip("should group 5+ items by theme", () => {});

    /** @req FR:pull-request-workflow/review.post */
    it("should have a Post Review phase", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/### Phase 6: Post Review/);
    });

    /** @req FR:pull-request-workflow/review.post.event */
    it("should specify COMMENT as default event type", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/COMMENT/);
    });

    /** @req FR:pull-request-workflow/review.post.suggestion */
    it("should document GitHub suggestion code blocks", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/suggestion/);
    });

    // @req FR:pull-request-workflow/review.post.suggestion-span — cannot be automated: runtime AI posting behavior (suggestion blocks span all relevant lines)
    it.skip("should span suggestion blocks across all relevant lines", () => {});

    /** @req FR:pull-request-workflow/review.post.prefix */
    it("should specify AI prefix requirement", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/\[Catalyst\]/);
    });

    /** @req FR:pull-request-workflow/review.post.body */
    /** @req FR:pull-request-workflow/review.post.body.no-repeat */
    it("should keep the review body to a summary that never repeats inline comments", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/a short summary only\. Never repeat the inline comments in the body/);
      expect(content).toMatch(/🚫 \{count\} · ⚠️ \{count\} · 💡 \{count\}/);
    });

    /** @req FR:pull-request-workflow/review.classify.verify */
    it("should verify findings before classifying them", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/Verify each finding against the real code before classifying it\. Drop any you cannot reproduce/);
    });

    // @req FR:pull-request-workflow/review.post.line-comments — cannot be automated: runtime AI posting behavior (line-level comments)
    it.skip("should post line-level comments for actionable findings", () => {});

    /** @req FR:pull-request-workflow/review.post.no-changes */
    it("should explicitly prohibit code changes", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/NOT.*code changes|NOT.*commit|NOT.*push/i);
    });

    it("should have Error Handling section", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/## Error Handling/);
    });

    it("should have Success Criteria section", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/## Success Criteria/);
    });
  });

  describe("update-pull-request.md playbook", () => {
    const playbookPath = join(PLAYBOOKS_DIR, "update-pull-request.md");

    /** @req FR:pull-request-workflow/update */
    it("should exist", () => {
      expect(existsSync(playbookPath)).toBe(true);
    });

    /** @req FR:pull-request-workflow/update */
    it("should have trigger frontmatter for PR events", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/^---\ntriggers:/);
      expect(content).toMatch(/pull_request_review/);
      expect(content).toMatch(/issue_comment/);
    });

    /** @req FR:pull-request-workflow/update */
    it("should have a title heading", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/^# .*[Uu]pdate.*[Pp]ull [Rr]equest/m);
    });

    /** @req FR:pull-request-workflow/update.input */
    it("should document pr-number as optional input", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/pr-number.*optional/i);
    });

    /** @req FR:pull-request-workflow/update.input.discovery */
    it("should have a Phase 0 for PR number discovery", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/### Phase 0: Resolve PR Number/);
    });

    /** @req FR:pull-request-workflow/update.input.discovery */
    it("should document session context check and author-filtered PR query in Phase 0", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/session context/i);
      expect(content).toMatch(/gh pr list.*--author @me/);
    });

    /** @req FR:pull-request-workflow/update.setup */
    it("should have a Setup phase", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/### Phase 1: Setup/);
    });

    /** @req FR:pull-request-workflow/update.setup.get */
    it("should reference gh pr view for setup", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/gh pr view/);
    });

    // @req FR:pull-request-workflow/update.setup.uncommitted — cannot be automated: runtime AI behavior (stop on uncommitted changes before checkout)
    it.skip("should stop on uncommitted changes before checkout", () => {});

    /** @req FR:pull-request-workflow/update.setup.checkout */
    it("should reference gh pr checkout", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/gh pr checkout/);
    });

    /** @req FR:pull-request-workflow/update.setup.branch */
    it("should verify branch matches PR head ref", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/branch.*head|headRefName/i);
    });

    // @req FR:pull-request-workflow/update.setup.todo — cannot be automated: runtime AI behavior (create todo list)
    it.skip("should create tracking todo list", () => {});

    /** @req FR:pull-request-workflow/update.research */
    it("should have a Research phase", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/### Phase 2: Research/);
    });

    /** @req FR:pull-request-workflow/update.research.threads */
    it("should reference GraphQL API for fetching review threads", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/gh api graphql/);
    });

    // @req FR:pull-request-workflow/update.research.metadata — cannot be automated: runtime AI behavior (track thread metadata including force-accept tags)
    it.skip("should track thread metadata including force-accept tags", () => {});

    // @req FR:pull-request-workflow/update.research.context — cannot be automated: runtime AI behavior (read project context and feature specs)
    it.skip("should read project context and feature specs", () => {});

    /** @req FR:pull-request-workflow/update.research.findings */
    it("should treat unanswered Catalyst review findings as needing a response", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/Catalyst review finding/);
      expect(content).toMatch(/🚫\/⚠️\/💡/);
      expect(content).toMatch(/no Catalyst response|has answered/i);
    });

    /** @req FR:pull-request-workflow/update.research.annotations */
    it("should fetch check-run annotations for the head commit", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/check-run annotations/i);
      expect(content).toMatch(/check-runs/);
      expect(content).toMatch(/annotations/);
      expect(content).toMatch(/annotation_level/);
    });

    // @req FR:pull-request-workflow/update.research.exit — cannot be automated: runtime AI behavior (summarize and stop when no threads need responses or annotations)
    it.skip("should summarize and stop when no threads or annotations need responses", () => {});

    /** @req FR:pull-request-workflow/update.research.pending-review */
    it("should detect a pending review and ask the user how to proceed", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(
        /reviews\(states: \[PENDING\], first: 1\) \{ totalCount \}/,
      );
      const step = content.match(/\*\*Check for a pending review\*\*[^\n]+/);
      expect(step).not.toBeNull();
      expect(step![0]).toMatch(/auq\.md/);
      expect(step![0]).toMatch(/submit or discard/i);
      expect(step![0]).toMatch(/unthreaded/i);
      expect(step![0]).toMatch(/Cancel/);
    });

    /** @req FR:pull-request-workflow/update.classify */
    it("should have a Classification phase", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/### Phase 3: Classification/);
    });

    /** @req FR:pull-request-workflow/update.classify.routine */
    it("should define Routine feedback tier", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/✅.*[Rr]outine/);
    });

    /** @req FR:pull-request-workflow/update.classify.targeted */
    it("should define Targeted feedback tier", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/🔧.*[Tt]argeted/);
    });

    /** @req FR:pull-request-workflow/update.classify.complex */
    it("should define Complex feedback tier", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/💬.*[Cc]omplex/);
    });

    /** @req FR:pull-request-workflow/update.consult */
    it("should have a User Consultation phase", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/### Phase 4: User Consultation/);
    });

    /** @req FR:pull-request-workflow/update.consult */
    it("should reference AUQ for consultation", async () => {
      const content = await readFile(playbookPath, "utf-8");
      // Playbooks invoke AUQ via the auq.md action file (per feedback_auq-invocation-pattern)
      expect(content).toMatch(/AskUserQuestion|auq\.md|\bAUQ\b/);
    });

    /** @req FR:pull-request-workflow/update.consult.routine */
    it("should require per-item context (reviewer, problem, ask, change, rationale) for batch-approval options", async () => {
      const content = await readFile(playbookPath, "utf-8");
      const phase4Match = content.match(
        /### Phase 4: User Consultation[\s\S]+?(?=\n### Phase 5:)/,
      );
      expect(phase4Match).not.toBeNull();
      const phase4 = phase4Match![0];
      expect(phase4).toMatch(/reviewer/i);
      expect(phase4).toMatch(/problem|feedback|flagged/i);
      expect(phase4).toMatch(/\bask\b/i);
      expect(phase4).toMatch(/change|fix|apply/i);
      expect(phase4).toMatch(/rationale|why|recommend/i);
    });

    /** @req FR:pull-request-workflow/update.consult.individual */
    it("should compose semantic grouping with the comprehension budget — collapse obvious, split coherently, never one-item-per-question", async () => {
      const content = await readFile(playbookPath, "utf-8");
      const phase4Match = content.match(
        /### Phase 4: User Consultation[\s\S]+?(?=\n### Phase 5:)/,
      );
      const phase4 = phase4Match![0];
      // semantic axis preserved (grouping by type / root issue / concern)
      expect(phase4).toMatch(
        /group semantically|by type|root.issue|by concern/i,
      );
      expect(phase4).toMatch(/compose|two axes/i);
      // comprehension budget applied
      expect(phase4).toMatch(
        /obvious.*no per-item explanation|collapse.*one.*group|terse group/i,
      );
      expect(phase4).toMatch(/100.word|fits the cap|under 100/i);
      // guardrails on BOTH failure modes
      expect(phase4).toMatch(/never.*cram|wall of text/i);
      expect(phase4).toMatch(
        /never.*(scatter|split a coherent|one.item.per.question|isolated single)/i,
      );
    });

    /** @req FR:pull-request-workflow/update.execute.pushback */
    it("should treat push-back as a last resort and prefer alternative-resolution paths", async () => {
      const content = await readFile(playbookPath, "utf-8");
      const phase4Match = content.match(
        /### Phase 4: User Consultation[\s\S]+?(?=\n### Phase 5:)/,
      );
      const phase4 = phase4Match![0];
      expect(phase4).toMatch(/last resort/i);
      expect(phase4).toMatch(/alternative/i);
      expect(phase4).toMatch(
        /spec clarification|design.decision|partial accept/i,
      );
      expect(phase4).toMatch(/green PR|product vision|sacrific/i);
    });

    // @req FR:pull-request-workflow/update.consult.routine — cannot be automated: runtime AUQ interaction (batch routine items for approval)
    it.skip("should batch routine items for approval", () => {});

    // @req FR:pull-request-workflow/update.consult.individual — cannot be automated: runtime AUQ interaction (present targeted/complex items individually)
    it.skip("should present targeted/complex items individually", () => {});

    // @req FR:pull-request-workflow/update.consult.escalation — cannot be automated: runtime AUQ interaction (need more context and defer to Q&A paths)
    it.skip("should support need more context and defer to Q&A escalation", () => {});

    // @req FR:pull-request-workflow/update.consult.small — cannot be automated: runtime AUQ interaction (skip summary for ≤4 items)
    it.skip("should skip summary round for 4 or fewer items", () => {});

    // @req FR:pull-request-workflow/update.consult.large — cannot be automated: runtime AUQ interaction (summary round for >8 items)
    it.skip("should use summary round for more than 8 items", () => {});

    /** @req FR:pull-request-workflow/update.execute */
    it("should have an Execute phase", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/### Phase 5: Execute/);
    });

    // @req FR:pull-request-workflow/update.execute.implement — cannot be automated: runtime AI behavior (implement approved changes)
    it.skip("should implement approved changes including routine fixes", () => {});

    // @req FR:pull-request-workflow/update.execute.autonomous — cannot be automated: runtime AI behavior (post questions and discussion autonomously)
    it.skip("should post questions and discussion responses autonomously", () => {});

    // @req FR:pull-request-workflow/update.execute.action — cannot be automated: runtime AI behavior (every response results in action)
    it.skip("should ensure every response results in action", () => {});

    // @req FR:pull-request-workflow/update.execute.templates — cannot be automated: runtime AI output formatting (response templates)
    it.skip("should use response templates with Catalyst prefix", () => {});

    /** @req FR:pull-request-workflow/update.execute.pushback */
    it("should document push-back response template", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/[Nn]eeds discussion|[Pp]ush.back/);
    });

    /** @req FR:pull-request-workflow/update.execute.force-accept */
    it("should document force-accept mechanism", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/#force-accept/);
    });

    /** @req FR:pull-request-workflow/update.execute.reply */
    it("should reference gh api for posting replies", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/gh api repos/);
    });

    /** @req FR:pull-request-workflow/update.execute.reply.annotations */
    it("should document that annotations have no reply thread and are addressed by fixing the code", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(
        /no reply call|no comment.*databaseId|nothing to reply to/i,
      );
      expect(content).toMatch(/Annotations fixed:/);
    });

    /** @req FR:pull-request-workflow/update.execute.reply.fallback */
    it("should document the pending-review 422 and the consolidated-comment fallback", async () => {
      const errors = await errorHandling(playbookPath);
      // the exact error string, so a reader can match it against what gh printed
      expect(errors).toMatch(
        /user_id can only have one pending review per pull request/,
      );
      expect(errors).toMatch(/422/);
      // cause, and that retrying is pointless
      expect(errors).toMatch(/unsubmitted|draft review|pending review/i);
      expect(errors).toMatch(/do not retry|never succeeds/i);
      // one consolidated general comment is the fallback
      expect(errors).toMatch(/gh pr comment \{pr-number\} --body-file/);
      expect(errors).toMatch(/404/);
      expect(errors).toMatch(/reviewThreads/);
    });

    /** @req FR:pull-request-workflow/update.execute.reply.fallback.attribution */
    it("should head each response in the fallback comment with its thread file:line", async () => {
      const errors = await errorHandling(playbookPath);
      expect(errors).toMatch(/file:line/);
      expect(errors).toMatch(/per thread|each thread/i);
      expect(errors).toMatch(/databaseId/);
    });

    /** @req FR:pull-request-workflow/update.execute.reply.fallback.disclosure */
    it("should require the fallback comment to disclose why replies are unthreaded", async () => {
      const errors = await errorHandling(playbookPath);
      expect(errors).toMatch(
        /(say|state|explain|disclose)[\s\S]{0,40}not threaded/i,
      );
      expect(errors).toMatch(/unsubmitted review/i);
    });

    /** @req FR:pull-request-workflow/update.validate */
    it("should have a Validate phase", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/### Phase 6: Validate/);
    });

    /** @req FR:pull-request-workflow/update.validate.tests */
    it("should require running tests", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/[Rr]un.*tests|[Tt]est.*MUST/i);
    });

    // @req FR:pull-request-workflow/update.validate.errors — cannot be automated: runtime AI behavior (tests MUST have no errors)
    it.skip("should enforce tests MUST have no errors", () => {});

    // @req FR:pull-request-workflow/update.validate.warnings — cannot be automated: runtime AI behavior (tests SHOULD have no warnings)
    it.skip("should enforce tests SHOULD have no warnings", () => {});

    // @req FR:pull-request-workflow/update.validate.fix — cannot be automated: runtime AI behavior (fix failing tests before proceeding)
    it.skip("should fix failing tests before proceeding", () => {});

    /** @req FR:pull-request-workflow/update.commit */
    it("should have a Review and Commit phase", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/### Phase 7: Review and Commit/);
    });

    // @req FR:pull-request-workflow/update.commit.review — cannot be automated: runtime AI behavior (user approval before commit)
    it.skip("should require user approval before commit", () => {});

    /** @req FR:pull-request-workflow/update.commit.attribution */
    it("should require Co-authored-by trailers", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/Co-authored-by/i);
    });

    /** @req FR:pull-request-workflow/update.commit.summary */
    it("should require summary comment", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/[Ss]ummary [Cc]omment|PR Update Summary/);
    });

    /** @req FR:pull-request-workflow/update.body-review */
    it("should have a PR Body Review phase", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/### Phase 8: PR Body Review/);
    });

    /** @req FR:pull-request-workflow/update.body-review.accuracy */
    it("should fetch and assess current PR body for accuracy", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/gh pr view.*--json body/);
      expect(content).toMatch(/accuracy|accurate/i);
    });

    /** @req FR:pull-request-workflow/update.body-review.succinct */
    it("should document succinct high-level body preference", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/succinct|high.level/i);
    });

    /** @req FR:pull-request-workflow/update.body-review.no-update */
    it("should document silent skip when body is accurate", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/skip silently|accurate.*skip/i);
    });

    it("should have Error Handling section", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/## Error Handling/);
    });

    it("should have Success Criteria section", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/## Success Criteria/);
    });
  });

  describe("loop-pull-request.md playbook", () => {
    const playbookPath = join(PLAYBOOKS_DIR, "loop-pull-request.md");

    /** @req FR:pull-request-workflow/loop */
    it("should exist", () => {
      expect(existsSync(playbookPath)).toBe(true);
    });

    /** @req FR:pull-request-workflow/loop */
    it("should have a title heading", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/^# .*[Ll]oop.*[Pp]ull [Rr]equest/m);
    });

    /** @req FR:pull-request-workflow/loop.input */
    it("should document pr-number and max-rounds as optional inputs", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/pr-number.*optional/i);
      expect(content).toMatch(/max-rounds.*optional/i);
    });

    /** @req FR:pull-request-workflow/loop.input */
    it("should reuse author-filtered PR discovery", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/gh pr list.*--author @me/);
    });

    /** @req FR:pull-request-workflow/loop.input */
    it("should default max-rounds to 3", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(
        /max-rounds.*[Dd]efault.*3|[Dd]efault.*3.*round/i,
      );
    });

    /** @req FR:pull-request-workflow/loop.setup */
    it("should have a Setup phase", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/### Phase 1: Setup/);
    });

    /** @req FR:pull-request-workflow/loop.setup.uncommitted */
    it("should stop on uncommitted changes before the first round", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/uncommitted/i);
    });

    /** @req FR:pull-request-workflow/loop.setup.pending-review */
    it("should check for a pending review before the first round", async () => {
      const content = await readFile(playbookPath, "utf-8");
      const setup = content.match(/### Phase 1: Setup[\s\S]+?(?=\n### )/);
      expect(setup).not.toBeNull();
      expect(setup![0]).toMatch(/pending review/i);
    });

    /** @req FR:pull-request-workflow/loop.round */
    it("should define a round as review followed by update", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/### Phase 2: Round Loop/);
      expect(content).toMatch(/review-pull-request/);
      expect(content).toMatch(/update-pull-request/);
    });

    /** @req FR:pull-request-workflow/loop.round.review */
    it("should dispatch the review step to a subagent", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/subagent/i);
    });

    /** @req FR:pull-request-workflow/loop.round.review.materiality */
    it("should have the review mark should-fix findings as material or polish", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/material/i);
      expect(content).toMatch(/polish/i);
    });

    /** @req FR:pull-request-workflow/loop.round.update */
    it("should run the update step in the primary agent", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/primary agent/i);
    });

    /** @req FR:pull-request-workflow/loop.round.autonomy */
    it("should apply only non-controversial or quality/usability-improving changes autonomously", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/autonomous|autonomously/i);
      expect(content).toMatch(/non.controversial/i);
      expect(content).toMatch(/quality.*usability|usability/i);
    });

    /** @req FR:pull-request-workflow/loop.round.flag */
    it("should comment and flag controversial or unclear items instead of applying them", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/controversial|unclear|uncertain/i);
      expect(content).toMatch(/flag/i);
    });

    // @req FR:pull-request-workflow/loop.round.record — cannot be automated: runtime AI behavior (accumulate per-round findings)
    it.skip("should record per-round findings, changes, and flagged items", () => {});

    /** @req FR:pull-request-workflow/loop.exit */
    it("should have an exit-conditions section", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/### Phase 3: Exit Conditions/);
    });

    /** @req FR:pull-request-workflow/loop.exit.resolved */
    it("should exit when no blockers or material should-fix findings remain", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/no blockers/i);
      expect(content).toMatch(/material should.fix/i);
    });

    /** @req FR:pull-request-workflow/loop.exit.diminishing */
    it("should exit on diminishing returns when findings are only polish or newly-invented nits", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/diminishing returns/i);
      expect(content).toMatch(/polish|nit/i);
    });

    /** @req FR:pull-request-workflow/loop.exit.round-limit */
    it("should exit when the round limit is reached", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/round limit|max-rounds/i);
    });

    /** @req FR:pull-request-workflow/loop.exit.no-progress */
    it("should exit when a round makes no progress", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/progress|no findings|non.converg|won't help/i);
    });

    /** @req FR:pull-request-workflow/loop.exit.blocked */
    it("should exit and surface on failure or merge conflict", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/merge conflict/i);
    });

    /** @req FR:pull-request-workflow/loop.consult */
    it("should consult the user once on flagged items at the end of the loop", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/### Phase 4: Consult on Flagged Items/);
      expect(content).toMatch(/end of the loop|end-of-loop/i);
      expect(content).toMatch(/auq\.md|AskUserQuestion|\bAUQ\b/);
      expect(content).toMatch(/\bonce\b/i);
    });

    /** @req FR:pull-request-workflow/loop.output */
    it("should have a Summary phase that is explicitly TLDR", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/### Phase 5: Summary/);
      const phase5Match = content.match(
        /### Phase 5: Summary[\s\S]+?(?=\n## )/,
      );
      expect(phase5Match).not.toBeNull();
      expect(phase5Match![0]).toMatch(/TLDR|not verbose/i);
    });

    /** @req FR:pull-request-workflow/loop.output */
    it("should recap each round and classify aggregate feedback, bugs, improvements", async () => {
      const content = await readFile(playbookPath, "utf-8");
      const phase5 = content.match(
        /### Phase 5: Summary[\s\S]+?(?=\n## CLI Reference)/,
      )![0];
      expect(phase5).toMatch(/[Rr]ound/);
      expect(phase5).toMatch(/[Ff]eedback applied/);
      expect(phase5).toMatch(/[Bb]ugs fixed/);
      expect(phase5).toMatch(/[Ii]mprovements made/);
    });

    /** @req FR:pull-request-workflow/loop.output */
    it("should call out flagged/unresolved items and the stop reason", async () => {
      const content = await readFile(playbookPath, "utf-8");
      const phase5 = content.match(
        /### Phase 5: Summary[\s\S]+?(?=\n## CLI Reference)/,
      )![0];
      expect(phase5).toMatch(/[Ff]lagged|[Uu]nresolved/);
      expect(phase5).toMatch(/stop reason/i);
    });

    it("should have Error Handling section", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/## Error Handling/);
    });

    it("should have Success Criteria section", async () => {
      const content = await readFile(playbookPath, "utf-8");
      expect(content).toMatch(/## Success Criteria/);
    });
  });

  describe("pr-loop.md command", () => {
    const commandPath = join(COMMANDS_DIR, "pr-loop.md");

    /** @req FR:pull-request-workflow/loop.@ai-skill */
    it("should exist", () => {
      expect(existsSync(commandPath)).toBe(true);
    });

    /** @req FR:pull-request-workflow/loop.@ai-skill */
    it("should have required frontmatter fields", async () => {
      const content = await readFile(commandPath, "utf-8");
      expect(content).toMatch(/^---\n/);
      expect(content).toMatch(/name:\s*"pr-loop"/);
      expect(content).toMatch(/description:/);
      expect(content).toMatch(/allowed-tools:/);
      expect(content).toMatch(/argument-hint:/);
    });

    /** @req FR:pull-request-workflow/loop.input */
    it("should accept pr-number and max-rounds as optional arguments", async () => {
      const content = await readFile(commandPath, "utf-8");
      expect(content).toMatch(/\[pr-number\]/);
      expect(content).toMatch(/\[max-rounds\]/);
    });

    /** @req FR:pull-request-workflow/loop.round.review */
    it("should allow the Task tool for subagent dispatch", async () => {
      const content = await readFile(commandPath, "utf-8");
      expect(content).toMatch(/allowed-tools:.*\bTask\b/);
    });

    // @req FR:pull-request-workflow/loop.@ai-skill.platform — cannot be automated: runtime platform detection behavior
    it.skip("should set ai-platform from invoking platform", () => {});

    /** @req FR:pull-request-workflow/loop.@playbook */
    it("should reference loop-pull-request playbook", async () => {
      const content = await readFile(commandPath, "utf-8");
      expect(content).toMatch(/loop-pull-request/);
    });
  });

  describe("pr-review.md command", () => {
    const commandPath = join(COMMANDS_DIR, "pr-review.md");

    /** @req FR:pull-request-workflow/review.@ai-skill */
    it("should exist", () => {
      expect(existsSync(commandPath)).toBe(true);
    });

    /** @req FR:pull-request-workflow/review.@ai-skill */
    it("should have YAML frontmatter", async () => {
      const content = await readFile(commandPath, "utf-8");
      expect(content).toMatch(/^---\n/);
    });

    /** @req FR:pull-request-workflow/review.@ai-skill */
    it("should have required frontmatter fields", async () => {
      const content = await readFile(commandPath, "utf-8");
      expect(content).toMatch(/name:\s*"pr-review"/);
      expect(content).toMatch(/description:/);
      expect(content).toMatch(/allowed-tools:/);
      expect(content).toMatch(/argument-hint:/);
    });

    /** @req FR:pull-request-workflow/review.input */
    it("should accept pr-number as optional argument", async () => {
      const content = await readFile(commandPath, "utf-8");
      expect(content).toMatch(/\[pr-number\]/);
    });

    // @req FR:pull-request-workflow/review.@ai-skill.platform — cannot be automated: runtime platform detection behavior
    it.skip("should set ai-platform from invoking platform", () => {});

    /** @req FR:pull-request-workflow/review.@playbook */
    it("should reference review-pull-request playbook", async () => {
      const content = await readFile(commandPath, "utf-8");
      expect(content).toMatch(/review-pull-request/);
    });
  });

  describe("pr-update.md command", () => {
    const commandPath = join(COMMANDS_DIR, "pr-update.md");

    /** @req FR:pull-request-workflow/update.@ai-skill */
    it("should exist", () => {
      expect(existsSync(commandPath)).toBe(true);
    });

    /** @req FR:pull-request-workflow/update.@ai-skill */
    it("should have YAML frontmatter", async () => {
      const content = await readFile(commandPath, "utf-8");
      expect(content).toMatch(/^---\n/);
    });

    /** @req FR:pull-request-workflow/update.@ai-skill */
    it("should have required frontmatter fields", async () => {
      const content = await readFile(commandPath, "utf-8");
      expect(content).toMatch(/name:\s*"pr-update"/);
      expect(content).toMatch(/description:/);
      expect(content).toMatch(/allowed-tools:/);
      expect(content).toMatch(/argument-hint:/);
    });

    /** @req FR:pull-request-workflow/update.input */
    it("should accept pr-number as optional argument", async () => {
      const content = await readFile(commandPath, "utf-8");
      expect(content).toMatch(/\[pr-number\]/);
    });

    // @req FR:pull-request-workflow/update.@ai-skill.platform — cannot be automated: runtime platform detection behavior
    it.skip("should set ai-platform from invoking platform", () => {});

    /** @req FR:pull-request-workflow/update.@playbook */
    it("should reference update-pull-request playbook", async () => {
      const content = await readFile(commandPath, "utf-8");
      expect(content).toMatch(/update-pull-request/);
    });
  });

  describe('sweep-pull-requests.md playbook', () => {
    const playbookPath = join(PLAYBOOKS_DIR, 'sweep-pull-requests.md');
    const matches = (re: RegExp) => async () => {
      expect(await readFile(playbookPath, 'utf-8')).toMatch(re);
    };

    /** @req FR:pull-request-workflow/sweep.@playbook */
    it('should exist without YAML frontmatter', async () => {
      expect(existsSync(playbookPath)).toBe(true);
      expect((await readFile(playbookPath, 'utf-8')).split('\n')[0]).not.toBe('---');
    });

    /** @req FR:pull-request-workflow/sweep.input */
    it(
      'should document optional inputs',
      matches(/pr-numbers.*optional[\s\S]*scope.*optional[\s\S]*execution-mode.*optional[\s\S]*ai-platform.*optional/i)
    );

    /** @req FR:pull-request-workflow/sweep.input */
    it('should name scope values after the update and review commands', matches(/`update` or `review`/));

    // @req FR:pull-request-workflow/sweep.platform — cannot be automated: runtime platform detection behavior
    it.skip('should set ai-platform from invoking platform', () => {});

    /** @req FR:pull-request-workflow/sweep.actor */
    it('should resolve the user from gh', matches(/current `gh` login[\s\S]*@me/));

    /** @req FR:pull-request-workflow/sweep.labels */
    it('should resolve label names from the label config', matches(/`labels\.names\.\{id\}` in `\.xe\/config\/catalyst\.json`[\s\S]*`labels\.style` is `simple`/));

    /** @req FR:pull-request-workflow/sweep.labels.missing */
    it('should create a missing label before first use', matches(/create it with `gh label create` before first use/));

    /** @req FR:pull-request-workflow/sweep.labels.fallback */
    it('should continue without a label it cannot create', matches(/report it as a gap and continue without it/));

    /** @req FR:pull-request-workflow/sweep.survey */
    it('should survey read-only', matches(/### Phase 1: Survey[\s\S]*gh search prs/));

    /** @req FR:pull-request-workflow/sweep.survey.no-agents */
    it('should not spend subagents on the survey', matches(/no subagents/i));

    /** @req FR:pull-request-workflow/sweep.survey.query */
    it('should exclude WIP and paused PRs in the query', matches(/-label:"\{wip\}" -label:"\{paused\}"/));

    /** @req FR:pull-request-workflow/sweep.survey.order */
    it('should order by release label', matches(/Order the queue by release label: blocker, priority, none, stretch/));

    /** @req FR:pull-request-workflow/sweep.survey.order.reviews-first */
    it('should work reviews before updates', matches(/reviews before updates/));

    /** @req FR:pull-request-workflow/sweep.skip */
    it('should skip PRs that need nothing from the user', matches(/--draft=false[\s\S]*Skip PRs the user already approved/));

    /** @req FR:pull-request-workflow/sweep.skip.draft */
    it('should skip non-authored drafts only', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/--review-requested @me --draft=false/);
      expect(content).not.toMatch(/--author @me[^\n]*--draft/);
    });

    /** @req FR:pull-request-workflow/sweep.skip.approved */
    it('should skip already-approved PRs', matches(/Skip PRs the user already approved/));

    /** @req FR:pull-request-workflow/sweep.wip */
    it('should claim a PR with WIP as soon as it is in scope', matches(/The moment a PR is in scope, add the WIP label/));

    /** @req FR:pull-request-workflow/sweep.wip.check */
    it('should re-check WIP before starting a PR', matches(/Before starting each PR's pass, re-read its labels/));

    /** @req FR:pull-request-workflow/sweep.wip.no-timeout */
    it("should never remove another actor's WIP", matches(/Never remove another actor's WIP, whatever its age/));

    /** @req FR:pull-request-workflow/sweep.wip.release */
    it('should remove its own WIP labels once subagents are done', matches(/once every subagent is done, remove the WIP label from every PR on this run's list, including PRs whose subagent failed/));

    /** @req FR:pull-request-workflow/sweep.route */
    it('should route by role', matches(/\*\*User authored it\*\* → [\s\S]*\*\*User reviews it\*\* →/));

    /** @req FR:pull-request-workflow/sweep.route.one-pass */
    it('should give each PR one pass', matches(/Each PR takes exactly one pass/));

    /** @req FR:pull-request-workflow/sweep.route.update */
    it('should delegate authored PRs to the update playbook', matches(/User authored it\*\* → Execute @node_modules\/@xerilium\/catalyst\/playbooks\/update-pull-request\.md/));

    /** @req FR:pull-request-workflow/sweep.route.update.rebase */
    it('should rebase and push with a lease', matches(/rebase onto it and push with `--force-with-lease`/));

    /** @req FR:pull-request-workflow/sweep.route.update.no-merge-base */
    it('should never merge the base branch in', matches(/Never merge the base branch in/));

    /** @req FR:pull-request-workflow/sweep.route.update.push-first */
    it('should push before resolving a thread', matches(/Push the fix before resolving its thread/));

    /** @req FR:pull-request-workflow/sweep.route.update.checks */
    it('should fix only code the PR touches', matches(/fix only code the PR touches/));

    /** @req FR:pull-request-workflow/sweep.route.update.checks.boy-scout */
    it('should allow explicit boy-scout requests', matches(/unless a human reviewer explicitly asks for a boy-scout fix/));

    /** @req FR:pull-request-workflow/sweep.route.review */
    it('should delegate reviews to the review playbook', matches(/User reviews it\*\* → Execute @node_modules\/@xerilium\/catalyst\/playbooks\/review-pull-request\.md/));

    /** @req FR:pull-request-workflow/sweep.route.review.post */
    it('should post one COMMENT review with inline findings', matches(/Post one `COMMENT` review whose findings are inline comments on their lines/));

    /** @req FR:pull-request-workflow/sweep.route.review.no-body-comments */
    it('should never post findings as PR comments or repeat them in the body', matches(/never repeats the inline comments\. Never post findings as PR comments/));

    /** @req FR:pull-request-workflow/sweep.thread */
    it('should classify unresolved threads', matches(/Classify each unresolved thread/));

    /** @req FR:pull-request-workflow/sweep.thread.confirmation */
    it('should resolve confirmation threads', matches(/only confirms a fix → resolve/));

    /** @req FR:pull-request-workflow/sweep.thread.closed */
    it('should leave threads that defer to the reviewer', matches(/defers to the reviewer[\s\S]*→ leave/));

    /** @req FR:pull-request-workflow/sweep.thread.escalated */
    it('should leave 🧭 threads', matches(/carries 🧭 → leave/));

    /** @req FR:pull-request-workflow/sweep.thread.stale */
    it('should resolve stale-reference claims with evidence', matches(/pushed head has it → resolve with evidence/));

    /** @req FR:pull-request-workflow/sweep.thread.open */
    it('should address unanswered requests', matches(/Reviewer request stands unanswered/));

    /** @req FR:pull-request-workflow/sweep.thread.default */
    it('should treat unclear threads as open', matches(/or class unclear → address/));

    /** @req FR:pull-request-workflow/sweep.thread.verify */
    it('should verify reviewer claims', matches(/Verify each reviewer claim against the real code/));

    /** @req FR:pull-request-workflow/sweep.thread.verify.fix */
    it('should implement the best fix for valid claims', matches(/implement the best fix, not just the literal suggestion/));

    /** @req FR:pull-request-workflow/sweep.thread.verify.refute */
    it('should refute wrong claims with evidence', matches(/refute in the thread with evidence/));

    /** @req FR:pull-request-workflow/sweep.thread.gate */
    it('should never resolve or fix 🔒 threads', matches(/Root comment carries 🔒 → never resolve or fix/));

    /** @req FR:pull-request-workflow/sweep.thread.gate.respond */
    it('should respond to actionable 🔒 threads and leave them unresolved', matches(/respond only if it asks something actionable, leave unresolved/));

    /** @req FR:pull-request-workflow/sweep.autonomy */
    it('should apply only non-controversial fixes', matches(/only non-controversial fixes/));

    /** @req FR:pull-request-workflow/sweep.autonomy.escalate */
    it('should escalate scope and design changes', matches(/changes scope or design/));

    /** @req FR:pull-request-workflow/sweep.autonomy.escalate.scope-creep */
    it('should escalate widening scope once', matches(/Escalate once when a review keeps widening/));

    /** @req FR:pull-request-workflow/sweep.autonomy.escalate.customer */
    it('should escalate customer and reliability impact', matches(/affects customers or system reliability/));

    /** @req FR:pull-request-workflow/sweep.autonomy.escalate.interface */
    it('should escalate UI, UX, and API changes', matches(/user interface, user experience, or public API/));

    /** @req FR:pull-request-workflow/sweep.autonomy.escalate.risk */
    it('should escalate security and legal changes', matches(/security or legal posture/));

    /** @req FR:pull-request-workflow/sweep.autonomy.report-only */
    it('should keep escalations in the report', matches(/report only, never as a PR comment/));

    /** @req FR:pull-request-workflow/sweep.autonomy.report-only.hand-back */
    it('should mark hand-back replies with 🧭', matches(/hands a question back to the user[\s\S]*carries 🧭/));

    /** @req FR:pull-request-workflow/sweep.autonomy.no-approve */
    it('should never approve', matches(/Never `APPROVE`/));

    /** @req FR:pull-request-workflow/sweep.safety */
    it('should isolate each PR in a fresh worktree', matches(/its own fresh worktree off the PR head/));

    /** @req FR:pull-request-workflow/sweep.safety.no-recycle */
    it('should never recycle worktrees', matches(/NEVER recycle worktrees\/folders!/));

    /** @req FR:pull-request-workflow/sweep.safety.busy */
    it('should defer PRs checked out with uncommitted changes elsewhere', matches(/checked out in another worktree with uncommitted changes, defer the PR/));

    /** @req FR:pull-request-workflow/sweep.safety.preserve */
    it('should never discard uncommitted work it did not create', matches(/Never discard or overwrite uncommitted work you did not create/));

    /** @req FR:pull-request-workflow/sweep.safety.stash */
    it('should stash only in its own worktree on a PR it claimed', matches(/Stash only in this pass's own worktree, on a PR whose WIP label this run added/));

    /** @req FR:pull-request-workflow/sweep.safety.stash.main */
    it('should never stash in the main repo folder', matches(/Never stash in the main repo folder/));

    /** @req FR:pull-request-workflow/sweep.safety.foreground */
    it('should run tests in the foreground', matches(/Run tests in the \*\*foreground\*\*/));

    /** @req FR:pull-request-workflow/sweep.safety.fork */
    it('should not execute untrusted fork code without confirmation', matches(/Fork PRs from someone without write access to the repo: never execute their code without confirmation/));

    /** @req FR:pull-request-workflow/sweep.safety.fork.unattended */
    it('should treat unanswerable confirmation as declined', matches(/If no one can answer \(an unattended run\), treat it as declined/));

    /** @req FR:pull-request-workflow/sweep.safety.fork.no-substitute */
    it('should not substitute another command for a declined head', matches(/never run the head another way/));

    /** @req FR:pull-request-workflow/sweep.safety.fork.report */
    it('should report checks not run locally', matches(/report that checks were not run locally/));

    /** @req FR:pull-request-workflow/sweep.agent */
    it('should run each PR in its own subagent', matches(/in its own subagent/));

    /** @req FR:pull-request-workflow/sweep.agent.carry */
    it('should carry forward only summaries', matches(/Carry forward only the result summary, never the transcript/));

    /** @req FR:pull-request-workflow/sweep.converge */
    it('should publish the report, then keep sweeping', matches(/Publish the report first, then keep going[\s\S]*DO NOT STOP while PRs remain to sweep/));

    /** @req FR:pull-request-workflow/sweep.converge.ci-wait */
    it('should wait for checks on PRs it pushed to', matches(/Checks running on a PR you pushed to:\*\* wait/));

    /** @req FR:pull-request-workflow/sweep.converge.ci-wait.duration */
    it("should base the wait on the repo's usual check time", matches(/median duration of its last 10 successful runs/));

    /** @req FR:pull-request-workflow/sweep.converge.ci-wait.bound */
    it('should report PRs still pending after two waits as testing', matches(/Still pending after two waits → report it as testing/));

    /** @req FR:pull-request-workflow/sweep.converge.stall */
    it('should stop when a pass makes no progress', matches(/a full pass makes no progress/));

    /** @req FR:pull-request-workflow/sweep.converge.ceiling */
    it('should stop at 10 iterations', matches(/10 iterations pass/));

    /** @req FR:pull-request-workflow/sweep.converge.stop */
    it('should stop only when nothing dispatchable remains', matches(/Stop when:\*\* nothing dispatchable remains for the user/));

    /** @req FR:pull-request-workflow/sweep.converge.no-stranded */
    it('should not strand PRs the sweep could finish', matches(/Never end with a PR still assigned to the user for something you could do yourself/));

    /** @req FR:pull-request-workflow/sweep.converge.no-bypass */
    it('should not work around denied permissions', matches(/never work around a denied permission/));

    /** @req FR:pull-request-workflow/sweep.converge.no-bypass.report */
    it('should report denied commands', matches(/report the denied command/));

    /** @req FR:pull-request-workflow/sweep.converge.retry */
    it('should retry failed bulk calls individually', matches(/Retry a failed bulk `gh` call once as individual per-PR calls/));

    /** @req FR:pull-request-workflow/sweep.report */
    it('should report one row per PR, decisions first', matches(/One row per PR, decisions first/));

    /** @req FR:pull-request-workflow/sweep.report.link */
    it('should link every PR number', matches(/Link every PR as `\[\{number\}\]\(\{url\}\)`, with no `#`, and never mention a PR number without its link/));

    /** @req FR:pull-request-workflow/sweep.report.threads */
    it('should link threads awaiting the user', matches(/link each thread awaiting the user's answer/));

    /** @req FR:pull-request-workflow/sweep.report.fresh */
    it('should never report stale status', matches(/never show status older than 10 minutes/));

    /** @req FR:pull-request-workflow/sweep.report.remaining */
    it('should report what remains', matches(/\{n\} PRs still to sweep · \{n\} in progress/));

    /** @req FR:pull-request-workflow/sweep.report.gaps */
    it('should list gaps once', matches(/\*\*Gaps:\*\* \{each tool, permission, or environment gap once\}/));

    /** @req FR:pull-request-workflow/sweep.output */
    /** @req FR:pull-request-workflow/sweep.output.row */
    it('should define the report table', matches(/\| PR +\| Title +\| Status +\| Next +\|[\s\S]*`🧭 Decide`[\s\S]*`✅ Ready`/));

    /** @req FR:pull-request-workflow/sweep.output.progress */
    it('should include the progress line', matches(/next check \{HH:MM\}/));

    /** @req FR:pull-request-workflow/sweep.output.gaps */
    it('should include gaps', matches(/\*\*Gaps:\*\*/));
  });

  describe('pr-sweep.md skill', () => {
    const commandPath = join(COMMANDS_DIR, 'pr-sweep.md');

    /** @req FR:pull-request-workflow/sweep.@ai-skill */
    it('should exist with required frontmatter and reference the playbook', async () => {
      expect(existsSync(commandPath)).toBe(true);
      const content = await readFile(commandPath, 'utf-8');
      expect(content).toMatch(/name:\s*"pr-sweep"/);
      expect(content).toMatch(/allowed-tools:/);
      expect(content).toMatch(/sweep-pull-requests/);
    });
  });
});
