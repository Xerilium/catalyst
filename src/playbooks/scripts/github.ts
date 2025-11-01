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
    console.error('  github.js --get-project-name');
    console.error('  github.js --find-issue <pattern> <project-name>');
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

    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}
