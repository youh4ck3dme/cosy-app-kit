# CI and release flow

```mermaid
flowchart LR
  Branch[feature branch]
  PR[pull request]
  CI[CI unit typecheck build]
  Main[main protected]
  Tag[annotated tag]
  Publish[Lovable Publish]
  Smoke[prod-smoke]

  Branch --> PR --> CI --> Main
  Main --> Tag
  Main --> Publish
  Main --> Smoke
```
