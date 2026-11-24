import JSZip from "jszip";

export async function validateFileContent(req, res, next) {
    if (!req.file) {
        return res.status(400).json({ message: "Choose a file to convert." });
    }

    if (req.body.mode === "pdfToWord") {
        const pdfHeader = req.file.buffer.subarray(0, 5).toString("ascii");

        if (pdfHeader !== "%PDF-") {
            return res.status(400).json({
                message: "The uploaded file does not appear to be a valid PDF.",
            });
        }

        return next();
    }

    if (req.body.mode === "wordToPdf") {
        try {
            const zip = await JSZip.loadAsync(req.file.buffer);

            const hasContentTypes = Boolean(zip.file("[Content_Types].xml"));
            const hasWordDocument = Boolean(zip.file("word/document.xml"));

            if (!hasContentTypes || !hasWordDocument) {
                return res.status(400).json({
                    message: "The uploaded file does not appear to be a valid DOCX document.",
                });
            }

            return next();
        } catch {
            return res.status(400).json({
                message: "The uploaded file is not a valid DOCX document.",
            });
        }
    }

    // Let the controller return the existing invalid-mode response.
    return next();
}