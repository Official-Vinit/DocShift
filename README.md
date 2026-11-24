# DocShift

DocShift is a PDF and Word converter built with React, Express, and MongoDB. The conversion engines run in the backend container: `pdf2docx` handles PDF to DOCX, and LibreOffice handles DOCX to PDF. Uploaded files are stored temporarily in the container and removed after the download finishes.

## Run the conversion backend locally

The backend needs Docker because it depends on Python, `pdf2docx`, and LibreOffice.

1. Copy `backend/.env.example` to `backend/.env` and set `MONGODB_URI` to a MongoDB connection string.
2. From the `backend` directory, build and run the container:

   ```sh
   docker build -t docshift-api .
   docker run --rm --env-file .env -p 5000:5000 -e PORT=5000 docshift-api
   ```

3. In another terminal, run the frontend:

   ```sh
   cd frontend
   npm ci
   npm run dev
   ```

Vite proxies `/api` requests to the local backend. The frontend can also use `VITE_API_URL` to point to a separately hosted API.

## Render deployment

Deploy the backend as a Docker web service using `backend` as its root directory and `Dockerfile` as its Dockerfile. Set `MONGODB_URI` and `FRONTEND_ORIGINS` in the service environment. Set `VITE_API_URL` on the frontend static site to the backend service URL, then rebuild the static site.

Render's free web services are intended for testing and hobby projects. They can spin down while idle and have limited memory, so conversions of large or complex documents may not complete reliably.

## License

DocShift is licensed under the GNU Affero General Public License version 3 or later. See [`LICENSE`](LICENSE) for the license identifier and official text link.

The PDF to DOCX dependency, `pdf2docx`, is no longer actively maintained by Artifex. Its PyMuPDF dependency is also AGPL-licensed. Review third-party license notices when distributing or operating DocShift.
