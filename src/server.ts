import express, {type Request, type Response } from "express";
import fileUpload, { type UploadedFile } from "express-fileupload";
import {PDFParse} from "pdf-parse";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server corriendo en http://localhost:${PORT}`);
});

app.use(
    cors({
        origin: ["http://localhost:3000", "http://localhost:5500", "http://127.0.0.1:5500"] //Add the live server http
    })
);

app.use(
  fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
    abortOnLimit: true,
  })
);

async function parsePDF(file: Uint8Array) {
  const parser = new PDFParse(file);
  const data = await parser.getText();
  const info = await parser.getInfo({ parsePageInfo: true });
  return { text: data?.text || "", info, numpages: info?.pages || 0 };
}

app.post("/upload", async (req: Request, res: Response) => {
  try {
    if (!req.files || !("file" in req.files)) {
      return res.status(400).json({
        error: "No existe PDF compartido.",
        body: `Body is ${JSON.stringify(req.body)}`,
      });
    }

    const pdfFile = req.files.file as UploadedFile;
    const unit8ArrayData = new Uint8Array(pdfFile?.data);
    const result = await parsePDF(unit8ArrayData);
    console.log("PDF analizado correctamente: ", result);
    res.json({ result, success: true });
  } catch (error) {
    console.error("Error procesando el PDF:", error);
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message, success: false });
    }
    res.status(500).json({
      error: "Error al procesar el PDF debido a un error desconocido.",
      success: false,
    });
  }
});

async function parsePageRangeFromPDF(
  file: Uint8Array,
  startPage: number,
  endPage: number,
) {
  const parser = new PDFParse(file);
  const info = await parser.getInfo({ parsePageInfo: true });
  const totalPages = Array.isArray(info?.pages)
    ? info.pages.length
    : (info?.pages as number) || 0;

  if (startPage < 1 || endPage > totalPages || startPage > endPage) {
    throw new Error(
      `Rango de paginas invalido. PDF tiene ${totalPages} paginas. Por favor de un rango valido que respete las siguientes condiciones: inicio >= 1, final <= ${totalPages}, e inicio <= final.`,
    );
  }

  const data = await parser.getText();
  const lines = data?.text?.split("\n") || [];

  return { text: data?.text || "", startPage, endPage, totalPages };
}

app.post("/upload-page-range", async (req: Request, res: Response) => {
  try {
    if (!req.files || !("file" in req.files)) {
      return res.status(400).json({
        error: "No PDF file shared.",
      });
    }

    const startPage = parseInt(
      (req.query.startPage as string) || (req.body?.startPage as string) || "1"
    );
    const endPage = parseInt(
      (req.query.endPage as string) || (req.body?.endPage as string) || "1"
    );

    if (isNaN(startPage) || isNaN(endPage)) {
      return res.status(400).json({
        error:
          "Rango de paginas invalido. Por favor ingrese un rango de inicio y final valido.",
      });
    }

    const pdfFile = req.files.file as UploadedFile;
    const unit8ArrayData = new Uint8Array(pdfFile?.data);
    const result = await parsePageRangeFromPDF(
      unit8ArrayData,
      startPage,
      endPage
    );
    console.log(
      `Paginas ${startPage}-${endPage} extraidas existosamente: `,
      result
    );
    res.json({ result, success: true });
  } catch (error) {
    console.error("Error procesando PDF: ", error);
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message, success: false });
    }
    res.status(500).json({
      error: "Error desconocido al procesar el PDF .",
      success: false,
    });
  }
});

function convertPDFDateToReadable(pdfDateString: string): string {
  try {
    let dateStr = pdfDateString.startsWith("D:")
      ? pdfDateString.slice(2)
      : pdfDateString;

    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const hour = dateStr.substring(8, 10);
    const minute = dateStr.substring(10, 12);
    const second = dateStr.substring(12, 14);

    const monthNum = parseInt(month);
    const dayNum = parseInt(day);

    if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
      throw new Error("Invalid date values");
    }

    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error("Error convirtiendo la fecha del PDF:", error);
    return "Invalid date";
  }
}

async function getPDFMetadata(file: Uint8Array) {
  const parser = new PDFParse(file);
  const info = await parser.getInfo({ parsePageInfo: true });
  return {
    title: info?.info?.Title || "N/A",
    author: info?.info?.Author || "N/A",
    subject: info?.info?.Subject || "N/A",
    creator: info?.info?.Creator || "N/A",
    producer: info?.info?.Producer || "N/A",
    creationDate: convertPDFDateToReadable(info?.info?.CreationDate || "N/A"),
    modificationDate: convertPDFDateToReadable(info?.info?.ModDate || "N/A"),
    pages: info?.total || 0,
  };
}

app.post("/metadata", async (req: Request, res: Response) => {
  try {
    if (!req.files || !("file" in req.files)) {
      return res.status(400).json({
        error: "No se encontro PDF compartido.",
      });
    }

    const pdfFile = req.files.file as UploadedFile;
    const unit8ArrayData = new Uint8Array(pdfFile?.data);
    const metadata = await getPDFMetadata(unit8ArrayData);

    console.log("Metadata del PDF extraida exitosamente: ", metadata);
    res.json({ metadata, success: true });
  } catch (error) {
    console.error("Error al extraer metadata:", error);
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message, success: false });
    }
    res.status(500).json({
      error: "Error al extraer metadata debido a error desconnocido.",
      success: false,
    });
  }
});

async function searchPDFText(
  file: Uint8Array,
  searchQuery: string,
  caseSensitive: boolean = false
) {
  const parser = new PDFParse(file);
  const info = await parser.getInfo({ parsePageInfo: true });
  const totalPages = Array.isArray(info?.pages)
    ? info.pages.length
    : (info?.pages as number) || 0;

  const results = {
    query: searchQuery,
    caseSensitive,
    matchCount: 0,
    matches: [] as Array<{
      page: number;
      text: string;
      position: number;
    }>,
  };

  for (let page = 1; page <= totalPages; page++) {
    const data = await parser.getText();
    const pageText = data?.text || "";

    const searchText = caseSensitive ? searchQuery : searchQuery.toLowerCase();
    const compareText = caseSensitive ? pageText : pageText.toLowerCase();

    let searchIndex = 0;
    while ((searchIndex = compareText.indexOf(searchText, searchIndex)) !== -1) {
      const startContext = Math.max(0, searchIndex - 50);
      const endContext = Math.min(pageText.length, searchIndex + searchQuery.length + 50);
      const contextText = pageText.substring(startContext, endContext);

      results.matches.push({
        page,
        text: contextText.trim(),
        position: searchIndex,
      });

      results.matchCount++;
      searchIndex += searchText.length;
    }
  }

  return results;
}

app.post("/search", async (req: Request, res: Response) => {
  try {
    if (!req.files || !("file" in req.files)) {
      return res.status(400).json({
        error: "No se encontro PDF compartido.",
      });
    }

    const query = (req.query.query as string) || (req.body?.query as string);
    const caseSensitive =
      (req.query.caseSensitive as string) === "true" ||
      req.body?.caseSensitive === true;

    if (!query || query.trim() === "") {
      return res.status(400).json({
        error: "Consulta de busqueda es necesaria.",
      });
    }

    const pdfFile = req.files.file as UploadedFile;
    const unit8ArrayData = new Uint8Array(pdfFile?.data);
    const results = await searchPDFText(unit8ArrayData, query, caseSensitive);

    if (results.matchCount === 0) {
      return res.json({
        result: results,
        success: true,
        message: "No se encontraron coincidencias.",
      });
    }

    console.log(`Se encontraron ${results.matchCount} coincidencias para "${query}"`);
    res.json({ result: results, success: true });
  } catch (error) {
    console.error("Error buscando PDF:", error);
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message, success: false });
    }
    res.status(500).json({
      error: "Error al buscar PDF debido a error desconnocido.",
      success: false,
    });
  }
});

