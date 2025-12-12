// routes/api.js (inside your router.post or app.post code)

router.post('/anime', async (req, res) => {
    try {
        const { jikanId, tvmazeId, title, image, status } = req.body;

        // 1. Determine which ID we are using to search
        // If we have a jikanId, look for that. If not, look for tvmazeId.
        const whereClause = jikanId 
            ? { jikanId: parseInt(jikanId) } 
            : { tvmazeId: parseInt(tvmazeId) };

        if (!whereClause.jikanId && !whereClause.tvmazeId) {
            return res.status(400).json({ msg: "No valid ID provided" });
        }

        // 2. Use UPSERT with the correct "where" clause
        // This prevents the P2002 Unique Constraint error
        const savedItem = await prisma.singleAnimeList.upsert({
            where: whereClause,
            update: {
                status: status,
                // Update image/title just in case they changed
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
