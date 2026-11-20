# 🍕 Pizzería — API

Backend del proyecto final de **Infraestructura para el Desarrollo Continuo** (ITESO).

API que expone el menú (tamaños, masas e ingredientes), calcula el precio de una pizza y registra pedidos.

## Stack

- **Cloudflare Workers** con **Hono** (TypeScript)
- **Cloudflare D1** como base de datos
- **Vitest** para pruebas unitarias

## Estado

🚧 En construcción.

## Proyecto

- Frontend: [pizzeria-web](https://github.com/pizzeria-iteso/pizzeria-web)
- Infraestructura y Wiki: [pizzeria-infra](https://github.com/pizzeria-iteso/pizzeria-infra)
- Tablero: [Pizzería](https://github.com/orgs/pizzeria-iteso/projects/1)

## Correr con Docker

La API también corre en Node con SQLite dentro de un contenedor. Usa las mismas migraciones que D1.

```bash
docker compose up --build
curl http://127.0.0.1:8787/health
```

- La base SQLite se guarda en el volumen `datos` (sobrevive a `docker compose down`; para borrarla: `docker compose down -v`).
- Sin Docker: `npm run start:node`.

### Imagen publicada

En cada merge a `main`, GitHub Actions publica la imagen en Docker Hub:
[`<usuario>/pizzeria-api`](https://hub.docker.com/r/<usuario>/pizzeria-api), con la etiqueta del SHA corto del commit y `latest`.

```bash
docker run --rm -p 8787:8787 pachvsus/pizzeria-api:latest
```