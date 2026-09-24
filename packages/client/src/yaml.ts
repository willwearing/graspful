import * as fs from 'node:fs';
import * as yaml from 'js-yaml';

export function parseYaml(source: string): unknown {
  return yaml.load(source, { schema: yaml.JSON_SCHEMA });
}

export function dumpYaml(value: unknown): string {
  return yaml.dump(value, { lineWidth: 120, noRefs: true, schema: yaml.JSON_SCHEMA });
}

export function readYamlFile(file: string): { content: string; raw: unknown } {
  if (!fs.existsSync(file)) throw new Error(`File not found: ${file}`);
  const content = fs.readFileSync(file, 'utf-8');
  try {
    return { content, raw: parseYaml(content) };
  } catch (error) {
    throw new Error(`YAML parse error: ${error instanceof Error ? error.message : String(error)}`);
  }
}
