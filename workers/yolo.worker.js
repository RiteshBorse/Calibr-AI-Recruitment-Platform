import * as tf from '@tensorflow/tfjs';

let model;

// Tech/Interview-relevant classes only (filter out animals, food, etc.)
const RELEVANT_CLASSES = [
  'person',      // Primary: people in interview
  'cell phone',  // Violation: phone usage
  'laptop',      // Common: laptop visible
  'book',        // Allowed: reference materials
  'tv',          // Background: monitor/screen
  'mouse',       // Common: computer mouse
  'keyboard',    // Common: keyboard
  'remote',      // Potential violation
  'clock',       // Background item
  'bottle',      // Allowed: water bottle
  'cup',         // Allowed: drinks
  'chair',       // Background
  'couch',       // Background
  'bed',         // Background/setting
  'dining table',// Background
  'backpack',    // Background
  'handbag',     // Background
  'tie',         // Clothing
  'scissors',    // Office item
  'vase'         // Background decoration
];

// Full COCO class names for index mapping (kept for correct class ID mapping)
const COCO_CLASSES = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
  'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
  'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
  'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
  'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
  'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
  'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair',
  'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse',
  'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator',
  'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
];

self.onmessage = async (e) => {
  const { type, imageBitmap } = e.data;

  if (type === 'load') {
    try {
      await tf.ready();
      model = await tf.loadGraphModel('/yolov8m/model.json');
      console.log('✅ YOLOv8m model loaded in worker');
      self.postMessage({ type: 'loaded' });
      
      // Notify main thread that YOLO is loaded
      if (typeof self !== 'undefined') {
        self.postMessage({ type: 'yolo-ready' });
      }
    } catch (err) {
      console.error('❌ YOLO model load error:', err);
      self.postMessage({ type: 'error', error: err.message });
    }
  }

  if (type === 'detect' && model && imageBitmap) {
    try {
      // Prepare input tensor (YOLOv8 expects 640x640)
      const tensor = tf.browser.fromPixels(imageBitmap)
        .resizeBilinear([640, 640])
        .div(255.0)
        .expandDims(0);

      // Run inference
      const predictions = model.execute(tensor);
      
      // YOLOv8 output format: [1, 84, 8400] - 4 bbox coords + 80 class scores
      let outputTensor = Array.isArray(predictions) ? predictions[0] : predictions;
      const predArray = await outputTensor.array();
      
      const objects = [];
      const confidenceThreshold = 0.8; 
      
      // Output format: [batch, 84, 8400] where 84 = [x, y, w, h, class0...class79]
      const batch = predArray[0]; // Shape: [84, 8400]
      
      if (batch && batch.length === 84) {
        const numPredictions = batch[0].length; // Should be 8400
        
        for (let i = 0; i < numPredictions; i++) {
          let maxScore = 0;
          let classId = 0;
          
          // Get max class score from 80 classes (indices 4-83)
          for (let j = 4; j < 84; j++) {
            const score = batch[j][i];
            if (score > maxScore) {
              maxScore = score;
              classId = j - 4; // Map to 0-79
            }
          }
          
          // Only process if confidence meets threshold
          if (maxScore > confidenceThreshold && classId < COCO_CLASSES.length) {
            const className = COCO_CLASSES[classId];
            // Only include tech/interview-relevant classes
            if (RELEVANT_CLASSES.includes(className) && !objects.includes(className)) {
              objects.push(className);
            }
          }
        }
      }
      self.postMessage({ type: 'result', objects });
      
      // Cleanup tensors
      tf.dispose([tensor, outputTensor]);
      if (Array.isArray(predictions)) {
        predictions.forEach(t => tf.dispose(t));
      }
    } catch (err) {
      console.error('❌ YOLO Worker detection error:', err);
      self.postMessage({ type: 'error', error: err.message });
    }
  }
};
