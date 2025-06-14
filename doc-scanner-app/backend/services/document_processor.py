class DocumentProcessor:
    def __init__(self, image_detector, pdf_converter):
        self.image_detector = image_detector
        self.pdf_converter = pdf_converter

    def process_image(self, image):
        detected_document = self.image_detector.detect_document(image)
        if detected_document is not None:
            cropped_image = self.image_detector.crop_document(image, detected_document)
            pdf_file = self.pdf_converter.convert_to_pdf(cropped_image)
            return pdf_file
        return None

    def process_images(self, images):
        pdf_files = []
        for image in images:
            pdf_file = self.process_image(image)
            if pdf_file:
                pdf_files.append(pdf_file)
        return pdf_files