# Build context is the REPO ROOT (not ./backend) so this image can bake in
# /data/rbi-regulated-lending-apps.json — see lendingList.ts, which resolves
# it at the absolute path /data regardless of environment. Locally,
# docker-compose additionally bind-mounts ./data:/data so edits are picked
# up without a rebuild; on a host with no such mount (e.g. Render), the
# COPY below is what makes the image self-contained.
FROM node:22-alpine AS build
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY data/rbi-regulated-lending-apps.json /data/rbi-regulated-lending-apps.json

EXPOSE 3000
CMD ["node", "dist/index.js"]
