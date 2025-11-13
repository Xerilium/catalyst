/**
 * CLI command parser and router
 */

import { GitHubAdapter } from './adapter';
import type { GitHubClient } from './client';

export interface ParsedCommand {
  category: string;
  action: string;
  args: string[];
  flags: Record<string, string | boolean>;
  showHelp: boolean;
  format: 'json' | 'text';
}

export function parseCommand(argv: string[]): ParsedCommand {
  const flags: Record<string, string | boolean> = {};
  const args: string[] = [];
  let category = '';
  let action = '';

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg.startsWith('--')) {
      if (arg === '--help') {
        return { category, action, args, flags, showHelp: true, format: 'text' };
      }

      if (arg === '--json') {
        flags.json = true;
        continue;
      }

      const [key, value] = arg.slice(2).split('=');
      if (value) {
        flags[key] = value;
      } else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        flags[key] = argv[++i];
      } else {
        flags[key] = true;
      }
    } else {
      if (!category) {
        category = arg;
      } else if (!action) {
        action = arg;
      } else {
        args.push(arg);
      }
    }
  }

  return {
    category,
    action,
    args,
    flags,
    showHelp: !category,
    format: flags.json ? 'json' : 'text',
  };
}

export async function executeCommand(cmd: ParsedCommand, client?: GitHubClient): Promise<void> {
  const adapter = client || new GitHubAdapter();

  if (cmd.showHelp) {
    showHelp(cmd.category, cmd.action);
    return;
  }

  try {
    switch (cmd.category) {
      case 'issue':
        await handleIssueCommand(cmd, adapter);
        break;
      case 'pr':
        await handlePRCommand(cmd, adapter);
        break;
      case 'repo':
        await handleRepoCommand(cmd, adapter);
        break;
      case 'auth':
        await handleAuthCommand(cmd, adapter);
        break;
      default:
        console.error(`Unknown command: ${cmd.category}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
}

async function handleIssueCommand(cmd: ParsedCommand, adapter: GitHubClient): Promise<void> {
  switch (cmd.action) {
    case 'find':
      const findResult = await adapter.findIssue(cmd.args[0]);
      outputResult(findResult, cmd.format);
      break;
    case 'get':
      if (cmd.flags['with-comments']) {
        const withCommentsResult = await adapter.getIssueWithComments(parseInt(cmd.args[0]));
        outputResult(withCommentsResult, cmd.format);
      } else {
        const getResult = await adapter.getIssue(parseInt(cmd.args[0]));
        outputResult(getResult, cmd.format);
      }
      break;
    case 'list':
      const listResult = await adapter.listIssues({
        state: cmd.flags.state as any,
        labels: cmd.flags.label ? (cmd.flags.label as string).split(',') : undefined,
        assignee: cmd.flags.assignee as string,
        author: cmd.flags.author as string,
      });
      outputResult(listResult, cmd.format);
      break;
    case 'create':
      const createResult = await adapter.createIssue({
        title: cmd.flags.title as string,
        body: cmd.flags.body as string,
        labels: cmd.flags.labels ? (cmd.flags.labels as string).split(',') : undefined,
        assignees: cmd.flags.assignees ? (cmd.flags.assignees as string).split(',') : undefined,
      });
      outputResult(createResult, cmd.format);
      break;
    case 'comment':
      const commentResult = await adapter.addIssueComment(parseInt(cmd.args[0]), cmd.args[1]);
      outputResult(commentResult, cmd.format);
      break;
    case 'close':
      const closeResult = await adapter.closeIssue(parseInt(cmd.args[0]), cmd.flags.reason as string);
      outputResult(closeResult, cmd.format);
      break;
    default:
      console.error(`Unknown issue action: ${cmd.action}`);
      process.exit(1);
  }
}

async function handlePRCommand(cmd: ParsedCommand, adapter: GitHubClient): Promise<void> {
  switch (cmd.action) {
    case 'find':
      const findResult = await adapter.findPRs(cmd.args[0]);
      outputResult(findResult, cmd.format);
      break;
    case 'get':
      const getResult = await adapter.getPR(parseInt(cmd.args[0]));
      outputResult(getResult, cmd.format);
      break;
    case 'get-feature':
      const featureResult = await adapter.getPRFeature(parseInt(cmd.args[0]));
      outputResult(featureResult, cmd.format);
      break;
    case 'list':
      const listResult = await adapter.listPRs({
        state: cmd.flags.state as any,
        labels: cmd.flags.label ? (cmd.flags.label as string).split(',') : undefined,
      });
      outputResult(listResult, cmd.format);
      break;
    case 'comments':
      const commentsResult = await adapter.getPRComments(parseInt(cmd.args[0]));
      outputResult(commentsResult, cmd.format);
      break;
    case 'comment':
      const commentResult = await adapter.addPRComment(parseInt(cmd.args[0]), cmd.args[1]);
      outputResult(commentResult, cmd.format);
      break;
    case 'threads':
      const threadsResult = await adapter.findPRThreads(parseInt(cmd.args[0]));
      outputResult(threadsResult, cmd.format);
      break;
    case 'reply':
      const replyResult = await adapter.replyToThread(
        parseInt(cmd.args[0]),
        parseInt(cmd.args[1]),
        cmd.args[2]
      );
      outputResult(replyResult, cmd.format);
      break;
    case 'reviews':
      const reviewsResult = await adapter.getPRReviews(parseInt(cmd.args[0]));
      outputResult(reviewsResult, cmd.format);
      break;
    case 'review':
      const reviewResult = await adapter.submitPRReview(parseInt(cmd.args[0]), {
        status: cmd.flags.status as any,
        body: cmd.flags.body as string,
      });
      outputResult(reviewResult, cmd.format);
      break;
    default:
      console.error(`Unknown PR action: ${cmd.action}`);
      process.exit(1);
  }
}

async function handleRepoCommand(cmd: ParsedCommand, adapter: GitHubClient): Promise<void> {
  switch (cmd.action) {
    case 'info':
      const infoResult = await adapter.getRepositoryInfo();
      outputResult(infoResult, cmd.format);
      break;
    case 'protect':
      const protectResult = await adapter.setBranchProtection(cmd.args[0], {
        requirePR: cmd.flags.requirePR as boolean,
        requiredReviews: parseInt(cmd.flags.requiredReviews as string) || 1,
      });
      outputResult(protectResult, cmd.format);
      break;
    case 'label':
      if (cmd.args[0] === 'create') {
        const createResult = await adapter.createLabel(
          cmd.args[1],
          cmd.flags.color as string,
          cmd.flags.description as string
        );
        outputResult(createResult, cmd.format);
      }
      break;
    default:
      console.error(`Unknown repo action: ${cmd.action}`);
      process.exit(1);
  }
}

async function handleAuthCommand(cmd: ParsedCommand, adapter: GitHubClient): Promise<void> {
  const authResult = await adapter.authenticate({
    force: cmd.flags.force as boolean,
  });
  outputResult(authResult, cmd.format);
}

function outputResult(result: any, format: 'json' | 'text'): void {
  if (!result.success) {
    console.error(`Error: ${result.error.message}`);
    console.error(`Remediation: ${result.error.remediation}`);
    process.exit(1);
  }

  if (format === 'json') {
    console.log(JSON.stringify(result.data, null, 2));
  } else {
    console.log(result.data);
  }
}

function showHelp(category?: string, action?: string): void {
  if (!category) {
    console.log(`
catalyst-github - GitHub operations CLI

Usage: catalyst-github <command> [options]

Commands:
  issue     Issue operations (find, get, list, create, comment, close)
  pr        Pull request operations (find, get, list, comments, reply, reviews)
  repo      Repository operations (info, protect, label)
  auth      Authentication

Options:
  --help    Show help for command
  --json    Output JSON format

Examples:
  catalyst-github issue get 42 --with-comments
  catalyst-github pr find "feature"
  catalyst-github repo info --json
  catalyst-github auth
`);
  }
}

export function main(argv: string[]): void {
  const cmd = parseCommand(argv);
  executeCommand(cmd).catch((error) => {
    console.error('Fatal error:', error.message);
    process.exit(1);
  });
}
