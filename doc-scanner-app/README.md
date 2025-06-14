# Document Scanner App

## Overview
The Document Scanner App is a powerful tool designed to scan documents using your mobile device's camera. It intelligently detects the document in the image, crops it, and converts it into a high-quality PDF format. This application is built using a Python backend with Flask and a responsive frontend for seamless use on mobile devices.

## Features
- Capture images of documents using your device's camera.
- Automatic detection and cropping of the document from the image.
- Conversion of scanned images to PDF format.
- User-friendly interface that works on both desktop and mobile devices.

## Project Structure
```
doc-scanner-app
├── backend
│   ├── app.py                # Main entry point for the backend application
│   ├── config.py             # Configuration settings for the application
│   ├── requirements.txt       # Python dependencies for the backend
│   ├── models
│   │   └── document.py       # Document model definition
│   ├── services
│   │   ├── document_processor.py  # Image processing and feature extraction
│   │   ├── pdf_converter.py       # Function to convert images to PDF
│   │   └── image_detection.py     # Document detection and cropping
│   └── api
│       └── routes.py          # API routes setup
├── frontend
│   ├── index.html            # Main HTML file for the frontend
│   ├── css
│   │   ├── main.css          # Main styles for the application
│   │   └── responsive.css     # Responsive styles for different devices
│   ├── js
│   │   ├── app.js            # Main JavaScript logic for the frontend
│   │   ├── camera.js         # Functions for accessing the device camera
│   │   └── document-detection.js # Functions for processing images
│   └── assets                # Additional assets (images, icons)
├── docs
│   └── README.md             # Documentation for the project
└── README.md                 # Overview of the project
```

## Installation
1. Clone the repository:
   ```
   git clone https://github.com/yourusername/doc-scanner-app.git
   ```
2. Navigate to the backend directory and install the required dependencies:
   ```
   cd doc-scanner-app/backend
   pip install -r requirements.txt
   ```
3. Run the backend server:
   ```
   python app.py
   ```

## Usage
- Open the `index.html` file in your browser to access the frontend application.
- Use the camera feature to capture images of documents.
- The app will automatically process the image and provide an option to download the scanned document as a PDF.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for more details.