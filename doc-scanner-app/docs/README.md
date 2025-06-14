# Doc Scanner App

## Overview
The Doc Scanner App is a powerful tool designed to scan documents using your mobile device's camera. It intelligently detects the document in the image, crops it, and converts it into a high-quality PDF format. This application is built with a backend powered by Flask and a responsive frontend that ensures a seamless user experience across devices.

## Features
- Capture images of documents using your device's camera.
- Automatic detection and cropping of documents from images.
- Conversion of scanned images to PDF format.
- User-friendly interface with responsive design for mobile and desktop.

## Project Structure
The project is organized into two main directories: `backend` and `frontend`.

### Backend
- **app.py**: Main entry point for the backend application.
- **config.py**: Configuration settings for the application.
- **requirements.txt**: Lists the Python dependencies required for the backend.
- **models/document.py**: Defines the Document model for storing scanned documents.
- **services/document_processor.py**: Contains methods for processing images and extracting features.
- **services/pdf_converter.py**: Function to convert images to PDF format.
- **services/image_detection.py**: Methods for detecting and cropping documents in images.
- **api/routes.py**: Sets up API routes linking endpoints to service functions.

### Frontend
- **index.html**: Main HTML file for the frontend application.
- **css/**: Contains stylesheets for the application.
  - **main.css**: Main styles for the application.
  - **responsive.css**: Styles for responsive design.
- **js/**: Contains JavaScript files for frontend functionality.
  - **app.js**: Main logic for handling user interactions and API calls.
  - **camera.js**: Functions for accessing the device camera.
  - **document-detection.js**: Functions for processing images and detecting documents.
- **assets/**: Directory for additional assets like images or icons.

## Setup Instructions
1. Clone the repository:
   ```
   git clone https://github.com/yourusername/doc-scanner-app.git
   ```
2. Navigate to the backend directory and install the required dependencies:
   ```
   cd doc-scanner-app/backend
   pip install -r requirements.txt
   ```
3. Run the backend application:
   ```
   python app.py
   ```
4. Open the `index.html` file in your browser to access the frontend.

## Usage
- To scan a document, click on the camera icon in the app.
- Capture the document image, and the app will automatically process it.
- Once processed, you can download the scanned document as a PDF.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any suggestions or improvements.

## License
This project is licensed under the MIT License. See the LICENSE file for details.