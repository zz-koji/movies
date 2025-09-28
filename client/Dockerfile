# build stage
FROM node:22 AS build
WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml ./
RUN corepack enable
RUN yarn install 
COPY . .
RUN yarn build

# runtime stage
FROM nginx:latest AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
