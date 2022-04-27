import { Feature, Point, Position } from "@turf/helpers";
import distance from "@turf/distance";

export function findMinDistancePosIndex(referencePoint: Feature<Point> | Position, posList: Position[]): number {
    let minDistance = distance(referencePoint, posList[0]);
    let minDistanceIndex = 0;

    for (let i = 1; i < posList.length; i++) {
        const thisDistance = distance(referencePoint, posList[i]);

        if (thisDistance < minDistance) {
            minDistance = thisDistance;
            minDistanceIndex = i;
        }
    }

    return minDistanceIndex;
}

export function equalPos(a: Position, b: Position): boolean {
    return distance(a, b) < 0.001;
}
