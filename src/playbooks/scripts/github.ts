import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

/**
 * Get project name from git repository
 */
export function getProjectName(): string {
  try {
    const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    const repoName = remoteUrl.split('/').pop()?.replace('.git', '') || 'New Project';
    return repoName;
  } catch {
    return 'New Project';
  }
}

/**
 * Check if GitHub CLI is available
 */
export function isGitHubCliAvailable(): boolean {
  try {
    execSync('gh --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Find issue number with matching title pattern
 * Returns issue number if found, null otherwise
 */
export function findIssue(titlePattern: string, projectName: string): string | null {
  try {
    const issues = execSync('gh issue list --state open --json number,title', { encoding: 'utf8' });
    const issueList = JSON.parse(issues);
    const matchingIssue = issueList.find((issue: any) =>
      issue.title.includes(titlePattern) && issue.title.includes(projectName)
    );
    return matchingIssue ? matchingIssue.number.toString() : null;
  } catch (error) {
    console.log('Could not find matching issue.');
    return null;
  }
}

/**
 * Fetch issue body from GitHub
 */
export function getIssueBody(issueNumber: string): string | null {
  try {
    const issueData = execSync(`gh issue view ${issueNumber} --json body`, { encoding: 'utf8' });
    const issue = JSON.parse(issueData);
    return issue.body || null;
  } catch (error) {
    console.warn(`Could not fetch issue #${issueNumber}.`);
    return null;
  }
}

/**
 * Find open pull requests matching a search pattern
 * Returns array of PR numbers and titles, or empty array if none found
 */
export function findOpenPRs(searchPattern: string): Array<{ number: number; title: string }> {
  try {
    const prs = execSync(`gh pr list --state open --search "${searchPattern}" --json number,title`, { encoding: 'utf8' });
    const prList = JSON.parse(prs);
    return prList || [];
  } catch (error) {
    console.log('Could not find matching PRs.');
    return [];
  }
}

/**
 * Fetch PR title and body from GitHub
 */
export function getPRView(prNumber: string): { title: string; body: string } | null {
  try {
    const prData = execSync(`gh pr view ${prNumber} --json title,body`, { encoding: 'utf8' });
    const pr = JSON.parse(prData);
    return {
      title: pr.title || '',
      body: pr.body || ''
    };
  } catch (error) {
    console.warn(`Could not fetch PR #${prNumber}.`);
    return null;
  }
}

interface PRComment {
  id: number;
  user: { login: string };
  body: string;
  created_at: string;
  in_reply_to_id: number | null;
  path?: string;
  line?: number;
}

interface ThreadInfo {
  thread_id: number;
  path: string;
  line: number | null;
  latest_comment_id: number;
  latest_user: string;
  latest_body: string;
  created_at: string;
  push_back_count?: number;
  has_force_accept?: boolean;
}

/**
 * Find PR comment threads that need replies from the AI platform
 * Returns array of threads where the latest reply is NOT from the AI platform
 */
export function findPRThreadsNeedingReplies(
  prNumber: string,
  aiPlatform: string = 'AI'
): ThreadInfo[] {
  try {
    // Fetch all PR comments using GitHub API
    const output = execSync(
      `gh api /repos/{owner}/{repo}/pulls/${prNumber}/comments --paginate`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 } // 10MB buffer
    );
    const comments: PRComment[] = JSON.parse(output);

    // Group comments by thread
    const threads = new Map<number, PRComment[]>();
    for (const comment of comments) {
      const threadId = comment.in_reply_to_id ?? comment.id;
      if (!threads.has(threadId)) {
        threads.set(threadId, []);
      }
      threads.get(threadId)!.push(comment);
    }

    // Find threads needing replies
    const aiPrefix = `[Catalyst][${aiPlatform}]`;
    const needsReply: ThreadInfo[] = [];

    for (const [threadId, threadComments] of threads.entries()) {
      // Sort by creation time to get the latest comment
      const sortedComments = [...threadComments].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      const latest = sortedComments[sortedComments.length - 1];
      const original = threadComments.find(c => c.in_reply_to_id === null) || sortedComments[0];

      // Skip if latest comment starts with the AI platform prefix
      if (latest.body.trimStart().startsWith(aiPrefix)) {
        continue;
      }

      // Count push-backs in thread (look for "Push-back (#/3)" pattern)
      const pushBackRegex = /Push-back \(#(\d+)\/3\)/i;
      let maxPushBackCount = 0;
      for (const comment of sortedComments) {
        if (comment.body.includes(aiPrefix)) {
          const match = comment.body.match(pushBackRegex);
          if (match) {
            const count = parseInt(match[1], 10);
            maxPushBackCount = Math.max(maxPushBackCount, count);
          }
        }
      }

      // Check for #force-accept tag in latest comment
      const hasForceAccept = latest.body.includes('#force-accept');

      // This thread needs a reply
      needsReply.push({
        thread_id: threadId,
        path: original.path || 'N/A',
        line: original.line || null,
        latest_comment_id: latest.id,
        latest_user: latest.user.login,
        latest_body: latest.body.substring(0, 200), // Preview
        created_at: latest.created_at,
        push_back_count: maxPushBackCount,
        has_force_accept: hasForceAccept,
      });
    }

    return needsReply;
  } catch (error) {
    console.error(`Could not fetch PR #${prNumber} comments:`, error);
    return [];
  }
}

/**
 * Get full thread comments for a specific PR thread
 * Returns all comments in chronological order with user, timestamp, and body
 */
export function getThreadComments(prNumber: string, threadId: string): PRComment[] {
  try {
    // Fetch all PR comments
    const output = execSync(
      `gh api /repos/{owner}/{repo}/pulls/${prNumber}/comments --paginate`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );
    const allComments: PRComment[] = JSON.parse(output);

    // Filter to this thread only
    const threadIdNum = parseInt(threadId, 10);
    const threadComments = allComments.filter(
      c => c.id === threadIdNum || c.in_reply_to_id === threadIdNum
    );

    // Sort by creation time
    return threadComments.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  } catch (error) {
    console.error(`Could not fetch thread #${threadId} comments:`, error);
    return [];
  }
}

/**
 * Post a threaded reply to a PR comment
 * Returns the new comment ID if successful, null otherwise
 */
export function postPRCommentReply(
  prNumber: string,
  commentId: string,
  body: string
): number | null {
  try {
    const output = execSync(
      `gh api --method POST -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28" /repos/{owner}/{repo}/pulls/${prNumber}/comments/${commentId}/replies -f 'body=${body.replace(/'/g, "'\\''")}'`,
      { encoding: 'utf-8' }
    );
    const response = JSON.parse(output);
    return response.id || null;
  } catch (error) {
    console.error(`Could not post reply to comment #${commentId}:`, error);
    return null;
  }
}

interface FeatureInfo {
  feature_id: string | null;
  branch_name: string;
  spec_exists: boolean;
  plan_exists: boolean;
  tasks_exists: boolean;
  spec_path: string | null;
  plan_path: string | null;
  tasks_path: string | null;
}

/**
 * Detect feature ID from PR and check for related files
 * Looks for feature ID in branch name (xe/{user}/{feature-id}) or PR body
 */
export function getPRFeature(prNumber: string): FeatureInfo | null {
  try {
    // Get PR data including branch name
    const prData = execSync(
      `gh pr view ${prNumber} --json headRefName,body`,
      { encoding: 'utf8' }
    );
    const pr = JSON.parse(prData);
    const branchName = pr.headRefName || '';
    const prBody = pr.body || '';

    // Try to extract feature ID from branch name (xe/{user}/{feature-id} pattern)
    let featureId: string | null = null;
    const branchMatch = branchName.match(/xe\/[^\/]+\/([^\/]+)/);
    if (branchMatch) {
      featureId = branchMatch[1];
    }

    // If not found in branch, look for feature references in PR body
    if (!featureId) {
      // Look for `.xe/features/{feature-id}/` pattern (or legacy `.xe/specs/{feature-id}/`)
      const bodyMatch = prBody.match(/\.xe\/(?:specs|features)\/([^\/\s]+)/);
      if (bodyMatch) {
        featureId = bodyMatch[1];
      }
    }

    // Check if feature files exist
    const result: FeatureInfo = {
      feature_id: featureId,
      branch_name: branchName,
      spec_exists: false,
      plan_exists: false,
      tasks_exists: false,
      spec_path: null,
      plan_path: null,
      tasks_path: null,
    };

    if (featureId) {
      const specPath = `.xe/features/${featureId}/spec.md`;
      const planPath = `.xe/features/${featureId}/plan.md`;
      const tasksPath = `.xe/features/${featureId}/tasks.md`;

      try {
        execSync(`test -f ${specPath}`, { stdio: 'ignore' });
        result.spec_exists = true;
        result.spec_path = specPath;
      } catch {}

      try {
        execSync(`test -f ${planPath}`, { stdio: 'ignore' });
        result.plan_exists = true;
        result.plan_path = planPath;
      } catch {}

      try {
        execSync(`test -f ${tasksPath}`, { stdio: 'ignore' });
        result.tasks_exists = true;
        result.tasks_path = tasksPath;
      } catch {}
    }

    return result;
  } catch (error) {
    console.error(`Could not detect feature for PR #${prNumber}:`, error);
    return null;
  }
}

/**
 * Fetch issue body and comments from GitHub
 */
export function getIssueWithComments(issueNumber: string): string | null {
  try {
    const issueData = execSync(`gh issue view ${issueNumber} --json body,comments`, { encoding: 'utf8' });
    const issue = JSON.parse(issueData);

    let content = issue.body || '';

    if (issue.comments && issue.comments.length > 0) {
      content += '\n\n---\n\n## Issue Comments\n\n';
      issue.comments.forEach((comment: any, index: number) => {
        content += `### Comment ${index + 1} (by ${comment.author?.login || 'unknown'})\n\n`;
        content += comment.body + '\n\n';
      });
    }

    return content || null;
  } catch (error) {
    console.warn(`Could not fetch issue #${issueNumber} with comments.`);
    return null;
  }
}

/**
 * Read issue template, strip frontmatter, and replace placeholders
 */
export function prepareIssueTemplate(
  templateName: string,
  projectName: string,
  additionalReplacements?: Record<string, string>
): string | null {
  const templatePath = path.join(__dirname, `../../templates/issues/${templateName}.md`);

  if (!fs.existsSync(templatePath)) {
    console.error(`Could not find ${templateName}.md template at: ${templatePath}`);
    return null;
  }

  let template = fs.readFileSync(templatePath, "utf8");

  // Strip front matter
  const frontMatterEnd = template.indexOf('---', 4);
  if (frontMatterEnd !== -1) {
    template = template.substring(frontMatterEnd + 3).trim();
  }

  // Replace project name placeholder
  template = template.replace(/{project-name}/g, projectName);

  // Apply additional replacements if provided
  if (additionalReplacements) {
    for (const [key, value] of Object.entries(additionalReplacements)) {
      template = template.replace(new RegExp(`{${key}}`, 'g'), value);
    }
  }

  return template;
}

/**
 * Create GitHub issue using gh CLI
 */
export function createGitHubIssue(title: string, body: string): void {
  const command = `gh issue create --title "${title}" --body "${body.replace(
    /"/g,
    '\\"'
  )}" --assignee ""`;

  try {
    const result = execSync(command, { encoding: "utf8" });
    console.log("Issue created:", result.trim());
  } catch (error: any) {
    if (error.status === 1 && error.stderr?.includes('not logged in')) {
      console.error("Failed to create issue: You are not logged in to GitHub CLI.");
      console.error("Please run: gh auth login");
    } else {
      console.error("Failed to create issue:", error.message);
    }
  }
}

// CLI interface when executed directly
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage:');
    console.error('  github.js --get-issue <number>');
    console.error('  github.js --get-issue-with-comments <number>');
    console.error('  github.js --get-pr <number>');
    console.error('  github.js --get-pr-feature <pr-number>');
    console.error('  github.js --find-pr-threads <pr-number> [ai-platform]');
    console.error('  github.js --get-thread-comments <pr-number> <thread-id>');
    console.error('  github.js --post-pr-comment-reply <pr-number> <comment-id> <body>');
    console.error('  github.js --get-project-name');
    console.error('  github.js --find-issue <pattern> <project-name>');
    console.error('  github.js --find-open-prs <search-pattern>');
    process.exit(1);
  }

  const command = args[0];

  switch (command) {
    case '--get-issue':
      const issueNumber = args[1];
      if (!issueNumber) {
        console.error('Error: Issue number required');
        process.exit(1);
      }
      const body = getIssueBody(issueNumber);
      if (body) {
        console.log(body);
      } else {
        process.exit(1);
      }
      break;

    case '--get-issue-with-comments':
      const issueNumberWithComments = args[1];
      if (!issueNumberWithComments) {
        console.error('Error: Issue number required');
        process.exit(1);
      }
      const fullContent = getIssueWithComments(issueNumberWithComments);
      if (fullContent) {
        console.log(fullContent);
      } else {
        process.exit(1);
      }
      break;

    case '--get-pr':
      const prNumber = args[1];
      if (!prNumber) {
        console.error('Error: PR number required');
        process.exit(1);
      }
      const prData = getPRView(prNumber);
      if (prData) {
        console.log(JSON.stringify(prData, null, 2));
      } else {
        process.exit(1);
      }
      break;

    case '--get-pr-feature':
      const featurePrNumber = args[1];
      if (!featurePrNumber) {
        console.error('Error: PR number required');
        process.exit(1);
      }
      const featureInfo = getPRFeature(featurePrNumber);
      if (featureInfo) {
        console.log(JSON.stringify(featureInfo, null, 2));
      } else {
        process.exit(1);
      }
      break;

    case '--find-pr-threads':
      const findPrNumber = args[1];
      const aiPlatform = args[2] || 'AI';
      if (!findPrNumber) {
        console.error('Error: PR number required');
        process.exit(1);
      }
      const threads = findPRThreadsNeedingReplies(findPrNumber, aiPlatform);
      console.log(JSON.stringify(threads, null, 2));
      console.error('\n=== Summary ===');
      console.error(`Threads needing replies: ${threads.length}`);
      if (threads.length > 0) {
        console.error('\nThreads needing replies:');
        for (const thread of threads) {
          const forceAcceptTag = thread.has_force_accept ? ' [#force-accept]' : '';
          const pushBackTag = thread.push_back_count ? ` [push-backs: ${thread.push_back_count}]` : '';
          console.error(`  - Thread ${thread.thread_id}: ${thread.path}:${thread.line || 'N/A'}${forceAcceptTag}${pushBackTag}`);
          console.error(`    Latest by ${thread.latest_user}: ${thread.latest_body.substring(0, 80)}...`);
        }
      } else {
        console.error('\n✅ All threads have been replied to!');
      }
      break;

    case '--get-thread-comments':
      const threadPrNumber = args[1];
      const threadId = args[2];
      if (!threadPrNumber || !threadId) {
        console.error('Error: PR number and thread ID required');
        process.exit(1);
      }
      const threadComments = getThreadComments(threadPrNumber, threadId);
      console.log(JSON.stringify(threadComments, null, 2));
      break;

    case '--post-pr-comment-reply':
      const replyPrNumber = args[1];
      const commentId = args[2];
      const replyBody = args[3];
      if (!replyPrNumber || !commentId || !replyBody) {
        console.error('Error: PR number, comment ID, and body required');
        process.exit(1);
      }
      const newCommentId = postPRCommentReply(replyPrNumber, commentId, replyBody);
      if (newCommentId) {
        console.log(`Posted comment #${newCommentId}`);
        process.exit(0);
      } else {
        process.exit(1);
      }
      break;

    case '--get-project-name':
      console.log(getProjectName());
      break;

    case '--find-issue':
      const findPattern = args[1];
      const findProjectName = args[2];
      if (!findPattern || !findProjectName) {
        console.error('Error: Pattern and project name required');
        process.exit(1);
      }
      const foundIssue = findIssue(findPattern, findProjectName);
      if (foundIssue) {
        console.log(foundIssue);
        process.exit(0);
      } else {
        process.exit(1);
      }
      break;

    case '--find-open-prs':
      const searchPattern = args[1];
      if (!searchPattern) {
        console.error('Error: Search pattern required');
        process.exit(1);
      }
      const openPRs = findOpenPRs(searchPattern);
      if (openPRs.length > 0) {
        console.log(JSON.stringify(openPRs, null, 2));
        process.exit(0);
      } else {
        process.exit(1);
      }
      break;

    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}
