// Main application file for DocuScan Pro
document.addEventListener('DOMContentLoaded', function() {
    console.log('DocuScan Pro initialized');
    
    // DOM Elements
    const appAlert = document.getElementById('app-alert');
    const alertMessage = document.getElementById('alert-message');
    const processButton = document.getElementById('process-button');
    
    // App configuration
    const config = {
        defaultFileName: 'docuscan_document.jpg',
        imageQuality: 0.9,
        maxFileSize: 10 * 1024 * 1024 // 10MB
    };
    
    // Initialize app components
    initAppTheme();
    setupEventListeners();
    
    // Check for system dark mode preference
    function initAppTheme() {
        const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDarkMode) {
            document.body.classList.add('dark-mode');
        }
        
        // Listen for changes in system theme preference
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (e.matches) {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
        });
    }
    
    // Setup app event listeners
    function setupEventListeners() {
        // If process button exists, add a listener to save image
        if (processButton) {
            processButton.addEventListener('click', processAndSaveDocument);
        }
    }
    
    // Process and save document locally
    function processAndSaveDocument() {
        // Get the canvas with the preview image
        const previewCanvas = document.getElementById('preview-canvas');
        if (!previewCanvas) {
            showAlert('No document available to save', 'error');
            return;
        }
        
        try {
            // Get document corners if available
            const docCorners = window.detectedDocument || {
                topLeft: { x: 0, y: 0 },
                topRight: { x: previewCanvas.width, y: 0 },
                bottomRight: { x: previewCanvas.width, y: previewCanvas.height },
                bottomLeft: { x: 0, y: previewCanvas.height }
            };
            
            // Show processing indicator
            showAlert('Processing document...', 'info');
            
            let processedCanvas;
            
            // Use OpenCV for better results if available
            if (window.documentDetection && window.documentDetection.isOpenCvReady()) {
                // Use OpenCV's perspective correction
                processedCanvas = window.documentDetection.correctPerspective(previewCanvas, docCorners);
                
                // Use OpenCV's document enhancement
                processedCanvas = window.documentDetection.enhanceDocument(processedCanvas);
            } else {
                // Fallback to basic processing
                processedCanvas = document.createElement('canvas');
                const ctx = processedCanvas.getContext('2d');
                
                // Set to A4 dimensions
                processedCanvas.width = 1240;
                processedCanvas.height = 1754;
                
                // Draw white background
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, processedCanvas.width, processedCanvas.height);
                
                // Extract document from preview
                const sourceWidth = docCorners.topRight.x - docCorners.topLeft.x;
                const sourceHeight = docCorners.bottomLeft.y - docCorners.topLeft.y;
                
                // Draw the document with basic transformation
                ctx.drawImage(
                    previewCanvas,
                    docCorners.topLeft.x, docCorners.topLeft.y, 
                    sourceWidth, sourceHeight,
                    0, 0, processedCanvas.width, processedCanvas.height
                );
                
                // Apply basic enhancement
                enhanceImage(processedCanvas);
            }
            
            // Convert to JPEG data URL
            const imageData = processedCanvas.toDataURL('image/jpeg', config.imageQuality);
            
            // Create download link
            const downloadLink = document.createElement('a');
            downloadLink.href = imageData;
            
            // Generate filename with date
            const now = new Date();
            const dateStr = now.toISOString().slice(0,10).replace(/-/g,'');
            const timeStr = now.toTimeString().slice(0,8).replace(/:/g,'');
            downloadLink.download = `DocuScan_${dateStr}_${timeStr}.jpg`;
            
            // Trigger download
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            showAlert('Document saved to your device', 'success');
            
            // Reset UI after processing is complete
            const previewSection = document.getElementById('preview-section');
            const cameraSection = document.getElementById('camera-section');
            
            setTimeout(() => {
                if (previewSection) previewSection.classList.add('hidden');
                if (cameraSection) cameraSection.classList.remove('hidden');
            }, 1500);
            
        } catch (error) {
            console.error('Error saving document:', error);
            showAlert('Error saving document', 'error');
        }
    }
    
    // Simple image enhancement
    function enhanceImage(canvas) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Simple contrast and brightness adjustment
        for (let i = 0; i < data.length; i += 4) {
            // Apply contrast (multiply)
            data[i] = Math.min(255, data[i] * 1.1);     // R
            data[i+1] = Math.min(255, data[i+1] * 1.1); // G
            data[i+2] = Math.min(255, data[i+2] * 1.1); // B
            
            // If pixel is near-white, make it pure white (clean up background)
            if (data[i] > 230 && data[i+1] > 230 && data[i+2] > 230) {
                data[i] = data[i+1] = data[i+2] = 255;
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }
    
    // Show alert message
    function showAlert(message, type = 'info', duration = 3000) {
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
    
    // Global error handler
    window.addEventListener('error', function(e) {
        console.error('Application error:', e.error);
        showAlert('An error occurred. Please try again.', 'error');
    });
});