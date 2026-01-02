// Pterodactyl API Integration
// Helper functions to interact with Pterodactyl Panel API

const axios = require('axios');
const { get } = require('./database');
const { decrypt } = require('./encryption');

// Cache for database config (to avoid repeated queries)
let configCache = {
    url: null,
    apiKey: null,
    lastChecked: null
};

// Cache expiration time (5 minutes)
const CACHE_EXPIRY = 5 * 60 * 1000;

// Get Pterodactyl configuration (database first, then .env fallback)
async function getConfig() {
    // Check cache first
    const now = Date.now();
    if (configCache.url && configCache.apiKey && configCache.lastChecked && 
        (now - configCache.lastChecked) < CACHE_EXPIRY) {
        return {
            url: configCache.url,
            apiKey: configCache.apiKey
        };
    }
    
    try {
        // Try database first
        const dbConfig = await get('SELECT panel_url, api_key FROM pterodactyl_config ORDER BY id DESC LIMIT 1');
        
        if (dbConfig && dbConfig.panel_url && dbConfig.api_key) {
            // Decrypt API key
            const decryptedKey = decrypt(dbConfig.api_key);
            
            // Update cache
            configCache = {
                url: dbConfig.panel_url,
                apiKey: decryptedKey,
                lastChecked: now
            };
            
            return {
                url: dbConfig.panel_url,
                apiKey: decryptedKey
            };
        }
    } catch (error) {
        console.error('Error fetching Pterodactyl config from database:', error);
    }
    
    // Fallback to .env
    const envUrl = process.env.PTERODACTYL_URL || '';
    const envKey = process.env.PTERODACTYL_API_KEY || '';
    
    // Update cache
    configCache = {
        url: envUrl,
        apiKey: envKey,
        lastChecked: now
    };
    
    return {
        url: envUrl,
        apiKey: envKey
    };
}

// Clear config cache (call this after updating config)
function clearConfigCache() {
    configCache = {
        url: null,
        apiKey: null,
        lastChecked: null
    };
}

// Create axios instance (will be updated dynamically)
let pterodactylAPI = axios.create({
    baseURL: '',
    headers: {
        'Authorization': '',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// Update axios instance with current config
async function updateAxiosConfig() {
    const config = await getConfig();
    pterodactylAPI = axios.create({
        baseURL: config.url ? `${config.url}/api` : '',
        headers: {
            'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : '',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    });
}

// Helper function to make API requests
async function makeRequest(method, endpoint, data = null) {
    try {
        // Update axios config with latest settings
        await updateAxiosConfig();
        
        const pterodactylConfig = await getConfig();
        
        if (!pterodactylConfig.url || !pterodactylConfig.apiKey) {
            throw new Error('Pterodactyl configuration is missing. Please configure it in Admin Panel → Panel or set PTERODACTYL_URL and PTERODACTYL_API_KEY in .env file');
        }

        const config = {
            method: method,
            url: endpoint,
            ...(data && { data })
        };

        const response = await pterodactylAPI(config);
        return {
            success: true,
            data: response.data
        };
    } catch (error) {
        console.error('Pterodactyl API Error:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data || error.message
        };
    }
}

// Get all servers
async function getAllServers() {
    return await makeRequest('GET', '/application/servers');
}

// Get server by ID
async function getServer(serverId) {
    return await makeRequest('GET', `/application/servers/${serverId}`);
}

// Helper function to extract public_address from server allocations
function extractPublicAddress(serverData) {
    // serverData should be the response from getServerDetails
    let alias = null;
    let ip = null;
    let port = null;
    
    // Method 1: Check relationships for allocations
    if (serverData?.relationships?.allocations?.data) {
        const allocations = serverData.relationships.allocations.data;
        
        // Find primary allocation (is_default === true or first one)
        const primaryAllocation = allocations.find(a => {
            const attrs = a.attributes || a;
            return attrs.is_default === true || attrs.is_default === 1;
        }) || allocations[0];
        
        if (primaryAllocation) {
            const attrs = primaryAllocation.attributes || primaryAllocation;
            alias = attrs.ip_alias;
            ip = attrs.ip;
            port = attrs.port;
        }
    }
    // Method 2: Check included allocations
    else if (serverData?.included) {
        const allocations = serverData.included.filter(item => item.type === 'allocation');
        
        // Find primary allocation (is_default === true or first one)
        const primaryAllocation = allocations.find(item => {
            const attrs = item.attributes || item;
            return attrs.is_default === true || attrs.is_default === 1;
        }) || allocations[0];
        
        if (primaryAllocation) {
            const attrs = primaryAllocation.attributes || primaryAllocation;
            alias = attrs.ip_alias;
            ip = attrs.ip;
            port = attrs.port;
        }
    }
    
    // Return public_address as alias:port or ip:port
    if (port) {
        const address = alias || ip;
        return address ? `${address}:${port}` : null;
    }
    
    return null;
}

// Get primary allocation for a server
async function getPrimaryAllocation(serverId) {
    try {
        const serverDetails = await getServerDetails(serverId);
        
        if (!serverDetails.success) {
            throw new Error('Failed to fetch server details');
        }
        
        const serverData = serverDetails.data;
        const serverAttributes = serverData.attributes || serverData;
        
        // Step 1: Get primary allocation ID from response.attributes.allocation (source of truth)
        const primaryAllocationId = serverAttributes.allocation;
        
        if (!primaryAllocationId) {
            throw new Error('Primary allocation ID not found in server attributes');
        }
        
        // Step 2: Find the allocation in relationships.allocations.data where id matches
        const allocations = serverData.relationships?.allocations?.data || [];
        
        if (!allocations || allocations.length === 0) {
            throw new Error('No allocations found in relationships');
        }
        
        // Find allocation where allocation.id === primaryAllocationId
        const primaryAllocation = allocations.find(allocation => {
            const allocationId = allocation.id || allocation.attributes?.id;
            return allocationId === primaryAllocationId || 
                   parseInt(allocationId) === parseInt(primaryAllocationId);
        });
        
        if (!primaryAllocation) {
            throw new Error(`Primary allocation ID ${primaryAllocationId} exists but allocation details not found in relationships`);
        }
        
        // Step 3: Extract allocation details
        const allocationAttributes = primaryAllocation.attributes || primaryAllocation;
        
        const allocationId = parseInt(allocationAttributes.id || primaryAllocation.id);
        
        if (isNaN(allocationId)) {
            throw new Error('Invalid allocation ID format');
        }
        
        return {
            id: allocationId,
            alias: allocationAttributes.ip_alias || null,
            ip: allocationAttributes.ip || null,
            port: allocationAttributes.port || null
        };
    } catch (error) {
        console.error(`Error getting primary allocation for server ${serverId}:`, error);
        throw new Error(`Failed to get primary allocation: ${error.message}`);
    }
}

// Get server details (including resources)
async function getServerDetails(serverId) {
    return await makeRequest('GET', `/application/servers/${serverId}?include=allocations,user,subusers`);
}

// Get server resources/usage
async function getServerResources(serverId) {
    return await makeRequest('GET', `/application/servers/${serverId}/resources`);
}

// Create a new server
async function createServer(serverData) {
    // serverData should include:
    // - name, user, egg, docker_image, startup, environment, limits, feature_limits, allocation
    return await makeRequest('POST', '/application/servers', serverData);
}

// Update server resources
async function updateServerResources(serverId, resources) {
    // resources should include: memory, swap, disk, io, cpu
    // First, get the current server details to preserve required fields
    try {
        const serverDetails = await getServerDetails(serverId);
        
        if (!serverDetails.success) {
            throw new Error('Failed to fetch server details');
        }
        
        // Log the full response for debugging
        console.log('Server details response structure:', JSON.stringify(serverDetails.data, null, 2));
        
        const server = serverDetails.data?.attributes || serverDetails.data;
        
        // Extract current values
        const currentLimits = server.limits || {};
        const currentFeatureLimits = server.feature_limits || {};
        
        // Build base update payload (without allocation first)
        let updateData = {
            limits: {
                memory: resources.memory,
                swap: resources.swap !== undefined ? resources.swap : (currentLimits.swap || 0),
                disk: resources.disk,
                io: resources.io !== undefined ? resources.io : (currentLimits.io || 500),
                cpu: resources.cpu
            },
            feature_limits: {
                databases: currentFeatureLimits.databases !== undefined ? currentFeatureLimits.databases : 0,
                allocations: currentFeatureLimits.allocations !== undefined ? currentFeatureLimits.allocations : 1,
                backups: currentFeatureLimits.backups !== undefined ? currentFeatureLimits.backups : 0
            }
        };
        
        console.log(`Updating server ${serverId} resources (memory: ${resources.memory}MB, cpu: ${resources.cpu}%, disk: ${resources.disk}MB)`);
        console.log('Update payload (without allocation):', JSON.stringify(updateData, null, 2));
        
        // Try update without allocation first
        let result = await makeRequest('PATCH', `/application/servers/${serverId}/build`, updateData);
        
        // If it fails with "allocation required" error, retry with allocation
        if (!result.success && result.error) {
            const errorDetail = result.error.detail || result.error.message || '';
            const errorData = result.error.errors || [];
            const needsAllocation = errorDetail.includes('allocation') || 
                                   (Array.isArray(errorData) && errorData.some(e => e.detail && e.detail.includes('allocation')));
            
            if (needsAllocation) {
                console.log('Update failed - allocation required. Extracting allocation ID...');
                
                // Extract allocation ID from relationships/included data
                let allocationId = null;
                
                // Method 1: Get from relationships - find the default allocation
                if (serverDetails.data?.relationships?.allocations?.data) {
                    const allocations = serverDetails.data.relationships.allocations.data;
                    
                    // Find default allocation (is_default === true or 1)
                    const defaultAlloc = allocations.find(a => {
                        const attrs = a.attributes || a;
                        return attrs.is_default === true || attrs.is_default === 1;
                    }) || allocations[0];
                    
                    if (defaultAlloc) {
                        const allocId = defaultAlloc.id || defaultAlloc.attributes?.id;
                        
                        // Get full allocation from included data
                        if (serverDetails.data?.included) {
                            const fullAllocation = serverDetails.data.included.find(
                                item => item.type === 'allocation' && 
                                       (item.id === allocId || item.attributes?.id === allocId)
                            );
                            
                            if (fullAllocation) {
                                allocationId = parseInt(fullAllocation.attributes?.id || fullAllocation.id);
                                console.log('Found default allocation from relationships/included:', allocationId);
                            } else if (allocId) {
                                allocationId = parseInt(allocId);
                                console.log('Found allocation ID from relationships:', allocationId);
                            }
                        } else if (allocId) {
                            allocationId = parseInt(allocId);
                            console.log('Found allocation ID from relationships:', allocationId);
                        }
                    }
                }
                // Method 2: Check included data directly
                else if (serverDetails.data?.included) {
                    const defaultAlloc = serverDetails.data.included.find(
                        item => item.type === 'allocation' && 
                               (item.attributes?.is_default === true || item.attributes?.is_default === 1)
                    ) || serverDetails.data.included.find(item => item.type === 'allocation');
                    
                    if (defaultAlloc) {
                        allocationId = parseInt(defaultAlloc.attributes?.id || defaultAlloc.id);
                        console.log('Found allocation from included:', allocationId);
                    }
                }
                
                if (allocationId && !isNaN(allocationId)) {
                    // Add allocation to payload and retry
                    updateData.allocation = {
                        default: allocationId
                    };
                    
                    console.log(`Retrying with allocation ID: ${allocationId}`);
                    console.log('Update payload (with allocation):', JSON.stringify(updateData, null, 2));
                    
                    result = await makeRequest('PATCH', `/application/servers/${serverId}/build`, updateData);
                } else {
                    console.error('Could not extract allocation ID. Server details structure:');
                    console.error('Full response:', JSON.stringify(serverDetails.data, null, 2));
                    throw new Error('Update failed and could not find allocation ID. Please check server configuration in Pterodactyl panel.');
                }
            }
        }
        
        return result;
    } catch (error) {
        console.error('Error in updateServerResources:', error);
        // Re-throw with more context
        if (error.message && !error.message.includes('Error in updateServerResources')) {
            throw new Error(`Failed to update server resources: ${error.message}`);
        }
        throw error;
    }
}

// Update server build configuration (simplified, always includes all required fields)
async function updateServerBuild(serverId, limits) {
    // limits should include: memory, swap, cpu, io, disk
    // First, get current server details to preserve feature_limits and get allocation
    try {
        const serverDetails = await getServerDetails(serverId);
        
        if (!serverDetails.success) {
            throw new Error('Failed to fetch server details');
        }
        
        const server = serverDetails.data?.attributes || serverDetails.data;
        const currentLimits = server.limits || {};
        const currentFeatureLimits = server.feature_limits || {};
        
        // Get primary allocation ID (required for build update)
        const primaryAllocation = await getPrimaryAllocation(serverId);
        
        // Build update payload with ALL required fields including allocation
        const updateData = {
            allocation: primaryAllocation.id, // Always include allocation ID
            limits: {
                memory: limits.memory,
                swap: limits.swap !== undefined ? limits.swap : (currentLimits.swap || 0),
                cpu: limits.cpu,
                io: limits.io !== undefined ? limits.io : (currentLimits.io || 500),
                disk: limits.disk
            },
            feature_limits: {
                databases: currentFeatureLimits.databases !== undefined ? currentFeatureLimits.databases : 0,
                allocations: currentFeatureLimits.allocations !== undefined ? currentFeatureLimits.allocations : 1,
                backups: currentFeatureLimits.backups !== undefined ? currentFeatureLimits.backups : 0
            }
        };
        
        console.log(`Updating server ${serverId} build configuration:`, JSON.stringify(updateData, null, 2));
        
        const result = await makeRequest('PATCH', `/application/servers/${serverId}/build`, updateData);
        
        if (!result.success) {
            const errorMsg = result.error?.detail || result.error?.message || JSON.stringify(result.error);
            throw new Error(`Pterodactyl API error: ${errorMsg}`);
        }
        
        return result;
    } catch (error) {
        console.error('Error in updateServerBuild:', error);
        throw error;
    }
}

// Send power signal to server (start, stop, restart, kill)
async function sendServerPowerSignal(serverId, signal) {
    // signal should be: 'start', 'stop', 'restart', 'kill'
    return await makeRequest('POST', `/application/servers/${serverId}/power`, { signal });
}

// Restart server (convenience wrapper for power signal)
async function restartServer(serverId) {
    return await sendServerPowerSignal(serverId, 'restart');
}

// Suspend server
async function suspendServer(serverId) {
    return await makeRequest('POST', `/application/servers/${serverId}/suspend`);
}

// Unsuspend server
async function unsuspendServer(serverId) {
    return await makeRequest('POST', `/application/servers/${serverId}/unsuspend`);
}

// Delete server
async function deleteServer(serverId) {
    return await makeRequest('DELETE', `/application/servers/${serverId}`);
}

// Get all users
async function getAllUsers() {
    return await makeRequest('GET', '/application/users');
}

// Get user by ID
async function getUser(userId) {
    return await makeRequest('GET', `/application/users/${userId}`);
}

// Create user
async function createUser(userData) {
    // userData should include: email, username, first_name, last_name, password
    return await makeRequest('POST', '/application/users', userData);
}

// Get server statistics (real-time)
async function getServerStats(serverId) {
    return await makeRequest('GET', `/application/servers/${serverId}/resources`);
}

// Get all nests
async function getAllNests() {
    return await makeRequest('GET', '/application/nests');
}

// Get eggs for a nest
async function getEggsForNest(nestId) {
    return await makeRequest('GET', `/application/nests/${nestId}/eggs?include=variables`);
}

// Get all eggs (from all nests)
async function getAllEggs() {
    try {
        const nestsResult = await getAllNests();
        if (!nestsResult.success) {
            return nestsResult;
        }
        
        const nests = nestsResult.data.data || [];
        const allEggs = [];
        
        for (const nest of nests) {
            const eggsResult = await getEggsForNest(nest.attributes.id);
            if (eggsResult.success && eggsResult.data.data) {
                eggsResult.data.data.forEach(egg => {
                    allEggs.push({
                        ...egg.attributes,
                        nest_id: nest.attributes.id,
                        nest_name: nest.attributes.name
                    });
                });
            }
        }
        
        return {
            success: true,
            data: allEggs
        };
    } catch (error) {
        console.error('Error fetching all eggs:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Get all locations
async function getAllLocations() {
    return await makeRequest('GET', '/application/locations');
}

// Get all nodes
async function getAllNodes() {
    return await makeRequest('GET', '/application/nodes');
}

// Get allocations for a node
async function getAllocationsForNode(nodeId) {
    return await makeRequest('GET', `/application/nodes/${nodeId}/allocations?per_page=500`);
}

// Get all available allocations
async function getAllAllocations() {
    try {
        const nodesResult = await getAllNodes();
        if (!nodesResult.success) {
            return nodesResult;
        }
        
        const nodes = nodesResult.data.data || [];
        const allAllocations = [];
        
        for (const node of nodes) {
            const allocationsResult = await getAllocationsForNode(node.attributes.id);
            if (allocationsResult.success && allocationsResult.data.data) {
                allocationsResult.data.data.forEach(allocation => {
                    if (!allocation.attributes.assigned) {
                        // Only include unassigned allocations
                        allAllocations.push({
                            ...allocation.attributes,
                            node_id: node.attributes.id,
                            node_name: node.attributes.name
                        });
                    }
                });
            }
        }
        
        return {
            success: true,
            data: allAllocations
        };
    } catch (error) {
        console.error('Error fetching all allocations:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Create user in Pterodactyl
async function createPterodactylUser(userData) {
    // userData should include: email, username, first_name, last_name, password
    return await makeRequest('POST', '/application/users', userData);
}

// Get user by email
async function getPterodactylUserByEmail(email) {
    try {
        const result = await makeRequest('GET', '/application/users');
        if (result.success && result.data.data) {
            const user = result.data.data.find(u => u.attributes.email === email);
            if (user) {
                return {
                    success: true,
                    data: user.attributes
                };
            }
        }
        return {
            success: false,
            error: 'User not found'
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

// Check if Pterodactyl is configured
async function isConfigured() {
    const config = await getConfig();
    return !!(config.url && config.apiKey);
}

// Test connection to Pterodactyl panel
async function testConnection(panelUrl, apiKey) {
    try {
        const testAPI = axios.create({
            baseURL: panelUrl ? `${panelUrl}/api` : '',
            headers: {
                'Authorization': apiKey ? `Bearer ${apiKey}` : '',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: 10000 // 10 second timeout
        });
        
        // Try to fetch servers list (lightweight endpoint)
        const response = await testAPI.get('/application/servers?per_page=1');
        
        return {
            success: true,
            message: 'Connection successful!'
        };
    } catch (error) {
        let errorMessage = 'Connection failed';
        
        if (error.response) {
            // Server responded with error
            if (error.response.status === 401 || error.response.status === 403) {
                errorMessage = 'Invalid API key. Please check your API key.';
            } else if (error.response.status === 404) {
                errorMessage = 'Panel URL not found. Please check your panel URL.';
            } else {
                errorMessage = `Connection error: ${error.response.status} ${error.response.statusText}`;
            }
        } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            errorMessage = 'Cannot connect to panel. Please check your panel URL.';
        } else if (error.code === 'ETIMEDOUT') {
            errorMessage = 'Connection timeout. Please check your panel URL.';
        } else {
            errorMessage = error.message || 'Unknown error occurred';
        }
        
        return {
            success: false,
            message: errorMessage,
            error: error.response?.data || error.message
        };
    }
}

module.exports = {
    makeRequest,
    getAllServers,
    getServer,
    getServerDetails,
    getServerResources,
    createServer,
    updateServerResources,
    updateServerBuild,
    sendServerPowerSignal,
    restartServer,
    getPrimaryAllocation,
    extractPublicAddress,
    suspendServer,
    unsuspendServer,
    deleteServer,
    getAllUsers,
    getUser,
    createUser,
    getServerStats,
    isConfigured,
    testConnection,
    getConfig,
    clearConfigCache,
    updateAxiosConfig,
    getAllNests,
    getEggsForNest,
    getAllEggs,
    getAllLocations,
    getAllNodes,
    getAllocationsForNode,
    getAllAllocations,
    createPterodactylUser,
    getPterodactylUserByEmail
};
