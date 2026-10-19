/**
 * Shared types for PR labels
 */

export type LabelStyle = 'simple' | 'key-value';

/**
 * @req FR:pr-labels/$label-definition
 */
export interface LabelDefinition {
  id: string;
  group?: string;
  value: string;
  simple: string;
  emoji: string;
  color: string;
  description: string;
  required: boolean;
}

/**
 * @req FR:pr-labels/$repo-label
 */
export interface RepoLabel {
  name: string;
  usage: number;
}

/**
 * @req FR:pr-labels/$label-pattern
 */
export interface LabelPattern {
  style: LabelStyle;
  basis: 'usage' | 'present' | 'low-use' | 'none';
  needsChoice: boolean;
  usage: { simple: number; keyValue: number };
}

/**
 * @req FR:pr-labels/$resolved-label
 */
export interface ResolvedLabel {
  id: string;
  name: string;
  exists: boolean;
}

export type RenameReason = 'emoji-placement' | 'style' | 'format';

export interface PlannedCreate extends LabelDefinition {
  name: string;
}

export interface PlannedRename {
  id: string;
  from: string;
  to: string;
  reason: RenameReason;
}

/**
 * @req FR:pr-labels/$label-plan
 */
export interface LabelPlan {
  style: LabelStyle;
  creates: PlannedCreate[];
  renames: PlannedRename[];
  duplicates: Array<{ id: string; names: string[] }>;
}

/**
 * @req FR:pr-labels/$setup-result
 */
export interface SetupResult {
  style: LabelStyle;
  created: string[];
  renamed: Array<{ from: string; to: string }>;
  pendingRenames: PlannedRename[];
  skipped?: string;
}

export interface NewLabel {
  name: string;
  color: string;
  description: string;
}

export interface LabelAdapter {
  list(): Promise<RepoLabel[]>;
  create(label: NewLabel): Promise<void>;
  rename(from: string, to: string): Promise<void>;
}
