ARG NODE_VERSION=24.22.1

FROM node:${NODE_VERSION}-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:${NODE_VERSION}-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server ./server
COPY --from=build /app/frontend/dist ./frontend/dist
COPY --from=build /app/.env.example ./.env.example

RUN mkdir -p /app/data/image /app/temp

EXPOSE 3000
CMD ["node", "server/index.js"]
