# DevOps Lab

Laboratoire DevOps complet : une API REST Node.js/Express connectée à PostgreSQL,
conteneurisée avec Docker, et livrée par un pipeline CI/CD Jenkins intégrant
tests automatisés, analyse de qualité SonarQube et scan de vulnérabilités Trivy.

Le but du projet est pédagogique : disposer d'une chaîne complète
**code → test → qualité → sécurité → build → déploiement → health check**
que l'on peut exécuter entièrement en local.

---

## Sommaire

- [Architecture](#architecture)
- [Stack technique](#stack-technique)
- [Structure du projet](#structure-du-projet)
- [Prérequis](#prérequis)
- [Démarrage rapide](#démarrage-rapide)
- [Initialisation de la base de données](#initialisation-de-la-base-de-données)
- [Variables d'environnement](#variables-denvironnement)
- [API](#api)
- [Tests](#tests)
- [Qualité de code — SonarQube](#qualité-de-code--sonarqube)
- [Sécurité — Trivy](#sécurité--trivy)
- [Pipeline CI/CD Jenkins](#pipeline-cicd-jenkins)
- [Dépannage](#dépannage)

---

## Architecture

```
                    ┌─────────────────────────────────────────────┐
                    │            Pipeline Jenkins                 │
                    │                                             │
   git push  ──────▶│  Checkout → Install → Test → SonarQube      │
                    │     → Quality Gate → Docker Build           │
                    │     → Trivy Scan → Deploy → Health Check    │
                    └──────────────────┬──────────────────────────┘
                                       │ docker compose up -d --build
                                       ▼
        ┌──────────────────────────────────────────────────────────┐
        │                    Docker Compose                        │
        │                                                          │
        │   ┌────────────────┐        ┌──────────────────────┐     │
        │   │  api           │───────▶│  postgres            │     │
        │   │  Node 22       │  5432  │  PostgreSQL 17       │     │
        │   │  :3000         │        │  volume postgres_data│     │
        │   └────────────────┘        └──────────────────────┘     │
        │                                                          │
        │   ┌──────────────────────────────────────────────┐       │
        │   │  sonarqube (community)  :9000                │       │
        │   └──────────────────────────────────────────────┘       │
        └──────────────────────────────────────────────────────────┘
```

Trois services sont définis dans `app/compose.yml` :

| Service     | Image / source     | Port  | Rôle                                     |
|-------------|--------------------|-------|------------------------------------------|
| `api`       | build local        | 3000  | API REST Express                         |
| `postgres`  | `postgres:17-alpine` | 5432 | Base de données, volume persistant      |
| `sonarqube` | `sonarqube:community` | 9000 | Serveur d'analyse de qualité de code    |

---

## Stack technique

| Domaine        | Outil                          |
|----------------|--------------------------------|
| Runtime        | Node.js 22 (image `node:22-alpine`) |
| Framework      | Express 5                      |
| Base de données| PostgreSQL 17 (client `pg` 8)  |
| Tests          | Jest 30 + Supertest 7          |
| Conteneurs     | Docker + Docker Compose        |
| CI/CD          | Jenkins (Declarative Pipeline) |
| Qualité de code| SonarQube Community + sonar-scanner |
| Sécurité       | Trivy (scan d'image)           |

---

## Structure du projet

```
devops-lap/
├── Jenkinsfile                    # Pipeline CI/CD déclaratif (9 stages)
├── .gitignore                     # Ignore les rapports Trivy générés
└── app/
    ├── app.js                     # Application Express (routes + pool PostgreSQL)
    ├── server.js                  # Point d'entrée : démarre le serveur HTTP
    ├── package.json               # Dépendances et scripts npm
    ├── Dockerfile                 # Image de l'API
    ├── compose.yml                # api + postgres + sonarqube
    ├── sonar-project.properties   # Configuration de l'analyse SonarQube
    ├── .dockerignore
    └── tests/
        └── app.test.js            # Tests d'intégration HTTP (Jest + Supertest)
```

`app.js` exporte l'application sans l'écouter, ce qui permet à Supertest de la
tester en mémoire ; `server.js` est le seul à appeler `listen()`. Le pool
PostgreSQL est exposé via `app.locals.pool` pour que les tests puissent le
fermer proprement.

---

## Prérequis

Pour un usage local :

- **Docker** et **Docker Compose** (v2, commande `docker compose`)
- **Node.js 22+** et npm — uniquement pour lancer les tests hors conteneur

Pour exécuter le pipeline complet, voir la section
[Pipeline CI/CD Jenkins](#pipeline-cicd-jenkins).

---

## Démarrage rapide

```bash
git clone https://github.com/brojalloo/devops-lap.git
cd devops-lap/app

# Construit l'image de l'API et démarre api + postgres + sonarqube
docker compose up -d --build

# Vérifier que tout est en ligne
curl http://localhost:3000/health
curl http://localhost:3000/db-health
```

Services accessibles :

- API : <http://localhost:3000>
- PostgreSQL : `localhost:5432`
- SonarQube : <http://localhost:9000> (identifiants initiaux `admin` / `admin`)

Arrêt :

```bash
docker compose down          # arrête les conteneurs
docker compose down -v       # supprime aussi les volumes (données PostgreSQL)
```

### Lancer l'API sans Docker

```bash
cd app
npm ci
npm start        # écoute sur le port 3000
```

Dans ce mode, l'API utilise les valeurs par défaut du pool (`localhost:5432`).
Une base PostgreSQL doit donc être accessible localement, sinon seules les
routes `/` et `/health` répondront correctement.

---

## Initialisation de la base de données

Le schéma n'est pas créé automatiquement au démarrage. Les routes `/products`
renvoient une erreur 500 tant que la table n'existe pas. Créez-la une fois le
conteneur PostgreSQL démarré :

```bash
docker exec -i devops-lab-postgres psql -U devops -d devops_lab <<'SQL'
CREATE TABLE IF NOT EXISTS products (
    id         SERIAL PRIMARY KEY,
    name       TEXT NOT NULL,
    price      NUMERIC NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SQL
```

Les colonnes `id`, `name`, `price` et `created_at` sont celles attendues par les
requêtes SQL de `app/app.js`.

---

## Variables d'environnement

Lues par `app/app.js` et `app/server.js`. Toutes ont une valeur par défaut, ce
qui permet de démarrer l'API sans configuration.

| Variable      | Défaut            | Description                        |
|---------------|-------------------|------------------------------------|
| `PORT`        | `3000`            | Port d'écoute HTTP                 |
| `DB_HOST`     | `localhost`       | Hôte PostgreSQL (`postgres` sous Compose) |
| `DB_PORT`     | `5432`            | Port PostgreSQL                    |
| `DB_NAME`     | `devops_lab`      | Nom de la base                     |
| `DB_USER`     | `devops`          | Utilisateur                        |
| `DB_PASSWORD` | `devops_password` | Mot de passe                       |
| `NODE_ENV`    | —                 | Positionné à `production` par Compose |

> Les identifiants sont écrits en clair dans `compose.yml` : c'est acceptable
> pour un laboratoire local, mais à externaliser (fichier `.env` ou secrets
> Jenkins/Docker) pour tout autre usage.

---

## API

Base URL : `http://localhost:3000`

| Méthode | Route        | Description                          | Codes            |
|---------|--------------|--------------------------------------|------------------|
| `GET`   | `/`          | Message de bienvenue                 | 200              |
| `GET`   | `/health`    | Liveness de l'API (aucune dépendance)| 200              |
| `GET`   | `/db-health` | Vérifie la connexion PostgreSQL      | 200 / 500        |
| `GET`   | `/products`  | Liste des produits, triés par `id`   | 200 / 500        |
| `POST`  | `/products`  | Crée un produit (`name`, `price`)    | 201 / 400 / 500  |

### Exemples

```bash
# Bienvenue
curl http://localhost:3000/
# {"message":"Bienvenue dans le DevOps Lab"}

# Santé de l'API
curl http://localhost:3000/health
# {"status":"UP"}

# Santé de la base
curl http://localhost:3000/db-health
# {"status":"UP","database":"connected"}

# Lister les produits
curl http://localhost:3000/products
# [{"id":1,"name":"Clavier","price":"49.90","created_at":"..."}]

# Créer un produit
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Clavier","price":49.90}'
# 201 {"id":1,"name":"Clavier","price":"49.90","created_at":"..."}
```

`POST /products` renvoie `400` avec `{"error":"name et price sont obligatoires"}`
si `name` est absent/vide ou si `price` n'est pas fourni.

---

## Tests

Tests d'intégration HTTP écrits avec **Jest** et **Supertest**, dans
`app/tests/app.test.js`.

```bash
cd app
npm test                    # exécution standard
npm test -- --runInBand     # exécution séquentielle (utilisée par le pipeline)
```

Les tests couvrent :

- `GET /health` → statut `UP`
- `GET /` → message de bienvenue
- `GET /db-health` → tolère 200 ou 500 (pas de dépendance stricte à la base)
- `GET /products` → tolère 200 ou 500, vérifie le format tableau si 200
- `POST /products` → attend un 201 et le produit créé

> `POST /products` est le seul test qui exige une base accessible **et** la table
> `products` créée. Sans base disponible, il échoue : lancez `docker compose up -d postgres`
> et créez la table avant `npm test`.

---

## Qualité de code — SonarQube

Configuration : `app/sonar-project.properties`

```properties
sonar.projectKey=DevOps-Lab-API
sonar.projectName=DevOps Lab API
sonar.sources=.
sonar.tests=tests
sonar.exclusions=node_modules/**,coverage/**
sonar.test.inclusions=tests/**/*.js
sonar.sourceEncoding=UTF-8
```

Analyse manuelle en local (serveur SonarQube démarré via Compose) :

```bash
cd app
sonar-scanner \
  -Dsonar.host.url=http://localhost:9000 \
  -Dsonar.token=<votre_token>
```

Dans le pipeline, l'URL et le token proviennent de la configuration Jenkins
(`withSonarQubeEnv('sonarqube-local')`), et le stage **Quality Gate** interrompt
le build si la porte de qualité n'est pas franchie (timeout : 5 minutes).

---

## Sécurité — Trivy

L'image Docker construite est scannée à deux niveaux dans le pipeline :

```bash
# Rapport complet au format JSON (archivé comme artefact Jenkins)
trivy image --format json --output trivy-report.json devops-lab-api:jenkins

# Porte de sécurité : échec du build si une CVE CRITICAL est trouvée
trivy image --severity CRITICAL --exit-code 1 devops-lab-api:jenkins
```

Les rapports générés (`trivy-report.json`, `trivy-report.txt`,
`trivy-critical.txt`) sont ignorés par Git via `.gitignore`.

---

## Pipeline CI/CD Jenkins

Défini dans `Jenkinsfile` (pipeline déclaratif, `agent any`).

| # | Stage                 | Action                                                        | Bloquant |
|---|-----------------------|---------------------------------------------------------------|----------|
| 1 | `Checkout`            | `checkout scm`                                                 | oui |
| 2 | `Install`             | `npm ci` dans `app/`                                           | oui |
| 3 | `Test`                | `npm test -- --runInBand`                                      | oui |
| 4 | `SonarQube Analysis`  | `sonar-scanner` avec `withSonarQubeEnv('sonarqube-local')`     | oui |
| 5 | `Quality Gate`        | `waitForQualityGate abortPipeline: true` (timeout 5 min)       | oui |
| 6 | `Docker Build`        | `docker build -t devops-lab-api:jenkins .`                     | oui |
| 7 | `Trivy Security Scan` | Rapport JSON archivé + échec sur CVE `CRITICAL`                | oui |
| 8 | `Deploy`              | `docker compose up -d --build`                                 | oui |
| 9 | `Health Check`        | `curl -f /health` et `curl -f /db-health`                      | oui |

Le bloc `post` journalise le résultat (`success` / `failure` / `always`).

### Configuration Jenkins requise

- **Plugins** : Pipeline, Git, SonarQube Scanner, Docker (pour l'accès au démon)
- **Serveur SonarQube** nommé `sonarqube-local`
  (*Administer → System → SonarQube servers*), avec un token d'authentification
- **Outil** `sonar-scanner` déclaré dans *Administer → Tools → SonarQube Scanner*
- **Sur l'agent** : `node` + `npm`, `docker` et `docker compose`, `trivy`, `curl`
- L'utilisateur Jenkins doit appartenir au groupe `docker` (ou avoir accès au
  socket Docker) pour les stages *Docker Build*, *Trivy* et *Deploy*
- Les stages utilisent des étapes `sh` : un agent Linux (ou un conteneur) est
  attendu, pas un agent Windows

---

## Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| `/products` renvoie 500 | La table `products` n'existe pas | Voir [Initialisation de la base de données](#initialisation-de-la-base-de-données) |
| `/db-health` renvoie `DOWN` | Conteneur `postgres` non démarré ou identifiants erronés | `docker compose ps`, puis `docker compose logs postgres` |
| Test `POST /products` en échec en local | Base ou table absente | Démarrer PostgreSQL et créer la table avant `npm test` |
| Stage *Quality Gate* en timeout | Le webhook SonarQube ne remonte pas vers Jenkins | Configurer le webhook `http://<jenkins>/sonarqube-webhook/` dans SonarQube |
| Stage *Trivy* en échec | CVE `CRITICAL` dans l'image | Consulter `trivy-report.json` archivé, mettre à jour l'image de base ou les dépendances |
| *Health Check* en échec | L'API n'est pas encore prête après le déploiement | Augmenter le `sleep` du stage ou attendre que `postgres` soit sain |
| SonarQube ne démarre pas | `vm.max_map_count` trop bas (Elasticsearch) | `sudo sysctl -w vm.max_map_count=262144` |

---

## Licence

ISC (voir `app/package.json`).
