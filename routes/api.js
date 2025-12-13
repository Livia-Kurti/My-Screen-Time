const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. GET: Fetch list
router.get('/mylist', async (req, res) => {
    try {
        const list = await prisma.singleAnimeList.findMany();
        res.json(list);
    } catch (error) {
        console.error("Error fetching list:", error);
        res.status(500).json({ error: "Failed to fetch list" });
    }
});

// 2. POST: Save or Update
router.post('/', async (req, res) => {
    try {
        const { jikanId, tvmazeId, title, image, status } = req.body;

        // CHECK IF EXISTS
        let existingItem = null;
        if (jikanId) {
            existingItem = await prisma.singleAnimeList.findFirst({ where: { jikanId: parseInt(jikanId) } });
        } else if (tvmazeId) {
            existingItem = await prisma.singleAnimeList.findFirst({ where: { tvmazeId: parseInt(tvmazeId) } });
        }

        // UPDATE OR CREATE
        let result;
        if (existingItem) {
            result = await prisma.singleAnimeList.update({
                where: { id: existingItem.id },
                data: { status, title, image }
            });
        } else {
            result = await prisma.singleAnimeList.create({
                data: {
                    jikanId: jikanId ? parseInt(jikanId) : null,
                    tvmazeId: tvmazeId ? parseInt(tvmazeId) : null,
                    title, image, status
                }
            });
        }
        res.json(result);
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
        // FIXED: Removed parseInt() because MongoDB IDs are Strings
        const updated = await prisma.singleAnimeList.update({
            where: { id: id }, 
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
        // FIXED: Removed parseInt() here too
        await prisma.singleAnimeList.delete({
            where: { id: id } 
        });
        res.json({ message: "Deleted" });
    } catch (error) {
        console.error("Delete Error:", error);
        res.status(500).json({ error: "Failed to delete" });
    }
});

module.exports = router;
