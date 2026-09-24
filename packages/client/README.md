# @graspful/client

Shared Node.js API client for the Graspful CLI and MCP server.

```ts
import { GraspfulApi, requireAuth } from '@graspful/client';

const api = new GraspfulApi(requireAuth());
const result = await api.importCourse('my-org', {
  yaml: courseYaml,
  publish: false,
  replace: false,
  archiveMissing: false,
});
```

Credentials resolve from `GRASPFUL_API_KEY`, then `~/.graspful/credentials.json`. `GRASPFUL_API_URL` overrides the saved API URL. `GRASPFUL_CONFIG_DIR` selects a different credential directory. Resolve credentials for each command to pick up a key saved or rotated by another process.

The package includes academy import and publication results, course publication, validated brand import, course listing, YAML helpers, and shared telemetry configuration. Academy publication preserves successful course IDs and records failures for the remaining courses.
