import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

app.post('/api/generate-specification', async (req, res) => {
  try {
    const { needsDescription } = req.body;
    
    const specPrompt = `
En tant qu'expert en analyse fonctionnelle, génère des spécifications détaillées pour le projet suivant.
Utilise ce format :

# Spécifications du projet

## Contexte et objectifs
[Description détaillée basée sur les besoins]

## Utilisateurs cibles
- [Liste des utilisateurs cibles]

## Fonctionnalités clés
1. [Fonctionnalité 1]
2. [Fonctionnalité 2]
...

## Exigences techniques
- [Exigence 1]
- [Exigence 2]
...

## Contraintes
- [Contrainte 1]
- [Contrainte 2]
...

## Livrables attendus
- [Livrable 1]
- [Livrable 2]
...

Expression du besoin :
${needsDescription}
`;

    const specResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: specPrompt }],
      temperature: 0.7,
    });

    res.json({ specification: specResponse.choices[0].message.content });
  } catch (error) {
    console.error('Erreur lors de la génération des spécifications:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/generate-epics', async (req, res) => {
  try {
    const { specification } = req.body;
    
    const epicsPrompt = `
En tant qu'expert en analyse fonctionnelle, analyse le projet suivant et génère les EPICs appropriés.

Description du projet :
${specification}

Génère les EPICs en suivant strictement ce format pour chacun :
1. Nom de l'EPIC
2. Objectif : quel est l'objectif fonctionnel ou métier de cette brique ?
3. Problématique adressée : quel problème cela permet-il de résoudre ?
4. Valeur métier : quel est l'intérêt pour l'entreprise ou les utilisateurs ?
5. La liste des user Stories associées : 3 à 5 user stories maximum, claires et orientées utilisateur
`;

    const epicsResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: epicsPrompt }],
      temperature: 0.7,
    });

    res.json({ epics: epicsResponse.choices[0].message.content });
  } catch (error) {
    console.error('Erreur lors de la génération des EPICs:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
}); 