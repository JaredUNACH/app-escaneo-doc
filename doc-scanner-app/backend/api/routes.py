from flask import Blueprint, request, jsonify
from backend.services.document_processor import DocumentProcessor
from backend.services.pdf_converter import convert_to_pdf

api = Blueprint('api', __name__)
document_processor = DocumentProcessor()

@api.route('/scan', methods=['POST'])
def scan_document():
    image_file = request.files.get('image')
    if not image_file:
        return jsonify({'error': 'No image file provided'}), 400

    processed_image = document_processor.process_image(image_file)
    if processed_image is None:
        return jsonify({'error': 'Failed to process image'}), 500

    pdf_file = convert_to_pdf(processed_image)
    return jsonify({'message': 'Document scanned successfully', 'pdf_file': pdf_file}), 200

@api.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'}), 200