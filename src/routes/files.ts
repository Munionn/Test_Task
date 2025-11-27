import { Router, Request, Response } from 'express';
import { db } from '../db/connection';
import { files } from '../db/schemas';
import { eq, and, desc } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth';
import { upload, uploadDirPath } from '../config/multer';
import path from 'path';
import fs from 'fs';

const router: Router = Router();

router.use(authenticateToken);

/**
 * POST /file/upload
 */
router.post('/file/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    const ext = path.extname(file.originalname).slice(1); 
    const fileName = path.basename(file.originalname, path.extname(file.originalname));


    const insertResult = await db.insert(files).values({
      name: fileName,
      extension: ext,
      mimeType: file.mimetype,
      size: file.size,
      path: file.path,
      userId: user.userId,
    });

    const fileId = Number(insertResult[0].insertId);

    res.status(201).json({
      id: fileId,
      name: fileName,
      extension: ext,
      mimeType: file.mimetype,
      size: file.size,
      uploadDate: new Date(),
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /file/list
 */
router.get('/file/list', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const listSizeParam = req.query.list_size as string;
    const pageParam = req.query.page as string;
    
    const listSize = listSizeParam ? parseInt(listSizeParam) : 10;
    const page = pageParam ? parseInt(pageParam) : 1;
    
    if (isNaN(listSize) || listSize <= 0 || listSize > 100) {
      return res.status(400).json({ error: 'list_size must be a positive number between 1 and 100' });
    }
    
    if (isNaN(page) || page <= 0) {
      return res.status(400).json({ error: 'page must be a positive number' });
    }
    
    const offset = (page - 1) * listSize;

    const userFiles = await db
      .select()
      .from(files)
      .where(eq(files.userId, user.userId))
      .orderBy(desc(files.uploadDate))
      .limit(listSize)
      .offset(offset);

    const totalFiles = await db
      .select()
      .from(files)
      .where(eq(files.userId, user.userId));

    res.status(200).json({
      files: userFiles.map((file) => ({
        id: file.id,
        name: file.name,
        extension: file.extension,
        mimeType: file.mimeType,
        size: file.size,
        uploadDate: file.uploadDate,
      })),
      pagination: {
        page,
        list_size: listSize,
        total: totalFiles.length,
        total_pages: Math.ceil(totalFiles.length / listSize),
      },
    });
  } catch (error: any) {
    console.error('List files error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /file/:id
 */
router.get('/file/:id', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = parseInt(req.params.id);
    if (isNaN(fileId) || fileId <= 0) {
      return res.status(400).json({ error: 'Invalid file ID' });
    }

    const [file] = await db
      .select()
      .from(files)
      .where(and(eq(files.id, fileId), eq(files.userId, user.userId)))
      .limit(1);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.status(200).json({
      id: file.id,
      name: file.name,
      extension: file.extension,
      mimeType: file.mimeType,
      size: file.size,
      uploadDate: file.uploadDate,
    });
  } catch (error: any) {
    console.error('Get file error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /file/download/:id
 */
router.get('/file/download/:id', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = parseInt(req.params.id);
    if (isNaN(fileId) || fileId <= 0) {
      return res.status(400).json({ error: 'Invalid file ID' });
    }

    const [file] = await db
      .select()
      .from(files)
      .where(and(eq(files.id, fileId), eq(files.userId, user.userId)))
      .limit(1);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (!fs.existsSync(file.path)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    const fileName = `${file.name}.${file.extension}`;
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', file.mimeType);
    res.sendFile(path.resolve(file.path));
  } catch (error: any) {
    console.error('Download file error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /file/update/:id
 */
router.put('/file/update/:id', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = parseInt(req.params.id);
    if (isNaN(fileId) || fileId <= 0) {
      return res.status(400).json({ error: 'Invalid file ID' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const [existingFile] = await db
      .select()
      .from(files)
      .where(and(eq(files.id, fileId), eq(files.userId, user.userId)))
      .limit(1);

    if (!existingFile) {
      // Удаляем загруженный файл, если файл не найден
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ error: 'File not found' });
    }

    if (fs.existsSync(existingFile.path)) {
      fs.unlinkSync(existingFile.path);
    }

    const file = req.file;
    const ext = path.extname(file.originalname).slice(1);
    const fileName = path.basename(file.originalname, path.extname(file.originalname));

    await db
      .update(files)
      .set({
        name: fileName,
        extension: ext,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path,
      })
      .where(eq(files.id, fileId));

    res.status(200).json({
      id: fileId,
      name: fileName,
      extension: ext,
      mimeType: file.mimetype,
      size: file.size,
      uploadDate: new Date(),
    });
  } catch (error: any) {
    console.error('Update file error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /file/delete/:id
 */
router.delete('/file/delete/:id', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = parseInt(req.params.id);
    if (isNaN(fileId) || fileId <= 0) {
      return res.status(400).json({ error: 'Invalid file ID' });
    }

    const [file] = await db
      .select()
      .from(files)
      .where(and(eq(files.id, fileId), eq(files.userId, user.userId)))
      .limit(1);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    await db.delete(files).where(eq(files.id, fileId));

    res.status(200).json({ message: 'File deleted successfully' });
  } catch (error: any) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

