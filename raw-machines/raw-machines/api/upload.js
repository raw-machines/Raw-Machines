import { handleUpload } from '@vercel/blob/client';
import { getUser } from './_lib.js';

// The browser uploads straight to Vercel Blob (avoids the 4.5 MB serverless body limit).
// This route only issues the upload token, and only to logged-in developers.
export default async function handler(req, res) {
  const user = getUser(req);
  try {
    const json = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async () => {
        if (!user || user.role !== 'developer') throw new Error('Developer login required.');
        return { addRandomSuffix: true, maximumSizeInBytes: 500 * 1024 * 1024, tokenPayload: JSON.stringify({ uid: user.id }) };
      },
      onUploadCompleted: async () => {}
    });
    res.json(json);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}
