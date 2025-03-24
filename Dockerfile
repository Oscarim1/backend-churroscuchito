FROM node:22.14.0

# Instala las librerías requeridas por Puppeteer
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libxshmfence1 \
    libglu1-mesa \
    xdg-utils \
    --no-install-recommends && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Directorio de trabajo
WORKDIR /app

# Copiamos dependencias primero para usar cache
COPY package*.json ./
RUN npm install

# Copiamos el resto del código
COPY . .

# Expone puerto
EXPOSE 3000

# Comando de inicio
CMD ["npm", "run", "dev"]

