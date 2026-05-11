import { describe, it, expect } from '@jest/globals';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Tests for pull-request-workflow playbooks and commands
 */
describe('Pull Request Workflow', () => {
  const PLAYBOOKS_DIR = join(__dirname, '../../../src/resources/playbooks');
  const COMMANDS_DIR = join(__dirname, '../../../src/resources/ai-config/commands');

  describe('review-pull-request.md playbook', () => {
    const playbookPath = join(PLAYBOOKS_DIR, 'review-pull-request.md');

    /** @req FR:pull-request-workflow/review */
    it('should exist', () => {
      expect(existsSync(playbookPath)).toBe(true);
    });

    /** @req FR:pull-request-workflow/review */
    it('should NOT have YAML frontmatter', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      const lines = content.split('\n');
      expect(lines[0]).not.toBe('---');
    });

    /** @req FR:pull-request-workflow/review */
    it('should have a title heading', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/^# .*[Rr]eview.*[Pp]ull [Rr]equest/m);
    });

    /** @req FR:pull-request-workflow/review.setup */
    it('should have a Setup phase', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/### Phase 1: Setup/);
    });

    /** @req FR:pull-request-workflow/review.setup.get */
    it('should reference gh pr view for setup', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/gh pr view/);
    });

    // @req FR:pull-request-workflow/review.setup.uncommitted — cannot be automated: runtime AI behavior (stop on uncommitted changes)
    it.skip('should stop on uncommitted changes', () => {});

    // @req FR:pull-request-workflow/review.setup.checkout — cannot be automated: runtime AI decision (conditional checkout based on PR size)
    it.skip('should conditionally checkout based on PR size', () => {});

    // @req FR:pull-request-workflow/review.setup.todo — cannot be automated: runtime AI behavior (create todo list)
    it.skip('should create tracking todo list', () => {});

    /** @req FR:pull-request-workflow/review.context */
    it('should have a Context phase', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/### Phase 2: Context/);
    });

    // @req FR:pull-request-workflow/review.context.issue — cannot be automated: runtime AI behavior (read linked issue context)
    it.skip('should read linked issue context', () => {});

    // @req FR:pull-request-workflow/review.context.feature — cannot be automated: runtime AI behavior (read feature specs)
    it.skip('should read feature context from .xe/features/', () => {});

    // @req FR:pull-request-workflow/review.context.prior — cannot be automated: runtime AI behavior (read prior work artifacts)
    it.skip('should read prior work artifacts', () => {});

    /** @req FR:pull-request-workflow/review.analyze */
    it('should have an Analysis phase', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/### Phase 3: Analysis/);
    });

    /** @req FR:pull-request-workflow/review.analyze.quality */
    it('should include quality analysis dimension', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/[Qq]uality/);
    });

    /** @req FR:pull-request-workflow/review.analyze.correctness */
    it('should include functional correctness analysis dimension', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/[Ff]unctional [Cc]orrectness/i);
    });

    /** @req FR:pull-request-workflow/review.analyze.alignment */
    it('should include project alignment analysis dimension', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/[Pp]roject [Aa]lignment/i);
    });

    /** @req FR:pull-request-workflow/review.classify */
    it('should have a Classification phase', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/### Phase 4: Classify/);
    });

    /** @req FR:pull-request-workflow/review.classify.blocker */
    it('should define Blocker severity tier', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/🚫.*[Bb]locker/);
    });

    /** @req FR:pull-request-workflow/review.classify.should-fix */
    it('should define Should fix severity tier', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/⚠️.*[Ss]hould fix/);
    });

    /** @req FR:pull-request-workflow/review.classify.suggestion */
    it('should define Suggestion severity tier', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/💡.*[Ss]uggestion/);
    });

    /** @req FR:pull-request-workflow/review.consult */
    it('should have a User Consultation phase', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/### Phase 5: User Consultation/);
    });

    /** @req FR:pull-request-workflow/review.consult.progressive */
    it('should reference AskUserQuestion for consultation', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/AskUserQuestion/);
    });

    // @req FR:pull-request-workflow/review.consult.individual — cannot be automated: runtime AUQ interaction (individual review drill-down)
    it.skip('should support individual review drill-down', () => {});

    // @req FR:pull-request-workflow/review.consult.grouping — cannot be automated: runtime AUQ interaction (group 5+ items by theme)
    it.skip('should group 5+ items by theme', () => {});

    /** @req FR:pull-request-workflow/review.post */
    it('should have a Post Review phase', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/### Phase 6: Post Review/);
    });

    /** @req FR:pull-request-workflow/review.post.event */
    it('should specify COMMENT as default event type', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/COMMENT/);
    });

    /** @req FR:pull-request-workflow/review.post.suggestion */
    it('should document GitHub suggestion code blocks', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/suggestion/);
    });

    // @req FR:pull-request-workflow/review.post.suggestion-span — cannot be automated: runtime AI posting behavior (suggestion blocks span all relevant lines)
    it.skip('should span suggestion blocks across all relevant lines', () => {});

    /** @req FR:pull-request-workflow/review.post.prefix */
    it('should specify AI prefix requirement', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/\[Catalyst\]/);
    });

    // @req FR:pull-request-workflow/review.post.body — cannot be automated: runtime AI output formatting (review body template)
    it.skip('should format review body with severity counts', () => {});

    // @req FR:pull-request-workflow/review.post.line-comments — cannot be automated: runtime AI posting behavior (line-level comments)
    it.skip('should post line-level comments for actionable findings', () => {});

    /** @req FR:pull-request-workflow/review.post.no-changes */
    it('should explicitly prohibit code changes', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/NOT.*code changes|NOT.*commit|NOT.*push/i);
    });

    it('should have Error Handling section', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/## Error Handling/);
    });

    it('should have Success Criteria section', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/## Success Criteria/);
    });
  });

  describe('update-pull-request.md playbook', () => {
    const playbookPath = join(PLAYBOOKS_DIR, 'update-pull-request.md');

    /** @req FR:pull-request-workflow/update */
    it('should exist', () => {
      expect(existsSync(playbookPath)).toBe(true);
    });

    /** @req FR:pull-request-workflow/update */
    it('should have trigger frontmatter for PR events', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/^---\ntriggers:/);
      expect(content).toMatch(/pull_request_review/);
      expect(content).toMatch(/issue_comment/);
    });

    /** @req FR:pull-request-workflow/update */
    it('should have a title heading', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/^# .*[Uu]pdate.*[Pp]ull [Rr]equest/m);
    });

    /** @req FR:pull-request-workflow/update.setup */
    it('should have a Setup phase', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/### Phase 1: Setup/);
    });

    /** @req FR:pull-request-workflow/update.setup.get */
    it('should reference gh pr view for setup', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/gh pr view/);
    });

    // @req FR:pull-request-workflow/update.setup.uncommitted — cannot be automated: runtime AI behavior (stop on uncommitted changes before checkout)
    it.skip('should stop on uncommitted changes before checkout', () => {});

    /** @req FR:pull-request-workflow/update.setup.checkout */
    it('should reference gh pr checkout', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/gh pr checkout/);
    });

    /** @req FR:pull-request-workflow/update.setup.branch */
    it('should verify branch matches PR head ref', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/branch.*head|headRefName/i);
    });

    // @req FR:pull-request-workflow/update.setup.todo — cannot be automated: runtime AI behavior (create todo list)
    it.skip('should create tracking todo list', () => {});

    /** @req FR:pull-request-workflow/update.research */
    it('should have a Research phase', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/### Phase 2: Research/);
    });

    /** @req FR:pull-request-workflow/update.research.threads */
    it('should reference GraphQL API for fetching review threads', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/gh api graphql/);
    });

    // @req FR:pull-request-workflow/update.research.metadata — cannot be automated: runtime AI behavior (track thread metadata including force-accept tags)
    it.skip('should track thread metadata including force-accept tags', () => {});

    // @req FR:pull-request-workflow/update.research.context — cannot be automated: runtime AI behavior (read project context and feature specs)
    it.skip('should read project context and feature specs', () => {});

    // @req FR:pull-request-workflow/update.research.exit — cannot be automated: runtime AI behavior (summarize and stop when no threads need responses)
    it.skip('should summarize and stop when no threads need responses', () => {});

    /** @req FR:pull-request-workflow/update.classify */
    it('should have a Classification phase', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/### Phase 3: Classification/);
    });

    /** @req FR:pull-request-workflow/update.classify.routine */
    it('should define Routine feedback tier', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/✅.*[Rr]outine/);
    });

    /** @req FR:pull-request-workflow/update.classify.targeted */
    it('should define Targeted feedback tier', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/🔧.*[Tt]argeted/);
    });

    /** @req FR:pull-request-workflow/update.classify.complex */
    it('should define Complex feedback tier', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/💬.*[Cc]omplex/);
    });

    /** @req FR:pull-request-workflow/update.consult */
    it('should have a User Consultation phase', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/### Phase 4: User Consultation/);
    });

    /** @req FR:pull-request-workflow/update.consult */
    it('should reference AUQ for consultation', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      // Playbooks invoke AUQ via the auq.md action file (per feedback_auq-invocation-pattern)
      expect(content).toMatch(/AskUserQuestion|auq\.md|\bAUQ\b/);
    });

    // @req FR:pull-request-workflow/update.consult.routine — cannot be automated: runtime AUQ interaction (batch routine items for approval)
    it.skip('should batch routine items for approval', () => {});

    // @req FR:pull-request-workflow/update.consult.individual — cannot be automated: runtime AUQ interaction (present targeted/complex items individually)
    it.skip('should present targeted/complex items individually', () => {});

    // @req FR:pull-request-workflow/update.consult.escalation — cannot be automated: runtime AUQ interaction (need more context and defer to Q&A paths)
    it.skip('should support need more context and defer to Q&A escalation', () => {});

    // @req FR:pull-request-workflow/update.consult.small — cannot be automated: runtime AUQ interaction (skip summary for ≤4 items)
    it.skip('should skip summary round for 4 or fewer items', () => {});

    // @req FR:pull-request-workflow/update.consult.large — cannot be automated: runtime AUQ interaction (summary round for >8 items)
    it.skip('should use summary round for more than 8 items', () => {});

    /** @req FR:pull-request-workflow/update.execute */
    it('should have an Execute phase', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/### Phase 5: Execute/);
    });

    // @req FR:pull-request-workflow/update.execute.implement — cannot be automated: runtime AI behavior (implement approved changes)
    it.skip('should implement approved changes including routine fixes', () => {});

    // @req FR:pull-request-workflow/update.execute.autonomous — cannot be automated: runtime AI behavior (post questions and discussion autonomously)
    it.skip('should post questions and discussion responses autonomously', () => {});

    // @req FR:pull-request-workflow/update.execute.action — cannot be automated: runtime AI behavior (every response results in action)
    it.skip('should ensure every response results in action', () => {});

    // @req FR:pull-request-workflow/update.execute.templates — cannot be automated: runtime AI output formatting (response templates)
    it.skip('should use response templates with Catalyst prefix', () => {});

    /** @req FR:pull-request-workflow/update.execute.pushback */
    it('should document push-back response template', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/[Nn]eeds discussion|[Pp]ush.back/);
    });

    /** @req FR:pull-request-workflow/update.execute.force-accept */
    it('should document force-accept mechanism', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/#force-accept/);
    });

    /** @req FR:pull-request-workflow/update.execute.reply */
    it('should reference gh api for posting replies', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/gh api repos/);
    });

    /** @req FR:pull-request-workflow/update.validate */
    it('should have a Validate phase', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/### Phase 6: Validate/);
    });

    /** @req FR:pull-request-workflow/update.validate.tests */
    it('should require running tests', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/[Rr]un.*tests|[Tt]est.*MUST/i);
    });

    // @req FR:pull-request-workflow/update.validate.errors — cannot be automated: runtime AI behavior (tests MUST have no errors)
    it.skip('should enforce tests MUST have no errors', () => {});

    // @req FR:pull-request-workflow/update.validate.warnings — cannot be automated: runtime AI behavior (tests SHOULD have no warnings)
    it.skip('should enforce tests SHOULD have no warnings', () => {});

    // @req FR:pull-request-workflow/update.validate.fix — cannot be automated: runtime AI behavior (fix failing tests before proceeding)
    it.skip('should fix failing tests before proceeding', () => {});

    /** @req FR:pull-request-workflow/update.commit */
    it('should have a Review and Commit phase', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/### Phase 7: Review and Commit/);
    });

    // @req FR:pull-request-workflow/update.commit.review — cannot be automated: runtime AI behavior (user approval before commit)
    it.skip('should require user approval before commit', () => {});

    /** @req FR:pull-request-workflow/update.commit.attribution */
    it('should require Co-authored-by trailers', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/Co-authored-by/i);
    });

    /** @req FR:pull-request-workflow/update.commit.summary */
    it('should require summary comment', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/[Ss]ummary [Cc]omment|PR Update Summary/);
    });

    it('should have Error Handling section', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/## Error Handling/);
    });

    it('should have Success Criteria section', async () => {
      const content = await readFile(playbookPath, 'utf-8');
      expect(content).toMatch(/## Success Criteria/);
    });
  });

  describe('pr-review.md command', () => {
    const commandPath = join(COMMANDS_DIR, 'pr-review.md');

    /** @req FR:pull-request-workflow/review.command */
    it('should exist', () => {
      expect(existsSync(commandPath)).toBe(true);
    });

    /** @req FR:pull-request-workflow/review.command */
    it('should have YAML frontmatter', async () => {
      const content = await readFile(commandPath, 'utf-8');
      expect(content).toMatch(/^---\n/);
    });

    /** @req FR:pull-request-workflow/review.command */
    it('should have required frontmatter fields', async () => {
      const content = await readFile(commandPath, 'utf-8');
      expect(content).toMatch(/name:\s*"pr-review"/);
      expect(content).toMatch(/description:/);
      expect(content).toMatch(/allowed-tools:/);
      expect(content).toMatch(/argument-hint:/);
    });

    /** @req FR:pull-request-workflow/review.command.input */
    it('should accept pr-number as argument', async () => {
      const content = await readFile(commandPath, 'utf-8');
      expect(content).toMatch(/pr-number/);
    });

    /** @req FR:pull-request-workflow/review.command.platform */
    it('should use AI_PLATFORM placeholder', async () => {
      const content = await readFile(commandPath, 'utf-8');
      expect(content).toMatch(/\$\$AI_PLATFORM\$\$/);
    });

    /** @req FR:pull-request-workflow/review.command */
    it('should reference review-pull-request playbook', async () => {
      const content = await readFile(commandPath, 'utf-8');
      expect(content).toMatch(/review-pull-request/);
    });
  });

  describe('pr-update.md command', () => {
    const commandPath = join(COMMANDS_DIR, 'pr-update.md');

    /** @req FR:pull-request-workflow/update.command */
    it('should exist', () => {
      expect(existsSync(commandPath)).toBe(true);
    });

    /** @req FR:pull-request-workflow/update.command */
    it('should have YAML frontmatter', async () => {
      const content = await readFile(commandPath, 'utf-8');
      expect(content).toMatch(/^---\n/);
    });

    /** @req FR:pull-request-workflow/update.command */
    it('should have required frontmatter fields', async () => {
      const content = await readFile(commandPath, 'utf-8');
      expect(content).toMatch(/name:\s*"pr-update"/);
      expect(content).toMatch(/description:/);
      expect(content).toMatch(/allowed-tools:/);
      expect(content).toMatch(/argument-hint:/);
    });

    /** @req FR:pull-request-workflow/update.command.input */
    it('should accept pr-number as argument', async () => {
      const content = await readFile(commandPath, 'utf-8');
      expect(content).toMatch(/pr-number/);
    });

    /** @req FR:pull-request-workflow/update.command.platform */
    it('should use AI_PLATFORM placeholder', async () => {
      const content = await readFile(commandPath, 'utf-8');
      expect(content).toMatch(/\$\$AI_PLATFORM\$\$/);
    });

    /** @req FR:pull-request-workflow/update.command */
    it('should reference update-pull-request playbook', async () => {
      const content = await readFile(commandPath, 'utf-8');
      expect(content).toMatch(/update-pull-request/);
    });
  });
});
