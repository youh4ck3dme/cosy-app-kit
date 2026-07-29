# Tutorial: Validate a document

```ts
import { createDefaultDocument, validateDocument } from "@/lib/builder";

const doc = createDefaultDocument();
const result = validateDocument(doc);
// result.ok === true for a factory-built default document
```

Corrupt the graph deliberately in tests only, then assert issue codes such as `CYCLE_FOUND` or `ROOT_MISSING`.

See [`../../examples/document-validation`](../../examples/document-validation/) and [INVARIANTS.md](../INVARIANTS.md).
