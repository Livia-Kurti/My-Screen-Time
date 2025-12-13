// routes/api.js

// ... (imports remain the same) ...

// 2. POST: Save or Update an item
router.post('/', async (req, res) => {
    try {
        const { jikanId, tvmazeId, title, image, status } = req.body;

        console.log("Saving Item:", { jikanId, tvmazeId, title }); // Debugging log

        // LOGIC FIX:
        // We cannot use a single 'whereClause' object with both fields if one is null/undefined.
        // We must decide strictly which unique ID we are using.
        
        let upsertWhere;
        
        if (jikanId) {
            // If saving Anime, look up by jikanId
            upsertWhere = { jikanId: parseInt(jikanId) };
        } else if (tvmazeId) {
            // If saving TV/Cartoon, look up by tvmazeId
            upsertWhere = { tvmazeId: parseInt(tvmazeId) };
        } else {
            return res.status(400).json({ msg: "Error: No ID provided (jikanId or tvmazeId missing)" });
        }

        const savedItem = await prisma.singleAnimeList.upsert({
            where: upsertWhere,
            update: {
                status: status,
                image: image,
                title: title, 
            },
            create: {
                // Ensure we pass INTEGERS, not strings
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
        res.status(500).json({ error: "Could not save item. Unique constraint failed?" });
    }
});

// ... (PUT and DELETE routes remain the same) ...
