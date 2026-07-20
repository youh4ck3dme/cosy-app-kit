# Čo musíš spraviť TY (manuálne) — a kedy

Agent **nevie** spoľahlivo pushnúť na GitHub (403) ani aplikovať SQL v tvojom Supabase projekte.  
Toto sú **tvoje** kroky. Poradie je dôležité.

---

## Kedy: **hneď** (keď chceš mať prácu na GitHube)

### 1. Push `developeredit`

```bash
cd /Users/erikbabcan/lovable-builder-cosyapp
git status
git push origin developeredit
```

- Účet musí mať **write** na `youh4ck3dme/cosy-app-kit`.  
- Ak 403: prihlás sa ako owner (`gh auth login` / SSH key / GitHub Desktop s správnym účtom).  
- **Kedy:** pred share linkom na CI, pred ďalším collabom, pred deployom z GitHubu.

---

## Kedy: **pred testovaním Versions restore v UI**

### 2. SQL migrácia (len Grok súbor)

Súbor: `supabase/migrations/20260720120000_artifact_versions.sql`  
Návod: [`docs/migrations.md`](./migrations.md)

1. Otvor Supabase SQL editor projektu napojeného na appku.  
2. Vlož celý obsah migrácie → Run.  
3. Overenie:

```sql
select to_regclass('public.artifact_versions');
```

**Kedy:** kým to neurobíš, timeline v Canvase môže ukázať “apply migration” / restore zlyhá.  
**Nie:** Claude migrácia `…090000…` — nepoužívaj ju.

---

## Kedy: **po pushe + po SQL** (alebo aspoň po `bun run dev`)

### 3. Smoke checklist

Súbor: [`docs/smoke-checklist.md`](./smoke-checklist.md)

- Build artefakt, Plan bez kódu, edit/retry reload, Cmd+K, `/api/ai-status`.  
**Kedy:** pred tým, než povieš “je to OK na demo”; po veľkom porte (PWA, threads).

Voliteľne:

```bash
bun run dev          # terminál 1
bun run smoke        # PWA asset checks (+ browser ak máš playwright)
```

---

## Čo NErobíš

| | |
|--|--|
| Full merge Claude branch do `developeredit` | ❌ |
| Merge čohokoľvek “naslepo” mimo `developeredit` | ❌ (agent to nerieši) |
| Čakať na mňa s pushom | Nemusíš — push je tvoj účet |

---

## Kedy volať agenta znova

| Situácia | Prompt |
|----------|--------|
| Push hotový, chceš ďalší Claude slice | Grok: S5 done — continue S7 polish / BPI |
| Scroll UX | Cursor: claudetodo Prompt B (S4) |
| Všetko zelené, demo | Human smoke + optional BPI samples |
