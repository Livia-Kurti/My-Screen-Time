// routes/api.js - FIXED (Manual Check instead of Upsert)

const express = require('express');
const router = express.Router();
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

        console.log("Processing item:", { title, jikanId, tvmazeId });

        // STEP A: Check if this item already exists in the DB
        let existingItem = null;

        if (jikanId) {
            existingItem = await prisma.singleAnimeList.findUnique({
                where: { jikanId: parseInt(jikanId) }
            });
        } else if (tvmazeId) {
            existingItem = await prisma.singleAnimeList.findUnique({
                where: { tvmazeId: parseInt(tvmazeId) }
            });
        }

        let result;

        // STEP B: If found, UPDATE it using its internal database ID
        if (existingItem) {
            console.log("Item exists. Updating ID:", existingItem.id);
            result = await prisma.singleAnimeList.update({
                where: { id: existingItem.id },
                data: {
                    status: status,
                    title: title,
                    image: image
                }
            });
        } 
        // STEP C: If not found, CREATE a new one
        else {
            console.log("Item not found. Creating new entry.");
            result = await prisma.singleAnimeList.create({
                data: {
                    jikanId: jikanId ? parseInt(jikanId) : null,
                    tvmazeId: tvmazeId ? parseInt(tvmazeId) : null,
                    title: title,
                    image: image,
                    status: status
                }
            });
        }

        res.json(result);

    } catch (error) {
        console.error("Save Error:", error);
        // Return 500 but log the specific error so we can see it
        res.status(500).json({ error: "Could not save item", details: error.message });
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
