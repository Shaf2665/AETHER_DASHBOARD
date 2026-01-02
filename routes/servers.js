// Server Management Routes
// Handles server creation, management, and viewing

const express = require('express');
const router = express.Router();
const path = require('path');
const { query, get, run } = require('../config/database');
const pterodactyl = require('../config/pterodactyl');

// Middleware to check if user is logged in
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    next();
};

// Servers management page
router.get('/', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '../views/servers.html'));
});

// Create server page
router.get('/create', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '../views/servers.html'));
});

// Resource store page
router.get('/store', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '../views/resource-store.html'));
});

// API endpoint to get user's servers
router.get('/api/list', requireAuth, async (req, res) => {
    try {
        const servers = await query(
            'SELECT * FROM servers WHERE user_id = ? ORDER BY created_at DESC',
            [req.session.user.id]
        );
        
        // Fetch public_address for servers that have pterodactyl_id but no public_address
        if (await pterodactyl.isConfigured()) {
            for (const server of servers) {
                if (server.pterodactyl_id && !server.public_address) {
                    try {
                        const serverDetails = await pterodactyl.getServerDetails(server.pterodactyl_id);
                        if (serverDetails.success) {
                            const publicAddress = pterodactyl.extractPublicAddress(serverDetails.data);
                            
                            // Update database if found
                            if (publicAddress) {
                                await run(
                                    'UPDATE servers SET public_address = ? WHERE id = ?',
                                    [publicAddress, server.id]
                                );
                                server.public_address = publicAddress;
                            }
                        }
                    } catch (error) {
                        console.error(`Error fetching public_address for server ${server.id}:`, error);
                        // Continue with other servers even if one fails
                    }
                }
            }
        }
        
        // Note: Real-time stats are not available via Application API
        // Users can view real-time stats by clicking "Open in Panel" button
        
        res.json({ success: true, servers });
    } catch (error) {
        console.error('Error fetching servers:', error);
        res.status(500).json({ success: false, message: 'Error fetching servers' });
    }
});

// API endpoint to get panel URL
router.get('/api/panel-url', requireAuth, async (req, res) => {
    try {
        const config = await pterodactyl.getConfig();
        res.json({ 
            success: true, 
            panel_url: config.url || null 
        });
    } catch (error) {
        res.json({ success: false, panel_url: null });
    }
});

// API endpoint to create server
router.post('/api/create', requireAuth, async (req, res) => {
    try {
        const { name, egg_id, ram, cpu, storage } = req.body;
        
        if (!name || !egg_id || ram === undefined || cpu === undefined || storage === undefined) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required' 
            });
        }
        
        // Validate server name
        if (typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Server name is required' 
            });
        }
        
        if (name.length > 50) {
            return res.status(400).json({ 
                success: false, 
                message: 'Server name must be 50 characters or less' 
            });
        }
        
        // Validate name contains only safe characters (alphanumeric, spaces, hyphens, underscores)
        if (!/^[a-zA-Z0-9\s\-_]+$/.test(name.trim())) {
            return res.status(400).json({ 
                success: false, 
                message: 'Server name contains invalid characters. Only letters, numbers, spaces, hyphens, and underscores are allowed.' 
            });
        }
        
        // Validate minimums (ram and storage are in MB, cpu is percentage)
        const ramGB = ram / 1024;
        const storageGB = storage / 1024;
        
        if (ramGB < 1) {
            return res.status(400).json({ 
                success: false, 
                message: 'RAM must be at least 1GB' 
            });
        }
        if (cpu < 100) {
            return res.status(400).json({ 
                success: false, 
                message: 'CPU must be 100%' 
            });
        }
        if (storageGB < 5) {
            return res.status(400).json({ 
                success: false, 
                message: 'Storage must be at least 5GB' 
            });
        }
        
        // Get user and check available resources
        const user = await get('SELECT id, server_slots, purchased_ram, purchased_cpu, purchased_storage, pterodactyl_user_id FROM users WHERE id = ?', 
            [req.session.user.id]);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        // Check server slots
        const userServerCount = await get('SELECT COUNT(*) as count FROM servers WHERE user_id = ?', [req.session.user.id]);
        const availableSlots = user.server_slots || 1;
        
        if (userServerCount.count >= availableSlots) {
            return res.status(400).json({ 
                success: false, 
                message: `You've reached your server limit (${availableSlots} slot${availableSlots > 1 ? 's' : ''}). Purchase more slots from the Resource Store to create additional servers.` 
            });
        }
        
        // Calculate used resources
        const usedResources = await get(`
            SELECT 
                SUM(ram) as used_ram,
                SUM(cpu) as used_cpu,
                SUM(storage) as used_storage
            FROM servers 
            WHERE user_id = ?
        `, [req.session.user.id]);
        
        const availableRam = (user.purchased_ram || 0) - (usedResources.used_ram || 0);
        const availableCpu = (user.purchased_cpu || 0) - (usedResources.used_cpu || 0);
        const availableStorage = (user.purchased_storage || 0) - (usedResources.used_storage || 0);
        
        // Check if user has enough resources
        if (availableRam < ram) {
            return res.status(400).json({ 
                success: false, 
                message: `Insufficient RAM. You have ${Math.round(availableRam / 1024)}GB available but need ${ramGB}GB.` 
            });
        }
        if (availableCpu < cpu) {
            return res.status(400).json({ 
                success: false, 
                message: `Insufficient CPU. You have ${availableCpu}% available but need ${cpu}%.` 
            });
        }
        if (availableStorage < storage) {
            return res.status(400).json({ 
                success: false, 
                message: `Insufficient Storage. You have ${Math.round(availableStorage / 1024)}GB available but need ${storageGB}GB.` 
            });
        }
        
        let pterodactyl_id = null;
        
        // If Pterodactyl is configured, create server there
        if (await pterodactyl.isConfigured()) {
            try {
                // Get egg information
                const egg = await get('SELECT * FROM pterodactyl_eggs WHERE egg_id = ? AND is_active = 1', [egg_id]);
                if (!egg) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Selected game type (egg) not found. Please contact an administrator.' 
                    });
                }
                
                // Get settings
                const settings = await get('SELECT * FROM pterodactyl_settings ORDER BY id DESC LIMIT 1');
                const nestId = settings?.default_nest_id || egg.nest_id;
                const locationId = settings?.default_location_id;
                
                // Get an available allocation (highest priority first)
                const allocation = await get(`
                    SELECT * FROM pterodactyl_allocations 
                    WHERE is_active = 1 
                    ORDER BY priority DESC, id ASC 
                    LIMIT 1
                `);
                
                if (!allocation) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'No available server allocations. Please contact an administrator.' 
                    });
                }
                
                // Parse environment variables
                let environmentVariables = {};
                try {
                    if (egg.environment_variables) {
                        const envVars = JSON.parse(egg.environment_variables);
                        if (Array.isArray(envVars)) {
                            envVars.forEach(variable => {
                                const attr = variable.attributes || variable;
                                if (attr.env_variable && attr.default_value !== undefined) {
                                    environmentVariables[attr.env_variable] = attr.default_value;
                                }
                            });
                        }
                    }
                } catch (error) {
                    console.warn('Error parsing environment variables:', error);
                }
                
                // Create server in Pterodactyl
                const pterodactylUser = await get('SELECT pterodactyl_user_id FROM users WHERE id = ?', [req.session.user.id]);
                const pterodactylUserId = pterodactylUser?.pterodactyl_user_id;
                
                if (!pterodactylUserId) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Pterodactyl user not found. Please contact an administrator.' 
                    });
                }
                
                const serverData = {
                    name: name,
                    user: parseInt(pterodactylUserId),
                    egg: parseInt(egg_id),
                    docker_image: egg.docker_image || 'ghcr.io/pterodactyl/yolks:java_17',
                    startup: egg.startup_command || '',
                    environment: environmentVariables,
                    limits: {
                        memory: ram,
                        swap: 0,
                        disk: storage,
                        io: 500,
                        cpu: cpu
                    },
                    feature_limits: {
                        databases: 0,
                        allocations: 1,
                        backups: 0
                    },
                    allocation: {
                        default: allocation.allocation_id
                    },
                    deploy: {
                        locations: locationId ? [parseInt(locationId)] : [],
                        dedicated_ip: false,
                        port_range: []
                    }
                };
                
                const createResult = await pterodactyl.createServer(serverData);
                
                if (!createResult.success) {
                    return res.status(500).json({ 
                        success: false, 
                        message: createResult.error || 'Failed to create server in Pterodactyl' 
                    });
                }
                
                pterodactyl_id = createResult.data?.id || createResult.data?.attributes?.id;
                
                // Extract public_address from allocations
                let publicAddress = null;
                if (createResult.data) {
                    publicAddress = pterodactyl.extractPublicAddress(createResult.data);
                }
                
                // If not found in creation response, fetch server details
                if (!publicAddress && pterodactyl_id) {
                    try {
                        const serverDetails = await pterodactyl.getServerDetails(pterodactyl_id);
                        if (serverDetails.success) {
                            publicAddress = pterodactyl.extractPublicAddress(serverDetails.data);
                        }
                    } catch (error) {
                        console.error('Error fetching server details for public_address:', error);
                    }
                }
                
                // Store server in our database with public_address
                const result = await run(
                    `INSERT INTO servers (user_id, pterodactyl_id, name, ram, cpu, storage, public_address) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [req.session.user.id, pterodactyl_id, name, ram, cpu, storage, publicAddress]
                );
                
                res.json({ 
                    success: true, 
                    message: 'Server created successfully',
                    server: {
                        id: result.lastID,
                        name,
                        ram,
                        cpu,
                        storage,
                        pterodactyl_id,
                        public_address: publicAddress
                    }
                });
                return;
            } catch (error) {
                console.error('Error creating server in Pterodactyl:', error);
                return res.status(500).json({ 
                    success: false, 
                    message: `Error creating server in Pterodactyl: ${error.message}` 
                });
            }
        }
        
        // Store server in our database (if Pterodactyl is not configured)
        const result = await run(
            `INSERT INTO servers (user_id, pterodactyl_id, name, ram, cpu, storage) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [req.session.user.id, pterodactyl_id, name, ram, cpu, storage]
        );
        
        res.json({ 
            success: true, 
            message: 'Server created successfully',
            server: {
                id: result.lastID,
                name,
                ram,
                cpu,
                storage,
                pterodactyl_id
            }
        });
    } catch (error) {
        console.error('Error creating server:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error creating server' 
        });
    }
});

// API endpoint to delete server
router.delete('/api/delete/:id', requireAuth, async (req, res) => {
    try {
        const serverId = req.params.id;
        
        // Get server to verify ownership
        const server = await get('SELECT * FROM servers WHERE id = ? AND user_id = ?', 
            [serverId, req.session.user.id]);
        
        if (!server) {
            return res.status(404).json({ 
                success: false, 
                message: 'Server not found' 
            });
        }
        
        // If Pterodactyl is configured and server has pterodactyl_id, delete it there
        if (await pterodactyl.isConfigured() && server.pterodactyl_id) {
            try {
                await pterodactyl.deleteServer(server.pterodactyl_id);
            } catch (error) {
                console.error('Error deleting server from Pterodactyl:', error);
                // Continue with database deletion even if Pterodactyl deletion fails
            }
        }
        
        // Return resources to user's purchased pool
        const user = await get('SELECT purchased_ram, purchased_cpu, purchased_storage FROM users WHERE id = ?', 
            [req.session.user.id]);
        
        if (user) {
            // Resources are already in purchased pool, we just need to remove them from used
            // Since we're deleting the server, the used resources will automatically decrease
            // But we don't need to do anything here as the resources remain in purchased_ram/cpu/storage
            // The "used" calculation is done dynamically from servers table
        }
        
        // Delete from our database
        await run('DELETE FROM servers WHERE id = ?', [serverId]);
        
        res.json({ 
            success: true, 
            message: 'Server deleted successfully. Resources have been returned to your pool.' 
        });
    } catch (error) {
        console.error('Error deleting server:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error deleting server' 
        });
    }
});

// REMOVED FOR V1: Upgrade and Sync endpoints removed for production stability
// These features have been fully removed from the codebase

// REMOVED FOR V1: Sync endpoint removed for production stability
// API endpoint to sync server resources from Pterodactyl to dashboard - FULLY REMOVED

// API endpoint to get server statistics
router.get('/api/stats/:id', requireAuth, async (req, res) => {
    try {
        const serverId = req.params.id;
        
        // Verify ownership
        const server = await get('SELECT * FROM servers WHERE id = ? AND user_id = ?', 
            [serverId, req.session.user.id]);
        
        if (!server) {
            return res.status(404).json({ 
                success: false, 
                message: 'Server not found' 
            });
        }
        
        // Note: Real-time statistics are not available via Application API
        // The /application/servers/{id}/resources endpoint only supports DELETE
        // Real-time stats require Client API which needs server owner's API key
        // Users should use "Open in Panel" button to view real-time stats
        
        // Return server info - stats will be null, frontend will show Panel button
        res.json({ 
            success: true, 
            server: server,
            stats: null
        });
    } catch (error) {
        console.error('Error fetching server stats:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching server statistics' 
        });
    }
});

// API endpoint to purchase resources
router.post('/api/purchase-resource', requireAuth, async (req, res) => {
    try {
        const { resource_type, amount } = req.body;
        
        if (!resource_type || !amount) {
            return res.status(400).json({ 
                success: false, 
                message: 'Resource type and amount are required' 
            });
        }
        
        if (!['ram', 'cpu', 'storage'].includes(resource_type)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid resource type' 
            });
        }
        
        if (amount <= 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Amount must be greater than 0' 
            });
        }
        
        // Get current prices from database
        const prices = await get('SELECT * FROM resource_prices ORDER BY id DESC LIMIT 1');
        if (!prices) {
            return res.status(500).json({ 
                success: false, 
                message: 'Resource prices not configured. Please contact an administrator.' 
            });
        }
        
        // Calculate cost based on resource type and database prices
        // Formula: cost = (requested_amount / units_per_set) * coins_per_set
        // Note: For RAM and Storage, amount is in GB from frontend
        let coinsSpent = 0;
        switch(resource_type) {
            case 'ram':
                // Amount is in GB from frontend, calculate cost in GB
                const ramCoinsPerSet = prices.ram_coins_per_set || 1;
                const ramGBPerSet = prices.ram_gb_per_set || 1;
                coinsSpent = Math.ceil((amount / ramGBPerSet) * ramCoinsPerSet);
                break;
            case 'cpu':
                const cpuCoinsPerSet = prices.cpu_coins_per_set || 1;
                const cpuPercentPerSet = prices.cpu_percent_per_set || 1;
                coinsSpent = Math.ceil((amount / cpuPercentPerSet) * cpuCoinsPerSet);
                break;
            case 'storage':
                // Amount is in GB from frontend, calculate cost in GB
                const storageCoinsPerSet = prices.storage_coins_per_set || 1;
                const storageGBPerSet = prices.storage_gb_per_set || 1;
                coinsSpent = Math.ceil((amount / storageGBPerSet) * storageCoinsPerSet);
                break;
        }
        
        // Check if user has enough coins
        const user = await get('SELECT coins, purchased_ram, purchased_cpu, purchased_storage FROM users WHERE id = ?', 
            [req.session.user.id]);
        if (!user || user.coins < coinsSpent) {
            return res.status(400).json({ 
                success: false, 
                message: `Insufficient coins. You need ${coinsSpent} coins but only have ${user?.coins || 0}` 
            });
        }
        
        // Update user's purchased resources
        // Note: Database stores RAM and Storage in MB, but frontend sends GB
        let updateQuery = '';
        let updateParams = [];
        let resourceAmountMB = 0; // For recording purchase
        
        switch(resource_type) {
            case 'ram':
                // Convert GB to MB for database storage (purchased_ram stores in MB)
                resourceAmountMB = amount * 1024;
                updateQuery = 'UPDATE users SET purchased_ram = purchased_ram + ?, coins = coins - ? WHERE id = ?';
                updateParams = [resourceAmountMB, coinsSpent, req.session.user.id];
                break;
            case 'cpu':
                // CPU is stored as percentage (0-100)
                updateQuery = 'UPDATE users SET purchased_cpu = purchased_cpu + ?, coins = coins - ? WHERE id = ?';
                updateParams = [amount, coinsSpent, req.session.user.id];
                resourceAmountMB = amount; // For recording, but it's actually percentage
                break;
            case 'storage':
                // Convert GB to MB for database storage (purchased_storage stores in MB)
                resourceAmountMB = amount * 1024;
                updateQuery = 'UPDATE users SET purchased_storage = purchased_storage + ?, coins = coins - ? WHERE id = ?';
                updateParams = [resourceAmountMB, coinsSpent, req.session.user.id];
                break;
        }
        
        await run(updateQuery, updateParams);
        
        // Record purchase (server_id is now NULL since resources are purchased, not assigned to a server yet)
        await run(
            `INSERT INTO resource_purchases (user_id, server_id, resource_type, amount, coins_spent) 
             VALUES (?, ?, ?, ?, ?)`,
            [req.session.user.id, null, resource_type, resourceAmountMB, coinsSpent]
        );
        
        // Get updated user data
        const updatedUser = await get('SELECT coins, purchased_ram, purchased_cpu, purchased_storage FROM users WHERE id = ?', 
            [req.session.user.id]);
        
        // Update session
        req.session.user.coins = updatedUser.coins;
        
        res.json({ 
            success: true, 
            message: 'Resource purchased successfully',
            coins_spent: coinsSpent,
            new_balance: updatedUser.coins,
            purchased_resources: {
                ram: updatedUser.purchased_ram,
                cpu: updatedUser.purchased_cpu,
                storage: updatedUser.purchased_storage
            }
        });
    } catch (error) {
        console.error('Error purchasing resource:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error purchasing resource' 
        });
    }
});

// API endpoint to purchase server slot
router.post('/api/purchase-slot', requireAuth, async (req, res) => {
    try {
        // Get current prices from database
        const prices = await get('SELECT * FROM resource_prices ORDER BY id DESC LIMIT 1');
        if (!prices || !prices.server_slot_price) {
            return res.status(500).json({ 
                success: false, 
                message: 'Server slot price not configured. Please contact an administrator.' 
            });
        }
        
        const slotPrice = prices.server_slot_price;
        
        // Get user's current coin balance
        const user = await get('SELECT coins, server_slots FROM users WHERE id = ?', [req.session.user.id]);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        // Check if user has enough coins
        if (user.coins < slotPrice) {
            return res.status(400).json({ 
                success: false, 
                message: `Insufficient coins. You need ${slotPrice} coins to purchase a server slot. You currently have ${user.coins} coins.` 
            });
        }
        
        // Deduct coins and add server slot
        await run(
            'UPDATE users SET coins = coins - ?, server_slots = server_slots + 1 WHERE id = ?',
            [slotPrice, req.session.user.id]
        );
        
        // Record the purchase
        await run(
            'INSERT INTO server_slot_purchases (user_id, coins_spent) VALUES (?, ?)',
            [req.session.user.id, slotPrice]
        );
        
        // Update session
        const updatedUser = await get('SELECT coins, server_slots FROM users WHERE id = ?', [req.session.user.id]);
        req.session.user.coins = updatedUser.coins;
        req.session.user.server_slots = updatedUser.server_slots;
        
        res.json({ 
            success: true, 
            message: 'Server slot purchased successfully!',
            coins_spent: slotPrice,
            new_balance: updatedUser.coins,
            new_slots: updatedUser.server_slots
        });
    } catch (error) {
        console.error('Error purchasing server slot:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error purchasing server slot' 
        });
    }
});

// API endpoint to get purchase history
router.get('/api/purchase-history', requireAuth, async (req, res) => {
    try {
        const purchases = await query(
            `SELECT rp.*, s.name as server_name 
             FROM resource_purchases rp 
             LEFT JOIN servers s ON rp.server_id = s.id 
             WHERE rp.user_id = ? 
             ORDER BY rp.purchased_at DESC 
             LIMIT 50`,
            [req.session.user.id]
        );
        
        res.json({ success: true, purchases });
    } catch (error) {
        console.error('Error fetching purchase history:', error);
        res.status(500).json({ success: false, message: 'Error fetching purchase history' });
    }
});

// API endpoint to get resource prices (for resource store page)
router.get('/api/resource-prices', requireAuth, async (req, res) => {
    try {
        const prices = await get('SELECT * FROM resource_prices ORDER BY id DESC LIMIT 1');
        if (!prices) {
            // Return default prices if not configured
            return res.json({ 
                success: true, 
                prices: {
                    ram_coins_per_set: 1,
                    ram_gb_per_set: 1,
                    cpu_coins_per_set: 1,
                    cpu_percent_per_set: 1,
                    storage_coins_per_set: 1,
                    storage_gb_per_set: 1,
                    server_slot_price: 100
                }
            });
        }
        res.json({ success: true, prices });
    } catch (error) {
        console.error('Error fetching resource prices:', error);
        res.status(500).json({ success: false, message: 'Error fetching prices' });
    }
});

// API endpoint to get available eggs
router.get('/api/eggs', requireAuth, async (req, res) => {
    try {
        const eggs = await query('SELECT * FROM pterodactyl_eggs WHERE is_active = 1 ORDER BY name');
        res.json({ success: true, eggs });
    } catch (error) {
        console.error('Error fetching eggs:', error);
        res.status(500).json({ success: false, message: 'Error fetching eggs' });
    }
});

// API endpoint to get user's purchased and used resources
router.get('/api/purchased-resources', requireAuth, async (req, res) => {
    try {
        const user = await get('SELECT purchased_ram, purchased_cpu, purchased_storage FROM users WHERE id = ?', 
            [req.session.user.id]);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        // Calculate used resources from all servers
        const usedResources = await get(`
            SELECT 
                SUM(ram) as used_ram,
                SUM(cpu) as used_cpu,
                SUM(storage) as used_storage
            FROM servers 
            WHERE user_id = ?
        `, [req.session.user.id]);
        
        res.json({
            success: true,
            purchased: {
                ram: user.purchased_ram || 0,
                cpu: user.purchased_cpu || 0,
                storage: user.purchased_storage || 0
            },
            used: {
                ram: usedResources.used_ram || 0,
                cpu: usedResources.used_cpu || 0,
                storage: usedResources.used_storage || 0
            },
            available: {
                ram: (user.purchased_ram || 0) - (usedResources.used_ram || 0),
                cpu: (user.purchased_cpu || 0) - (usedResources.used_cpu || 0),
                storage: (user.purchased_storage || 0) - (usedResources.used_storage || 0)
            }
        });
    } catch (error) {
        console.error('Error fetching purchased resources:', error);
        res.status(500).json({ success: false, message: 'Error fetching purchased resources' });
    }
});

module.exports = router;

