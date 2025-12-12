const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. GET: Fetch the user's list
router.get('/anime/mylist', async (req, res) => {
    try {
        const list = await prisma.singleAnimeList.findMany();
        res.json(list);
    } catch (error) {
        console.error("Error fetching list:", error);
        res.status(500).json({ error: "Failed to fetch list" });
    }
});

// 2. POST: Save or Update an item (The Fix for "Unique Constraint" Error)
router.post('/anime', async (req, res) => {
    try {
        const { jikanId, tvmazeId, title, image, status } = req.body;

        // Determine which ID to look for
        const whereClause = jikanId 
            ? { jikanId: parseInt(jikanId) } 
            : { tvmazeId: parseInt(tvmazeId) };

        if (!whereClause.jikanId && !whereClause.tvmazeId) {
            return res.status(400).json({ msg: "No valid ID provided" });
        }

        // Upsert: Create if new, Update if exists
        const savedItem = await prisma.singleAnimeList.upsert({
            where: whereClause,
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

// 3. PUT: Update Status (Watching/Completed/etc)
router.put('/anime/:id', async (req, res) => {
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

// 4. DELETE: Remove item from list
router.delete('/anime/:id', async (req, res) => {
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
