import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const conversionModes = {
  pdfToWord: {
    inputFormat: "pdf",
    outputFormat: "docx",
    executable: "pdf2docx",
    getArguments: (inputPath, outputPath) => ["convert", inputPath, outputPath],
  },
  wordToPdf: {
    inputFormat: "docx",
    outputFormat: "pdf",
  },
};

const conversionTimeoutMs = 90_000;

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, conversionTimeoutMs);

    child.stderr.on("data", (chunk) => {
      if (stderr.length < 4096) {
        stderr += chunk.toString().slice(0, 4096 - stderr.length);
      }
    });

    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.once("close", (code) => {
      clearTimeout(timeout);

      if (timedOut) {
        const error = new Error("Conversion process timed out.");
        error.statusCode = 504;
        error.publicMessage =
          "This document took too long to convert. Try a smaller document.";
        return reject(error);
      }

      if (code !== 0) {
        const error = new Error(
          stderr.trim() || `Conversion process exited with code ${code}.`
        );
        error.statusCode = 422;
        error.publicMessage =
          "We couldn't convert this file. It may be damaged, encrypted, or unsupported.";
        return reject(error);
      }

      resolve();
    });
  });
}

function safeBaseName(filename) {
  const baseName = path.basename(filename, path.extname(filename));
  const safeName = baseName
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return safeName || "converted-document";
}

async function removeTempDirectory(directory) {
  if (!directory) return;

  try {
    await fs.rm(directory, { recursive: true, force: true });
  } catch (error) {
    console.error("Could not remove conversion temporary files:", error.message);
  }
}

export async function convertFile(req, res, next) {
  let tempDirectory;

  try {
    const conversion = conversionModes[req.body.mode];

    if (!req.file) {
      return res.status(400).json({ message: "Choose a file to convert." });
    }

    if (!conversion) {
      return res.status(400).json({ message: "Choose a valid conversion type." });
    }

    const originalName = path.basename(req.file.originalname || "document");
    const actualExtension = path.extname(originalName).toLowerCase();
    const expectedExtension = `.${conversion.inputFormat}`;

    if (actualExtension !== expectedExtension) {
      return res.status(400).json({
        message: `This mode requires a ${conversion.inputFormat.toUpperCase()} file.`,
      });
    }

    const baseName = safeBaseName(originalName);
    const outputName = `${baseName}.${conversion.outputFormat}`;
    tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "docshift-"));

    const inputPath = path.join(
      tempDirectory,
      `source.${conversion.inputFormat}`
    );
    const outputPath = path.join(
      tempDirectory,
      `source.${conversion.outputFormat}`
    );

    await fs.writeFile(inputPath, req.file.buffer);

    if (req.body.mode === "pdfToWord") {
      await runCommand(
        conversion.executable,
        conversion.getArguments(inputPath, outputPath)
      );
    } else {
      const profilePath = pathToFileURL(
        path.join(tempDirectory, "libreoffice-profile")
      ).href;

      await runCommand("libreoffice", [
        `-env:UserInstallation=${profilePath}`,
        "--headless",
        "--nologo",
        "--nodefault",
        "--nofirststartwizard",
        "--convert-to",
        "pdf:writer_pdf_Export",
        "--outdir",
        tempDirectory,
        inputPath,
      ]);
    }

    const outputFilePath =
      req.body.mode === "wordToPdf"
        ? path.join(tempDirectory, "source.pdf")
        : outputPath;
    const outputInfo = await fs.stat(outputFilePath);

    if (!outputInfo.isFile() || outputInfo.size === 0) {
      const error = new Error("The conversion produced an empty file.");
      error.statusCode = 422;
      error.publicMessage = "The converted file was empty. Please try another file.";
      throw error;
    }

    return res.download(outputFilePath, outputName, async (error) => {
      await removeTempDirectory(tempDirectory);

      if (error) {
        if (res.headersSent) {
          console.error("Download stream failed:", error.message);
          return;
        }

        next(error);
      }
    });
  } catch (error) {
    await removeTempDirectory(tempDirectory);
    next(error);
  }
}
