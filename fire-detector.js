// fire-detector.js — Real-time fire detection via pixel color analysis
// Fire pixels: high Red, moderate Green, very low Blue

function FireDetector(canvas, video) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  // Sensitivity levels: 1 (low) → 5 (high)
  // Higher sensitivity = detects fire from farther away
  const SENSITIVITY_PRESETS = {
    1: { redMin: 200, greenMin: 80,  greenMax: 160, blueMax: 80,  fireRatio: 0.015 },
    2: { redMin: 180, greenMin: 60,  greenMax: 180, blueMax: 100, fireRatio: 0.008 },
    3: { redMin: 155, greenMin: 45,  greenMax: 200, blueMax: 115, fireRatio: 0.004 },
    4: { redMin: 130, greenMin: 30,  greenMax: 210, blueMax: 130, fireRatio: 0.002 },
    5: { redMin: 110, greenMin: 20,  greenMax: 220, blueMax: 145, fireRatio: 0.001 },
  };

  let sensitivity = 3; // default: medium-high
  let config = { ...SENSITIVITY_PRESETS[sensitivity], sampleStep: 3 };

  function setSensitivity(level) {
    sensitivity = Math.max(1, Math.min(5, level));
    config = { ...SENSITIVITY_PRESETS[sensitivity], sampleStep: 3 };
  }

  function analyzeFrame() {
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    let firePixels  = 0;
    let totalSampled = 0;

    for (let i = 0; i < data.length; i += 4 * config.sampleStep) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      totalSampled++;

      if (
        r > config.redMin       &&   // strong red
        g > config.greenMin     &&   // some green
        g < config.greenMax     &&   // not too much green
        b < config.blueMax      &&   // very little blue
        r > g                   &&   // red dominates green
        g > b                        // green dominates blue
      ) {
        firePixels++;
      }
    }

    const fireRatio = firePixels / totalSampled;
    return {
      detected:    fireRatio >= config.fireRatio,
      confidence:  Math.min(100, Math.round((fireRatio / config.fireRatio) * 100)),
      firePixels,
      totalSampled,
      sensitivity,
    };
  }

  return { analyzeFrame, setSensitivity, getSensitivity: () => sensitivity, config };
}

