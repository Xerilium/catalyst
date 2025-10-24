#!/usr/bin/env node
/**
 * Find PR comment threads that need replies from the AI platform.
 *
 * This script identifies comment threads where:
 * 1. The latest reply is from a user (not the AI platform)
 * 2. The latest reply doesn't contain the AI platform prefix
 *
 * Usage:
 *   npx tsx .xe/playbooks/scripts/findPrThreadsNeedingReplies.ts <pr-number> [ai-platform]
 *
 * Arguments:
 *   pr-number: GitHub PR number to analyze
 *   ai-platform: AI platform name (e.g., "Claude", "Copilot"). Defaults to "AI"
 *
 * Output:
 *   JSON array of thread objects needing replies, each containing:
 *   - thread_id: Original comment ID to reply to
 *   - path: File path where comment was made
 *   - line: Line number (if applicable)
 *   - latest_comment_id: ID of the latest comment in thread
 *   - latest_user: Username who posted the latest comment
 *   - latest_body: Preview of the latest comment body
 *   - created_at: Timestamp of latest comment
 */

import { execSync } from 'child_process';

interface Comment {
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
}

function fetchPRComments(prNumber: number): Comment[] {
  try {
    // Note: {owner} and {repo} are GitHub CLI placeholders that get auto-resolved
    // based on the current repository context
    const output = execSync(
      `gh api /repos/{owner}/{repo}/pulls/${prNumber}/comments --paginate`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 } // 10MB buffer
    );
    return JSON.parse(output);
  } catch (error) {
    console.error('Error fetching PR comments:', error);
    process.exit(1);
  }
}

function groupByThread(comments: Comment[]): Map<number, Comment[]> {
  const threads = new Map<number, Comment[]>();

  for (const comment of comments) {
    // Original comments have no in_reply_to_id
    const threadId = comment.in_reply_to_id ?? comment.id;

    if (!threads.has(threadId)) {
      threads.set(threadId, []);
    }
    threads.get(threadId)!.push(comment);
  }

  return threads;
}

function findThreadsNeedingReplies(
  threads: Map<number, Comment[]>,
  aiPlatform: string = 'AI'
): ThreadInfo[] {
  const aiPrefix = `[Catalyst][${aiPlatform}]`;
  const needsReply: ThreadInfo[] = [];

  for (const [threadId, threadComments] of threads.entries()) {
    // Sort by creation time to get the latest comment
    const sortedComments = [...threadComments].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const latest = sortedComments[sortedComments.length - 1];
    const original = threadComments.find(c => c.in_reply_to_id === null) || sortedComments[0];

    // Check if latest comment starts with the AI platform prefix
    // This prevents false positives when the prefix appears in quotes
    if (latest.body.trimStart().startsWith(aiPrefix)) {
      continue;
    }

    // This thread needs a reply
    needsReply.push({
      thread_id: threadId,
      path: original.path || 'N/A',
      line: original.line || null,
      latest_comment_id: latest.id,
      latest_user: latest.user.login,
      latest_body: latest.body.substring(0, 200), // Preview
      created_at: latest.created_at,
    });
  }

  return needsReply;
}

function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: npx tsx findPrThreadsNeedingReplies.ts <pr-number> [ai-platform]');
    process.exit(1);
  }

  const prNumber = parseInt(args[0], 10);
  const aiPlatform = args[1] || 'AI';

  if (isNaN(prNumber)) {
    console.error('Error: pr-number must be a valid integer');
    process.exit(1);
  }

  // Fetch all PR comments
  const comments = fetchPRComments(prNumber);

  // Group by thread
  const threads = groupByThread(comments);

  // Find threads needing replies
  const threadsNeedingReplies = findThreadsNeedingReplies(threads, aiPlatform);

  // Output results as JSON
  console.log(JSON.stringify(threadsNeedingReplies, null, 2));

  // Print summary to stderr
  console.error('\n=== Summary ===');
  console.error(`Total threads: ${threads.size}`);
  console.error(`Threads needing replies: ${threadsNeedingReplies.length}`);

  if (threadsNeedingReplies.length > 0) {
    console.error('\nThreads needing replies:');
    for (const thread of threadsNeedingReplies) {
      console.error(`  - Thread ${thread.thread_id}: ${thread.path}:${thread.line}`);
      console.error(`    Latest by ${thread.latest_user}: ${thread.latest_body.substring(0, 80)}...`);
    }
  } else {
    console.error('\n✅ All threads have been replied to!');
  }
}

main();
