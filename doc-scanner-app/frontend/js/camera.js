
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const cameraSection = document.getElementById('camera-section');
    const previewSection = document.getElementById('preview-section');
    const cameraVideo = document.getElementById('camera');
    const captureButton = document.getElementById('capture-button');
    const retakeButton = document.getElementById('retake-button');
    const confirmButton = document.getElementById('confirm-button');
    const previewCanvas = document.getElementById('preview-canvas');
    const documentOverlay = document.querySelector('.document-overlay');
    const documentCornersElement = document.getElementById('document-corners');
    const documentDetectedMessage = document.getElementById('document-detected-message');
    
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
                    showAlert('Position document within frame and tap capture', 'info');
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
        
        // Show processing indicator
        showAlert('Processing image...', 'info');
        
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
    }
    
    // Detect document edges using OpenCV
    function detectDocumentEdges() {
        if (!previewCanvas) return;
        
        const width = previewCanvas.width;
        const height = previewCanvas.height;
        
        // Check if OpenCV is ready
        if (window.documentDetection && window.documentDetection.isOpenCvReady()) {
            try {
                // Use OpenCV for detection
                const result = window.documentDetection.performDocumentDetectionWithCV(previewCanvas);
                
                // Store detected document corners for later processing
                window.detectedDocument = result.corners;
                
                // Preview already contains visualization from the detection function
                const img = new Image();
                img.onload = () => {
                    previewContext.clearRect(0, 0, width, height);
                    previewContext.drawImage(img, 0, 0, width, height);
                    
                    // Update document corners visualization
                    updateDocumentCornersDisplay(result.corners);
                    
                    // Show success message
                    documentDetectedMessage.innerHTML = '<i class="fa-solid fa-check-circle"></i> Document detected';
                    documentDetectedMessage.style.backgroundColor = 'rgba(0, 150, 0, 0.5)';
                };
                img.src = result.imageData;
                
                showAlert('Document detected! Review and confirm or retake.', 'success');
            } catch (error) {
                console.error('Error in document detection:', error);
                fallbackDocumentDetection();
            }
        } else {
            // Fallback to basic detection if OpenCV isn't ready
            fallbackDocumentDetection();
        }
    }
    
    // Update document corners visualization
    function updateDocumentCornersDisplay(corners) {
        if (!documentCornersElement) return;
        
        const { topLeft, topRight, bottomRight, bottomLeft } = corners;
        
        // Create SVG path for the document outline
        documentCornersElement.innerHTML = `
            <svg width="100%" height="100%" style="position:absolute; top:0; left:0;">
                <path d="
                    M ${topLeft.x} ${topLeft.y}
                    L ${topRight.x} ${topRight.y}
                    L ${bottomRight.x} ${bottomRight.y}
                    L ${bottomLeft.x} ${bottomLeft.y}
                    Z
                " fill="rgba(255, 125, 0, 0.1)" stroke="#ff7d30" stroke-width="3"></path>
                
                <!-- Top-left corner -->
                <path d="
                    M ${topLeft.x} ${topLeft.y + 30}
                    L ${topLeft.x} ${topLeft.y}
                    L ${topLeft.x + 30} ${topLeft.y}
                " stroke="#ff7d30" stroke-width="4"></path>
                
                <!-- Top-right corner -->
                <path d="
                    M ${topRight.x - 30} ${topRight.y}
                    L ${topRight.x} ${topRight.y}
                    L ${topRight.x} ${topRight.y + 30}
                " stroke="#ff7d30" stroke-width="4"></path>
                
                <!-- Bottom-right corner -->
                <path d="
                    M ${bottomRight.x} ${bottomRight.y - 30}
                    L ${bottomRight.x} ${bottomRight.y}
                    L ${bottomRight.x - 30} ${bottomRight.y}
                " stroke="#ff7d30" stroke-width="4"></path>
                
                <!-- Bottom-left corner -->
                <path d="
                    M ${bottomLeft.x + 30} ${bottomLeft.y}
                    L ${bottomLeft.x} ${bottomLeft.y}
                    L ${bottomLeft.x} ${bottomLeft.y - 30}
                " stroke="#ff7d30" stroke-width="4"></path>
            </svg>
        `;
    }
    
    // Fallback detection method
    function fallbackDocumentDetection() {
        const width = previewCanvas.width;
        const height = previewCanvas.height;
        
        // Simple margin-based detection
        const padding = 50;
        const docX = Math.max(padding, width * 0.1);
        const docY = Math.max(padding, height * 0.1);
        const docWidth = Math.min(width - padding * 2, width * 0.8);
        const docHeight = Math.min(height - padding * 2, height * 0.8);
        
        // Store detected corners for later processing
        window.detectedDocument = {
            topLeft: { x: docX, y: docY },
            topRight: { x: docX + docWidth, y: docY },
            bottomRight: { x: docX + docWidth, y: docY + docHeight },
            bottomLeft: { x: docX, y: docY + docHeight }
        };
        
        // Update document corners visualization
        updateDocumentCornersDisplay(window.detectedDocument);
        
        // Show basic detection message
        if (documentDetectedMessage) {
            documentDetectedMessage.innerHTML = '<i class="fa-solid fa-exclamation-circle"></i> Basic detection applied';
            documentDetectedMessage.style.backgroundColor = 'rgba(255, 125, 0, 0.5)';
        }
        
        showAlert('Document detected using basic detection. Confirm or retake.', 'info');
    }
    
    // Process the detected document (when user confirms with checkmark)
    function processDocument() {
        if (!window.detectedDocument) {
            showAlert('No document detected. Please try again.', 'error');
            return;
        }
        
        // Show processing indicator
        showAlert('Processing document...', 'info');
        
        // Let the app.js handle the document processing
        // This is now handled via the button in app.js
        
        // Update workflow step
        if (typeof updateWorkflowStep === 'function') {
            updateWorkflowStep('process');
        }
        
        // No need to reset UI here as the app.js will handle downloading and resetting
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
    
    if (confirmButton) {
        confirmButton.addEventListener('click', processDocument);
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