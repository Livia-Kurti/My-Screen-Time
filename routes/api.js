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

// 2. POST: Save or Update (The Fix)
router.post('/', async (req, res) => {
    try {
        const { jikanId, tvmazeId, title, image, status } = req.body;

        // STEP A: Check if item exists using findFirst (Safe for non-unique fields)
        let existingItem = null;

        if (jikanId) {
            existingItem = await prisma.singleAnimeList.findFirst({
                where: { jikanId: parseInt(jikanId) }
            });
        } else if (tvmazeId) {
            existingItem = await prisma.singleAnimeList.findFirst({
                where: { tvmazeId: parseInt(tvmazeId) }
            });
        }

        let result;

        // STEP B: Update if found
        if (existingItem) {
            console.log("Item found. Updating...", existingItem.id);
            result = await prisma.singleAnimeList.update({
                where: { id: existingItem.id },
                data: { status, title, image }
            });
        } 
        // STEP C: Create if new
        else {
            console.log("Item not found. Creating...");
            result = await prisma.singleAnimeList.create({
                data: {
                    jikanId: jikanId ? parseInt(jikanId) : null,
                    tvmazeId: tvmazeId ? parseInt(tvmazeId) : null,
                    title,
                    image,
                    status
                }
            });
        }

        res.json(result);

    } catch (error) {
        console.error("Save Error:", error);
        res.status(500).json({ error: "Could not save item", details: error.message });
    }
});

// 3. PUT: Update Status
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const updated = await prisma.singleAnimeList.update({
            where: { id: parseInt(id) }, // Note: If your ID is a String in schema, remove parseInt here!
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
            where: { id: parseInt(id) } // Note: If your ID is a String in schema, remove parseInt here!
        });
        res.json({ message: "Deleted" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete" });
    }
});

module.exports = router;
