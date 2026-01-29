
FROM node:18-alpine

WORKDIR /app

COPY index.js .
COPY package.json .

RUN npm install --production

ENV PORT=8080

EXPOSE 8080

CMD ["node", "index.js"]
