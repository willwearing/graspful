const fs = require('node:fs');
const path = require('node:path');

function resolveWorkspaceDependencies(manifests) {
  const versions = new Map(manifests.map((manifest) => [manifest.name, manifest.version]));
  return manifests.map((manifest) => {
    const resolved = structuredClone(manifest);
    for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
      for (const [name, range] of Object.entries(resolved[field] || {})) {
        if (!range.startsWith('workspace:')) continue;
        const version = versions.get(name);
        if (!version) throw new Error(`Unknown workspace dependency: ${name}`);
        if (range !== 'workspace:*') throw new Error(`Unsupported workspace range: ${range}`);
        resolved[field][name] = `^${version}`;
      }
    }
    return resolved;
  });
}

if (require.main === module) {
  const filenames = ['shared', 'client', 'cli', 'mcp'].map((name) =>
    path.resolve(process.cwd(), 'packages', name, 'package.json'));
  const resolved = resolveWorkspaceDependencies(filenames.map((filename) => JSON.parse(fs.readFileSync(filename, 'utf8'))));
  filenames.forEach((filename, index) => fs.writeFileSync(filename, `${JSON.stringify(resolved[index], null, 2)}\n`));
}

module.exports = { resolveWorkspaceDependencies };
