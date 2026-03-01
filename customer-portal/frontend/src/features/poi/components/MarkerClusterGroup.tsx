/**
 * MarkerClusterGroup - React wrapper for Leaflet.markercluster
 *
 * Integrates leaflet.markercluster with react-leaflet v5.
 * Uses createPathComponent from @react-leaflet/core for proper lifecycle management.
 */

import { createPathComponent } from '@react-leaflet/core';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

// Create React Leaflet component from L.markerClusterGroup
const MarkerClusterGroup = createPathComponent<
  L.MarkerClusterGroup,
  L.MarkerClusterGroupOptions & { children?: React.ReactNode }
>(
  function createMarkerClusterGroup({ ...props }, ctx) {
    const clusterGroup = L.markerClusterGroup(props);
    return {
      instance: clusterGroup,
      context: { ...ctx, layerContainer: clusterGroup },
    };
  },
  function updateMarkerClusterGroup(instance, props, prevProps) {
    // Re-process clusters when children change
    if (props !== prevProps) {
      instance.refreshClusters();
    }
  }
);

export default MarkerClusterGroup;
