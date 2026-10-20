import assert from "node:assert/strict";
import { test } from "node:test";
import { anglesFor, angularDistance, builderCategories, clusterDegreesFor, clusterPlaces, nearestAngle, project } from "./world-math";

const close = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test("flying to a place puts it at the centre, facing the viewer", () => {
  for (const [lat, lng] of [[31.56, 74.35], [51.51, -0.13], [-33.87, 151.21], [0, 0], [64.1, -21.9]]) {
    const { phi, theta } = anglesFor(lat, lng);
    const p = project(lat, lng, phi, theta);
    close(p.x, 0.5);
    close(p.y, 0.5);
    assert.ok(p.visible && p.depth > 0.8);
  }
});

test("the far side of the globe is hidden", () => {
  const { phi, theta } = anglesFor(31.56, 74.35); // looking at Lahore
  assert.equal(project(-31.56, -105.65, phi, theta).visible, false); // its antipode
  assert.equal(project(28.6, 77.2, phi, theta).visible, true); // Delhi, next door
});

test("north is up and east is to the right", () => {
  const { phi, theta } = anglesFor(0, 0);
  assert.ok(project(20, 0, phi, theta).y < 0.5);
  assert.ok(project(0, 20, phi, theta).x > 0.5);
});

test("zoom scales distance from the centre", () => {
  const { phi, theta } = anglesFor(0, 0);
  const a = project(10, 10, phi, theta, 1);
  const b = project(10, 10, phi, theta, 2);
  close((b.x - 0.5) / (a.x - 0.5), 2);
});

test("flights take the short way round", () => {
  close(nearestAngle(0.1, Math.PI * 2 - 0.1), -0.1);
  close(nearestAngle(10, 10.5), 10.5);
  assert.ok(Math.abs(nearestAngle(0, 3 * Math.PI) - Math.PI) < 1e-9 || Math.abs(nearestAngle(0, 3 * Math.PI) + Math.PI) < 1e-9);
});

test("angular distance", () => {
  close(angularDistance({ lat: 0, lng: 0 }, { lat: 0, lng: 90 }), 90);
  assert.ok(Math.abs(angularDistance({ lat: 31.56, lng: 74.35 }, { lat: 24.86, lng: 67.01 }) - 9.3) < 0.5); // Lahore–Karachi
});

test("nearby places cluster when zoomed out and split when zoomed in", () => {
  const places = [
    { key: "lahore", lat: 31.56, lng: 74.35, count: 12 },
    { key: "islamabad", lat: 33.72, lng: 73.04, count: 3 },
    { key: "london", lat: 51.51, lng: -0.13, count: 5 },
  ];
  const far = clusterPlaces(places, clusterDegreesFor(1));
  assert.equal(far.length, 2);
  const pk = far.find((c) => c.key === "lahore")!;
  assert.equal(pk.count, 15);
  assert.deepEqual(pk.places.map((p) => p.key), ["lahore", "islamabad"]);
  assert.equal(clusterPlaces(places, clusterDegreesFor(3)).length, 3);
});

test("builder interests come from skills, headline and project types, several allowed", () => {
  assert.deepEqual(builderCategories({ headline: "Full Stack Developer", skills: ["typescript"] }), ["developers"]);
  assert.deepEqual(builderCategories({ skills: ["godot", "pixel art"] }), ["games", "creative"]);
  assert.deepEqual(builderCategories({ headline: "making beats", projectTypes: ["AI_TOOL"] }), ["ai", "creative"]);
  assert.deepEqual(builderCategories({ headline: "Figma + UX" }), ["designers"]);
  assert.deepEqual(builderCategories({ headline: "hello" }), []);
  assert.deepEqual(builderCategories({ headline: "said maid" }), []); // no false "ai" inside words
});
