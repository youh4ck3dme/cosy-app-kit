<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Git lock on `main` (human gate)

**Direct pushes to `main` are blocked** by GitHub branch protection (including admins).

Agents **must**:

1. Work on a **feature branch** only  
2. `git push -u origin <branch>`  
3. Open a **Pull Request** to `main`  
4. **Never** `git push origin main`, force-push, or `gh pr merge` unless the human **explicitly** asked in that turn  

See `.github/BRANCH_PROTECTION.md`.
