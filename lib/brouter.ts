import { Feature, FeatureCollection, LineString, Point, Polygon, Position } from "@turf/helpers";
import { addDebugFeature, addDebugPosition } from "./debug";
import fetch from "node-fetch";
import distance from "@turf/distance";

const baseUrl = "https://brouter-api.brokenpipe.de/brouter";

export async function polygonToGpxUrl(
    startPoint: Feature<Point>,
    poly: Feature<Polygon>,
    profile = "fastbike-verylowtraffic"
) {
    const polyPoints = poly.geometry.coordinates[0];
    const pairs = collectPosPairs(polyPoints);
    const route = await Promise.all(pairs.map((pair) => callRouter(pair, profile)));

    const fixes = findAllDeadEnds(startPoint, route);
    console.log("found fixes", fixes);

    const fixedPoints: Position[] = [];
    for (let i = 0; i < polyPoints.length; i++) {
        const fix = fixes.find((f) => equalPos(polyPoints[i], f[0]));
        fixedPoints.push(fix ? fix[1] : polyPoints[i]);
    }

    const lonlats = fixedPoints.map((x) => x.join(",")).join("|");
    const url = `${baseUrl}?lonlats=${lonlats}&profile=${profile}&alternativeidx=0&format=gpx`;
    console.log("brouter gpx url", url);

    return url;
}

function equalPos(a: Position, b: Position): boolean {
    return distance(a, b) < 0.005;
}

function collectPosPairs(points: Position[]): [Position, Position][] {
    const result: [Position, Position][] = [];

    for (let i = 0; i < points.length - 1; i++) {
        result.push([points[i], points[i + 1]]);
    }

    return result;
}

async function callRouter(pair: [Position, Position], profile: string): Promise<Feature<LineString>> {
    const lonlats = pair.map((x) => x.join(",")).join("|");
    const url = `${baseUrl}?lonlats=${lonlats}&profile=${profile}&alternativeidx=0&format=geojson`;
    console.log("calling brouter w/", url);
    const response = await fetch(url);

    const result: FeatureCollection<LineString> = (await response.json()) as any;
    addDebugFeature(result.features[0]);

    return result.features[0];
}

function findAllDeadEnds(startPoint: Feature<Point>, route: Feature<LineString>[]): [Position, Position][] {
    const fixes: [Position, Position][] = [];
    for (let segment = 0; segment < route.length - 1; segment++) {
        const seg = route[segment].geometry.coordinates;
        if (equalPos(seg[seg.length - 1], startPoint.geometry.coordinates)) {
            continue;
        }

        const fix = findDeadEndOnRoute(seg, route[segment + 1].geometry.coordinates);
        if (fix) fixes.push(fix);
    }

    if (!equalPos(route[0].geometry.coordinates[0].slice(0, 2), startPoint.geometry.coordinates)) {
        const fix = findDeadEndOnRoute(route[route.length - 1].geometry.coordinates, route[0].geometry.coordinates);
        if (fix) fixes.push(fix);
    }

    return fixes;
}

function findDeadEndOnRoute(segA: Position[], segB: Position[]): undefined | [Position, Position] {
    const maxOffset = Math.min(segA.length, segB.length);

    let offA = 0;
    let offB = 0;

    while (equalPos(segA[segA.length - 1 - offA], segA[segA.length - 1 - offA - 1])) offA++;
    while (equalPos(segB[offB], segB[offB + 1])) offB++;

    while (offA < maxOffset && equalPos(segA[segA.length - 1 - offA], segB[offB])) {
        offA++;
        offB++;

        while (equalPos(segA[segA.length - 1 - offA], segA[segA.length - 1 - offA - 1])) offA++;
        while (equalPos(segB[offB], segB[offB + 1])) offB++;
    }

    if (offA === 1) return;

    addDebugPosition(segB[offB - 1]);
    return [segB[0], segB[offB - 1]];
}
