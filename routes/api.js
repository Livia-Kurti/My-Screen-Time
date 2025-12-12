const express = require('express');
const { PrismaClient, AnimeStatus } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();
const VALID_STATUSES = Object.keys(AnimeStatus);

// ===============================================
// READ: GET /api/anime/mylist
// ===============================================
router.get('/mylist', async (req, res) => {
    const { status } = req.query; 
    const filter = {};
    
    if (status && VALID_STATUSES.includes(status)) {
        filter.status = status;
    }

    try {
        const list = await prisma.singleAnimeList.findMany({
            where: filter,
            orderBy: { updatedAt: 'desc' },
        });
        res.json(list);
    } catch (error) {
        console.error("Error fetching list:", error);
        res.status(500).json({ msg: "Failed to load list." });
    }
});

// ===============================================
// CREATE/UPDATE: POST /api/anime
// ===============================================
router.post('/', async (req, res) => {
    const { jikanId, tvmazeId, title, image, status } = req.body;

    // Validate Status
    if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ msg: "Invalid status." });
    }

    // Validate IDs
    if (!jikanId && !tvmazeId) {
        return res.status(400).json({ msg: "Missing Show ID (Jikan or TVMaze)." });
    }

    try {
        let listEntry;

        if (jikanId) {
            // ANIME LOGIC
            listEntry = await prisma.singleAnimeList.upsert({
                where: { jikanId: parseInt(jikanId) }, 
                update: { status: status, updatedAt: new Date() },
                create: { jikanId: parseInt(jikanId), tvmazeId: null, title, image: image || '', status },
            });
        } else {
            // TV SHOW LOGIC
            listEntry = await prisma.singleAnimeList.upsert({
                where: { tvmazeId: parseInt(tvmazeId) },
                update: { status: status, updatedAt: new Date() },
                create: { jikanId: null, tvmazeId: parseInt(tvmazeId), title, image: image || '', status },
            });
        }
        res.status(201).json({ msg: 'List updated.', entry: listEntry });

    } catch (error) {
        console.error("Error creating/updating list:", error);
        res.status(500).json({ msg: 'Failed to process list entry.' });
    }
});

// ===============================================
// UPDATE STATUS: PUT /api/anime/:id
// ===============================================
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!id || !VALID_STATUSES.includes(status)) {
        return res.status(400).json({ msg: "Invalid ID or status." });
    }

    try {
        const updatedEntry = await prisma.singleAnimeList.update({
            where: { id: id },
            data: { status: status, updatedAt: new Date() },
        });
        res.json({ msg: 'List entry updated.', entry: updatedEntry });
    } catch (error) {
        console.error("Error updating list entry:", error);
        res.status(500).json({ msg: 'Failed to update list entry.' });
    }
});

// ===============================================
// DELETE: DELETE /api/anime/:id
// ===============================================
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.singleAnimeList.delete({ where: { id: id } });
        res.status(204).send();
    } catch (error) {
        console.error("Error deleting list entry:", error);
        res.status(500).json({ msg: 'Failed to delete list entry.' });
    }
});

module.exports = router;