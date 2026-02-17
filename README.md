# 📄 PDF Text Extractor

API REST construida con **Express** y **TypeScript** para extraer texto, metadatos y realizar búsquedas dentro de archivos PDF. Incluye una interfaz gráfica HTML lista para usar.

---

## Tecnologías

- [Node.js](https://nodejs.org/)
- [Express 5](https://expressjs.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [pdf-parse](https://www.npmjs.com/package/pdf-parse)
- [express-fileupload](https://www.npmjs.com/package/express-fileupload)
- [cors](https://www.npmjs.com/package/cors)

---

## Estructura del proyecto

```
pdf-text-extractor/
├── src/
│   └── server.ts         # Servidor Express con todos los endpoints
├── PDF-Extractor.html # Interfaz gráfica
├── package.json
├── tsconfig.json
└── README.md
```

---

## Instalación

```bash
# Clonar el repositorio
git clone <url-del-repo>
cd pdf-text-extractor

# Instalar dependencias
npm install
```

---

## Desarrollo

```bash
npm run dev
```

El servidor correrá en `http://localhost:8080`.

Para la interfaz gráfica, abre `PDF-Extractor.html` con **Live Server** desde VS Code (correrá en `http://127.0.0.1:5500`).

---

## Build y producción

```bash
# Compilar TypeScript
npm run build

# Iniciar en producción
npm start
```

---

## Endpoints

Todos los endpoints reciben el archivo PDF como `multipart/form-data` con el campo `file`.

### `POST /upload`
Extrae todo el texto del PDF.

**Request:**
```
Content-Type: multipart/form-data
file: <archivo.pdf>
```

**Response:**
```json
{
  "result": {
    "text": "Contenido del PDF...",
    "numpages": 10,
    "info": {}
  },
  "success": true
}
```

---

### `POST /upload-page-range`
Extrae el texto de un rango de páginas específico.

**Query params:**
| Parámetro  | Tipo   | Descripción           |
|------------|--------|-----------------------|
| startPage  | number | Página de inicio (≥ 1)|
| endPage    | number | Página final          |

**Ejemplo:**
```
POST /upload-page-range?startPage=2&endPage=5
```

**Response:**
```json
{
  "result": {
    "text": "Texto de las páginas 2 a 5...",
    "startPage": 2,
    "endPage": 5,
    "totalPages": 20
  },
  "success": true
}
```

---

### `POST /metadata`
Retorna los metadatos del PDF.

**Response:**
```json
{
  "metadata": {
    "title": "Mi Documento",
    "author": "Juan Pérez",
    "subject": "Informe anual",
    "creator": "Microsoft Word",
    "producer": "Adobe PDF",
    "creationDate": "01/01/2024",
    "modificationDate": "15/03/2024",
    "pages": 10
  },
  "success": true
}
```

---

### `POST /search`
Busca un texto dentro del PDF y retorna los fragmentos donde aparece.

**Query params:**
| Parámetro     | Tipo    | Descripción                              |
|---------------|---------|------------------------------------------|
| query         | string  | Texto a buscar (requerido)               |
| caseSensitive | boolean | Distinguir mayúsculas/minúsculas (default: `false`) |

**Ejemplo:**
```
POST /search?query=introducción&caseSensitive=false
```

**Response:**
```json
{
  "result": {
    "query": "introducción",
    "caseSensitive": false,
    "matchCount": 3,
    "matches": [
      {
        "page": 1,
        "text": "...contexto alrededor de la introducción encontrada...",
        "position": 142
      }
    ]
  },
  "success": true
}
```

---

## Interfaz gráfica

El archivo `pdf-extractor-ui.html` ofrece una interfaz visual para interactuar con la API sin necesidad de herramientas como Postman.

**Funcionalidades:**
- Drag & drop o selección de archivo PDF
- Tres modos: texto completo, rango de páginas y metadatos
- Estadísticas de palabras y caracteres
- Botón para copiar el resultado al portapapeles

Para usarla, asegúrate de que el servidor esté corriendo y abre el HTML con Live Server.

<img width="1893" height="904" alt="Interface" src="https://github.com/user-attachments/assets/bce13e44-5b89-45f8-99f5-e502e296bf6f" />

---

## CORS

El servidor permite solicitudes desde los siguientes orígenes:

```ts
origin: [
  "http://localhost:3000",
  "http://localhost:5500",
  "http://127.0.0.1:5500"
]
```

Si necesitas agregar otro origen, edita la configuración de CORS en `src/server.ts`.

---

## Limitaciones

- Tamaño máximo de archivo: **50 MB**
- Solo se aceptan archivos en formato **PDF**
- El endpoint `/upload-page-range` retorna el texto completo del PDF (el filtrado por página depende de la estructura interna del documento)

---

Inspirado en https://www.freecodecamp.org/news/build-a-custom-pdf-text-extractor-with-nodejs-and-typescript/#heading-resources

