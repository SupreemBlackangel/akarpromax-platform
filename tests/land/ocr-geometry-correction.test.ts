import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  correctPageGeometry,
  detectPageQuad,
  PERSPECTIVE_MIN_CONFIDENCE,
} from "@/lib/land/ocr/geometry-correction";
import {
  rotateGraySmallAngle,
  rotateGrayRightAngle,
  warpQuadToRect,
  computeHomography,
  type GrayImage,
} from "@/lib/land/ocr/raster";
import { detectSkew } from "@/lib/land/ocr/image-quality";

function textPage(options: { width?: number; height?: number; lineHeight?: number; gap?: number } = {}): GrayImage {
  const width = options.width ?? 600;
  const height = options.height ?? 800;
  const lineHeight = options.lineHeight ?? 18;
  const gap = options.gap ?? 16;
  const data = new Uint8ClampedArray(width * height).fill(245);
  for (let y = 60; y < height - 60; y += lineHeight + gap) {
    for (let dy = 0; dy < lineHeight; dy += 1) {
      const lineWidth = Math.floor(width * (0.7 + ((y * 7919) % 20) / 100));
      for (let x = 40; x < Math.min(width - 40, 40 + lineWidth); x += 1) {
        if (((x + y * 13) % 37) < 30) data[(y + dy) * width + x] = 20;
      }
    }
  }
  return { width, height, data };
}

/** A photographed page: bright trapezoid paper on a dark desk. */
function photographedPage(shift: number): GrayImage {
  const width = 600;
  const height = 800;
  const data = new Uint8ClampedArray(width * height).fill(40); // desk
  // Paper corners: top edge pushed inward by `shift` (perspective).
  const corners = [
    { x: 60 + shift, y: 60 },
    { x: width - 60 - shift, y: 60 },
    { x: width - 30, y: height - 60 },
    { x: 30, y: height - 60 },
  ];
  // Fill the quad by scanline.
  for (let y = 60; y < height - 60; y += 1) {
    const t = (y - 60) / (height - 120);
    const left = corners[0].x + (corners[3].x - corners[0].x) * t;
    const right = corners[1].x + (corners[2].x - corners[1].x) * t;
    for (let x = Math.ceil(left); x < right; x += 1) data[y * width + x] = 240;
  }
  // A few text bands inside the paper.
  for (let y = 140; y < height - 140; y += 34) {
    for (let dy = 0; dy < 14; dy += 1) {
      const t = (y - 60) / (height - 120);
      const left = corners[0].x + (corners[3].x - corners[0].x) * t + 30;
      const right = corners[1].x + (corners[2].x - corners[1].x) * t - 30;
      for (let x = Math.ceil(left); x < right; x += 1) {
        if (((x + y * 13) % 31) < 24) data[(y + dy) * width + x] = 30;
      }
    }
  }
  return { width, height, data };
}

describe("Deskew", () => {
  for (const angle of [1, 3, 5, -3, -8]) {
    it(`corrects a ${angle}° skew`, async () => {
      const skewed = rotateGraySmallAngle(textPage(), angle);
      const result = await correctPageGeometry(skewed);
      const deskew = result.applied.find((operation) => operation.operation === "DESKEW");
      assert.ok(deskew, `deskew applied (ops: ${result.applied.map((o) => o.operation).join(",")})`);
      const residual = detectSkew(result.image);
      assert.ok(Math.abs(residual.angle) <= 1.5, `residual skew ${residual.angle}`);
    });
  }

  it("records what it detected and applied", async () => {
    const result = await correctPageGeometry(rotateGraySmallAngle(textPage(), 5));
    const deskew = result.applied.find((operation) => operation.operation === "DESKEW");
    assert.ok(deskew?.detail && deskew.confidence !== undefined);
  });

  it("does not rotate a straight page", async () => {
    const result = await correctPageGeometry(textPage());
    assert.ok(!result.applied.some((operation) => operation.operation === "DESKEW"));
  });
});

describe("Right-angle orientation", () => {
  it("turns a 90°-rotated page upright", async () => {
    const sideways = rotateGrayRightAngle(textPage(), 90);
    const result = await correctPageGeometry(sideways);
    assert.ok(result.applied.some((operation) => operation.operation === "ROTATE_90"));
    assert.ok(result.image.width > result.image.height === (textPage().width > textPage().height));
  });

  it("preserves a 180°-rotated page rather than guessing", async () => {
    // Banding cannot tell 0° from 180°; the safe move is no destructive turn.
    const upsideDown = rotateGrayRightAngle(textPage(), 180);
    const result = await correctPageGeometry(upsideDown);
    assert.ok(!result.applied.some((operation) => /^ROTATE/.test(operation.operation)));
  });
});

describe("Perspective correction", () => {
  it("detects and corrects a page photographed at an angle", async () => {
    const photo = photographedPage(70);
    const quad = detectPageQuad(photo);
    assert.ok(quad, "page quad found");
    assert.ok(quad.confidence >= PERSPECTIVE_MIN_CONFIDENCE, `confidence ${quad.confidence}`);
    assert.ok(quad.distortionDegrees >= 1.5, `distortion ${quad.distortionDegrees}`);
    const result = await correctPageGeometry(photo);
    assert.ok(result.applied.some((operation) => operation.operation === "PERSPECTIVE_CORRECTION"));
  });

  it("leaves a full-frame scan alone — there is no page border to trust", async () => {
    const scan = textPage();
    const result = await correctPageGeometry(scan);
    assert.ok(!result.applied.some((operation) => operation.operation === "PERSPECTIVE_CORRECTION"));
  });

  it("never mistakes a parcel drawing for the page border", async () => {
    // A full-frame white page whose CONTENT is a large dark trapezoid outline
    // (a parcel boundary). The paper fills the frame, so there is no page
    // quad to correct, however strong the inner shape is.
    const image = textPage({ height: 800 });
    const trapezoid = [
      { x: 150, y: 200 }, { x: 430, y: 220 }, { x: 470, y: 600 }, { x: 120, y: 560 },
    ];
    for (let edge = 0; edge < 4; edge += 1) {
      const a = trapezoid[edge];
      const b = trapezoid[(edge + 1) % 4];
      const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y));
      for (let s = 0; s <= steps; s += 1) {
        const x = Math.round(a.x + ((b.x - a.x) * s) / steps);
        const y = Math.round(a.y + ((b.y - a.y) * s) / steps);
        for (let w = -2; w <= 2; w += 1) image.data[(y + w) * image.width + x] = 10;
      }
    }
    const result = await correctPageGeometry(image);
    assert.ok(!result.applied.some((operation) => operation.operation === "PERSPECTIVE_CORRECTION"));
  });

  it("round-trips a known homography", () => {
    const quad = [
      { x: 100, y: 50 }, { x: 500, y: 80 }, { x: 520, y: 700 }, { x: 80, y: 680 },
    ];
    const h = computeHomography(
      [{ x: 0, y: 0 }, { x: 400, y: 0 }, { x: 400, y: 600 }, { x: 0, y: 600 }],
      quad,
    );
    // Destination corner (400, 600) must land on source corner (520, 700).
    const d = h[6] * 400 + h[7] * 600 + h[8];
    assert.ok(Math.abs((h[0] * 400 + h[1] * 600 + h[2]) / d - 520) < 0.5);
    assert.ok(Math.abs((h[3] * 400 + h[4] * 600 + h[5]) / d - 700) < 0.5);
  });

  it("warps a quad into an upright rectangle", () => {
    const source: GrayImage = { width: 200, height: 200, data: new Uint8ClampedArray(200 * 200).fill(255) };
    // Dark band along the source quad's top edge.
    for (let x = 40; x < 160; x += 1) for (let y = 30; y < 40; y += 1) source.data[y * 200 + x] = 0;
    const warped = warpQuadToRect(source, [
      { x: 40, y: 30 }, { x: 160, y: 30 }, { x: 170, y: 180 }, { x: 30, y: 180 },
    ], 120, 150);
    // The band must now hug the top of the output.
    let darkTop = 0;
    for (let x = 0; x < 120; x += 1) if (warped.data[3 * 120 + x] < 100) darkTop += 1;
    assert.ok(darkTop > 80, `dark top pixels ${darkTop}`);
  });
});
