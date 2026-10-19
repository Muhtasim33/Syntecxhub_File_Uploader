# DropLab - File Uploader

DropLab is a responsive, Drive-style file storage web app. Users can create an account, organize files in nested folders, upload and share content, and manage deleted or spam items from one dashboard.

## Features

- Sign up and log in with validated credentials and password visibility controls.
- Upload individual files or whole folders, preserving nested folder paths.
- Organize files in My Drive with nested folders, and star frequently used items.
- Browse Home / Suggested, Shared with me, Recent, Starred, Spam, and Trash views.
- Share files and folders with links or other users.
- Restore items from Trash; old trashed items and spam are automatically cleaned up after 30 days.
- View storage usage and use the interface on mobile, tablet, and desktop screens.

## Tech stack

- **Frontend:** HTML, CSS, and vanilla JavaScript
- **Backend:** Node.js and Express
- **Database and file storage:** MongoDB, Mongoose, and GridFS
- **Authentication:** Passport JWT, JSON Web Tokens, and bcryptjs
- **Uploads:** Multer

## Run locally

1. Install [Node.js](https://nodejs.org/) and have a MongoDB database available (MongoDB Atlas or a local MongoDB instance).
2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the project root:

   ```env
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=replace_with_a_long_random_secret
   PORT=5000
   ```

4. Start the app:

   ```bash
   npm start
   ```

5. Open [http://localhost:5000](http://localhost:5000).

The app creates and uses the GridFS bucket named `uploads` in the configured database. For deployment, set `MONGO_URI` and a strong, unique `JWT_SECRET` in the hosting provider's environment settings. **Do not commit `.env` or put real secrets in this README.**
