// src/__tests__/example.test.ts
//
// Exemple minimal, pour voir la syntaxe avant d'écrire vos propres tests.
// Il porte sur une route SAINE (GET /api/products) : il ne prouve aucune
// faille, il montre juste le squelette à reproduire.
//
// À faire, au TP 5-6, pour chaque faille que vous trouvez :
//   1. Copiez ce squelette dans un nouveau fichier (ou ajoutez-y un test).
//   2. Écrivez une assertion qui capture l'exigence (ex. "la réponse doit
//      être 404", "le rôle ne doit pas changer"...).
//   3. Lancez `npm test` : le test doit ÉCHOUER contre le code encore
//      vulnérable — c'est la preuve que le test teste bien quelque chose.
//   4. Corrigez la faille, relancez `npm test` : il doit passer au vert.
//
// Exécution : npm test (compile puis lance node --test sur dist/__tests__/).

import assert from 'node:assert/strict';
import { test, beforeEach } from 'node:test';
import request from 'supertest';
import { app } from '../app';
import { initSchema } from '../db';
import { reset, seed } from '../seed';

// Remet la base dans un état connu avant chaque test, pour que l'ordre
// d'exécution ou ce qu'un autre test a fait n'influence jamais le résultat.
beforeEach(() => {
  reset();
  initSchema();
  seed();
});

test('GET /api/products renvoie la liste des produits', async () => {
  const res = await request(app).get('/api/products');

  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body), 'la réponse doit être un tableau');
  assert.ok(res.body.length > 0, 'le tableau ne doit pas être vide');
});

test('GET /api/admin/diagnostic refuse un hôte non autorisé', async () => {
    const login = await request(app)
        .post('/login')
        .send({
            email: 'alice@minishop.test',
            password: 'Password123'
        });

    assert.equal(login.status, 200);

    const token = login.body.token;

    const res = await request(app)
        .get('/api/admin/diagnostic')
        .query({ host: '127.0.0.1;echo test' })
        .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 400);
    assert.deepEqual(res.body, {
        error: 'Hôte non autorisé'
    });
});


test('GET /api/invoices/:id refuse la facture d’un autre utilisateur', async () => {
    // Connexion du premier utilisateur
    const loginAlice = await request(app)
        .post('/login')
        .send({
            email: 'alice@minishop.test',
            password: 'Password123'
        });

    const tokenAlice = loginAlice.body.token;

    // Connexion du deuxième utilisateur
    const loginBob = await request(app)
        .post('/login')
        .send({
            email: 'bob@minishop.test',
            password: 'Soleil2024'
        });

    const tokenBob = loginBob.body.token;

    // Alice récupère ses factures
    const invoicesAlice = await request(app)
        .get('/api/invoices')
        .set('Authorization', `Bearer ${tokenAlice}`);

    // Vérifier qu'Alice possède au moins une facture
    assert.ok(invoicesAlice.body.length > 0);

    const invoiceId = invoicesAlice.body[0].id;

    // Bob tente d'accéder à la facture d'Alice
    const res = await request(app)
        .get(`/api/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${tokenBob}`);

    assert.equal(res.status, 404);
    assert.deepEqual(res.body, { error: 'Facture introuvable' });
});



test('POST /login refuse une injection SQL', async () => {
    const res = await request(app)
        .post('/login')
        .send({
            email: "' OR '1'='1' -- ",
            password: 'mauvais_mot_de_passe'
        });

    assert.equal(res.status, 401);
    assert.equal(res.body.token, undefined);
});

test('GET /products échappe la valeur q pour empêcher une XSS', async () => {
    const payload = "<script>alert('XSS')</script>";

    const res = await request(app)
        .get('/products')
        .query({ q: payload });

    assert.equal(res.status, 200);

    // Le HTML doit contenir le texte échappé, pas une balise script exécutable
    assert.ok(res.text.includes('&lt;script&gt;'));
    assert.ok(!res.text.includes("<script>alert('XSS')</script>"));
});

test('PUT /api/profile empêche un client de devenir admin', async () => {
    const login = await request(app)
        .post('/login')
        .send({
            email: 'alice@minishop.test',
            password: 'Password123'
        });

    assert.equal(login.status, 200);
    const token = login.body.token;

    const res = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
            name: 'Alice',
            role: 'admin'
        });

    // Le rôle ne doit pas pouvoir être modifié
    assert.notEqual(res.body.role, 'admin');

    const profile = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${token}`);

    assert.notEqual(profile.body.role, 'admin');
});

// --- À vous ---
// Inspirez-vous de ce test pour écrire les vôtres : vous aurez besoin de
// vous connecter d'abord dans la plupart des cas, par exemple :
//
//   const login = await request(app)
//     .post('/login')
//     .send({ email: 'alice@minishop.test', password: 'Password123' });
//   const token = login.body.token;
//
//   const res = await request(app)
//     .get('/api/UNE_ROUTE_A_TESTER')
//     .set('Authorization', `Bearer ${token}`);
//
//   assert.equal(res.status, 404); // ou ce que votre exigence attend
