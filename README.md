# CourseQuest

Révisions gamifiées des cours du S3, façon application de langues : leçons de 3 minutes, XP, série de jours, cœurs, tests d'unité et badges.

**Application en ligne :** https://emile-delaunay.github.io/coursequest/

## Cours disponibles

| Cours | Statut | Contenu |
| --- | --- | --- |
| Trademark Law (2311) | ✅ En ligne | 8 unités, 16 leçons, 107 exercices (sessions 1 à 8 + glossaire EN↔FR) |
| Digital Innovation, Econometrics, Cost Accounting, AFA, Marketing | 🔜 Bientôt | — |

Le contenu de Trademark Law est tiré des slides du cours (Elsa Mimoun, coordinatrice), du *Translated Glossary* et de la *Case law list* disponibles sur MyCourses.

## Mécaniques de jeu

- **Parcours** : les leçons se débloquent dans l'ordre ; chaque unité se termine par un **test** (10 questions, 80 % pour valider).
- **Types d'exercices** : QCM, vrai/faux, cas pratiques, phrases à compléter, paires à associer.
- **XP** : 10 XP par bonne réponse du premier coup, 4 XP au 2e essai, +10 pour une leçon sans faute, +20 pour un test réussi.
- **Cœurs** : 5 maximum ; une erreur en leçon coûte un cœur ; +1 cœur toutes les 30 min ou après une révision.
- **Révision** : rejoue les questions ratées, sans perte de cœur.
- **Série et objectif du jour** (10 à 50 XP), **badges**, sons et confettis.

La progression est enregistrée dans le navigateur (localStorage) : aucun compte, aucun serveur.

## Structure

```
index.html            # coquille de l'app
assets/app.js         # moteur : routeur, leçons, XP, cœurs, séries, badges
assets/style.css      # styles (clair / sombre)
assets/icon.svg
data/courses.json     # liste des cours
data/trademark-law.json  # unités → leçons → exercices
```

## Ajouter un cours

1. Crée `data/<id-du-cours>.json` en suivant le format de `trademark-law.json`.
2. Dans `data/courses.json`, passe le cours en `"status": "live"`.

Formats d'exercices :

```json
{ "id": "u1l1e1", "type": "mcq",   "prompt": "…", "choices": ["…"], "answer": 0, "explain": "…" }
{ "id": "u1l1e2", "type": "tf",    "prompt": "…", "answer": true, "explain": "…" }
{ "id": "u1l1e3", "type": "fill",  "prompt": "… ___ …", "bank": ["…"], "answer": ["…"], "explain": "…" }
{ "id": "u1l1e4", "type": "match", "prompt": "…", "pairs": [["gauche", "droite"]] }
```

Un `"scenario": "…"` ajouté à un QCM l'affiche comme cas pratique.

## Lancer en local

```bash
python3 -m http.server 8000   # puis http://localhost:8000
```
