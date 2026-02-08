FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server ./server
COPY --from=build /app/frontend/dist ./frontend/dist
COPY --from=build /app/data ./data
COPY --from=build /app/temp ./temp
COPY --from=build /app/.env.example ./.env.example

RUN mkdir -p /app/data/image /app/temp

EXPOSE 3000
CMD ["node", "server/index.js"]
