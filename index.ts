import commandLineArgs from "command-line-args";
import commandLineUsage from "command-line-usage";
import { point } from "@turf/helpers";
import { makeRandomRoute } from "./lib/route";
import { getDebugFeatureCollection } from "./lib/debug";
import { writeFileSync } from "fs";
import fetch from "node-fetch";

const optionList = [
    {
        name: "help",
        alias: "h",
        type: Boolean,
        description: "Display this usage guide.",
    },
    {
        name: "length",
        alias: "l",
        type: Number,
        defaultValue: 100,
        description: "Set desired (approximate) route length.",
    },
    {
        name: "start",
        alias: "s",
        type: String,
        defaultValue: "9.943462461233139,49.77135645006747",
        description: "Set start location (longitude, latitude position) of the route.",
    },
    {
        name: "out",
        alias: "o",
        type: String,
        description: "Write resulting GPX to this file.",
    },
    {
        name: "ccw",
        type: Boolean,
        description: "Generate counter-clockwise route.",
    },
    {
        name: "debug-geojson-features",
        type: String,
        description: "Write GeoJSON FeatureCollection with debugging information to given file.",
    },
];

const options = commandLineArgs(optionList);

console.log(options);

if (options.help) {
    console.log(
        commandLineUsage([
            {
                header: "A random route creation robot.",
                content: "Generate a random cycle route starting at a given point",
            },
            {
                header: "Options",
                optionList,
            },
        ])
    );
    process.exit(0);
}

(async function () {
    const startPoint = point(options.start.split(/\s*,\s*/).map(Number));
    const gpxUrl = await makeRandomRoute(startPoint, options.length, { ccw: options.ccw });

    if (options["debug-geojson-features"]) {
        writeFileSync(options["debug-geojson-features"], JSON.stringify(getDebugFeatureCollection(), undefined, 4));
    }

    const gpxData = await (await fetch(gpxUrl)).text();
    if (options.out) {
        writeFileSync(options.out, gpxData);
    } else {
        console.log(gpxData);
    }
})();
