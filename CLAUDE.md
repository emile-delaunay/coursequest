# CourseQuest — brief pour Claude Code

App web de révision gamifiée « type Duolingo » pour les cours du S3 à l'IESEG. Premier cours en ligne : **Trademark Law 2311** (Elsa Mimoun). L'utilisateur (Émile) écrit en français ; l'interface est en français, le contenu du cours en anglais (vocabulaire EN↔FR dans l'unité 8).

- Repo : https://github.com/emile-delaunay/coursequest (public, branche `main`)
- URL visée : https://emile-delaunay.github.io/coursequest/ (GitHub Pages)

## État au moment du transfert

Le repo a été créé à la main, puis rempli par l'interface d'upload de GitHub :

| Fichier | Sur GitHub ? |
|---|---|
| `index.html`, `README.md` | oui |
| `assets/style.css`, `assets/icon.svg` | oui (à vérifier) |
| `assets/app.js` | **non** |
| `data/courses.json`, `data/trademark-law.json` | **non** |
| `CLAUDE.md` (ce fichier) | non |
| GitHub Pages | **pas encore activé** |

Ce dossier contient la version complète et testée de tous les fichiers. C'est elle qui fait foi.

## À faire, dans l'ordre

1. **Synchroniser le repo** avec ce dossier :
   ```bash
   git init -b main   # si le dossier n'est pas encore un repo
   git remote add origin https://github.com/emile-delaunay/coursequest.git
   git fetch origin
   git reset --soft origin/main   # garde les fichiers locaux, part de l'historique distant
   git add -A
   git commit -m "Add app.js, course data and CLAUDE.md"
   git push origin main
   ```
   Si le push est refusé, ne force pas : fais un `git pull --rebase`, en gardant les versions locales en cas de conflit.
2. **Activer GitHub Pages** (source : branche `main`, dossier `/`) :
   ```bash
   gh api -X POST repos/emile-delaunay/coursequest/pages -f "source[branch]=main" -f "source[path]=/"
   ```
   Si l'API refuse, faire à la main : Settings > Pages > Deploy from a branch > `main` / `(root)` > Save.
3. **Vérifier le déploiement** : `gh api repos/emile-delaunay/coursequest/pages/builds/latest` doit donner `built`. Ouvre ensuite l'URL et contrôle : la page d'accueil, puis le parcours du cours, puis une leçon (les JSON se chargent en `fetch` relatif, donc ça ne marche que servi en HTTP, pas en `file://`).

## Architecture

SPA statique en JavaScript vanilla : aucune dépendance, aucun build. On la lance en local avec `python3 -m http.server 8000`.

```
index.html             coquille : barre du haut (série 🔥, XP ⚡, cœurs ❤️), menu (#menu), <main id="app">, toast, canvas confettis
assets/style.css       tokens CSS sur :root + mode sombre, boutons « chunky », parcours en zigzag, UI des leçons
assets/app.js          tout le JS (IIFE, ~36 Ko) : état, routeur, vues, moteur d'exercices, badges, sons, confettis
assets/icon.svg        favicon (hexagone vert)
data/courses.json      catalogue des cours du semestre (status "live" ou "soon")
data/trademark-law.json  8 unités, 16 leçons, 107 exercices
```

**Routage** (hash) :

- `#/` accueil
- `#/c/:courseId` parcours du cours
- `#/l/:courseId/:lessonId` leçon
- `#/t/:courseId/:unitId` checkpoint d'unité
- `#/p/:courseId` entraînement sur les erreurs
- `#/profile` profil
- `#/aide` aide (règles du jeu)

**Menu** : barre d'onglets en bas sur mobile, barre latérale à partir de 900 px ; masqué pendant une session (`body.in-session`). « Apprendre » et « Réviser » visent le dernier cours ouvert (`S.lastCourse`), sinon le premier cours `live`.

**Palette** : beige (fond) et vert forêt (`--primary`), terracotta pour les erreurs, ocre pour l'or. Les couleurs des unités (`data/*.json`) et des cours (`courses.json`) restent dans ces tons.

**État** : `localStorage`, clé `coursequest-v1`. La progression est propre à chaque navigateur ; il n'y a pas de backend.

**Règles de jeu** (constantes en tête de `app.js`) :

- XP : 10 par bonne réponse du premier coup, 4 après une erreur, +10 pour une leçon parfaite, +20 pour un checkpoint réussi, 5 par réponse en mode entraînement.
- Cœurs : 5 au maximum, +1 toutes les 30 min. Une erreur en leçon coûte 1 cœur ; une session d'entraînement en rend 1.
- Série de jours et objectif quotidien (10, 20, 30 ou 50 XP).
- Étoiles par leçon : ≥95 % = 3 étoiles, ≥75 % = 2.
- Checkpoint : 10 questions tirées au hasard, réussi à ≥80 %, ne coûte pas de cœurs.
- En leçon, une réponse fausse est reposée à la fin.

## Format du contenu (`data/<courseId>.json`)

```json
{ "id": "trademark-law", "title": "...", "code": "...", "source": "...", "units": [
  { "id": "u1", "title": "...", "session": "Session 1", "color": "#7b5cff", "lessons": [
    { "id": "u1l1", "title": "...", "exercises": [
      { "id": "u1l1e1", "type": "mcq", "prompt": "...", "choices": ["A","B","C"], "answer": 0, "explain": "...", "scenario": "facultatif : en fait un cas pratique" },
      { "id": "...", "type": "tf", "prompt": "...", "answer": true, "explain": "..." },
      { "id": "...", "type": "fill", "prompt": "The ___ protects ...", "bank": ["mot1","mot2"], "answer": ["mot1"], "explain": "..." },
      { "id": "...", "type": "match", "prompt": "...", "pairs": [["EN","FR"], ["...","..."]] }
    ]}
  ]}
]}
```

Référence : `data/trademark-law.json`, ainsi que `renderExercise()` et `check()` dans `app.js`. L'icône et la couleur d'un cours se règlent dans `data/courses.json`.

Les icônes disponibles (map `ICONS` dans `app.js`) : scale, chip, chart, coins, book, megaphone, star, lock, trophy, check.

### Ajouter un cours

1. Créer `data/<id>.json` dans le format ci-dessus.
2. Dans `data/courses.json`, passer l'entrée du cours à `"status": "live"` (ou l'ajouter).
3. Valider le contenu : ids uniques, index `answer` valides, chaque `fill` a autant de réponses que de `___`.

Cours prévus : `digital-innovation`, `econometrics`, `cost-accounting`, `advanced-financial-accounting`, `marketing-management`. Le contenu vient des slides MyCourses d'Émile. N'invente pas de contenu de cours : demande les supports.

## Conventions

- Garder zéro dépendance et zéro build : ça doit rester déployable tel quel sur Pages.
- Garder l'UI en français, l'accessibilité (focus visibles, `prefers-reduced-motion`) et le mobile sans scroll horizontal à 420 px.
- Ne pas changer la clé `localStorage` sans migration, sinon les utilisateurs perdent leur progression.
- Tester avant de pousser : serveur local, puis une leçon complète (bonne et mauvaise réponse), puis le profil, avec la console sans erreurs.
