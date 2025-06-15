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
    const cornerPoints = document.querySelectorAll('.corner-point');
    const documentPath = document.getElementById('document-path');
    const documentEditorMessage = document.getElementById('document-editor-message');
    
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
    
    // Ensure correct orientation (portrait/vertical)
    function ensureVerticalOrientation() {
        if (!previewCanvas) return;
        
        const width = previewCanvas.width;
        const height = previewCanvas.height;
        
        // If width is greater than height, we need to rotate the canvas
        if (width > height) {
            console.log('Rotating image to portrait orientation');
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = height;
            tempCanvas.height = width;
            
            const tempContext = tempCanvas.getContext('2d');
            
            // Rotate and draw
            tempContext.translate(height, 0);
            tempContext.rotate(Math.PI / 2);
            tempContext.drawImage(previewCanvas, 0, 0);
            
            // Copy back to original canvas
            previewContext.clearRect(0, 0, width, height);
            previewCanvas.width = height;
            previewCanvas.height = width;
            previewContext.drawImage(tempCanvas, 0, 0);
        }
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
                    
                    // Position the corner points
                    positionCornerPoints(result.corners);
                    
                    // Update document path
                    updateDocumentPath();
                    
                    // Add dark overlay outside document
                    createDarkOverlay();
                    
                    // Show success message
                    if (documentEditorMessage) {
                        documentEditorMessage.innerHTML = '<i class="fa-solid fa-check-circle"></i> Document detected - Drag corners to adjust';
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
    
    // Position corner points based on detected document
    function positionCornerPoints(corners) {
        if (!corners || cornerPoints.length !== 4) return;
        
        const { topLeft, topRight, bottomRight, bottomLeft } = corners;
        const positions = [topLeft, topRight, bottomRight, bottomLeft];
        
        // Get container dimensions for percentage calculations
        const containerWidth = previewCanvas.width;
        const containerHeight = previewCanvas.height;
        
        // Update corner positions
        cornerPoints.forEach((point, index) => {
            const cornerPos = positions[index];
            const percentX = (cornerPos.x / containerWidth) * 100;
            const percentY = (cornerPos.y / containerHeight) * 100;
            
            point.style.left = `${percentX}%`;
            point.style.top = `${percentY}%`;
            
            // Store original positions for dragging
            point.setAttribute('data-x', cornerPos.x);
            point.setAttribute('data-y', cornerPos.y);
            
            // Add event listeners for dragging
            point.addEventListener('mousedown', startDrag);
            point.addEventListener('touchstart', startDrag, { passive: false });
        });
    }
    
    // Start dragging a corner point
    function startDrag(e) {
        e.preventDefault();
        
        isDragging = true;
        activeCorner = e.target;
        
        // Add active class for styling
        activeCorner.classList.add('dragging');
        
        // Add event listeners for drag movement
        document.addEventListener('mousemove', dragCorner);
        document.addEventListener('touchmove', dragCorner, { passive: false });
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('touchend', stopDrag);
    }
    
    // Handle dragging a corner point
    function dragCorner(e) {
        if (!isDragging || !activeCorner) return;
        
        e.preventDefault();
        
        // Get coordinates relative to preview container
        const previewContainer = document.querySelector('.preview-container');
        const containerRect = previewContainer.getBoundingClientRect();
        let clientX, clientY;
        
        if (e.type === 'touchmove') {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        // Calculate position as percentage of container
        const percentX = ((clientX - containerRect.left) / containerRect.width) * 100;
        const percentY = ((clientY - containerRect.top) / containerRect.height) * 100;
        
        // Update corner position (clamped to container bounds)
        const clampedX = Math.max(0, Math.min(100, percentX));
        const clampedY = Math.max(0, Math.min(100, percentY));
        
        activeCorner.style.left = `${clampedX}%`;
        activeCorner.style.top = `${clampedY}%`;
        
        // Update data attributes with actual pixel values
        const actualX = (clampedX / 100) * previewCanvas.width;
        const actualY = (clampedY / 100) * previewCanvas.height;
        
        activeCorner.setAttribute('data-x', actualX);
        activeCorner.setAttribute('data-y', actualY);
        
        // Update document path and dark overlay
        updateDocumentPath();
        createDarkOverlay();
    }
    
    // Stop dragging
    function stopDrag() {
        if (!isDragging) return;
        
        // Remove dragging class
        if (activeCorner) {
            activeCorner.classList.remove('dragging');
        }
        
        // Update the detectedDocument object with new corner positions
        updateDetectedDocumentCorners();
        
        isDragging = false;
        activeCorner = null;
        
        // Remove event listeners
        document.removeEventListener('mousemove', dragCorner);
        document.removeEventListener('touchmove', dragCorner);
        document.removeEventListener('mouseup', stopDrag);
        document.removeEventListener('touchend', stopDrag);
        
        // Show message about corner adjustment
        showAlert('Corner position updated. Fine-tune as needed.', 'info', 2000);
    }
    
    // Update detected document corners from current point positions
    function updateDetectedDocumentCorners() {
        if (!window.detectedDocument || cornerPoints.length !== 4) return;
        
        // Get corner positions
        const topLeft = {
            x: parseFloat(cornerPoints[0].getAttribute('data-x')),
            y: parseFloat(cornerPoints[0].getAttribute('data-y'))
        };
        
        const topRight = {
            x: parseFloat(cornerPoints[1].getAttribute('data-x')),
            y: parseFloat(cornerPoints[1].getAttribute('data-y'))
        };
        
        const bottomRight = {
            x: parseFloat(cornerPoints[2].getAttribute('data-x')),
            y: parseFloat(cornerPoints[2].getAttribute('data-y'))
        };
        
        const bottomLeft = {
            x: parseFloat(cornerPoints[3].getAttribute('data-x')),
            y: parseFloat(cornerPoints[3].getAttribute('data-y'))
        };
        
        // Update detected document
        window.detectedDocument = {
            topLeft, topRight, bottomRight, bottomLeft
        };
    }
    
    // Update the document path based on corner positions
    function updateDocumentPath() {
        if (!documentPath || cornerPoints.length !== 4) return;
        
        // Get the corner points in the right order
        const points = Array.from(cornerPoints);
        
        // Create path from corner points with proper syntax for SVG path
        const pathData = `
            M ${points[0].style.left} ${points[0].style.top}
            L ${points[1].style.left} ${points[1].style.top}
            L ${points[2].style.left} ${points[2].style.top}
            L ${points[3].style.left} ${points[3].style.top}
            Z
        `;
        
        // Apply the path
        documentPath.setAttribute('d', pathData);
        
        // Also update the style to make it more visible
        documentPath.setAttribute('stroke-width', '3');
        documentPath.setAttribute('stroke', 'var(--primary-orange)');
        documentPath.setAttribute('fill', 'rgba(255, 125, 48, 0.05)');
    }
    
    // Create dark overlay outside document area
    function createDarkOverlay() {
        const overlay = document.querySelector('.document-outside-overlay');
        
        if (!overlay) {
            // Create overlay element if it doesn't exist
            const svgNS = "http://www.w3.org/2000/svg";
            const overlayContainer = document.createElementNS(svgNS, "svg");
            overlayContainer.setAttribute("class", "document-outside-overlay");
            overlayContainer.setAttribute("width", "100%");
            overlayContainer.setAttribute("height", "100%");
            overlayContainer.style.position = "absolute";
            overlayContainer.style.top = "0";
            overlayContainer.style.left = "0";
            overlayContainer.style.pointerEvents = "none";
            overlayContainer.style.zIndex = "4";
            
            const mask = document.createElementNS(svgNS, "mask");
            mask.setAttribute("id", "document-mask");
            
            const background = document.createElementNS(svgNS, "rect");
            background.setAttribute("width", "100%");
            background.setAttribute("height", "100%");
            background.setAttribute("fill", "white"); // White = visible in mask
            
            const documentArea = document.createElementNS(svgNS, "path");
            documentArea.setAttribute("fill", "black"); // Black = transparent in mask
            documentArea.setAttribute("id", "document-mask-path");
            
            mask.appendChild(background);
            mask.appendChild(documentArea);
            
            const darkRect = document.createElementNS(svgNS, "rect");
            darkRect.setAttribute("width", "100%");
            darkRect.setAttribute("height", "100%");
            darkRect.setAttribute("fill", "rgba(0, 0, 0, 0.7)");
            darkRect.setAttribute("mask", "url(#document-mask)");
            
            overlayContainer.appendChild(mask);
            overlayContainer.appendChild(darkRect);
            
            const previewContainer = document.querySelector('.preview-container');
            if (previewContainer) {
                previewContainer.appendChild(overlayContainer);
            }
        }
        
        // Update mask path to match document path
        const maskPath = document.getElementById('document-mask-path');
        if (maskPath && documentPath) {
            maskPath.setAttribute('d', documentPath.getAttribute('d'));
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
        
        // Position corner points
        positionCornerPoints(window.detectedDocument);
        
        // Update document path
        updateDocumentPath();
        
        // Add dark overlay outside document
        createDarkOverlay();
        
        // Show basic detection message
        if (documentEditorMessage) {
            documentEditorMessage.innerHTML = '<i class="fa-solid fa-arrows-up-down-left-right"></i> Adjust corners to fit document';
        }
        
        showAlert('Adjust document corners for perfect alignment.', 'info');
    }
    
    // Simple crop without perspective correction - preserves natural look
    function simpleCropDocument(sourceCanvas, corners) {
        const { topLeft, topRight, bottomRight, bottomLeft } = corners;
        
        // Find the bounding box
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
        
        // Just crop the image
        destContext.drawImage(
            sourceCanvas,
            minX, minY, width, height,
            0, 0, width, height
        );
        
        return destCanvas;
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
            
            // Process after scan effect
            setTimeout(() => {
                previewContainer.classList.remove('scan-active');
                
                try {
                    let correctedCanvas;
                    
                    // Check if correction is enabled (if checkbox exists)
                    if (document.getElementById('apply-correction') && 
                        document.getElementById('apply-correction').checked) {
                        // Apply perspective correction
                        correctedCanvas = window.documentDetection.correctPerspective(
                            previewCanvas, 
                            window.detectedDocument
                        );
                    } else {
                        // Use simple crop for natural look (default option)
                        correctedCanvas = simpleCropDocument(
                            previewCanvas, 
                            window.detectedDocument
                        );
                    }
                    
                    // Apply enhancements if enabled
                    if (document.getElementById('enhance-contrast') && 
                        document.getElementById('enhance-contrast').checked) {
                        window.documentDetection.enhanceDocument(correctedCanvas);
                    }
                    
                    // Convert to black and white if enabled
                    if (document.getElementById('bw-mode') && 
                        document.getElementById('bw-mode').checked) {
                        convertToBlackAndWhite(correctedCanvas);
                    }
                    
                    // Generate and download PDF
                    generatePDF(correctedCanvas);
                    
                    // Update workflow step
                    if (typeof updateWorkflowStep === 'function') {
                        updateWorkflowStep('process');
                    }
                    
                    showAlert('Document processed successfully!', 'success');
                } catch (error) {
                    console.error('Error processing document:', error);
                    showAlert('Error processing document. Please try again.', 'error');
                }
            }, 1200);
        }
    }
    
    // Convert canvas to black and white
    function convertToBlackAndWhite(canvas) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            const threshold = 128;
            const value = avg > threshold ? 255 : 0;
            data[i] = data[i + 1] = data[i + 2] = value;
        }
        
        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }
    
    // Generate and download PDF
    function generatePDF(canvas) {
        // Check if jsPDF is available globally or through window.jspdf
        const jspdfLib = window.jspdf || window.jsPDF || window;
        
        if (typeof jspdfLib.jsPDF === 'undefined') {
            console.warn('jsPDF library not found, falling back to image download');
            downloadCanvasAsImage(canvas);
            return;
        }
        
        try {
            const { jsPDF } = jspdfLib;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });
            
            // Add the canvas as an image to the PDF with high quality
            const imgData = canvas.toDataURL('image/jpeg', 0.98);
            pdf.addImage(imgData, 'JPEG', 10, 10, 190, 270);
            
            // Save the PDF
            pdf.save('document-scan.pdf');
            
            showAlert('Document saved as PDF!', 'success');
        } catch (error) {
            console.error('Error generating PDF:', error);
            // Fallback to image download
            downloadCanvasAsImage(canvas);
        }
    }
    
    // Fallback: Download canvas as image if PDF generation fails
    function downloadCanvasAsImage(canvas) {
        const link = document.createElement('a');
        link.download = 'document-scan.jpg';
        link.href = canvas.toDataURL('image/jpeg', 0.98);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showAlert('Document saved as image!', 'success');
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
    
    // Helper function to show alerts
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

    // Crea la opción de corrección de perspectiva si no existe
    function createPerspectiveOption() {
        const enhancementOptions = document.querySelector('.enhancement-options');
        if (enhancementOptions && !document.getElementById('apply-correction')) {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'enhancement-option';
            optionDiv.innerHTML = `
                <input type="checkbox" id="apply-correction">
                <label for="apply-correction">Corregir perspectiva (puede distorsionar)</label>
            `;
            enhancementOptions.appendChild(optionDiv);
        }
    }

    // Ejecuta esta función cuando se cargue la página
    createPerspectiveOption();
});