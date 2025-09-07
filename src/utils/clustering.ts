// Geographic clustering utilities for multi-day route planning

interface Point {
  id: string;
  lat: number;
  lng: number;
  data: any; // Additional customer data
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

// K-means clustering for geographic points
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
  const maxIterations = 50;

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
      return distance < 0.01; // Convergence threshold: 0.01 miles
    });

    centroids = newCentroids;
    iterations++;

    if (converged || iterations >= maxIterations) {
      break;
    }
  } while (true);

  // Balance clusters to avoid empty days
  balanceClusters(clusters);

  return clusters;
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

// Balance clusters to ensure no empty days
const balanceClusters = (clusters: Cluster[]) => {
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