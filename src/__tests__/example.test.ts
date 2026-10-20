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
