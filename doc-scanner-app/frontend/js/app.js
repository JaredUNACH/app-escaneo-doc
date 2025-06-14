const app = document.getElementById('app');
const captureButton = document.getElementById('capture-button');
const imagePreview = document.getElementById('image-preview');
const uploadButton = document.getElementById('upload-button');
const apiUrl = '/api/upload';

captureButton.addEventListener('click', () => {
    // Logic to access the camera and capture an image
    startCamera();
});

uploadButton.addEventListener('click', () => {
    // Logic to upload the captured image to the backend
    uploadImage();
});

function startCamera() {
    // Access the device camera and display the video feed
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            const video = document.createElement('video');
            video.srcObject = stream;
            video.play();
            app.appendChild(video);

            const capture = document.createElement('button');
            capture.innerText = 'Capture';
            capture.addEventListener('click', () => {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const context = canvas.getContext('2d');
                context.drawImage(video, 0, 0);
                const imageData = canvas.toDataURL('image/png');
                imagePreview.src = imageData;
                stream.getTracks().forEach(track => track.stop());
                app.removeChild(video);
                app.removeChild(capture);
            });
            app.appendChild(capture);
        })
        .catch(error => {
            console.error('Error accessing the camera: ', error);
        });
}

function uploadImage() {
    const imageSrc = imagePreview.src;
    fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ image: imageSrc })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Image uploaded successfully:', data);
    })
    .catch(error => {
        console.error('Error uploading image:', error);
    });
}