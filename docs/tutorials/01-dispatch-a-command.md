# Tutorial: Dispatch a command

1. Create a kernel session:

```ts
import { BuilderKernel, createDefaultDocument, AddNodeCommand, createNodeFromDefaults } from "@/lib/builder";

const kernel = new BuilderKernel(createDefaultDocument());
const rootId = kernel.getDocument().tree.rootId;
const node = createNodeFromDefaults("container" /* type must exist in your registry context */);
```

2. Prefer `bootstrapBuilderKernel()` when you need native node definitions registered.

3. Dispatch and assert:

```ts
const result = kernel.dispatch(new AddNodeCommand({ /* payload per command class */ }));
console.log(result.success, kernel.getDocument().metadata.version);
```

4. Run unit tests for patterns:

```bash
bun run test:unit src/lib/builder/commandEngine.test.ts
```

See also [`../../examples/basic-command`](../../examples/basic-command/).
