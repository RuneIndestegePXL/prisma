FROM node:20

WORKDIR /opt/app-root/src

COPY package.json package-lock.json ./
RUN npm install --production

COPY . .

RUN npx prisma generate

EXPOSE 5858
EXPOSE 4001

CMD ["npm", "start"]