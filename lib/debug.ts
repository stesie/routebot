import { Feature, featureCollection, point, Position, Properties } from "@turf/helpers";

const features: Feature[] = [];

export function addDebugFeature(feature: Feature) {
    features.push(feature);
}

export function addDebugPosition(position: Position, props?: Properties) {
    addDebugFeature(point(position, props));
}

export function getDebugFeatureCollection() {
    return featureCollection(features);
}
