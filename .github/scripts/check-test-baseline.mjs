// Decides the CI test job.
//
// `npm test` is red on main (see .github/known-test-failures.json), so "jest
// exit code 0" is not a gate anybody could turn on today. This gates on which
// tests fail instead: a failure already on the known list is tolerated, any
// other failure fails the build. That blocks new breakage without demanding
// the existing backlog be fixed first.
//
// Usage: node .github/scripts/check-test-baseline.mjs <jest --json outputFile>

import { readFileSync } from 'node:fs';
import * as path from 'node:path';

const KNOWN_FILE = '.github/known-test-failures.json';
const resultsFile = process.argv[2] ?? 'jest-results.json';

const fail = msg => {
  console.error(`::error title=Test baseline::${msg}`);
  process.exit(1);
};

const readJson = file => {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    // A missing or truncated results file means jest never finished — a crash,
    // an OOM, a config error. Never let that read as "no new failures".
    fail(`Could not read ${file}: ${err.message}. Jest did not produce usable results.`);
  }
};

const knownEntries = readJson(KNOWN_FILE).known;
const known = new Set(knownEntries.map(e => e.name));
// An entry that only fails under some condition — a load-dependent flake, or a
// platform difference — proves nothing by passing, so it is exempt from the
// "this one is fixed, delete it" nudge below. Only a failure that is meant to
// happen every run going green is news worth acting on.
const conditional = new Set(
  knownEntries.filter(e => e.flaky || e.linuxOnly).map(e => e.name)
);
const results = readJson(resultsFile);

const failing = new Set();

for (const suite of results.testResults ?? []) {
  const assertions = suite.assertionResults ?? [];
  for (const a of assertions) {
    if (a.status === 'failed') {
      failing.add([...a.ancestorTitles, a.title].join(' > '));
    }
  }

  // A suite can fail without any single test failing: an import or syntax
  // error, a beforeAll/afterAll throw, a teardown timeout. There is no test
  // name to match against the known list, so attribute it to the suite file
  // and treat it as new breakage — which is what it is.
  const hasFailingAssertion = assertions.some(a => a.status === 'failed');
  if (suite.status === 'failed' && !hasFailingAssertion) {
    const rel = path.relative(process.cwd(), suite.name);
    const where = rel.startsWith('..') ? suite.name : rel;
    const reason = (suite.failureMessage ?? '').split('\n')[0].trim();
    failing.add(`SUITE FAILED WITH NO FAILING TEST: ${where}${reason ? ` — ${reason}` : ''}`);
  }
}

const added = [...failing].filter(name => !known.has(name)).sort();
const fixed = [...known].filter(name => !failing.has(name) && !conditional.has(name)).sort();

const summary = [];
summary.push('### Test');
summary.push('');
summary.push(
  `${results.numPassedTests ?? 0} passed, ${results.numFailedTests ?? 0} failed, ` +
    `${results.numPendingTests ?? 0} skipped of ${results.numTotalTests ?? 0}.`
);
summary.push('');

if (added.length > 0) {
  summary.push(`**${added.length} failure(s) not on the known-failures list:**`);
  summary.push('');
  for (const name of added) summary.push(`- \`${name}\``);
} else {
  summary.push('No failures outside the known-failures baseline.');
}

if (fixed.length > 0) {
  // Not a failure. Entries go stale as the backlog gets fixed, and the list is
  // only trustworthy if it shrinks.
  summary.push('');
  summary.push(
    `**${fixed.length} known failure(s) passed this run** — remove from \`${KNOWN_FILE}\`:`
  );
  summary.push('');
  for (const name of fixed) summary.push(`- \`${name}\``);
}

const text = summary.join('\n');
console.log(text);
if (process.env.GITHUB_STEP_SUMMARY) {
  try {
    const { appendFileSync } = await import('node:fs');
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);
  } catch (err) {
    console.error(`Could not write job summary: ${err.message}`);
  }
}

for (const name of added) {
  console.error(`::error title=New test failure::${name}`);
}

if (added.length > 0) {
  fail(
    `${added.length} test failure(s) are not in ${KNOWN_FILE}. Fix them, or — only if ` +
      'they were already broken before this change — add them there with a reason.'
  );
}

console.log('Test baseline holds.');
