// src/routes/profile.ts
import { Router } from 'express';
import { requireLogin, AuthedRequest } from '../middleware/auth';
import { db } from '../db';

export const profileRouter = Router();

profileRouter.get('/api/profile', requireLogin, (req: AuthedRequest, res) => {
  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.user!.id);
  res.json(user);
});

profileRouter.put('/api/profile', requireLogin, (req: AuthedRequest, res) => {
    const current = db
        .prepare('SELECT * FROM users WHERE id = ?')
        .get(req.user!.id) as any;

    if (!current) {
        return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    const name = req.body.name ?? current.name;
    const phone = req.body.phone ?? current.phone;
    const email = req.body.email ?? current.email;

    db.prepare(
        'UPDATE users SET name = ?, phone = ?, email = ? WHERE id = ?'
    ).run(name, phone, email, current.id);

    return res.json({
        id: current.id,
        name,
        phone,
        email,
        role: current.role
    });
});
