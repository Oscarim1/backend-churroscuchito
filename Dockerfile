FROM node:22.14.0

# Instala dependencias del sistema necesarias para Puppeteer
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
    xdg-utils \
    --no-install-recommends && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Crea el directorio de trabajo
WORKDIR /app

# Copia solo package.json y lock para aprovechar cache
COPY package*.json ./

# Instala dependencias del proyecto
RUN npm install

# Copia el resto del código
COPY . .

# Expone el puerto del backend
EXPOSE 3000

# Comando de inicio
CMD ["npm", "run", "dev"]
