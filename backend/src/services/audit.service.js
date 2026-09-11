const createAuditLog = async (
    client,
    {
        userId,
        action,
        entityType,
        entityId = null,
        metadata = null
    }
) => {
    const formattedMetadata = metadata && typeof metadata === "object" ? JSON.stringify(metadata) : metadata;

    await client.query(
        `INSERT INTO audit_logs
            (user_id, action, entity_type, entity_id, metadata)
         VALUES
            ($1, $2, $3, $4, $5::jsonb)`,
        [
            userId,
            action,
            entityType,
            entityId,
            formattedMetadata
        ]
    );
};

module.exports = {
    createAuditLog
};