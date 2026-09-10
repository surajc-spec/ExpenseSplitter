const pool = require("../db/db");

const createGroup = async (req, res) => {
    const client = await pool.connect();

    try {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({
                message: "Group name is required"
            });
        }

        const userId = req.user.userId;

        await client.query("BEGIN");

        // Create the group
        const groupResult = await client.query(
            `INSERT INTO groups (name, created_by)
             VALUES ($1, $2)
             RETURNING id, name, created_by, created_at`,
            [name, userId]
        );

        const group = groupResult.rows[0];

        // Creator automatically becomes group admin
        await client.query(
            `INSERT INTO group_members (group_id, user_id, role)
             VALUES ($1, $2, 'admin')`,
            [group.id, userId]
        );

        await client.query("COMMIT");

        res.status(201).json({
            message: "Group created successfully",
            group
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Create group error:", error);

        res.status(500).json({
            message: "Internal server error"
        });

    } finally {
        client.release();
    }
};

const addMember = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "Email is required"
            });
        }

        const userId = req.user.userId;

       
        const adminCheck = await pool.query(
            `SELECT role
             FROM group_members
             WHERE group_id = $1
             AND user_id = $2`,
            [groupId, userId]
        );

        if (adminCheck.rows.length === 0) {
            return res.status(403).json({
                message: "You are not a member of this group"
            });
        }

        if (adminCheck.rows[0].role !== "admin") {
            return res.status(403).json({
                message: "Only group admins can add members"
            });
        }

       
        const userResult = await pool.query(
            `SELECT id, name, email
             FROM users
             WHERE email = $1`,
            [email]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const userToAdd = userResult.rows[0];

       
        const existingMember = await pool.query(
            `SELECT 1
             FROM group_members
             WHERE group_id = $1
             AND user_id = $2`,
            [groupId, userToAdd.id]
        );

        if (existingMember.rows.length > 0) {
            return res.status(409).json({
                message: "User is already a member"
            });
        }

  
        await pool.query(
            `INSERT INTO group_members (group_id, user_id, role)
             VALUES ($1, $2, 'member')`,
            [groupId, userToAdd.id]
        );

        res.status(201).json({
            message: "Member added successfully",
            member: userToAdd
        });

    } catch (error) {
        console.error("Add member error:", error);

        res.status(500).json({
            message: "Internal server error"
        });
    }
};

const removeMember = async (req, res) => {
    try {
        const { groupId, userId } = req.params;

        const requesterId = req.user.userId;

        
        const adminCheck = await pool.query(
            `SELECT role
             FROM group_members
             WHERE group_id = $1
             AND user_id = $2`,
            [groupId, requesterId]
        );

        if (adminCheck.rows.length === 0) {
            return res.status(403).json({
                message: "You are not a member of this group"
            });
        }

        if (adminCheck.rows[0].role !== "admin") {
            return res.status(403).json({
                message: "Only group admins can remove members"
            });
        }

       
        if (requesterId === userId) {
            return res.status(400).json({
                message: "Group admin cannot remove themselves"
            });
        }

       
        const memberCheck = await pool.query(
            `SELECT user_id
             FROM group_members
             WHERE group_id = $1
             AND user_id = $2`,
            [groupId, userId]
        );

        if (memberCheck.rows.length === 0) {
            return res.status(404).json({
                message: "User is not a member of this group"
            });
        }

      
        await pool.query(
            `DELETE FROM group_members
             WHERE group_id = $1
             AND user_id = $2`,
            [groupId, userId]
        );

        res.status(200).json({
            message: "Member removed successfully"
        });

    } catch (error) {
        console.error("Remove member error:", error);

        res.status(500).json({
            message: "Internal server error"
        });
    }
};

const getMembers = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user.userId;

       
        const memberCheck = await pool.query(
            `SELECT role
             FROM group_members
             WHERE group_id = $1
             AND user_id = $2`,
            [groupId, userId]
        );

        if (memberCheck.rows.length === 0) {
            return res.status(403).json({
                message: "You are not a member of this group"
            });
        }

        
        const groupResult = await pool.query(
            `SELECT id, name, created_by, created_at
             FROM groups
             WHERE id = $1`,
            [groupId]
        );

        if (groupResult.rows.length === 0) {
            return res.status(404).json({
                message: "Group not found"
            });
        }

        
        const membersResult = await pool.query(
            `SELECT u.id, u.name, u.email, gm.role, gm.joined_at
             FROM group_members gm
             JOIN users u ON u.id = gm.user_id
             WHERE gm.group_id = $1
             ORDER BY gm.joined_at ASC`,
            [groupId]
        );

        res.status(200).json({
            group: groupResult.rows[0],
            members: membersResult.rows
        });

    } catch (error) {
        console.error("Get members error:", error);

        res.status(500).json({
            message: "Internal server error"
        });
    }
};

const updateMemberRole = async (req, res) => {
    try {
        const { groupId, userId } = req.params;
        const { role } = req.body;

        const requesterId = req.user.userId;

       
        if (role !== "admin" && role !== "member") {
            return res.status(400).json({
                message: "Role must be either admin or member"
            });
        }

        
        const adminCheck = await pool.query(
            `SELECT role
             FROM group_members
             WHERE group_id = $1
             AND user_id = $2`,
            [groupId, requesterId]
        );

        if (adminCheck.rows.length === 0) {
            return res.status(403).json({
                message: "You are not a member of this group"
            });
        }

      
        if (adminCheck.rows[0].role !== "admin") {
            return res.status(403).json({
                message: "Only group admins can change member roles"
            });
        }

      
        if (requesterId === userId) {
            return res.status(400).json({
                message: "You cannot change your own role"
            });
        }

        
        const memberCheck = await pool.query(
            `SELECT user_id, role
             FROM group_members
             WHERE group_id = $1
             AND user_id = $2`,
            [groupId, userId]
        );

        if (memberCheck.rows.length === 0) {
            return res.status(404).json({
                message: "User is not a member of this group"
            });
        }

        if (
            role === "member" &&
            memberCheck.rows[0].role === "admin"
        ) {
            const adminCount = await pool.query(
                `SELECT COUNT(*) AS count
                 FROM group_members
                 WHERE group_id = $1
                 AND role = 'admin'`,
                [groupId]
            );

            if (parseInt(adminCount.rows[0].count) <= 1) {
                return res.status(400).json({
                    message: "Group must have at least one admin"
                });
            }
        }


        const result = await pool.query(
            `UPDATE group_members
             SET role = $1
             WHERE group_id = $2
             AND user_id = $3
             RETURNING group_id, user_id, role`,
            [role, groupId, userId]
        );

        return res.status(200).json({
            message: "Member role updated successfully",
            member: result.rows[0]
        });

    } catch (error) {
        console.error("Update member role error:", error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};
module.exports = {
    createGroup,
    addMember,
    removeMember,
    getMembers,
    updateMemberRole
};