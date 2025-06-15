// Enhanced document detection module for DocuScan Pro with OpenCV.js
// Provides Adobe-like document detection capabilities

// Check if OpenCV is ready to use
function isOpenCvReady() {
    return window.cv && window.cvReady === true;
}

// Wait for OpenCV to be ready
function waitForOpenCV(callback) {
    if (isOpenCvReady()) {
        callback();
    } else {
        // Check again in 100ms
        setTimeout(() => waitForOpenCV(callback), 100);
    }
}

// Maintain backward compatibility with existing function
function detectDocument(image) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            context.drawImage(img, 0, 0);

            // Use the enhanced detection algorithm
            waitForOpenCV(() => {
                try {
                    const detectedDocument = performDocumentDetectionWithCV(canvas);
                    if (detectedDocument) {
                        resolve(detectedDocument);
                    } else {
                        reject('No document detected');
                    }
                } catch (error) {
                    console.error('Error in document detection:', error);
                    // Fallback to basic detection
                    const basicDetection = performBasicDocumentDetection(canvas);
                    resolve(basicDetection);
                }
            });
        };

        img.onerror = () => {
            reject('Error loading image');
        };

        img.src = image;
    });
}

// Advanced document detection with OpenCV
function performDocumentDetectionWithCV(canvas) {
    if (!isOpenCvReady()) {
        console.warn('OpenCV not ready, falling back to basic detection');
        return performBasicDocumentDetection(canvas);
    }
    
    // Get image data
    const context = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const imageData = context.getImageData(0, 0, width, height);
    
    // Convert to OpenCV format
    const src = cv.matFromImageData(imageData);
    const dst = new cv.Mat();
    
    try {
        // Step 1: Convert to grayscale
        cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
        
        // Step 2: Apply Gaussian blur to reduce noise
        const ksize = new cv.Size(5, 5);
        cv.GaussianBlur(dst, dst, ksize, 0);
        
        // Step 3: Apply Canny edge detection
        const edges = new cv.Mat();
        cv.Canny(dst, edges, 75, 200);
        
        // Step 4: Dilate to connect edge pixels
        const kernel = cv.Mat.ones(3, 3, cv.CV_8U);
        const dilated = new cv.Mat();
        cv.dilate(edges, dilated, kernel, new cv.Point(-1, -1), 1);
        
        // Step 5: Find contours
        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();
        cv.findContours(dilated, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
        
        // Step 6: Find the largest contour (likely the document)
        let maxArea = 0;
        let maxContourIndex = -1;
        
        for (let i = 0; i < contours.size(); i++) {
            const contour = contours.get(i);
            const area = cv.contourArea(contour);
            
            if (area > maxArea) {
                maxArea = area;
                maxContourIndex = i;
            }
        }
        
        // If no significant contour found, use default detection
        if (maxContourIndex === -1 || maxArea < (width * height * 0.1)) {
            // Clean up
            src.delete(); dst.delete(); edges.delete(); dilated.delete();
            contours.delete(); hierarchy.delete(); kernel.delete();
            
            // Fallback to basic detection
            return performBasicDocumentDetection(canvas);
        }
        
        // Step 7: Approximate the contour to get corners
        const maxContour = contours.get(maxContourIndex);
        const peri = cv.arcLength(maxContour, true);
        const approx = new cv.Mat();
        cv.approxPolyDP(maxContour, approx, 0.02 * peri, true);
        
        let corners;
        
        // Step 8: If we get a quadrilateral, use those corners
        if (approx.rows === 4) {
            // Extract corners from approximated contour
            corners = [];
            for (let i = 0; i < 4; i++) {
                corners.push({
                    x: approx.data32S[i * 2],
                    y: approx.data32S[i * 2 + 1]
                });
            }
        } else {
            // If not a quad, find the bounding rectangle
            const rect = cv.boundingRect(maxContour);
            corners = [
                { x: rect.x, y: rect.y },
                { x: rect.x + rect.width, y: rect.y },
                { x: rect.x + rect.width, y: rect.y + rect.height },
                { x: rect.x, y: rect.y + rect.height }
            ];
        }
        
        // Step 9: Sort corners in order: top-left, top-right, bottom-right, bottom-left
        const sortedCorners = sortCorners(corners);
        
        // Clean up OpenCV objects
        src.delete(); dst.delete(); edges.delete(); dilated.delete();
        contours.delete(); hierarchy.delete(); kernel.delete(); approx.delete();
        
        // Step 10: Draw detected document onto a canvas for visualization
        const detectionCanvas = document.createElement('canvas');
        detectionCanvas.width = width;
        detectionCanvas.height = height;
        const detectionCtx = detectionCanvas.getContext('2d');
        
        // Draw original image
        detectionCtx.drawImage(canvas, 0, 0);
        
        // Draw document outline
        detectionCtx.strokeStyle = '#ff7d30';
        detectionCtx.lineWidth = 3;
        detectionCtx.beginPath();
        detectionCtx.moveTo(sortedCorners[0].x, sortedCorners[0].y);
        detectionCtx.lineTo(sortedCorners[1].x, sortedCorners[1].y);
        detectionCtx.lineTo(sortedCorners[2].x, sortedCorners[2].y);
        detectionCtx.lineTo(sortedCorners[3].x, sortedCorners[3].y);
        detectionCtx.closePath();
        detectionCtx.stroke();
        
        // Draw corner markers
        const cornerSize = Math.min(width, height) * 0.03;
        drawCornerMarkers(detectionCtx, sortedCorners, cornerSize);
        
        return {
            imageData: detectionCanvas.toDataURL('image/jpeg'),
            corners: {
                topLeft: sortedCorners[0],
                topRight: sortedCorners[1],
                bottomRight: sortedCorners[2],
                bottomLeft: sortedCorners[3]
            }
        };
    } catch (error) {
        console.error('OpenCV error:', error);
        // Clean up
        if (src) src.delete();
        if (dst) dst.delete();
        
        // Fallback to basic detection
        return performBasicDocumentDetection(canvas);
    }
}

// Basic document detection as fallback
function performBasicDocumentDetection(canvas) {
    const width = canvas.width;
    const height = canvas.height;
    
    // Simple margin-based detection
    const margin = Math.min(width, height) * 0.1;
    const docBounds = {
        topLeft: { x: margin, y: margin },
        topRight: { x: width - margin, y: margin },
        bottomRight: { x: width - margin, y: height - margin },
        bottomLeft: { x: margin, y: height - margin }
    };
    
    return {
        imageData: canvas.toDataURL('image/jpeg'),
        corners: docBounds
    };
}

// Helper to sort corners in the right order
function sortCorners(corners) {
    // Calculate center point
    const center = {
        x: corners.reduce((sum, corner) => sum + corner.x, 0) / corners.length,
        y: corners.reduce((sum, corner) => sum + corner.y, 0) / corners.length
    };
    
    // Separate corners into top/bottom based on y position relative to center
    const top = corners.filter(corner => corner.y < center.y);
    const bottom = corners.filter(corner => corner.y >= center.y);
    
    // Sort top corners by x (left to right)
    top.sort((a, b) => a.x - b.x);
    
    // Sort bottom corners by x (left to right)
    bottom.sort((a, b) => a.x - b.x);
    
    // Return corners in the order: top-left, top-right, bottom-right, bottom-left
    // Make sure we have exactly 4 corners
    const result = [];
    if (top.length >= 2) {
        result.push(top[0]);
        result.push(top[top.length - 1]);
    } else if (top.length === 1) {
        result.push(top[0]);
        result.push({ x: center.x + (center.x - top[0].x), y: top[0].y });
    } else {
        result.push({ x: center.x - center.x * 0.2, y: center.y - center.y * 0.2 });
        result.push({ x: center.x + center.x * 0.2, y: center.y - center.y * 0.2 });
    }
    
    if (bottom.length >= 2) {
        result.push(bottom[bottom.length - 1]);
        result.push(bottom[0]);
    } else if (bottom.length === 1) {
        result.push({ x: bottom[0].x, y: bottom[0].y });
        result.push({ x: center.x - (bottom[0].x - center.x), y: bottom[0].y });
    } else {
        result.push({ x: center.x + center.x * 0.2, y: center.y + center.y * 0.2 });
        result.push({ x: center.x - center.x * 0.2, y: center.y + center.y * 0.2 });
    }
    
    return result;
}

// Draw corner markers for visualization
function drawCornerMarkers(ctx, corners, size) {
    ctx.strokeStyle = '#ff7d30';
    ctx.lineWidth = 3;
    
    corners.forEach(corner => {
        // Top-left corner
        ctx.beginPath();
        ctx.moveTo(corner.x, corner.y + size);
        ctx.lineTo(corner.x, corner.y);
        ctx.lineTo(corner.x + size, corner.y);
        ctx.stroke();
    });
}

// Apply perspective correction to the document - RESPETANDO MÁRGENES DEL USUARIO
function correctPerspective(sourceCanvas, corners) {
    if (!isOpenCvReady()) {
        console.warn('OpenCV not ready, using basic correction');
        return basicCorrectPerspective(sourceCanvas, corners);
    }
    
    try {
        // IMPORTANTE: Usamos directamente las esquinas proporcionadas por el usuario
        // sin ninguna modificación automática
        const { topLeft, topRight, bottomRight, bottomLeft } = corners;
        
        console.log("Usando esquinas definidas por usuario:", corners);
        
        // Convert source canvas to OpenCV format
        const context = sourceCanvas.getContext('2d');
        const imageData = context.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
        const src = cv.matFromImageData(imageData);
        
        // Calculamos las dimensiones EXACTAS basadas en las esquinas del usuario
        // Promediamos los lados opuestos para obtener dimensiones consistentes
        const destWidth = Math.round(
            (Math.hypot(topRight.x - topLeft.x, topRight.y - topLeft.y) +
             Math.hypot(bottomRight.x - bottomLeft.x, bottomRight.y - bottomLeft.y)) / 2
        );
        
        const destHeight = Math.round(
            (Math.hypot(bottomLeft.x - topLeft.x, bottomLeft.y - topLeft.y) +
             Math.hypot(bottomRight.x - topRight.x, bottomRight.y - topRight.y)) / 2
        );
        
        // Define source points - EXACTAMENTE las coordenadas del usuario
        const srcPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
            topLeft.x, topLeft.y,
            topRight.x, topRight.y,
            bottomRight.x, bottomRight.y,
            bottomLeft.x, bottomLeft.y
        ]);
        
        // Define destination points para un rectángulo perfecto
        const dstPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
            0, 0,
            destWidth, 0,
            destWidth, destHeight,
            0, destHeight
        ]);
        
        // Calculate perspective transform
        const M = cv.getPerspectiveTransform(srcPoints, dstPoints);
        
        // Apply transform
        const dst = new cv.Mat();
        cv.warpPerspective(src, dst, M, new cv.Size(destWidth, destHeight));
        
        // Convert back to canvas
        const destCanvas = document.createElement('canvas');
        destCanvas.width = destWidth;
        destCanvas.height = destHeight;
        const destContext = destCanvas.getContext('2d');
        
        // Convert OpenCV mat to ImageData and draw on canvas
        const imgData = new ImageData(
            new Uint8ClampedArray(dst.data),
            dst.cols,
            dst.rows
        );
        destContext.putImageData(imgData, 0, 0);
        
        // Clean up OpenCV objects
        src.delete();
        dst.delete();
        M.delete();
        srcPoints.delete();
        dstPoints.delete();
        
        return destCanvas;
    } catch (error) {
        console.error('Error en corrección de perspectiva:', error);
        return simpleCropDocument(sourceCanvas, corners);
    }
}
// Simple crop that EXACTLY respects user-defined corners
function simpleCropDocument(sourceCanvas, corners) {
    const { topLeft, topRight, bottomRight, bottomLeft } = corners;
    
    // Find the bounding box - EXACTAMENTE como lo definió el usuario
    const minX = Math.min(topLeft.x, bottomLeft.x);
    const minY = Math.min(topLeft.y, topRight.y);
    const maxX = Math.max(topRight.x, bottomRight.x);
    const maxY = Math.max(bottomLeft.y, bottomRight.y);
    
    const width = maxX - minX;
    const height = maxY - minY;
    
    // Create a new canvas for the cropped document
    const destCanvas = document.createElement('canvas');
    destCanvas.width = width;
    destCanvas.height = height;
    const destContext = destCanvas.getContext('2d');
    
    // Just crop the image - SIN MODIFICACIONES automáticas
    destContext.drawImage(
        sourceCanvas,
        minX, minY, width, height,
        0, 0, width, height
    );
    
    console.log("Recorte simple con esquinas del usuario:", {
        minX, minY, width, height,
        corners: corners
    });
    
    return destCanvas;
}
// Basic perspective correction as fallback - MODIFIED FOR NATURAL LOOK
function basicCorrectPerspective(sourceCanvas, corners) {
    const { topLeft, topRight, bottomRight, bottomLeft } = corners;
    
    // MODIFICADO: Calcular dimensiones basadas en el documento detectado
    const width = Math.max(
        Math.abs(topRight.x - topLeft.x),
        Math.abs(bottomRight.x - bottomLeft.x)
    );
    const height = Math.max(
        Math.abs(bottomLeft.y - topLeft.y),
        Math.abs(bottomRight.y - topRight.y)
    );
    
    // Create a new canvas for the corrected document
    const destCanvas = document.createElement('canvas');
    destCanvas.width = width;
    destCanvas.height = height;
    const destContext = destCanvas.getContext('2d');
    
    // Draw white background
    destContext.fillStyle = '#ffffff';
    destContext.fillRect(0, 0, width, height);
    
    // Simplemente recortar el área del documento
    destContext.drawImage(
        sourceCanvas,
        topLeft.x, topLeft.y, width, height,
        0, 0, width, height
    );
    
    return destCanvas;
}
// Helper function to check document orientation
function isDocumentLandscape(corners) {
    const { topLeft, topRight, bottomLeft } = corners;
    
    // Calculate width and height of document based on corners
    const docWidth = Math.hypot(topRight.x - topLeft.x, topRight.y - topLeft.y);
    const docHeight = Math.hypot(bottomLeft.x - topLeft.x, bottomLeft.y - topLeft.y);
    
    // Return true if width > height (landscape orientation)
    return docWidth > docHeight;
}

// Y actualiza la exportación al final del archivo:
window.documentDetection = {
    detectDocument,
    performDocumentDetectionWithCV,
    correctPerspective,
    processDocumentContent,
    enhanceDocument,
    isOpenCvReady
};
// Process document for OCR or other post-processing
function processDocumentContent(documentImage) {
    // This would integrate with an OCR service in a real implementation
    console.log('Document ready for OCR processing');
    
    // Return simulated OCR result
    return {
        success: true,
        textContent: "Simulated OCR text extraction would appear here.",
        confidence: 0.92
    };
}

// Process document for color/contrast enhancement - COLOR PRESERVING VERSION
function enhanceDocument(canvas) {
    if (!isOpenCvReady()) {
        console.warn('OpenCV not ready, using basic enhancement');
        return basicEnhanceDocument(canvas);
    }
    
    try {
        // Get image data
        const context = canvas.getContext('2d');
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        // Convert to OpenCV format
        const src = cv.matFromImageData(imageData);
        
        // IMPROVED: Use Lab color space for better color preservation
        const labImg = new cv.Mat();
        cv.cvtColor(src, labImg, cv.COLOR_RGBA2Lab);
        
        // Split channels (L = lightness, a/b = color)
        let labPlanes = new cv.MatVector();
        cv.split(labImg, labPlanes);
        
        // Only enhance the L channel (lightness)
        let lChannel = labPlanes.get(0);
        
        // Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
        const clahe = new cv.CLAHE(2.0, new cv.Size(8, 8));
        const enhancedL = new cv.Mat();
        clahe.apply(lChannel, enhancedL);
        
        // Replace L channel with enhanced version
        labPlanes.set(0, enhancedL);
        
        // Merge channels back
        const enhancedLab = new cv.Mat();
        cv.merge(labPlanes, enhancedLab);
        
        // Convert back to RGBA
        const result = new cv.Mat();
        cv.cvtColor(enhancedLab, result, cv.COLOR_Lab2RGBA);
        
        // Copy result back to canvas
        const processedData = new ImageData(
            new Uint8ClampedArray(result.data),
            canvas.width,
            canvas.height
        );
        context.putImageData(processedData, 0, 0);
        
        // Clean up
        src.delete();
        labImg.delete();
        lChannel.delete();
        enhancedL.delete();
        enhancedLab.delete();
        result.delete();
        labPlanes.delete();
        
        return canvas;
    } catch (error) {
        console.error('Error in document enhancement:', error);
        return basicEnhanceDocument(canvas);
    }
}
// Basic enhancement as fallback
function basicEnhanceDocument(canvas) {
    const context = canvas.getContext('2d');
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Apply simple contrast enhancement
    for (let i = 0; i < data.length; i += 4) {
        // Simple contrast adjustment
        data[i] = Math.min(255, data[i] * 1.2);     // R
        data[i+1] = Math.min(255, data[i+1] * 1.2); // G
        data[i+2] = Math.min(255, data[i+2] * 1.2); // B
        
        // If pixel is near-white, make it pure white (clean up background)
        if (data[i] > 230 && data[i+1] > 230 && data[i+2] > 230) {
            data[i] = data[i+1] = data[i+2] = 255;
        }
    }
    
    context.putImageData(imageData, 0, 0);
    return canvas;
}

// Export functions to global scope for use in camera.js
window.documentDetection = {
    detectDocument,
    performDocumentDetectionWithCV,
    correctPerspective,
    processDocumentContent,
    enhanceDocument,
    isOpenCvReady
};