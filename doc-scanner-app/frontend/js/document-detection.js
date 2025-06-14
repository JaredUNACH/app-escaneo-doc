function detectDocument(image) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            context.drawImage(img, 0, 0);

            // Use a library like OpenCV.js or similar for document detection
            // This is a placeholder for the actual detection logic
            const detectedDocument = performDocumentDetection(canvas);

            if (detectedDocument) {
                resolve(detectedDocument);
            } else {
                reject('No document detected');
            }
        };

        img.onerror = () => {
            reject('Error loading image');
        };

        img.src = image;
    });
}

function performDocumentDetection(canvas) {
    // Placeholder function for document detection logic
    // Implement actual detection algorithm here
    // For example, using OpenCV.js to find contours and crop the document

    // Return a cropped image or coordinates of the detected document
    return canvas.toDataURL(); // Example return
}

function handleImageCapture(image) {
    detectDocument(image)
        .then((detectedDocument) => {
            console.log('Document detected:', detectedDocument);
            // Further processing, e.g., converting to PDF
        })
        .catch((error) => {
            console.error(error);
        });
}