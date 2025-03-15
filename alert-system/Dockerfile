FROM node:16-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install -g @angular/cli@15.0.0
RUN npm install
COPY . .
RUN ng build --configuration production
FROM node:16-alpine
WORKDIR /app
COPY --from=build /app/dist/alert-system ./dist/alert-system
RUN npm install -g http-server
EXPOSE 4200
CMD ["http-server", "dist/alert-system", "-p", "4200"]