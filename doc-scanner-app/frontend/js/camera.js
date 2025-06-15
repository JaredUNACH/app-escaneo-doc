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
    
    // Add camera flash element
    const cameraFlash = document.createElement('div');
    cameraFlash.className = 'camera-flash';
    document.body.appendChild(cameraFlash);
    
    // Add scan line element for effect
    const scanLine = document.createElement('div');
    scanLine.className = 'scan-line';
    
    // Camera stream reference
    let cameraStream = null;
    
    // Canvas contexts
    const previewContext = previewCanvas ? previewCanvas.getContext('2d') : null;
    
    // Track if corners are being dragged
    let isDragging = false;
    let activeCorner = null;
    
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
    
    // Capture image from camera with flash effect
    function captureImage() {
        if (!cameraStream) {
            showAlert('Camera not ready.', 'error');
            return;
        }
        
        // Trigger camera flash effect
        cameraFlash.classList.add('active');
        setTimeout(() => {
            cameraFlash.classList.remove('active');
        }, 700);
        
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
        
        // Add scan line animation
        const previewContainer = document.querySelector('.preview-container');
        if (previewContainer) {
            previewContainer.appendChild(scanLine);
            previewContainer.classList.add('scan-active');
            
            // Remove scan line after animation
            setTimeout(() => {
                previewContainer.classList.remove('scan-active');
            }, 1500);
        }
        
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
                    
                    // Update document corners visualization with draggable corners
                    updateDocumentCornersDisplay(result.corners);
                    
                    // Add corner drag handlers
                    initCornerDragging();
                    
                    // Show success message
                    if (documentDetectedMessage) {
                        documentDetectedMessage.innerHTML = '<i class="fa-solid fa-check-circle"></i> Document detected - Adjust corners if needed';
                        documentDetectedMessage.style.backgroundColor = 'rgba(0, 150, 0, 0.5)';
                    }
                };
                img.src = result.imageData;
                
                showAlert('Document detected! Adjust corners if needed, then confirm.', 'success');
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
                " fill="rgba(255, 125, 0, 0.1)" stroke="#ff7d30" stroke-width="3" stroke-dasharray="8" stroke-dashoffset="0"></path>
                
                <!-- Interactive corner points -->
                <circle class="corner-handle" cx="${topLeft.x}" cy="${topLeft.y}" r="12" fill="#ff7d30" stroke="white" stroke-width="2" data-corner="topLeft" />
                <circle class="corner-handle" cx="${topRight.x}" cy="${topRight.y}" r="12" fill="#ff7d30" stroke="white" stroke-width="2" data-corner="topRight" />
                <circle class="corner-handle" cx="${bottomRight.x}" cy="${bottomRight.y}" r="12" fill="#ff7d30" stroke="white" stroke-width="2" data-corner="bottomRight" />
                <circle class="corner-handle" cx="${bottomLeft.x}" cy="${bottomLeft.y}" r="12" fill="#ff7d30" stroke="white" stroke-width="2" data-corner="bottomLeft" />
            </svg>
        `;
    }
    
    // Initialize corner dragging
    function initCornerDragging() {
        const cornerHandles = document.querySelectorAll('.corner-handle');
        
        cornerHandles.forEach(handle => {
            handle.addEventListener('mousedown', startDrag);
            handle.addEventListener('touchstart', startDrag, { passive: false });
        });
        
        function startDrag(e) {
            e.preventDefault();
            isDragging = true;
            activeCorner = e.target.getAttribute('data-corner');
            
            // Add event listeners for drag movement
            document.addEventListener('mousemove', dragCorner);
            document.addEventListener('touchmove', dragCorner, { passive: false });
            document.addEventListener('mouseup', stopDrag);
            document.addEventListener('touchend', stopDrag);
            
            // Add active styling to the handle
            e.target.setAttribute('stroke-width', '3');
            e.target.setAttribute('r', '14');
        }
        
        function dragCorner(e) {
            if (!isDragging || !activeCorner) return;
            
            e.preventDefault();
            
            // Get coordinates relative to preview canvas
            const previewRect = previewCanvas.getBoundingClientRect();
            let pageX, pageY;
            
            if (e.type === 'touchmove') {
                pageX = e.touches[0].pageX;
                pageY = e.touches[0].pageY;
            } else {
                pageX = e.pageX;
                pageY = e.pageY;
            }
            
            // Calculate position relative to canvas
            let x = (pageX - previewRect.left) * (previewCanvas.width / previewRect.width);
            let y = (pageY - previewRect.top) * (previewCanvas.height / previewRect.height);
            
            // Constrain to canvas bounds with some padding
            x = Math.max(10, Math.min(previewCanvas.width - 10, x));
            y = Math.max(10, Math.min(previewCanvas.height - 10, y));
            
            // Update the corner position in our document corners object
            window.detectedDocument[activeCorner] = { x, y };
            
            // Redraw corners
            updateDocumentCornersDisplay(window.detectedDocument);
            
            // Re-initialize dragging since we redrew the handles
            const cornerHandles = document.querySelectorAll('.corner-handle');
            cornerHandles.forEach(handle => {
                if (handle.getAttribute('data-corner') === activeCorner) {
                    handle.setAttribute('stroke-width', '3');
                    handle.setAttribute('r', '14');
                }
            });
        }
        
        function stopDrag(e) {
            if (!isDragging) return;
            
            isDragging = false;
            
            // Remove event listeners
            document.removeEventListener('mousemove', dragCorner);
            document.removeEventListener('touchmove', dragCorner);
            document.removeEventListener('mouseup', stopDrag);
            document.removeEventListener('touchend', stopDrag);
            
            // Reset handle styling
            const activeHandle = document.querySelector(`.corner-handle[data-corner="${activeCorner}"]`);
            if (activeHandle) {
                activeHandle.setAttribute('stroke-width', '2');
                activeHandle.setAttribute('r', '12');
            }
            
            activeCorner = null;
            
            // Show message about corner adjustment
            showAlert('Corner position updated. Adjust others if needed.', 'info', 2000);
        }
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
        
        // Add corner drag handlers
        initCornerDragging();
        
        // Show basic detection message
        if (documentDetectedMessage) {
            documentDetectedMessage.innerHTML = '<i class="fa-solid fa-arrows-up-down-left-right"></i> Adjust corners to fit document';
            documentDetectedMessage.style.backgroundColor = 'rgba(255, 125, 0, 0.5)';
        }
        
        showAlert('Adjust document corners for perfect alignment.', 'info');
    }
    
    // Process the detected document (when user confirms with checkmark)
    function processDocument() {
        if (!window.detectedDocument) {
            showAlert('No document detected. Please try again.', 'error');
            return;
        }
        
        // Show processing indicator
        showAlert('Processing document...', 'info');
        
        // Add scanning effect before processing
        const previewContainer = document.querySelector('.preview-container');
        if (previewContainer) {
            previewContainer.classList.add('scan-active');
            
            // Let the app.js handle the document processing after scan effect
            setTimeout(() => {
                previewContainer.classList.remove('scan-active');
                
                // Update workflow step
                if (typeof updateWorkflowStep === 'function') {
                    updateWorkflowStep('process');
                }
            }, 1200);
        } else {
            // Update workflow step immediately if no container for effects
            if (typeof updateWorkflowStep === 'function') {
                updateWorkflowStep('process');
            }
        }
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