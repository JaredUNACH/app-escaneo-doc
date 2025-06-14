from fpdf import FPDF
import os

def convert_to_pdf(image_path, output_pdf_path):
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"The image file {image_path} does not exist.")
    
    pdf = FPDF()
    pdf.add_page()
    pdf.image(image_path, x=10, y=10, w=190)  # Adjust x, y, w as needed
    pdf.output(output_pdf_path)