### GitHub — switch user / check who you are

```bash
# kto je prihlásený teraz
gh auth status

# zoznam účtov (ak máš viac)
gh auth status -a

# prepnutie na iný účet (interactive)
gh auth switch

# alebo odhlásenie + nové prihlásenie
gh auth logout
gh auth login

# overenie po switchi
gh auth status
git config user.name
git config user.email
```

Ak push ide cez HTTPS s uloženým tokenom a stále ide „zlý“ user:

```bash
gh auth setup-git
gh api user --jq .login
```

---

### Vercel — kto je prihlásený

```bash
# kto je prihlásený
vercel whoami

# detailnejší auth status (ak máš novší CLI)
vercel teams list

# odhlásenie + nové prihlásenie
vercel logout
vercel login

# znova kontrola
vercel whoami
```

Ak `vercel` nie je v PATH:

```bash
npx vercel whoami
npx vercel logout
npx vercel login
```

---

**Rýchly checklist:** `gh auth status` → `gh auth switch` → `vercel whoami`.