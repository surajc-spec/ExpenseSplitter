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
    await client.query(
        `INSERT INTO audit_logs
            (user_id, action, entity_type, entity_id, metadata)
         VALUES
            ($1, $2, $3, $4, $5)`,
        [
            userId,
            action,
            entityType,
            entityId,
            metadata
        ]
    );
};

module.exports = {
    createAuditLog
};