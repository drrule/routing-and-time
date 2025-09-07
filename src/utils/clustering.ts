// Geographic clustering utilities for multi-day route planning

interface Point {
  id: string;
  lat: number;
  lng: number;
  data: any; // Additional customer data
}

interface HouseGroup {
  id: string;
  customers: Point[];
  centroid: { lat: number; lng: number };
}

interface Cluster {
  id: number;
  centroid: { lat: number; lng: number };
  points: Point[];
}

// Calculate distance between two points using Haversine formula
export const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Parse address to extract street info
const parseAddress = (address: string) => {
  // Remove common prefixes and normalize
  const normalized = address.toLowerCase().trim();
  
  // Extract house number and street name
  const match = normalized.match(/^(\d+)\s+(.+?)(?:\s*,|$)/);
  if (!match) return null;
  
  const houseNumber = parseInt(match[1]);
  let streetName = match[2];
  
  // Normalize street name (remove directional prefixes/suffixes, standardize abbreviations)
  streetName = streetName
    .replace(/^(north|south|east|west|n|s|e|w)\s+/i, '')
    .replace(/\s+(north|south|east|west|n|s|e|w)$/i, '')
    .replace(/\s+(st|street|ave|avenue|rd|road|dr|drive|ln|lane|blvd|boulevard|ct|court|pl|place|way|cir|circle)$/i, '')
    .trim();
  
  return { houseNumber, streetName };
};

// Identify customers on the same street who could be serviced in one stop
const identifyStreetGroups = (points: Point[]): HouseGroup[] => {
  const streetMap = new Map<string, Point[]>();
  
  // Group customers by street name
  points.forEach(point => {
    const parsed = parseAddress(point.data.address);
    if (parsed) {
      const key = parsed.streetName;
      if (!streetMap.has(key)) {
        streetMap.set(key, []);
      }
      streetMap.get(key)!.push(point);
    }
  });
  
  const groups: HouseGroup[] = [];
  
  // For each street, create walking groups
  streetMap.forEach((streetCustomers, streetName) => {
    if (streetCustomers.length === 1) {
      // Single customer on this street
      const customer = streetCustomers[0];
      groups.push({
        id: `group-${groups.length}`,
        customers: [customer],
        centroid: { lat: customer.lat, lng: customer.lng }
      });
    } else {
      // Multiple customers on same street - sort by house number
      const sorted = streetCustomers
        .map(customer => ({
          customer,
          parsed: parseAddress(customer.data.address)
        }))
        .filter(item => item.parsed)
        .sort((a, b) => a.parsed!.houseNumber - b.parsed!.houseNumber);
      
      // Group nearby house numbers (within ~10 house numbers, accounting for odd/even)
      let currentGroup: Point[] = [];
      let lastHouseNumber = -1;
      
      sorted.forEach(({ customer, parsed }) => {
        const houseNumber = parsed!.houseNumber;
        
        if (currentGroup.length === 0 || 
            Math.abs(houseNumber - lastHouseNumber) <= 10) {
          // Add to current group
          currentGroup.push(customer);
          lastHouseNumber = houseNumber;
        } else {
          // Start new group
          if (currentGroup.length > 0) {
            const centroid = {
              lat: currentGroup.reduce((sum, p) => sum + p.lat, 0) / currentGroup.length,
              lng: currentGroup.reduce((sum, p) => sum + p.lng, 0) / currentGroup.length
            };
            groups.push({
              id: `group-${groups.length}`,
              customers: currentGroup,
              centroid
            });
          }
          currentGroup = [customer];
          lastHouseNumber = houseNumber;
        }
      });
      
      // Add final group
      if (currentGroup.length > 0) {
        const centroid = {
          lat: currentGroup.reduce((sum, p) => sum + p.lat, 0) / currentGroup.length,
          lng: currentGroup.reduce((sum, p) => sum + p.lng, 0) / currentGroup.length
        };
        groups.push({
          id: `group-${groups.length}`,
          customers: currentGroup,
          centroid
        });
      }
    }
  });
  
  console.log(`Identified ${groups.length} street-based groups from ${points.length} customers`);
  groups.forEach((group, index) => {
    if (group.customers.length > 1) {
      const addresses = group.customers.map(c => c.data.address).join(', ');
      console.log(`Street group ${index + 1}: ${group.customers.length} customers on same street - ${addresses}`);
    }
  });
  
  return groups;
};

// Balanced clustering for multi-day route planning considering drive times
export const clusterCustomers = (customers: any[], numDays: number, homeBase?: { lat: number; lng: number }): Cluster[] => {
  if (customers.length === 0 || numDays <= 0) return [];
  
  const points: Point[] = customers.map(customer => ({
    id: customer.id,
    lat: customer.lat,
    lng: customer.lng,
    data: customer
  }));

  // If we have fewer customers than days, create one cluster per customer
  if (points.length <= numDays) {
    return points.map((point, index) => ({
      id: index,
      centroid: { lat: point.lat, lng: point.lng },
      points: [point]
    }));
  }

  // First, identify street groups (customers on same street that are walkable)
  const streetGroups = identifyStreetGroups(points);

  // Start with geographic K-means clustering using street groups as units
  let clusters = performKMeansClusteringWithGroups(streetGroups, numDays, homeBase);
  
  // Balance clusters by total drive time rather than just customer count
  clusters = balanceClustersByDriveTimeWithGroups(clusters, streetGroups, homeBase);
  
  return clusters;
};

// Perform K-means clustering using street groups as units
const performKMeansClusteringWithGroups = (streetGroups: HouseGroup[], numDays: number, homeBase?: { lat: number; lng: number }): Cluster[] => {
  // Use street group centroids for clustering
  const groupPoints: Point[] = streetGroups.map(group => ({
    id: group.id,
    lat: group.centroid.lat,
    lng: group.centroid.lng,
    data: group // Store the entire street group
  }));

  const clusters = performKMeansClustering(groupPoints, numDays, homeBase);
  
  // Expand clusters to include all customers from street groups
  return clusters.map(cluster => ({
    ...cluster,
    points: cluster.points.flatMap(groupPoint => {
      const streetGroup = groupPoint.data as HouseGroup;
      return streetGroup.customers;
    })
  }));
};

// Perform initial K-means clustering
const performKMeansClustering = (points: Point[], numDays: number, homeBase?: { lat: number; lng: number }): Cluster[] => {
  // Initialize centroids
  let centroids: { lat: number; lng: number }[] = [];
  
  if (homeBase && numDays > 1) {
    // First centroid at home base
    centroids.push({ lat: homeBase.lat, lng: homeBase.lng });
    
    // Distribute remaining centroids around the area
    const bounds = getBounds(points);
    for (let i = 1; i < numDays; i++) {
      centroids.push({
        lat: bounds.minLat + (bounds.maxLat - bounds.minLat) * Math.random(),
        lng: bounds.minLng + (bounds.maxLng - bounds.minLng) * Math.random()
      });
    }
  } else {
    // Random initialization
    const bounds = getBounds(points);
    for (let i = 0; i < numDays; i++) {
      centroids.push({
        lat: bounds.minLat + (bounds.maxLat - bounds.minLat) * Math.random(),
        lng: bounds.minLng + (bounds.maxLng - bounds.minLng) * Math.random()
      });
    }
  }

  let clusters: Cluster[] = [];
  let iterations = 0;
  const maxIterations = 20; // Reduced for performance with large datasets

  do {
    // Assign points to nearest centroid
    clusters = centroids.map((centroid, index) => ({
      id: index,
      centroid,
      points: []
    }));

    // Assign each point to the nearest cluster
    points.forEach(point => {
      let minDistance = Infinity;
      let nearestClusterIndex = 0;

      centroids.forEach((centroid, index) => {
        const distance = calculateDistance(point.lat, point.lng, centroid.lat, centroid.lng);
        if (distance < minDistance) {
          minDistance = distance;
          nearestClusterIndex = index;
        }
      });

      clusters[nearestClusterIndex].points.push(point);
    });

    // Update centroids
    const newCentroids = clusters.map(cluster => {
      if (cluster.points.length === 0) {
        return cluster.centroid; // Keep old centroid if no points assigned
      }

      const avgLat = cluster.points.reduce((sum, point) => sum + point.lat, 0) / cluster.points.length;
      const avgLng = cluster.points.reduce((sum, point) => sum + point.lng, 0) / cluster.points.length;
      
      return { lat: avgLat, lng: avgLng };
    });

    // Check for convergence
    const converged = centroids.every((centroid, index) => {
      const newCentroid = newCentroids[index];
      const distance = calculateDistance(centroid.lat, centroid.lng, newCentroid.lat, newCentroid.lng);
      return distance < 0.1; // Looser convergence for performance
    });

    centroids = newCentroids;
    iterations++;

    if (converged || iterations >= maxIterations) {
      break;
    }
  } while (true);

  return clusters;
};

// Balance empty clusters (simplified version)
const balanceEmptyClusters = (clusters: Cluster[]) => {
  // Find empty clusters
  const emptyClusters = clusters.filter(cluster => cluster.points.length === 0);
  const populatedClusters = clusters.filter(cluster => cluster.points.length > 1);

  // Move points from populated clusters to empty ones
  emptyClusters.forEach(emptyCluster => {
    if (populatedClusters.length === 0) return;

    // Find the most populated cluster
    const mostPopulated = populatedClusters.reduce((max, cluster) => 
      cluster.points.length > max.points.length ? cluster : max
    );

    if (mostPopulated.points.length > 1) {
      // Move one point to the empty cluster
      const point = mostPopulated.points.pop()!;
      emptyCluster.points.push(point);
      
      // Update centroid
      emptyCluster.centroid = { lat: point.lat, lng: point.lng };
    }
  });
};

// Get bounding box of all points
const getBounds = (points: Point[]) => {
  return points.reduce((bounds, point) => ({
    minLat: Math.min(bounds.minLat, point.lat),
    maxLat: Math.max(bounds.maxLat, point.lat),
    minLng: Math.min(bounds.minLng, point.lng),
    maxLng: Math.max(bounds.maxLng, point.lng)
  }), {
    minLat: Infinity,
    maxLat: -Infinity,
    minLng: Infinity,
    maxLng: -Infinity
  });
};

// Balance clusters by total drive time to create even working days (with house groups)
const balanceClustersByDriveTimeWithGroups = (clusters: Cluster[], houseGroups: HouseGroup[], homeBase?: { lat: number; lng: number }): Cluster[] => {
  if (!homeBase) return clusters;

  const targetDriveTimePerDay = calculateTotalDriveTime(clusters, homeBase) / clusters.length;
  const tolerance = targetDriveTimePerDay * 0.15; // Allow 15% variance
  
  console.log(`Target drive time per day: ${targetDriveTimePerDay.toFixed(1)} minutes`);

  let balanced = false;
  let attempts = 0;
  const maxAttempts = 20;

  while (!balanced && attempts < maxAttempts) {
    balanced = true;
    attempts++;

    for (let i = 0; i < clusters.length; i++) {
      const clusterDriveTime = calculateClusterDriveTime(clusters[i], homeBase);
      
      if (clusterDriveTime > targetDriveTimePerDay + tolerance) {
        // This cluster is too heavy, try to move a house group to a lighter cluster
        const groupToMove = findBestHouseGroupToMove(clusters[i], clusters, houseGroups, homeBase, 'lighten');
        if (groupToMove) {
          moveHouseGroupBetweenClusters(clusters, i, groupToMove.targetCluster, groupToMove.houseGroup, houseGroups);
          balanced = false;
          console.log(`Moved house group (${groupToMove.houseGroup.customers.length} customers) from cluster ${i} to ${groupToMove.targetCluster}`);
        }
      } else if (clusterDriveTime < targetDriveTimePerDay - tolerance) {
        // This cluster is too light, try to get a house group from a heavier cluster
        const groupToMove = findBestHouseGroupToMove(clusters[i], clusters, houseGroups, homeBase, 'heavier');
        if (groupToMove) {
          moveHouseGroupBetweenClusters(clusters, groupToMove.targetCluster, i, groupToMove.houseGroup, houseGroups);
          balanced = false;
          console.log(`Moved house group (${groupToMove.houseGroup.customers.length} customers) to cluster ${i} from ${groupToMove.targetCluster}`);
        }
      }
    }
  }

  // Ensure no empty clusters
  balanceEmptyClusters(clusters);
  
  return clusters;
};

// Balance clusters by total drive time to create even working days
const balanceClustersByDriveTime = (clusters: Cluster[], homeBase?: { lat: number; lng: number }): Cluster[] => {
  if (!homeBase) return clusters;

  const targetDriveTimePerDay = calculateTotalDriveTime(clusters, homeBase) / clusters.length;
  const tolerance = targetDriveTimePerDay * 0.15; // Allow 15% variance
  
  console.log(`Target drive time per day: ${targetDriveTimePerDay.toFixed(1)} minutes`);

  let balanced = false;
  let attempts = 0;
  const maxAttempts = 20;

  while (!balanced && attempts < maxAttempts) {
    balanced = true;
    attempts++;

    for (let i = 0; i < clusters.length; i++) {
      const clusterDriveTime = calculateClusterDriveTime(clusters[i], homeBase);
      
      if (clusterDriveTime > targetDriveTimePerDay + tolerance) {
        // This cluster is too heavy, try to move a customer to a lighter cluster
        const customerToMove = findBestCustomerToMove(clusters[i], clusters, homeBase, 'lighten');
        if (customerToMove) {
          moveCustomerBetweenClusters(clusters, i, customerToMove.targetCluster, customerToMove.customer);
          balanced = false;
          console.log(`Moved customer from cluster ${i} to ${customerToMove.targetCluster} to balance drive time`);
        }
      } else if (clusterDriveTime < targetDriveTimePerDay - tolerance) {
        // This cluster is too light, try to get a customer from a heavier cluster
        const customerToMove = findBestCustomerToMove(clusters[i], clusters, homeBase, 'heavier');
        if (customerToMove) {
          moveCustomerBetweenClusters(clusters, customerToMove.targetCluster, i, customerToMove.customer);
          balanced = false;
          console.log(`Moved customer to cluster ${i} from ${customerToMove.targetCluster} to balance drive time`);
        }
      }
    }
  }

  // Ensure no empty clusters
  balanceEmptyClusters(clusters);
  
  return clusters;
};

// Calculate total drive time for all clusters
const calculateTotalDriveTime = (clusters: Cluster[], homeBase: { lat: number; lng: number }): number => {
  return clusters.reduce((total, cluster) => total + calculateClusterDriveTime(cluster, homeBase), 0);
};

// Calculate drive time for a single cluster (in minutes)
const calculateClusterDriveTime = (cluster: Cluster, homeBase: { lat: number; lng: number }): number => {
  if (cluster.points.length === 0) return 0;

  const optimizedRoute = optimizeDayRoute(cluster.points.map(p => p.data), homeBase);
  let totalDriveTime = 0;
  let currentLat = homeBase.lat;
  let currentLng = homeBase.lng;

  // Calculate drive time for the route
  for (const customer of optimizedRoute) {
    const driveDistance = calculateDistance(currentLat, currentLng, customer.lat, customer.lng);
    totalDriveTime += driveDistance * 2; // Assume 2 minutes per mile (30 mph average with stops)
    currentLat = customer.lat;
    currentLng = customer.lng;
  }

  // Add return trip to home
  const returnDistance = calculateDistance(currentLat, currentLng, homeBase.lat, homeBase.lng);
  totalDriveTime += returnDistance * 2;

  return totalDriveTime;
};

// Find best house group to move for balancing
const findBestHouseGroupToMove = (
  cluster: Cluster, 
  allClusters: Cluster[], 
  houseGroups: HouseGroup[],
  homeBase: { lat: number; lng: number },
  direction: 'lighten' | 'heavier'
): { houseGroup: HouseGroup; targetCluster: number } | null => {
  const currentDriveTime = calculateClusterDriveTime(cluster, homeBase);
  
  // Find house groups that belong to this cluster
  const clusterHouseGroups = houseGroups.filter(group => 
    group.customers.some(customer => 
      cluster.points.some(point => point.id === customer.id)
    )
  );

  for (const houseGroup of clusterHouseGroups) {
    for (let i = 0; i < allClusters.length; i++) {
      if (allClusters[i].id === cluster.id) continue;
      
      const targetDriveTime = calculateClusterDriveTime(allClusters[i], homeBase);
      
      // Check if this move would improve balance
      if (direction === 'lighten' && targetDriveTime < currentDriveTime) {
        return { houseGroup, targetCluster: i };
      } else if (direction === 'heavier' && targetDriveTime > currentDriveTime) {
        return { houseGroup, targetCluster: i };
      }
    }
  }
  
  return null;
};

// Move entire house group between clusters
const moveHouseGroupBetweenClusters = (
  clusters: Cluster[], 
  fromIndex: number, 
  toIndex: number, 
  houseGroup: HouseGroup,
  allHouseGroups: HouseGroup[]
) => {
  // Remove all customers in the house group from source cluster
  houseGroup.customers.forEach(customer => {
    clusters[fromIndex].points = clusters[fromIndex].points.filter(p => p.id !== customer.id);
  });
  
  // Add all customers in the house group to target cluster
  houseGroup.customers.forEach(customer => {
    clusters[toIndex].points.push(customer);
  });
  
  // Update centroids
  clusters[fromIndex] = updateClusterCentroid(clusters[fromIndex]);
  clusters[toIndex] = updateClusterCentroid(clusters[toIndex]);
};

// Find best customer to move for balancing
const findBestCustomerToMove = (
  cluster: Cluster, 
  allClusters: Cluster[], 
  homeBase: { lat: number; lng: number },
  direction: 'lighten' | 'heavier'
): { customer: Point; targetCluster: number } | null => {
  const currentDriveTime = calculateClusterDriveTime(cluster, homeBase);
  
  for (const customer of cluster.points) {
    for (let i = 0; i < allClusters.length; i++) {
      if (allClusters[i].id === cluster.id) continue;
      
      const targetDriveTime = calculateClusterDriveTime(allClusters[i], homeBase);
      
      // Check if this move would improve balance
      if (direction === 'lighten' && targetDriveTime < currentDriveTime) {
        return { customer, targetCluster: i };
      } else if (direction === 'heavier' && targetDriveTime > currentDriveTime) {
        return { customer, targetCluster: i };
      }
    }
  }
  
  return null;
};

// Move customer between clusters
const moveCustomerBetweenClusters = (
  clusters: Cluster[], 
  fromIndex: number, 
  toIndex: number, 
  customer: Point
) => {
  // Remove from source cluster
  clusters[fromIndex].points = clusters[fromIndex].points.filter(p => p.id !== customer.id);
  
  // Add to target cluster
  clusters[toIndex].points.push(customer);
  
  // Update centroids
  clusters[fromIndex] = updateClusterCentroid(clusters[fromIndex]);
  clusters[toIndex] = updateClusterCentroid(clusters[toIndex]);
};

// Update cluster centroid
const updateClusterCentroid = (cluster: Cluster): Cluster => {
  if (cluster.points.length === 0) {
    return cluster;
  }
  
  const avgLat = cluster.points.reduce((sum, point) => sum + point.lat, 0) / cluster.points.length;
  const avgLng = cluster.points.reduce((sum, point) => sum + point.lng, 0) / cluster.points.length;
  
  return {
    ...cluster,
    centroid: { lat: avgLat, lng: avgLng }
  };
};

// Optimize route order within a single day using nearest neighbor
export const optimizeDayRoute = (customers: any[], homeBase?: { lat: number; lng: number }): any[] => {
  if (!homeBase || customers.length === 0) return customers;

  const unvisited = [...customers];
  const optimized: any[] = [];
  let currentLat = homeBase.lat;
  let currentLng = homeBase.lng;

  while (unvisited.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = calculateDistance(currentLat, currentLng, unvisited[0].lat, unvisited[0].lng);

    // Find the nearest unvisited customer
    for (let i = 1; i < unvisited.length; i++) {
      const distance = calculateDistance(currentLat, currentLng, unvisited[i].lat, unvisited[i].lng);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }

    // Move to the nearest customer
    const nearestCustomer = unvisited.splice(nearestIndex, 1)[0];
    optimized.push(nearestCustomer);
    currentLat = nearestCustomer.lat;
    currentLng = nearestCustomer.lng;
  }

  return optimized;
};