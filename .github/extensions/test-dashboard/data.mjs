import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const ZERO_TOTALS = Object.freeze({
  passed: 0,
  failed: 0,
  skipped: 0,
  total: 0,
  durationMs: 0,
});

const ARTIFACTS = Object.freeze([
  'coverage/coverage-summary.json',
  'coverage/coverage-final.json',
  '.test-results/vitest.json',
  '.test-results/playwright.json',
]);

export async function readSnapshot(repoRoot) {
  const root = resolveRepoRoot(repoRoot);
  const generatedAt = new Date().toISOString();

  const repo = await safeLoad(
    () => readRepo(root),
    () => defaultRepo(),
  );
  const [vitest, playwright, coverage, freshness, lastPassingCommit] = await Promise.all([
    safeLoad(
      () => readVitest(root),
      (reason) => unavailableTestSection(reason),
    ),
    safeLoad(
      () => readPlaywright(root),
      (reason) => unavailableTestSection(reason),
    ),
    safeLoad(
      () => readCoverage(root),
      (reason) => unavailableCoverage(reason),
    ),
    safeLoad(
      () => readFreshness(root, repo),
      (reason) => ({ state: 'never-run', resultsGeneratedAt: null, reason }),
    ),
    safeLoad(
      () => readLastPassingCommit(root),
      (reason) => unavailableLastPassingCommit(reason),
    ),
  ]);

  return {
    generatedAt,
    repoRoot: root,
    repo,
    freshness,
    vitest,
    playwright,
    coverage,
    lastPassingCommit,
  };
}

async function safeLoad(loader, fallback) {
  try {
    return await loader();
  } catch (error) {
    return fallback(`Snapshot section failed: ${errorMessage(error)}`);
  }
}

function defaultRepo() {
  return {
    branch: null,
    headSha: null,
    headShortSha: null,
    headSubject: null,
    headAuthor: null,
    headDate: null,
    dirty: false,
    dirtyFileCount: 0,
  };
}

function unavailableTestSection(reason) {
  return {
    available: false,
    reason,
    totals: zeroTotals(),
    cases: [],
  };
}

function unavailableCoverage(reason) {
  return {
    available: false,
    reason,
    totals: null,
    files: [],
  };
}

function resolveRepoRoot(repoRoot) {
  try {
    return path.resolve(String(repoRoot || process.cwd()));
  } catch {
    return process.cwd();
  }
}

async function readRepo(repoRoot) {
  const [branch, headSha, headShortSha, log, status] = await Promise.all([
    gitValue(repoRoot, ['rev-parse', '--abbrev-ref', 'HEAD']),
    gitValue(repoRoot, ['rev-parse', 'HEAD']),
    gitValue(repoRoot, ['rev-parse', '--short', 'HEAD']),
    gitValue(repoRoot, ['log', '-1', '--format=%s%x1f%an%x1f%cI']),
    gitValue(repoRoot, ['status', '--porcelain']),
  ]);

  const [headSubject, headAuthor, headDate] = splitLogLine(log.value);
  const dirtyLines = status.value ? status.value.split(/\r?\n/).filter(Boolean) : [];

  return {
    branch: branch.ok ? nullIfEmpty(branch.value) : null,
    headSha: headSha.ok ? nullIfEmpty(headSha.value) : null,
    headShortSha: headShortSha.ok ? nullIfEmpty(headShortSha.value) : null,
    headSubject: headSubject || null,
    headAuthor: headAuthor || null,
    headDate: normalizeIso(headDate),
    dirty: dirtyLines.length > 0,
    dirtyFileCount: dirtyLines.length,
  };
}

async function readFreshness(repoRoot, repo) {
  const artifactStats = await Promise.all(ARTIFACTS.map(async (relPath) => {
    try {
      const stat = await fs.stat(path.join(repoRoot, relPath));
      return { relPath, mtimeMs: stat.mtimeMs, mtimeIso: stat.mtime.toISOString() };
    } catch {
      return null;
    }
  }));

  const existing = artifactStats.filter(Boolean);
  if (existing.length === 0) {
    return {
      state: 'never-run',
      resultsGeneratedAt: null,
      reason: 'No test result artifacts found',
    };
  }

  const newest = existing.reduce((best, stat) => (stat.mtimeMs > best.mtimeMs ? stat : best));

  if (repo.dirty) {
    return {
      state: 'stale',
      resultsGeneratedAt: newest.mtimeIso,
      reason: plural(repo.dirtyFileCount, 'file') + ' changed in the working tree',
    };
  }

  const tracked = await gitValue(repoRoot, ['ls-files', 'src', 'e2e']);
  if (tracked.ok && tracked.value) {
    let newerCount = 0;
    const files = tracked.value.split(/\r?\n/).filter(Boolean);
    await Promise.all(files.map(async (file) => {
      try {
        const stat = await fs.stat(path.join(repoRoot, file));
        if (stat.mtimeMs > newest.mtimeMs) newerCount += 1;
      } catch {
        // Ignore deleted or inaccessible tracked files for freshness.
      }
    }));
    if (newerCount > 0) {
      return {
        state: 'stale',
        resultsGeneratedAt: newest.mtimeIso,
        reason: plural(newerCount, 'tracked source file') + ' newer than the latest test result',
      };
    }
  }

  return {
    state: 'fresh',
    resultsGeneratedAt: newest.mtimeIso,
    reason: null,
  };
}

async function readVitest(repoRoot) {
  const json = await readJsonFile(path.join(repoRoot, '.test-results', 'vitest.json'));
  if (!json.ok) {
    return {
      available: false,
      reason: json.reason || 'No Vitest data — run npm run test',
      totals: zeroTotals(),
      cases: [],
    };
  }

  const cases = [];
  const testResults = Array.isArray(json.data?.testResults) ? json.data.testResults : [];
  for (const result of testResults) {
    const file = typeof result?.name === 'string' ? result.name : '';
    const relFile = toRepoRelative(repoRoot, file);
    const assertions = Array.isArray(result?.assertionResults) ? result.assertionResults : [];

    if (assertions.length === 0 && file) {
      const status = normalizeStatus(result?.status);
      cases.push(makeCase({
        kind: 'vitest',
        index: cases.length,
        repoRoot,
        file,
        relFile,
        suite: [],
        name: path.basename(relFile || file),
        status,
        durationMs: durationBetween(result?.startTime, result?.endTime),
        failure: status === 'failed' ? failureFromMessages([result?.message]) : null,
      }));
      continue;
    }

    for (const assertion of assertions) {
      const suite = Array.isArray(assertion?.ancestorTitles)
        ? assertion.ancestorTitles.filter((title) => typeof title === 'string' && title.length > 0)
        : [];
      const status = normalizeStatus(assertion?.status);
      const failure = status === 'failed'
        ? failureFromMessages(assertion?.failureMessages)
        : null;
      cases.push(makeCase({
        kind: 'vitest',
        index: cases.length,
        repoRoot,
        file,
        relFile,
        suite,
        name: stringOrFallback(assertion?.title, assertion?.fullName, 'Unnamed Vitest test'),
        status,
        durationMs: numberOrZero(assertion?.duration),
        failure,
      }));
    }
  }

  return {
    available: true,
    reason: null,
    totals: totalsFromCases(cases),
    cases,
  };
}

async function readPlaywright(repoRoot) {
  const json = await readJsonFile(path.join(repoRoot, '.test-results', 'playwright.json'));
  if (!json.ok) {
    return {
      available: false,
      reason: json.reason || 'No Playwright data — run npm run test:e2e',
      totals: zeroTotals(),
      cases: [],
    };
  }

  const cases = [];
  const suites = Array.isArray(json.data?.suites) ? json.data.suites : [];
  for (const suite of suites) {
    collectPlaywrightSuite(repoRoot, suite, [], cases);
  }

  return {
    available: true,
    reason: null,
    totals: totalsFromCases(cases),
    cases,
  };
}

function collectPlaywrightSuite(repoRoot, suite, suitePath, cases) {
  if (!suite || typeof suite !== 'object') return;

  const title = typeof suite.title === 'string' && suite.title.length > 0 ? suite.title : null;
  const nextPath = title ? [...suitePath, title] : suitePath;

  const childSuites = Array.isArray(suite.suites) ? suite.suites : [];
  for (const child of childSuites) {
    collectPlaywrightSuite(repoRoot, child, nextPath, cases);
  }

  const specs = Array.isArray(suite.specs) ? suite.specs : [];
  for (const spec of specs) {
    collectPlaywrightSpec(repoRoot, spec, nextPath, cases);
  }
}

function collectPlaywrightSpec(repoRoot, spec, suitePath, cases) {
  if (!spec || typeof spec !== 'object') return;

  const file = typeof spec.file === 'string' ? spec.file : '';
  const relFile = toPlaywrightRelFile(repoRoot, file);
  const tests = Array.isArray(spec.tests) ? spec.tests : [];

  if (tests.length === 0) {
    const status = spec.ok === false ? 'failed' : 'skipped';
    cases.push(makeCase({
      kind: 'playwright',
      index: cases.length,
      repoRoot,
      file,
      relFile,
      suite: suitePath,
      name: stringOrFallback(spec.title, 'Unnamed Playwright spec'),
      status,
      durationMs: 0,
      failure: null,
      extraIdParts: [String(spec.line || '')],
    }));
    return;
  }

  for (const test of tests) {
    const results = Array.isArray(test?.results) ? test.results : [];
    const finalResult = results.length > 0 ? results[results.length - 1] : null;
    const rawStatus = finalResult?.status || test?.status || (spec.ok === false ? 'failed' : 'passed');
    const status = normalizeStatus(rawStatus);
    const failure = status === 'failed'
      ? failureFromPlaywrightResult(finalResult || test)
      : null;
    const projectName = typeof test?.projectName === 'string' && test.projectName.length > 0
      ? test.projectName
      : null;
    const testSuite = projectName ? [...suitePath, projectName] : suitePath;
    const durationMs = results.reduce((sum, result) => sum + numberOrZero(result?.duration), 0)
      || numberOrZero(test?.duration)
      || numberOrZero(finalResult?.duration);

    cases.push(makeCase({
      kind: 'playwright',
      index: cases.length,
      repoRoot,
      file,
      relFile,
      suite: testSuite,
      name: stringOrFallback(test?.title, spec.title, 'Unnamed Playwright test'),
      status,
      durationMs,
      failure,
      extraIdParts: [String(spec.line || '')],
    }));
  }
}

async function readCoverage(repoRoot) {
  const summary = await readJsonFile(path.join(repoRoot, 'coverage', 'coverage-summary.json'));
  if (!summary.ok) {
    return {
      available: false,
      reason: summary.reason || 'No coverage data — run npm run test:coverage',
      totals: null,
      files: [],
    };
  }

  const detail = await readJsonFile(path.join(repoRoot, 'coverage', 'coverage-final.json'));
  const detailData = detail.ok && detail.data && typeof detail.data === 'object' ? detail.data : {};
  const files = [];

  for (const [filePath, metrics] of Object.entries(summary.data || {})) {
    if (filePath === 'total') continue;
    const detailEntry = findCoverageDetail(detailData, filePath);
    files.push({
      path: normalizeArtifactPath(filePath),
      relPath: toRepoRelative(repoRoot, filePath),
      statements: toMetric(metrics?.statements),
      branches: toMetric(metrics?.branches),
      functions: toMetric(metrics?.functions),
      lines: toMetric(metrics?.lines),
      uncoveredLines: detail.ok ? uncoveredLines(detailEntry) : [],
    });
  }

  files.sort((a, b) => a.relPath.localeCompare(b.relPath));

  return {
    available: true,
    reason: detail.ok ? null : 'Coverage details unavailable — uncovered lines omitted',
    totals: {
      statements: toMetric(summary.data?.total?.statements),
      branches: toMetric(summary.data?.total?.branches),
      functions: toMetric(summary.data?.total?.functions),
      lines: toMetric(summary.data?.total?.lines),
    },
    files,
  };
}

async function readLastPassingCommit(repoRoot) {
  const repoSlug = await getRepoSlug(repoRoot);
  const run = await runCommand('gh', [
    'run',
    'list',
    '--repo',
    repoSlug,
    '--workflow',
    'CI',
    '--branch',
    'main',
    '--status',
    'success',
    '--limit',
    '1',
    '--json',
    'headSha,displayTitle,conclusion,url,number,updatedAt,workflowName',
  ], repoRoot, 15000);

  if (!run.ok) {
    return unavailableLastPassingCommit(classifyGhFailure(run));
  }

  let runs;
  try {
    runs = JSON.parse(run.stdout || '[]');
  } catch {
    return unavailableLastPassingCommit('GitHub CLI returned malformed JSON');
  }

  const latest = Array.isArray(runs) ? runs[0] : null;
  if (!latest?.headSha) {
    return unavailableLastPassingCommit('No successful CI run found on main');
  }

  const sha = String(latest.headSha);
  const metadata = await readCommitMetadata(repoRoot, repoSlug, sha);

  return {
    available: true,
    source: 'github-actions',
    reason: null,
    sha,
    shortSha: sha.slice(0, 7),
    subject: metadata.subject || stringOrNull(latest.displayTitle),
    author: metadata.author,
    committedAt: metadata.committedAt,
    runUrl: stringOrNull(latest.url),
    runNumber: numberOrNull(latest.number),
    runConcludedAt: normalizeIso(latest.updatedAt),
    workflowName: stringOrNull(latest.workflowName),
    branch: 'main',
  };
}

async function readCommitMetadata(repoRoot, repoSlug, sha) {
  const local = await gitValue(repoRoot, ['log', '-1', '--format=%s%x1f%an%x1f%cI', sha]);
  if (local.ok && local.value) {
    const [subject, author, committedAt] = splitLogLine(local.value);
    return {
      subject: subject || null,
      author: author || null,
      committedAt: normalizeIso(committedAt),
    };
  }

  const remote = await runCommand('gh', [
    'api',
    `repos/${repoSlug}/commits/${sha}`,
    '--jq',
    '{message:.commit.message, author:.commit.author.name, date:.commit.author.date} | @json',
  ], repoRoot, 15000);

  if (!remote.ok) {
    return { subject: null, author: null, committedAt: null };
  }

  try {
    const data = JSON.parse(remote.stdout || '{}');
    const message = typeof data.message === 'string' ? data.message : '';
    return {
      subject: message.split(/\r?\n/)[0] || null,
      author: stringOrNull(data.author),
      committedAt: normalizeIso(data.date),
    };
  } catch {
    return { subject: null, author: null, committedAt: null };
  }
}

async function getRepoSlug(repoRoot) {
  const remote = await gitValue(repoRoot, ['remote', 'get-url', 'origin']);
  return parseRepoSlug(remote.value) || 'richross/cribbage-board';
}

function parseRepoSlug(remoteUrl) {
  if (!remoteUrl || typeof remoteUrl !== 'string') return null;
  const trimmed = remoteUrl.trim().replace(/\.git$/, '');

  let match = /^git@[^:]+:([^/]+\/.+)$/.exec(trimmed);
  if (match) return match[1];

  match = /^(?:https?:\/\/|ssh:\/\/git@)[^/]+\/([^/]+\/.+)$/.exec(trimmed);
  if (match) return match[1];

  return null;
}

function unavailableLastPassingCommit(reason) {
  return {
    available: false,
    source: 'unavailable',
    reason,
    sha: null,
    shortSha: null,
    subject: null,
    author: null,
    committedAt: null,
    runUrl: null,
    runNumber: null,
    runConcludedAt: null,
    workflowName: null,
    branch: null,
  };
}

async function gitValue(repoRoot, args) {
  const result = await runCommand('git', args, repoRoot, 5000);
  return {
    ok: result.ok,
    value: result.ok ? result.stdout.trim() : '',
    reason: result.ok ? null : result.reason,
  };
}

async function runCommand(command, args, cwd, timeout) {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      cwd,
      timeout,
      windowsHide: true,
      maxBuffer: 1024 * 1024 * 4,
    });
    return { ok: true, stdout: stdout || '', stderr: stderr || '', reason: null };
  } catch (error) {
    return {
      ok: false,
      stdout: error?.stdout || '',
      stderr: error?.stderr || '',
      reason: errorMessage(error),
      code: error?.code || null,
      signal: error?.signal || null,
      killed: Boolean(error?.killed),
    };
  }
}

async function readJsonFile(filePath) {
  let text;
  try {
    text = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return { ok: false, reason: missingReason(filePath), data: null };
    }
    return { ok: false, reason: `Could not read ${displayArtifact(filePath)}: ${errorMessage(error)}`, data: null };
  }

  try {
    return { ok: true, reason: null, data: JSON.parse(text) };
  } catch (error) {
    return { ok: false, reason: `Malformed JSON in ${displayArtifact(filePath)}: ${errorMessage(error)}`, data: null };
  }
}

function missingReason(filePath) {
  const displayed = displayArtifact(filePath);
  if (displayed.endsWith('vitest.json')) return 'No Vitest data — run npm run test';
  if (displayed.endsWith('playwright.json')) return 'No Playwright data — run npm run test:e2e';
  if (displayed.endsWith('coverage-summary.json')) return 'No coverage data — run npm run test:coverage';
  return `Missing ${displayed}`;
}

function displayArtifact(filePath) {
  return normalizeSlashes(filePath).replace(/^.*?((?:coverage|\.test-results)\/.*)$/i, '$1');
}

function makeCase({ kind, index, repoRoot, file, relFile, suite, name, status, durationMs, failure, extraIdParts = [] }) {
  const normalizedSuite = Array.isArray(suite) ? suite.map(String).filter(Boolean) : [];
  const normalizedName = String(name || 'Unnamed test');
  const normalizedRelFile = relFile || toRepoRelative(repoRoot, file);
  const id = stableId([kind, normalizedRelFile, ...normalizedSuite, normalizedName, ...extraIdParts, String(index)]);

  return {
    id,
    file: normalizeArtifactPath(file),
    relFile: normalizedRelFile,
    suite: normalizedSuite,
    name: normalizedName,
    status,
    durationMs: numberOrZero(durationMs),
    failure,
  };
}

function totalsFromCases(cases) {
  const totals = zeroTotals();
  for (const testCase of cases) {
    totals.total += 1;
    totals.durationMs += numberOrZero(testCase.durationMs);
    if (testCase.status === 'passed') totals.passed += 1;
    else if (testCase.status === 'failed') totals.failed += 1;
    else totals.skipped += 1;
  }
  totals.durationMs = roundNumber(totals.durationMs, 0);
  return totals;
}

function zeroTotals() {
  return { ...ZERO_TOTALS };
}

function normalizeStatus(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'passed' || normalized === 'expected') return 'passed';
  if (normalized === 'failed' || normalized === 'timedout' || normalized === 'timedOut' || normalized === 'unexpected' || normalized === 'flaky' || normalized === 'interrupted') {
    return 'failed';
  }
  return 'skipped';
}

function failureFromMessages(messages) {
  const joined = (Array.isArray(messages) ? messages : [messages])
    .filter((message) => typeof message === 'string' && message.trim().length > 0)
    .join('\n\n')
    .trim();

  if (!joined) return { message: 'Test failed', stack: null };
  const firstLine = joined.split(/\r?\n/).find((line) => line.trim().length > 0) || joined;
  return {
    message: firstLine.trim(),
    stack: joined === firstLine ? null : joined,
  };
}

function failureFromPlaywrightResult(result) {
  const messages = [];
  const errors = Array.isArray(result?.errors) ? result.errors : [];
  if (result?.error) errors.unshift(result.error);
  for (const error of errors) {
    if (typeof error?.message === 'string') messages.push(error.message);
    if (typeof error?.stack === 'string') messages.push(error.stack);
  }
  return failureFromMessages(messages);
}

function toMetric(metric) {
  const total = numberOrZero(metric?.total);
  const covered = numberOrZero(metric?.covered);
  const pct = Number.isFinite(Number(metric?.pct))
    ? Number(metric.pct)
    : (total > 0 ? (covered / total) * 100 : 100);

  return {
    covered,
    total,
    pct: roundNumber(clamp(pct, 0, 100), 1),
  };
}

function findCoverageDetail(detailData, filePath) {
  if (detailData?.[filePath]) return detailData[filePath];
  const normalized = normalizeSlashes(filePath).toLowerCase();
  for (const [key, value] of Object.entries(detailData || {})) {
    if (normalizeSlashes(key).toLowerCase() === normalized) return value;
  }
  return null;
}

function uncoveredLines(detailEntry) {
  const lines = new Set();
  const statementMap = detailEntry?.statementMap || {};
  const hits = detailEntry?.s || {};
  for (const [id, statement] of Object.entries(statementMap)) {
    if (Number(hits[id]) === 0) {
      const line = Number(statement?.start?.line);
      if (Number.isFinite(line) && line > 0) lines.add(line);
    }
  }
  return [...lines].sort((a, b) => a - b);
}

function toRepoRelative(repoRoot, filePath) {
  const normalizedInput = normalizeArtifactPath(filePath);
  if (!normalizedInput) return '';

  try {
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(repoRoot, filePath);
    const relative = path.relative(repoRoot, absolutePath);
    if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) {
      return normalizeSlashes(relative);
    }
  } catch {
    // Fall back to returning the normalized artifact path below.
  }

  return normalizedInput;
}

function toPlaywrightRelFile(repoRoot, filePath) {
  const relFile = toRepoRelative(repoRoot, filePath);
  if (!filePath || path.isAbsolute(filePath) || relFile.includes('/')) return relFile;

  for (const dir of ['e2e', 'tests', 'src']) {
    try {
      const candidate = path.join(repoRoot, dir, filePath);
      if (existsSync(candidate)) return normalizeSlashes(path.join(dir, filePath));
    } catch {
      // Keep the artifact's file value if probing fails.
    }
  }

  return relFile;
}

function normalizeArtifactPath(filePath) {
  return normalizeSlashes(String(filePath || ''));
}

function normalizeSlashes(value) {
  return String(value || '').replace(/\\/g, '/');
}

function stableId(parts) {
  return createHash('sha1').update(parts.join('\x1f')).digest('hex').slice(0, 16);
}

function splitLogLine(value) {
  const parts = typeof value === 'string' ? value.split('\x1f') : [];
  return [parts[0] || null, parts[1] || null, parts[2] || null];
}

function normalizeIso(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function stringOrNull(value) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function stringOrFallback(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return 'Unnamed test';
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function durationBetween(start, end) {
  const started = Number(start);
  const ended = Number(end);
  if (!Number.isFinite(started) || !Number.isFinite(ended) || ended < started) return 0;
  return ended - started;
}

function roundNumber(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(numberOrZero(value) * factor) / factor;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function nullIfEmpty(value) {
  return value && value.length > 0 ? value : null;
}

function errorMessage(error) {
  if (!error) return 'Unknown error';
  if (typeof error.message === 'string' && error.message.length > 0) return error.message;
  return String(error);
}

function plural(count, noun) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

function classifyGhFailure(result) {
  const text = `${result.reason || ''}\n${result.stderr || ''}\n${result.stdout || ''}`.toLowerCase();
  if (result.code === 'ENOENT' || text.includes('enoent')) return 'gh not installed';
  if (result.killed || result.signal === 'SIGTERM' || text.includes('timed out')) return 'GitHub CLI timed out';
  if (text.includes('not logged in') || text.includes('authentication') || text.includes('authenticate') || text.includes('401')) {
    return 'gh not authenticated';
  }
  if (text.includes('rate limit') || text.includes('api rate limit')) return 'GitHub API rate limit exceeded';
  if (text.includes('could not resolve') || text.includes('failed to connect') || text.includes('network') || text.includes('enotfound') || text.includes('econnreset') || text.includes('etimedout')) {
    return 'Network error while contacting GitHub';
  }
  return `GitHub CLI failed: ${(result.stderr || result.reason || 'unknown error').trim()}`;
}
