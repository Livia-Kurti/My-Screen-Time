// routes/api.js - COMPLETE FILE

const express = require('express');
const router = express.Router(); // <--- This was missing before!
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. GET: Fetch the user's list
router.get('/mylist', async (req, res) => {
    try {
        const list = await prisma.singleAnimeList.findMany();
        res.json(list);
    } catch (error) {
        console.error("Error fetching list:", error);
        res.status(500).json({ error: "Failed to fetch list" });
    }
});

// 2. POST: Save or Update an item
router.post('/', async (req, res) => {
    try {
        const { jikanId, tvmazeId, title, image, status } = req.body;

        // LOGIC FIX: Strictly decide which ID to use for the "Unique" check
        let upsertWhere;
        
        if (jikanId) {
            upsertWhere = { jikanId: parseInt(jikanId) };
        } else if (tvmazeId) {
            upsertWhere = { tvmazeId: parseInt(tvmazeId) };
        } else {
            return res.status(400).json({ msg: "Error: No ID provided" });
        }

        const savedItem = await prisma.singleAnimeList.upsert({
            where: upsertWhere,
            update: {
                status: status,
                image: image,
                title: title, 
            },
            create: {
                jikanId: jikanId ? parseInt(jikanId) : null,
                tvmazeId: tvmazeId ? parseInt(tvmazeId) : null,
                title: title,
                image: image,
                status: status
            }
        });

        res.json(savedItem);

    } catch (error) {
        console.error("Save Error:", error);
        res.status(500).json({ error: "Could not save item" });
    }
});

// 3. PUT: Update Status
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        const updated = await prisma.singleAnimeList.update({
            where: { id: parseInt(id) },
            data: { status }
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: "Failed to update" });
    }
});

// 4. DELETE: Remove item
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        await prisma.singleAnimeList.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: "Deleted" });
    } catch (error) {
        console.error("Delete Error:", error);
        res.status(500).json({ error: "Failed to delete" });
    }
});

module.exports = router;
