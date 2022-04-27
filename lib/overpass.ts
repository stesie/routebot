import { Feature, Point, polygon, Polygon, Position } from "@turf/helpers";
import { overpassJson } from "overpass-ts";
import { addDebugPosition } from "./debug";
import { findMinDistancePosIndex } from "./distance";

export async function snapPolygonToRoad(startPoint: Feature<Point>, poly: Feature<Polygon>) {
    const points = poly.geometry.coordinates[0].slice(0, -1);

    const snapped = await Promise.all(
        points.map((pos): Promise<Position> => {
            if (startPoint.geometry.coordinates[0] === pos[0] && startPoint.geometry.coordinates[1] === pos[1]) {
                return Promise.resolve(pos);
            }

            return snapPosToRoad(pos);
        })
    );

    snapped.push(snapped[0]);

    const newPoly = polygon([snapped], { fill: "#dd0" });
    return newPoly;
}

async function snapPosToRoad(pos: Position): Promise<Position> {
    const query = `
        [out:json];
        (way
            [highway~'tertiary|unclassified']
            (around:1000.0,${pos[1]},${pos[0]});
            >;
        );
        out;
    `;

    console.log("running overpass query", query);
    const result = await overpassJson(query, {
        verbose: true,
        endpoint: "https://overpass.kumi.systems/api/interpreter",
    });

    if (!result.elements.length) {
        throw new Error("Overpass Query returned no results :/");
    }

    const nodes = result.elements.flatMap((el): Position[] => (el.type === "node" ? [[el.lon, el.lat]] : []));
    const index = findMinDistancePosIndex(pos, nodes);

    addDebugPosition(nodes[index], { "marker-color": "#dd0" });
    return nodes[index];
}
