# syntax=docker/dockerfile:1

FROM node:22-alpine AS manifests
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/syncstart-protocol/package.json packages/syncstart-protocol/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY tools/syncstart-simulator/package.json tools/syncstart-simulator/package.json

FROM manifests AS build-dependencies
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

FROM manifests AS runtime-dependencies
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --no-audit --no-fund

FROM build-dependencies AS build
COPY . .
RUN npm run build

FROM node:22-alpine AS node-runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=runtime-dependencies /app ./
COPY --from=build /app/packages/syncstart-protocol/dist packages/syncstart-protocol/dist

FROM node-runtime AS api
COPY --from=build /app/apps/api/dist apps/api/dist
EXPOSE 3002
CMD ["npm", "run", "start:prod", "--workspace=@lobby-control-room/api"]

FROM nginx:alpine AS frontend
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

FROM node-runtime AS syncstart-simulator
COPY --from=build /app/tools/syncstart-simulator/dist tools/syncstart-simulator/dist
EXPOSE 19000
CMD ["npm", "run", "start", "--workspace=@lobby-control-room/syncstart-simulator"]
