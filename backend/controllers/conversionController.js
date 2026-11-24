import CloudConvert from "cloudconvert";

function getCloudConvert() {
    const apiKey = process.env.CLOUDCONVERT_API_KEY;

    if (!apiKey) {
        throw new Error("CLOUDCONVERT_API_KEY is not configured.");
    }

    return new CloudConvert(apiKey);
}
const conversionModes = {
    pdfToWord: {
        inputFormat: "pdf",
        outputFormat: "docx",
        outputExtension: "docx",
    },
    wordToPdf: {
        inputFormat: "docx",
        outputFormat: "pdf",
        outputExtension: "pdf",
    },
};

export async function convertFile(req, res, next) {
    const cloudConvert = getCloudConvert();
    try {
        const { mode } = req.body;
        const conversion = conversionModes[mode];

        if (!req.file) {
            return res.status(400).json({ message: "Choose a file to convert." });
        }

        if (!conversion) {
            return res.status(400).json({ message: "Choose a valid conversion type." });
        }

        const originalName = req.file.originalname;
        const expectedExtension = `.${conversion.inputFormat}`;

        if (!originalName.toLowerCase().endsWith(expectedExtension)) {
            return res.status(400).json({
                message: `This mode requires a ${conversion.inputFormat.toUpperCase()} file.`,
            });
        }

        const outputName = `${originalName.replace(/\.[^.]+$/, "")}.${conversion.outputExtension}`;

        const job = await cloudConvert.jobs.create({
            tasks: {
                "upload-file": {
                    operation: "import/upload",
                },
                "convert-file": {
                    operation: "convert",
                    input: "upload-file",
                    input_format: conversion.inputFormat,
                    output_format: conversion.outputFormat,
                    filename: outputName,
                },
                "export-file": {
                    operation: "export/url",
                    input: "convert-file",
                },
            },
        });

        const uploadTask = job.tasks.find((task) => task.name === "upload-file");

        await cloudConvert.tasks.upload(
            uploadTask,
            req.file.buffer,
            originalName
        );

        const finishedJob = await cloudConvert.jobs.wait(job.id);
        const [exportedFile] = cloudConvert.jobs.getExportUrls(finishedJob);

        if (!exportedFile?.url) {
            throw new Error("The conversion finished without a downloadable file.");
        }

        return res.json({
            filename: exportedFile.filename,
            downloadUrl: exportedFile.url,
        });
    } catch (error) {
        console.error(
            "Conversion failed:",
            error.response?.data ?? error.stack ?? error
        );

        next(error);
    }
}