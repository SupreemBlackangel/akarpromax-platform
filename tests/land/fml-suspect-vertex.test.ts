// The deed tells you which number was misread. It was not being asked.
//
// Plot 36 at Salalah Airport, 990 m², came out of the tool as 13,915 m² — a
// sliver a kilometre long. All the reader was told was that the area differed
// by 1305%, which is the symptom. The sheet states the length of every side, so
// the document already knows which corner is wrong.
import assert from "node:assert/strict";
import test from "node:test";

import { suspectVertexIndices, SIDE_TOLERANCE_METERS } from "../../src/lib/tools/fml-suspect-vertex.ts";

const side = (fromIndex: number, toIndex: number, lengthMeters: number, documentLengthMeters: number) => ({
  fromIndex,
  toIndex,
  lengthMeters,
  documentLengthMeters,
  deviationMeters: Math.abs(lengthMeters - documentLengthMeters),
});

test("the corner both of whose sides disagree is the one named", () => {
  // The real reading, reproduced: P1's easting came through as 187930 instead
  // of 186943.15, and nothing else changed.
  const segments = [
    side(0, 1, 983.03, 22.02),
    side(1, 2, 45.00, 45.04),
    side(2, 3, 22.00, 22.02),
    side(3, 0, 941.79, 45.03),
  ];

  assert.deepEqual(suspectVertexIndices(segments), [0]);
});

test("a parcel that matches its deed accuses nobody", () => {
  const segments = [
    side(0, 1, 21.999, 22.02),
    side(1, 2, 45.004, 45.04),
    side(2, 3, 22.001, 22.02),
    side(3, 0, 45.003, 45.03),
  ];

  assert.deepEqual(suspectVertexIndices(segments), []);
});

test("every side wrong is not a corner, and nothing is named", () => {
  // A wrong zone, a wrong scale or a misread table moves the whole polygon.
  // Sending a reader to audit one number out of eight when all eight are
  // suspect is worse than saying nothing.
  const segments = [
    side(0, 1, 220.2, 22.02),
    side(1, 2, 450.4, 45.04),
    side(2, 3, 220.2, 22.02),
    side(3, 0, 450.3, 45.03),
  ];

  assert.deepEqual(suspectVertexIndices(segments), []);
});

test("one side off on its own names nobody", () => {
  // It is as likely to be either end. Naming the wrong point sends the reader
  // to check a number that is right.
  const segments = [
    side(0, 1, 30.0, 22.02),
    side(1, 2, 45.004, 45.04),
    side(2, 3, 22.001, 22.02),
    side(3, 0, 45.003, 45.03),
  ];

  assert.deepEqual(suspectVertexIndices(segments), []);
});

test("the centimetre the scale factor accounts for is not a misreading", () => {
  // SCALE FACTOR = 1.0007885 on this drawing: 3.5cm over a 45m side. Grid and
  // plan distances differ by design, and the sheet prints both.
  const segments = [
    side(0, 1, 22.02 - 0.02, 22.02),
    side(1, 2, 45.04 - 0.04, 45.04),
    side(2, 3, 22.02 - 0.02, 22.02),
    side(3, 0, 45.03 - 0.03, 45.03),
  ];

  assert.deepEqual(suspectVertexIndices(segments), []);
  assert.ok(SIDE_TOLERANCE_METERS > 0.05, "the tolerance must clear the scale factor");
});

test("a sheet that states no distances is not second-guessed", () => {
  // Plenty of deeds list coordinates and no side lengths. With no answer key
  // there is nothing to check against, and a computed area alone cannot say
  // which corner is at fault.
  const segments = [
    { fromIndex: 0, toIndex: 1, lengthMeters: 983.03 },
    { fromIndex: 1, toIndex: 2, lengthMeters: 45.0 },
  ];

  assert.deepEqual(suspectVertexIndices(segments), []);
});

test("two corners can be named when the sheet accuses two", () => {
  // Two misread corners in a six-sided parcel: the pair of sides that meet at
  // P1 both fail, and so does the pair that meets at P4. The two sides that
  // touch neither still measure what the sheet says.
  const segments = [
    side(0, 1, 900, 20),
    side(1, 2, 900, 20),
    side(2, 3, 20.0, 20.02),
    side(3, 4, 900, 20),
    side(4, 5, 900, 20),
    side(5, 0, 20.0, 20.02),
  ];

  assert.deepEqual(suspectVertexIndices(segments), [1, 4]);
});
