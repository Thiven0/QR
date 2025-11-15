const Tesseract = require("tesseract.js");

const MAX_IMAGE_BYTES = Number(process.env.VISITOR_DOC_MAX_BYTES || 5 * 1024 * 1024);

const normalizeLine = (line) => {
  if (typeof line !== "string") return "";
  return line
    .replace(/[^0-9a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s\/\-.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const splitLines = (text) => {
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map((line) => normalizeLine(line))
    .filter(Boolean);
};

const decodeBase64Image = (input) => {
  if (!input || typeof input !== "string") {
    throw new Error("La imagen del documento es obligatoria");
  }

  const matches = input.match(/^data:(.*?);base64,(.+)$/);
  const base64Data = matches ? matches[2] : input;

  const buffer = Buffer.from(base64Data, "base64");

  if (!buffer.length) {
    throw new Error("No fue posible leer la imagen del documento");
  }

  if (buffer.length > MAX_IMAGE_BYTES) {
    const limitMb = (MAX_IMAGE_BYTES / (1024 * 1024)).toFixed(1);
    throw new Error(`La imagen del documento supera el limite permitido (${limitMb}MB)`);
  }

  return buffer;
};

const findLineAfterKeyword = (lines, keywords) => {
  const normalizedKeywords = keywords.map((keyword) => keyword.toLowerCase());
  const index = lines.findIndex((line) => {
    const normalizedLine = line.toLowerCase();
    return normalizedKeywords.some((keyword) => normalizedLine.includes(keyword));
  });

  if (index === -1) return null;
  return lines[index + 1] || null;
};

const parseDocumentNumber = (lines) => {
  const keywordMatches = lines
    .map((line) => line.toLowerCase())
    .map((line, index) => ({ line, index }))
    .filter(({ line }) =>
      ["cedula", "cc", "c.c", "identidad", "numero", "número", "no", "n°"].some((keyword) =>
        line.includes(keyword)
      )
    )
    .map(({ index }) => lines[index]);

  const digitCandidates = [...keywordMatches, ...lines]
    .map((line) => line.replace(/[^\d]/g, ""))
    .filter((digits) => digits.length >= 6);

  if (!digitCandidates.length) return null;

  const sorted = digitCandidates.sort((a, b) => b.length - a.length);
  return sorted[0];
};

const parseBirthDate = (lines, fullText) => {
  const normalizedText = fullText.replace(/\s+/g, " ");
  const patterns = [
    /(\d{2})[\/\-. ](\d{2})[\/\-. ](\d{4})/,
    /(\d{2})\s+(\d{2})\s+(\d{4})/,
  ];

  const convertMatch = (match) => {
    if (!match) return null;
    const [, day, month, year] = match;
    if (!day || !month || !year) return null;
    const dayInt = Number(day);
    const monthInt = Number(month);
    const yearInt = Number(year);
    if (
      !Number.isFinite(dayInt) ||
      !Number.isFinite(monthInt) ||
      !Number.isFinite(yearInt)
    ) {
      return null;
    }
    const paddedDay = String(dayInt).padStart(2, "0");
    const paddedMonth = String(monthInt).padStart(2, "0");
    return `${yearInt}-${paddedMonth}-${paddedDay}`;
  };

  const nacimientoLine = lines.find((line) =>
    line.toLowerCase().includes("nac")
  );

  if (nacimientoLine) {
    for (const pattern of patterns) {
      const match = nacimientoLine.match(pattern);
      if (match) {
        return convertMatch(match);
      }
    }
  }

  for (const pattern of patterns) {
    const match = normalizedText.match(pattern);
    if (match) {
      return convertMatch(match);
    }
  }

  return null;
};

const pickLetterLines = (lines) =>
  lines.filter((line) => /^[A-ZÁÉÍÓÚÜÑ ]{4,}$/i.test(line.replace(/[^A-Za-zÁÉÍÓÚÜÑ\s]/gi, "")));

const parseNames = (lines) => {
  const apellido = findLineAfterKeyword(lines, ["apellido", "apellidos"]);
  const nombre = findLineAfterKeyword(lines, ["nombre", "nombres"]);

  if (apellido || nombre) {
    return {
      apellidos: apellido || null,
      nombres: nombre || null,
    };
  }

  const lettersOnly = pickLetterLines(lines);
  if (!lettersOnly.length) {
    return { nombres: null, apellidos: null };
  }

  const [first, second] = lettersOnly;

  return {
    apellidos: first || null,
    nombres: second || null,
  };
};

const parseDocumentFields = (rawText) => {
  if (!rawText) {
    return {
      cedula: null,
      nombres: null,
      apellidos: null,
      fechaNacimiento: null,
      fieldsDetected: [],
    };
  }

  const lines = splitLines(rawText);
  const documentNumber = parseDocumentNumber(lines);
  const birthDate = parseBirthDate(lines, rawText);
  const { nombres, apellidos } = parseNames(lines);

  const fieldsDetected = [];
  if (documentNumber) fieldsDetected.push("cedula");
  if (nombres) fieldsDetected.push("nombres");
  if (apellidos) fieldsDetected.push("apellidos");
  if (birthDate) fieldsDetected.push("fechaNacimiento");

  return {
    cedula: documentNumber || null,
    nombres: nombres || null,
    apellidos: apellidos || null,
    fechaNacimiento: birthDate || null,
    fieldsDetected,
  };
};

const extractDocumentDataFromImage = async (imageData) => {
  const buffer = decodeBase64Image(imageData);

  const { data } = await Tesseract.recognize(buffer, "spa+eng", {
    logger: () => {},
  });

  const rawText = (data?.text || "").trim();
  const parsed = parseDocumentFields(rawText);

  return {
    rawText,
    confidence: typeof data?.confidence === "number" ? data.confidence : null,
    ...parsed,
  };
};

module.exports = {
  extractDocumentDataFromImage,
};
