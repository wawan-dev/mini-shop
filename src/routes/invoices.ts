// src/routes/invoices.ts
import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { requireLogin, AuthedRequest } from '../middleware/auth';
import { db } from '../db';

export const invoicesRouter = Router();

const FILES_DIR = path.join(__dirname, '..', '..', 'files');

invoicesRouter.get('/api/invoices', requireLogin, (req: AuthedRequest, res) => {
  const invoices = db
    .prepare(`SELECT id, order_id, amount, file_name, created_at FROM invoices WHERE user_id = ? ORDER BY id`)
    .all(req.user!.id);
  res.json(invoices);
});


invoicesRouter.get('/api/invoices/:id', requireLogin, (req: AuthedRequest, res) => {
  const invoice = db
    .prepare('SELECT * FROM invoices WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user!.id);

  if (!invoice) {
    return res.status(404).json({ error: 'Facture introuvable' });
  }

  return res.json(invoice);
});


invoicesRouter.get('/download', requireLogin, (req, res) => {
    const name = String(req.query.name || '');

    // Refuser les chemins et les noms de fichiers invalides
    if (!name || name === '.' || name === '..' || path.basename(name) !== name || name.includes('/') || name.includes('\\')) {
        return res.status(400).send('Nom de fichier invalide');
    }

    const fullPath = path.resolve(FILES_DIR, name);

    // Vérifier que le fichier reste dans le dossier autorisé
    if (path.dirname(fullPath) !== path.resolve(FILES_DIR)) {
        return res.status(400).send('Chemin interdit');
    }

    fs.readFile(fullPath, 'utf-8', (err, data) => {
        if (err) return res.status(404).send('Fichier introuvable');
        return res.type('text/plain').send(data);
    });
});
