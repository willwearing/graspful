/**
 * Retired direct database importer.
 * Legacy invocation: bun scripts/import-course.ts <orgSlug> <yamlPath>
 * Course imports and publication must use the authenticated API through the CLI.
 */

function quoteShellArgument(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

const [orgSlug, yamlPath] = process.argv.slice(2);
const fileArgument = quoteShellArgument(yamlPath || 'course.yaml');
const orgArgument = quoteShellArgument(orgSlug || 'your-org');

console.error([
  'This direct database importer has been retired.',
  'The supported CLI preserves learner progress and uses the server quality gate.',
  '',
  'Authenticate through browser sign-in if needed:',
  '  bunx @graspful/cli register',
  '',
  'Review the course, then import and publish through the API:',
  `  bunx @graspful/cli review ${fileArgument}`,
  `  bunx @graspful/cli import ${fileArgument} --org ${orgArgument} --publish`,
  '',
  'For a draft import, omit --publish. Publication requires all quality checks to pass.',
  'Docs: https://graspful.ai/docs/cli',
].join('\n'));

process.exitCode = 1;

export {};
