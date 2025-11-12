/**
 * Template operations for issue creation
 * Internal functions - not exposed via CLI
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import type { Result, IssueTemplate, TemplateFrontmatter, CreateIssueOptions } from './types';
import { success, failure, GitHubError } from './types';
import { GitHubAdapter } from './adapter';

export function readIssueTemplate(templateName: string): Result<IssueTemplate> {
  try {
    const templatePath = join(process.cwd(), 'templates', 'issues', `${templateName}.md`);
    const content = readFileSync(templatePath, 'utf-8');
    return success(parseTemplateFrontmatter(content));
  } catch (error) {
    return failure(new GitHubError(
      `Template not found: ${templateName}`,
      'TEMPLATE_NOT_FOUND',
      'Check templates/issues/ directory',
      error as Error
    ));
  }
}

export function parseTemplateFrontmatter(content: string): IssueTemplate {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!frontmatterMatch) {
    return { frontmatter: {}, body: content };
  }

  const frontmatterText = frontmatterMatch[1];
  const body = frontmatterMatch[2];

  const frontmatter: TemplateFrontmatter = {};

  // Simple YAML parsing
  const lines = frontmatterText.split('\n');
  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      const [, key, value] = match;
      if (key === 'labels' || key === 'assignees') {
        (frontmatter as any)[key] = value.replace(/[\[\]]/g, '').split(',').map(s => s.trim());
      } else if (key === 'title' || key === 'milestone') {
        (frontmatter as any)[key] = value;
      }
    }
  }

  return { frontmatter, body };
}

export function replaceTemplatePlaceholders(template: string, replacements: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}

export async function createIssueFromTemplate(
  templateName: string,
  replacements: Record<string, string>
): Promise<Result<any>> {
  const templateResult = readIssueTemplate(templateName);
  if (!templateResult.success) return templateResult;

  const { frontmatter, body } = templateResult.data;
  const processedBody = replaceTemplatePlaceholders(body, replacements);
  const processedTitle = frontmatter.title
    ? replaceTemplatePlaceholders(frontmatter.title, replacements)
    : 'Untitled';

  const options: CreateIssueOptions = {
    title: processedTitle,
    body: processedBody,
    labels: frontmatter.labels,
    assignees: frontmatter.assignees,
    milestone: frontmatter.milestone,
  };

  const adapter = new GitHubAdapter();
  return await adapter.createIssue(options);
}
