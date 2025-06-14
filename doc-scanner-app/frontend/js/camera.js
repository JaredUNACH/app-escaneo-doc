document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const cameraSection = document.getElementById('camera-section');
    const previewSection = document.getElementById('preview-section');
    const cameraVideo = document.getElementById('camera');
    const captureButton = document.getElementById('capture-button');
    const retakeButton = document.getElementById('retake-button');
    const processButton = document.getElementById('process-button');
    const previewCanvas = document.getElementById('preview-canvas');
    const documentOverlay = document.querySelector('.document-overlay');
    
    // Camera stream reference
    let cameraStream = null;
    
    // Canvas contexts
    const previewContext = previewCanvas.getContext('2d');
    
    // Initialize camera when section becomes visible
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.target === cameraSection && 
                !cameraSection.classList.contains('hidden') && 
                !cameraStream) {
                startCamera();
            }
        });
    });
    
    // Start observing changes to the camera section
    if (cameraSection) {
        observer.observe(cameraSection, { attributes: true });
    }
    
    // Start camera stream
    function startCamera() {
        // Check if browser supports getUserMedia
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showAlert('Your browser does not support camera access.', 'error');
            return;
        }
        
        // Get available cameras and use the environment-facing one if available
        navigator.mediaDevices.enumerateDevices()
            .then(devices => {
                const videoDevices = devices.filter(device => device.kind === 'videoinput');
                
                // Try to use back camera on mobile devices
                const constraints = {
                    video: {
                        facingMode: 'environment',
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
                    },
                    audio: false
                };
                
                return navigator.mediaDevices.getUserMedia(constraints);
            })
            .then(stream => {
                cameraStream = stream;
                cameraVideo.srcObject = stream;
                
                // Wait for video to be ready
                cameraVideo.onloadedmetadata = () => {
                    cameraVideo.play();
                    showAlert('Camera ready. Position document within frame.', 'info');
                };
            })
            .catch(error => {
                console.error('Camera error:', error);
                showAlert('Could not access camera. Please allow camera permissions.', 'error');
            });
    }
    
    // Stop camera stream
    function stopCamera() {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => {
                track.stop();
            });
            cameraStream = null;
        }
    }
    
    // Capture image from camera
    function captureImage() {
        if (!cameraStream) {
            showAlert('Camera not ready.', 'error');
            return;
        }
        
        // Set canvas dimensions to match video
        const width = cameraVideo.videoWidth;
        const height = cameraVideo.videoHeight;
        
        previewCanvas.width = width;
        previewCanvas.height = height;
        
        // Draw the current frame from the video
        previewContext.drawImage(cameraVideo, 0, 0, width, height);
        
        // Hide camera section and show preview
        cameraSection.classList.add('hidden');
        previewSection.classList.remove('hidden');
        
        // Detect document in the captured image
        detectDocumentEdges();
        
        showAlert('Image captured. Review and process or retake.', 'success');
    }
    
    // Simplified document edge detection
    function detectDocumentEdges() {
        const width = previewCanvas.width;
        const height = previewCanvas.height;
        
        // Get image data
        const imageData = previewContext.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        // This is a placeholder for actual document detection
        // In a real implementation, this would use computer vision techniques
        
        // For demo purposes, we'll create a simple simulated detection
        // that finds high-contrast edges in the image
        
        // Create a new canvas for edge detection visualization
        const edgeCanvas = document.createElement('canvas');
        edgeCanvas.width = width;
        edgeCanvas.height = height;
        const edgeContext = edgeCanvas.getContext('2d');
        
        // Apply simple edge detection (very simplified)
        edgeContext.drawImage(previewCanvas, 0, 0);
        const edgeData = edgeContext.getImageData(0, 0, width, height);
        const edgePixels = edgeData.data;
        
        // Draw document outline (simulated)
        previewContext.save();
        
        // Clear original and draw a processed version
        previewContext.drawImage(previewCanvas, 0, 0);
        
        // Draw document border
        const padding = 50;
        const docX = Math.max(padding, width * 0.1);
        const docY = Math.max(padding, height * 0.1);
        const docWidth = Math.min(width - padding * 2, width * 0.8);
        const docHeight = Math.min(height - padding * 2, height * 0.8);
        
        // Apply "enhancement" effect to document area
        previewContext.fillStyle = 'rgba(255, 125, 0, 0.1)';
        previewContext.fillRect(docX, docY, docWidth, docHeight);
        
        // Draw corners
        previewContext.strokeStyle = '#ff7d30';
        previewContext.lineWidth = 4;
        
        // Top-left corner
        previewContext.beginPath();
        previewContext.moveTo(docX, docY + 30);
        previewContext.lineTo(docX, docY);
        previewContext.lineTo(docX + 30, docY);
        previewContext.stroke();
        
        // Top-right corner
        previewContext.beginPath();
        previewContext.moveTo(docX + docWidth - 30, docY);
        previewContext.lineTo(docX + docWidth, docY);
        previewContext.lineTo(docX + docWidth, docY + 30);
        previewContext.stroke();
        
        // Bottom-right corner
        previewContext.beginPath();
        previewContext.moveTo(docX + docWidth, docY + docHeight - 30);
        previewContext.lineTo(docX + docWidth, docY + docHeight);
        previewContext.lineTo(docX + docWidth - 30, docY + docHeight);
        previewContext.stroke();
        
        // Bottom-left corner
        previewContext.beginPath();
        previewContext.moveTo(docX + 30, docY + docHeight);
        previewContext.lineTo(docX, docY + docHeight);
        previewContext.lineTo(docX, docY + docHeight - 30);
        previewContext.stroke();
        
        previewContext.restore();
        
        // Store detected corners for later processing
        window.detectedDocument = {
            topLeft: { x: docX, y: docY },
            topRight: { x: docX + docWidth, y: docY },
            bottomRight: { x: docX + docWidth, y: docY + docHeight },
            bottomLeft: { x: docX, y: docY + docHeight }
        };
    }
    
    // Process the detected document
    function processDocument() {
        if (!window.detectedDocument) {
            showAlert('No document detected. Please try again.', 'error');
            return;
        }
        
        // Get detected document corners
        const { topLeft, topRight, bottomRight, bottomLeft } = window.detectedDocument;
        
        // Create a new canvas for the final document
        const docCanvas = document.createElement('canvas');
        const docContext = docCanvas.getContext('2d');
        
        // Set document size (A4 aspect ratio)
        const docWidth = 595; // A4 width in pixels at 72 DPI
        const docHeight = 842; // A4 height in pixels at 72 DPI
        
        docCanvas.width = docWidth;
        docCanvas.height = docHeight;
        
        // Apply perspective correction (simplified)
        // In a real implementation, this would use a perspective transform
        // For the demo, we'll just crop to the detected rectangle
        
        // Draw white background
        docContext.fillStyle = 'white';
        docContext.fillRect(0, 0, docWidth, docHeight);
        
        // Draw the source image on the destination canvas, with perspective correction
        const sourceWidth = topRight.x - topLeft.x;
        const sourceHeight = bottomLeft.y - topLeft.y;
        
        // Draw the source image with a simple scaling transform
        docContext.drawImage(
            previewCanvas,
            topLeft.x, topLeft.y, sourceWidth, sourceHeight,
            0, 0, docWidth, docHeight
        );
        
        // Convert the document to a data URL
        const documentImage = docCanvas.toDataURL('image/jpeg', 0.9);
        
        // In a real implementation, we would send this to the server
        // For now, just show it in a new tab or download it
        
        // Create download link
        const downloadLink = document.createElement('a');
        downloadLink.href = documentImage;
        downloadLink.download = 'scanned_document.jpg';
        
        // Trigger download
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        // Update workflow step
        if (typeof updateWorkflowStep === 'function') {
            updateWorkflowStep('process');
        }
        
        showAlert('Document processed successfully!', 'success');
        
        // Reset UI
        setTimeout(() => {
            previewSection.classList.add('hidden');
            cameraSection.classList.remove('hidden');
            startCamera();
        }, 1000);
    }
    
    // Handle retake button
    function retakePhoto() {
        previewSection.classList.add('hidden');
        cameraSection.classList.remove('hidden');
        
        // Restart camera if needed
        if (!cameraStream) {
            startCamera();
        }
    }
    
    // Event listeners
    if (captureButton) {
        captureButton.addEventListener('click', captureImage);
    }
    
    if (retakeButton) {
        retakeButton.addEventListener('click', retakePhoto);
    }
    
    if (processButton) {
        processButton.addEventListener('click', processDocument);
    }
    
    // Cleanup when the page unloads
    window.addEventListener('beforeunload', stopCamera);
    
    // Helper function to show alerts (uses the same function from search.js)
    function showAlert(message, type = 'info', duration = 3000) {
        const appAlert = document.getElementById('app-alert');
        const alertMessage = document.getElementById('alert-message');
        
        if (!appAlert || !alertMessage) return;
        
        alertMessage.textContent = message;
        appAlert.className = 'floating-alert visible';
        
        // Set alert type (info, success, error)
        appAlert.classList.add(`alert-${type}`);
        
        setTimeout(() => {
            appAlert.classList.add('hiding');
            setTimeout(() => {
                appAlert.className = 'floating-alert';
            }, 300);
        }, duration);
    }
});