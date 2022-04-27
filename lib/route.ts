import { Feature, Point, polygon, Polygon, Position } from "@turf/helpers";
import circle from "@turf/circle";
import { addDebugFeature, addDebugPosition } from "./debug";
import { snapPolygonToRoad } from "./overpass";
import { equalPos, findMinDistancePosIndex } from "./distance";
import { polygonToGpxUrl } from "./brouter";

export async function makeRandomRoute(startPoint: Feature<Point>, length: number, steps = 5): Promise<string> {
    const radius = length / Math.PI / 2;
    console.log("going w/ radius", radius);

    /* const poly2: Feature<Polygon> = {
        type: "Feature",
        properties: { fill: "#dd0", stroke: "#bb0" },
        geometry: {
            type: "Polygon",
            coordinates: [
                [
                    [9.7272374, 49.9125713],
                    [9.5008441, 49.820677],
                    [9.5894801, 49.6561877],
                    [9.8526421, 49.6563786],
                    [9.943462461233139, 49.77135645006747],
                    [9.7272374, 49.9125713],
                ],
            ],
        },
    }; */

    const center = findRandomCenterPos(startPoint, radius);
    const poly1 = findRandomCheckpointPolygon(center, radius, steps, startPoint);
    const poly1b = shiftToStartPoint(startPoint, poly1);

    const poly2 = await snapPolygonToRoad(startPoint, poly1);
    console.log(JSON.stringify(poly2));
    addDebugFeature(poly2);

    return polygonToGpxUrl(startPoint, poly2);
}

function shiftToStartPoint(startPoint: Feature<Point>, poly1: Feature<Polygon>): Feature<Polygon> {
    const points = poly1.geometry.coordinates[0];

    while (!equalPos(points[0], startPoint.geometry.coordinates)) {
        points.pop();
        const p = points.shift();
        points.push(p!);
        points.push(points[0]);
    }

    return polygon([points]);
}

function findRandomCheckpointPolygon(
    center: Position,
    radius: number,
    steps: number,
    startPoint: Feature<Point>
): Feature<Polygon> {
    const c2 = circle(center, radius, { steps });
    const minDistanceIndex = findMinDistancePosIndex(startPoint, c2.geometry.coordinates[0]);

    c2.geometry.coordinates[0].splice(minDistanceIndex, 1, startPoint.geometry.coordinates);

    if (minDistanceIndex === 0) {
        c2.geometry.coordinates[0].splice(-1, 1, startPoint.geometry.coordinates);
    }

    addDebugFeature(c2);
    return c2;
}

function findRandomCenterPos(startPoint: Feature<Point>, radius: number): Position {
    const c1 = circle(startPoint, radius, { steps: 180 });
    addDebugFeature(startPoint);
    addDebugFeature(c1);

    const center = c1.geometry.coordinates[0][Math.floor(Math.random() * c1.geometry.coordinates[0].length)];
    console.log("chosen random center", center);
    addDebugPosition(center);

    return center;
}
